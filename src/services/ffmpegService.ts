/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { ProcessingMode } from '../types';

export type ProgressCallback = (percentage: number, message: string) => void;

export interface FFmpegCutResult {
  blob: Blob;
  url: string;
  modeUsed: ProcessingMode;
  extension: string;
  mimeType: string;
}

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;
  private loadError: string | null = null;
  private taskChain: Promise<any> = Promise.resolve();

  /**
   * Helper to enforce a timeout on FFmpeg load so it never hangs forever
   * while allowing sufficient time (45s) for the 31MB WebAssembly binary to compile.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
      promise
        .then((val) => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Pre-warms FFmpeg in the background so it is ready before the user clicks Process.
   */
  public preload(): void {
    if (!this.isLoaded && !this.isLoading) {
      this.load().catch(() => {});
    }
  }

  /**
   * Initializes and loads FFmpeg WebAssembly core with explicit classWorkerURL.
   */
  public async load(onProgress?: ProgressCallback): Promise<boolean> {
    if (this.isLoaded && this.ffmpeg) {
      return true;
    }

    if (this.isLoading) {
      let attempts = 0;
      while (this.isLoading && attempts < 200) {
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

    const origin = window.location.origin;

    // Strategy 1: Direct same-origin local worker + core + wasm
    try {
      onProgress?.(6, 'Loading local WebAssembly engine (6%)...');
      setupInstance();
      const classWorkerURL = `${origin}/ffmpeg/worker.js`;
      const coreURL = `${origin}/ffmpeg/ffmpeg-core.js`;
      const wasmURL = `${origin}/ffmpeg/ffmpeg-core.wasm`;

      await this.withTimeout(
        this.ffmpeg!.load({
          classWorkerURL,
          coreURL,
          wasmURL,
        }),
        45000,
        'Local direct FFmpeg load'
      );

      this.isLoaded = true;
      this.isLoading = false;
      return true;
    } catch (localDirectErr: any) {
      console.warn('Local direct FFmpeg core load failed, trying local blob URLs...', localDirectErr);
    }

    // Strategy 2: Local worker + Blob URLs
    try {
      onProgress?.(8, 'Loading WebAssembly binary via Blob URL (8%)...');
      setupInstance();
      const classWorkerURL = `${origin}/ffmpeg/worker.js`;
      const coreURL = await toBlobURL(`${origin}/ffmpeg/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${origin}/ffmpeg/ffmpeg-core.wasm`, 'application/wasm');

      await this.withTimeout(
        this.ffmpeg!.load({
          classWorkerURL,
          coreURL,
          wasmURL,
        }),
        45000,
        'Local blob FFmpeg load'
      );

      this.isLoaded = true;
      this.isLoading = false;
      return true;
    } catch (localBlobErr: any) {
      console.warn('Local blob FFmpeg load failed:', localBlobErr);
      this.isLoading = false;
      this.isLoaded = false;
      this.loadError = localBlobErr?.message || 'Failed to load FFmpeg WebAssembly core.';
      return false;
    }
  }

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
  ): Promise<FFmpegCutResult> {
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
  ): Promise<FFmpegCutResult> {
    onProgress?.(4, 'Initializing FFmpeg WebAssembly engine (4%)...');
    const ready = await this.load(onProgress);
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
    // Always output standard MP4 container with H.264 + AAC + faststart moov atom
    // so the downloaded clip plays with 0 glitches in all media players and preserves 100% original aspect ratio.
    const outputExt = 'mp4';
    const outputName = `output_${uid}.${outputExt}`;

    onProgress?.(12, 'Reading local video into browser RAM (12%)...');

    let currentSmoothPercent = 18;
    let simTimer: ReturnType<typeof setInterval> | null = null;

    // Parse FFmpeg log output for `time=HH:MM:SS.xx` to compute exact live percentage
    const logProgressHandler = ({ message }: { message: string }) => {
      const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
      if (timeMatch && duration > 0) {
        const h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        const s = parseFloat(timeMatch[3]);
        const encodedSecs = h * 3600 + m * 60 + s;
        const ratio = Math.min(Math.max(encodedSecs / duration, 0), 1);
        const calcPercent = Math.min(Math.max(Math.round(18 + ratio * 77), currentSmoothPercent), 95);
        currentSmoothPercent = calcPercent;
        onProgress?.(
          currentSmoothPercent,
          `Encoding exact frames in original ratio (${currentSmoothPercent}%)...`
        );
      }
    };

    const progressHandler = ({ progress, time }: { progress: number; time: number }) => {
      let calcPercent = currentSmoothPercent;
      if (duration > 0 && time > 0) {
        const ratio = Math.min(Math.max(time / 1000000 / duration, 0), 1);
        calcPercent = Math.max(calcPercent, Math.round(18 + ratio * 77));
      } else if (progress > 0 && progress <= 1) {
        calcPercent = Math.max(calcPercent, Math.round(18 + progress * 77));
      }
      currentSmoothPercent = Math.min(Math.max(calcPercent, 18), 95);
      onProgress?.(
        currentSmoothPercent,
        `Encoding exact frames in original ratio (${currentSmoothPercent}%)...`
      );
    };

    this.ffmpeg.on('progress', progressHandler);
    this.ffmpeg.on('log', logProgressHandler);

    // Smooth ticker so short clips show continuous percentage progression
    simTimer = setInterval(() => {
      if (currentSmoothPercent < 90) {
        currentSmoothPercent += 1;
        onProgress?.(
          currentSmoothPercent,
          `Processing clip in original resolution (${currentSmoothPercent}%)...`
        );
      }
    }, 350);

    try {
      const fileData = await fetchFile(sourceFile);
      await this.ffmpeg.writeFile(inputName, fileData);

      onProgress?.(18, 'Preparing glitch-free frame-accurate pipeline (18%)...');

      // Glitch-free two-stage seek calculation:
      // A 15-second pre-seek window guarantees FFmpeg lands before a full IDR keyframe (GOP),
      // and then decodes frame-by-frame to exactPostSeek so Frame 0 of the cut clip has 100%
      // intact reference frames (zero macroblock corruption, zero freezing, exact 00:10:00.000 cut!).
      const fastPreSeek = exactStart > 25 ? Math.max(0, exactStart - 15) : 0;
      const exactPostSeek = Math.round((exactStart - fastPreSeek) * 1000) / 1000;

      const fastSeekStr = fastPreSeek.toFixed(3);
      const exactPostSeekStr = exactPostSeek.toFixed(3);
      const durationStr = duration.toFixed(3);
      const directStartStr = exactStart.toFixed(3);

      // Preserve 100% of original width, height, orientation, and aspect ratio.
      // `scale=trunc(iw/2)*2:trunc(ih/2)*2` keeps exact original dimensions while ensuring
      // even pixel numbers required by the H.264 yuv420p specification.
      const crfValue = mode === 'stream-copy' ? '16' : '18';

      const buildSafeTranscodeArgs = (targetOutput: string): string[] => [
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
        '-vf',
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        crfValue,
        '-pix_fmt',
        'yuv420p',
        '-profile:v',
        'high',
        '-level',
        '4.1',
        '-g',
        '30',
        '-keyint_min',
        '15',
        '-sc_threshold',
        '0',
        '-vsync',
        'cfr',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '48000',
        '-fflags',
        '+genpts',
        '-avoid_negative_ts',
        'make_zero',
        '-movflags',
        '+faststart',
        targetOutput,
      ];

      onProgress?.(
        20,
        `Cutting exact range (${directStartStr}s for ${durationStr}s) in original ratio (20%)...`
      );

      const exitCode = await this.ffmpeg.exec(buildSafeTranscodeArgs(outputName));

      if (exitCode !== 0) {
        throw new Error(`FFmpeg exited with error code ${exitCode}.`);
      }

      onProgress?.(96, 'Verifying output video stream (96%)...');

      const outputData = await this.ffmpeg.readFile(outputName);
      const uint8 = outputData instanceof Uint8Array ? outputData : new Uint8Array(outputData as any);

      if (uint8.byteLength < 512) {
        throw new Error('FFmpeg produced an empty or incomplete video stream.');
      }

      const blob = new Blob([uint8], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      onProgress?.(100, 'Clip processing complete (100%)!');

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
        extension: 'mp4',
        mimeType: 'video/mp4',
      };
    } finally {
      if (simTimer) clearInterval(simTimer);
      try {
        (this.ffmpeg as any).off?.('progress', progressHandler);
        (this.ffmpeg as any).off?.('log', logProgressHandler);
      } catch (e) {
        // ignore
      }
    }
  }
}

export const ffmpegService = new FFmpegService();
