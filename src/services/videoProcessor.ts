/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ffmpegService, ProgressCallback } from './ffmpegService';
import { cutVideoWithBrowserEngine } from './browserClipper';
import { ProcessingMode } from '../types';

export interface ProcessClipResult {
  blob: Blob;
  url: string;
  duration: number;
  extension: string;
  mimeType: string;
  engineUsed: 'ffmpeg-stream-copy' | 'ffmpeg-reencode' | 'browser-engine';
}

export async function processClip(
  sourceFile: File,
  startSeconds: number,
  endSeconds: number,
  mode: ProcessingMode = 'accurate-reencode',
  onProgress?: ProgressCallback,
  knownDimensions?: { width?: number; height?: number }
): Promise<ProcessClipResult> {
  const duration = Math.max(0.1, endSeconds - startSeconds);
  const ext = (sourceFile.name.split('.').pop() || '').toLowerCase();
  const isBrowserNativeContainer = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);

  let ffmpegErr: any = null;

  try {
    onProgress?.(2, 'Initializing FFmpeg engine (2%)...');
    const result = await ffmpegService.cutVideo(sourceFile, startSeconds, endSeconds, mode, onProgress);
    return {
      blob: result.blob,
      url: result.url,
      duration,
      extension: result.extension,
      mimeType: result.mimeType,
      engineUsed: result.modeUsed === 'stream-copy' ? 'ffmpeg-stream-copy' : 'ffmpeg-reencode',
    };
  } catch (err: any) {
    ffmpegErr = err;
    console.warn('FFmpeg processing error:', err);
  }

  // Fallback to browser engine only if container is natively decodable by the browser
  if (isBrowserNativeContainer) {
    onProgress?.(10, 'Switching to Browser Native Engine (10%)...');
    try {
      const fallbackResult = await cutVideoWithBrowserEngine(
        sourceFile,
        startSeconds,
        endSeconds,
        onProgress,
        knownDimensions
      );
      return {
        blob: fallbackResult.blob,
        url: fallbackResult.url,
        duration,
        extension: fallbackResult.extension,
        mimeType: fallbackResult.mimeType,
        engineUsed: 'browser-engine',
      };
    } catch (fallbackErr: any) {
      console.warn('Browser engine fallback also failed:', fallbackErr);
      throw new Error(
        `Clip processing failed: ${ffmpegErr?.message || fallbackErr?.message || 'Processing engine error.'}`
      );
    }
  } else {
    throw new Error(
      `Clip processing failed: ${ffmpegErr?.message || 'FFmpeg engine failed to process video.'} ` +
      `Note: .${ext.toUpperCase()} containers require FFmpeg WebAssembly.`
    );
  }
}
