/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { ProcessingMode } from '../types';

export type ProgressCallback = (percentage: number, message: string) => void;

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;
  private loadError: string | null = null;

  /**
   * Initializes and loads FFmpeg WebAssembly core
   * Strategy:
   * 1. Direct same-origin local URL (/ffmpeg/ffmpeg-core.js & .wasm)
   * 2. Local blob URL (/ffmpeg/...)
   * 3. unpkg CDN ESM fallback
   * 4. jsdelivr CDN ESM fallback
   */
  public async load(): Promise<boolean> {
    if (this.isLoaded && this.ffmpeg) {
      return true;
    }

    if (this.isLoading) {
      let attempts = 0;
      while (this.isLoading && attempts < 100) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        attempts++;
      }
      return this.isLoaded;
    }

    this.isLoading = true;
    this.loadError = null;

    const setupInstance = () => {
      try {
        this.ffmpeg?.terminate();
      } catch {}
      this.ffmpeg = new FFmpeg();
      this.ffmpeg.on('log', ({ message }) => {
        if (import.meta.env.DEV) {
          console.debug('[FFmpeg]', message);
        }
      });
    };

    // Strategy 1: Direct same-origin URL (fastest, zero blob import issues in module workers)
    try {
      setupInstance();
      const origin = window.location.origin;
      const coreURL = `${origin}/ffmpeg/ffmpeg-core.js`;
      const wasmURL = `${origin}/ffmpeg/ffmpeg-core.wasm`;

      await this.ffmpeg!.load({
        coreURL,
        wasmURL,
      });

      this.isLoaded = true;
      this.isLoading = false;
      return true;
    } catch (localDirectErr: any) {
      console.warn('Local direct FFmpeg core load failed, trying local blob URLs...', localDirectErr);
    }

    // Strategy 2: Local blob URLs via toBlobURL
    try {
      setupInstance();
      const coreURL = await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript');
      const wasmURL = await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm');

      await this.ffmpeg!.load({
        coreURL,
        wasmURL,
      });

      this.isLoaded = true;
      this.isLoading = false;
      return true;
    } catch (localBlobErr: any) {
      console.warn('Local blob FFmpeg load failed, trying unpkg CDN...', localBlobErr);
    }

    // Strategy 3: unpkg CDN ESM fallback
    try {
      setupInstance();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

      await this.ffmpeg!.load({
        coreURL,
        wasmURL,
      });

      this.isLoaded = true;
      this.isLoading = false;
      return true;
    } catch (unpkgErr: any) {
      console.warn('unpkg core load failed, trying jsdelivr CDN...', unpkgErr);
    }

    // Strategy 4: jsdelivr CDN ESM fallback
    try {
      setupInstance();
      const fallbackBaseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
      const coreURL = await toBlobURL(`${fallbackBaseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${fallbackBaseURL}/ffmpeg-core.wasm`, 'application/wasm');

      await this.ffmpeg!.load({
        coreURL,
        wasmURL,
      });

      this.isLoaded = true;
      this.isLoading = false;
      return true;
    } catch (jsdelivrErr: any) {
      this.isLoading = false;
      this.isLoaded = false;
      this.loadError = jsdelivrErr?.message || 'Failed to load FFmpeg WebAssembly core.';
      console.warn('All FFmpeg loading strategies exhausted:', jsdelivrErr);
      return false;
    }
  }

  private taskChain: Promise<any> = Promise.resolve();

  public getStatus(): { isLoaded: boolean; isLoading: boolean; loadError: string | null } {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      loadError: this.loadError,
    };
  }

  /**
   * Cuts a video using FFmpeg.wasm with a background task queue mutex
   * so multiple clips can be submitted simultaneously without colliding.
   */
  public async cutVideo(
    sourceFile: File,
    startSeconds: number,
    endSeconds: number,
    mode: ProcessingMode = 'accurate-reencode',
    onProgress?: ProgressCallback
  ): Promise<{ blob: Blob; url: string; modeUsed: ProcessingMode }> {
    const runTask = async () => {
      return this.executeCutInternal(sourceFile, startSeconds, endSeconds, mode, onProgress);
    };

    const nextTask = this.taskChain.then(runTask, runTask);
    this.taskChain = nextTask.catch(() => {});
    return nextTask;
  }

  private async executeCutInternal(
    sourceFile: File,
    startSeconds: number,
    endSeconds: number,
    mode: ProcessingMode = 'accurate-reencode',
    onProgress?: ProgressCallback
  ): Promise<{ blob: Blob; url: string; modeUsed: ProcessingMode }> {
    const ready = await this.load();
    if (!ready || !this.ffmpeg) {
      throw new Error(
        this.loadError || 'FFmpeg WebAssembly core could not be initialized.'
      );
    }

    const exactStart = Math.round(startSeconds * 1000) / 1000;
    const exactEnd = Math.round(endSeconds * 1000) / 1000;
    const duration = Math.max(0.1, Math.round((exactEnd - exactStart) * 1000) / 1000);

    const inputExt = sourceFile.name.split('.').pop()?.toLowerCase() || 'mp4';
    const uid = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inputName = `input_${uid}.${inputExt}`;
    const outputExt = mode === 'stream-copy' ? inputExt : 'mp4';
    const outputName = `output_${uid}.${outputExt}`;

    onProgress?.(5, 'Reading local video file into browser memory...');

    const progressHandler = ({ progress, time }: { progress: number; time: number }) => {
      let percent = Math.min(Math.max(Math.round(progress * 100), 5), 95);
      if (duration > 0 && time > 0) {
        const calcPercent = Math.min(Math.max(Math.round((time / 1000000 / duration) * 100), 5), 95);
        percent = Math.max(percent, calcPercent);
      }
      onProgress?.(
        percent,
        mode === 'stream-copy'
          ? `Extracting clip (Lossless Copy, ${percent}%)...`
          : `Cutting exact frames (${percent}%)...`
      );
    };

    this.ffmpeg.on('progress', progressHandler);

    try {
      const fileData = await fetchFile(sourceFile);
      await this.ffmpeg.writeFile(inputName, fileData);

      onProgress?.(15, 'Preparing surgical frame-accurate pipeline...');

      // Two-stage exact seek calculation:
      // Stage 1 (Fast demuxer seek up to 2s before target) + Stage 2 (Exact frame decode after -i)
      const fastPreSeek = Math.max(0, exactStart - 2);
      const exactPostSeek = Math.round((exactStart - fastPreSeek) * 1000) / 1000;

      const fastSeekStr = fastPreSeek.toFixed(3);
      const exactPostSeekStr = exactPostSeek.toFixed(3);
      const durationStr = duration.toFixed(3);
      const directStartStr = exactStart.toFixed(3);

      let ffmpegArgs: string[] = [];

      if (mode === 'stream-copy') {
        ffmpegArgs = [
          '-ss',
          directStartStr,
          '-i',
          inputName,
          '-t',
          durationStr,
          '-map',
          '0:v:0',
          '-map',
          '0:a?',
          '-c',
          'copy',
          '-avoid_negative_ts',
          'make_zero',
          outputName,
        ];
      } else {
        // Two-stage frame-accurate transcode:
        // Putting -ss exactPostSeekStr AFTER -i guarantees frame-by-frame decoding
        // so 00:10:00 is strictly 00:10:00.000, never 00:10:01!
        ffmpegArgs = [
          ...(fastPreSeek > 0 ? ['-ss', fastSeekStr] : []),
          '-i',
          inputName,
          '-ss',
          exactPostSeekStr,
          '-t',
          durationStr,
          '-map',
          '0:v:0',
          '-map',
          '0:a?',
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-crf',
          '17',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-avoid_negative_ts',
          'make_zero',
          '-movflags',
          '+faststart',
          outputName,
        ];
      }

      onProgress?.(
        25,
        mode === 'stream-copy'
          ? 'Lossless cutting...'
          : `Cutting exact range (${directStartStr}s for ${durationStr}s)...`
      );

      const exitCode = await this.ffmpeg.exec(ffmpegArgs);

      if (exitCode !== 0) {
        if (mode === 'stream-copy') {
          console.warn('Stream copy exited with code', exitCode, '. Retrying with exact frame-accurate transcode...');
          onProgress?.(30, 'Switching to exact frame-accurate transcode...');

          const fallbackOutputName = `output_fb_${uid}.mp4`;
          const fallbackArgs = [
            ...(fastPreSeek > 0 ? ['-ss', fastSeekStr] : []),
            '-i',
            inputName,
            '-ss',
            exactPostSeekStr,
            '-t',
            durationStr,
            '-map',
            '0:v:0',
            '-map',
            '0:a?',
            '-c:v',
            'libx264',
            '-preset',
            'ultrafast',
            '-crf',
            '17',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-avoid_negative_ts',
            'make_zero',
            '-movflags',
            '+faststart',
            fallbackOutputName,
          ];

          const retryExitCode = await this.ffmpeg.exec(fallbackArgs);
          if (retryExitCode !== 0) {
            throw new Error(`FFmpeg exited with error code ${retryExitCode}. Check codec compatibility.`);
          }

          const fallbackData = await this.ffmpeg.readFile(fallbackOutputName);
          const uint8 = fallbackData instanceof Uint8Array ? fallbackData : new Uint8Array(fallbackData as any);
          const blob = new Blob([uint8], { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);

          try {
            await this.ffmpeg.deleteFile(inputName);
            await this.ffmpeg.deleteFile(fallbackOutputName);
          } catch {}

          return { blob, url, modeUsed: 'accurate-reencode' };
        } else {
          throw new Error(`FFmpeg exited with error code ${exitCode}.`);
        }
      }

      onProgress?.(95, 'Reading output clip from browser memory...');

      const outputData = await this.ffmpeg.readFile(outputName);
      const mimeType = outputExt === 'webm' ? 'video/webm' : outputExt === 'mkv' ? 'video/x-matroska' : 'video/mp4';

      const uint8 = outputData instanceof Uint8Array ? outputData : new Uint8Array(outputData as any);
      const blob = new Blob([uint8], { type: mimeType });
      const url = URL.createObjectURL(blob);

      onProgress?.(100, 'Clip processing complete!');

      try {
        await this.ffmpeg.deleteFile(inputName);
        await this.ffmpeg.deleteFile(outputName);
      } catch (cleanErr) {
        console.warn('Virtual file cleanup warning:', cleanErr);
      }

      return {
        blob,
        url,
        modeUsed: mode,
      };
    } finally {
      try {
        (this.ffmpeg as any).off?.('progress', progressHandler);
      } catch (e) {
        // ignore
      }
    }
  }
}

export const ffmpegService = new FFmpegService();

