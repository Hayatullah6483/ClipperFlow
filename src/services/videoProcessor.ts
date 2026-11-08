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
  engineUsed: 'ffmpeg-stream-copy' | 'ffmpeg-reencode' | 'browser-engine';
}

export async function processClip(
  sourceFile: File,
  startSeconds: number,
  endSeconds: number,
  mode: ProcessingMode = 'accurate-reencode',
  onProgress?: ProgressCallback
): Promise<ProcessClipResult> {
  const duration = Math.max(0.1, endSeconds - startSeconds);
  const ext = (sourceFile.name.split('.').pop() || '').toLowerCase();
  const isBrowserNativeContainer = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);

  let ffmpegErr: any = null;

  try {
    onProgress?.(2, 'Initializing FFmpeg engine...');
    const result = await ffmpegService.cutVideo(sourceFile, startSeconds, endSeconds, mode, onProgress);
    return {
      blob: result.blob,
      url: result.url,
      duration,
      engineUsed: result.modeUsed === 'stream-copy' ? 'ffmpeg-stream-copy' : 'ffmpeg-reencode',
    };
  } catch (err: any) {
    ffmpegErr = err;
    console.warn('FFmpeg processing error:', err);
  }

  // If FFmpeg fails, can we use browser canvas + MediaRecorder fallback?
  // Only attempt browser engine if container is natively supported by the browser
  if (isBrowserNativeContainer) {
    onProgress?.(10, 'Switching to Browser Native Engine...');
    try {
      const fallbackResult = await cutVideoWithBrowserEngine(sourceFile, startSeconds, endSeconds, onProgress);
      return {
        blob: fallbackResult.blob,
        url: fallbackResult.url,
        duration,
        engineUsed: 'browser-engine',
      };
    } catch (fallbackErr: any) {
      console.warn('Browser engine fallback also failed:', fallbackErr);
      throw new Error(
        `Clip processing failed: ${ffmpegErr?.message || fallbackErr?.message || 'Processing engine error.'}`
      );
    }
  } else {
    // Non-native containers (MKV, AVI, FLV, WMV) require FFmpeg WebAssembly
    throw new Error(
      `Clip processing failed: ${ffmpegErr?.message || 'FFmpeg engine failed to process video.'} ` +
      `Note: .${ext.toUpperCase()} containers require FFmpeg WebAssembly.`
    );
  }
}

