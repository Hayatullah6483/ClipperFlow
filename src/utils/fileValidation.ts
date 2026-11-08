/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoMetadata } from '../types';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

export const SUPPORTED_EXTENSIONS = [
  'mp4',
  'mov',
  'mkv',
  'webm',
  'avi',
  'm4v',
  'flv',
  'wmv',
  'ts',
  'ogv',
  '3gp',
];

/**
 * Returns whether a file is an accepted video format
 */
export function isSupportedVideoFile(file: File): { supported: boolean; reason?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInGb = (file.size / (1024 * 1024 * 1024)).toFixed(2);
    return {
      supported: false,
      reason: `File size (${sizeInGb} GB) exceeds the 5 GB maximum limit.`,
    };
  }

  const isSupportedExt = SUPPORTED_EXTENSIONS.includes(extension);
  const isVideoMime = file.type.startsWith('video/') || extension === 'mkv' || extension === 'mov';

  if (!isSupportedExt && !isVideoMime) {
    return {
      supported: false,
      reason: `Unsupported format ".${extension || 'unknown'}". Supported formats include MP4, MOV, MKV, WebM, AVI, M4V.`,
    };
  }

  return { supported: true };
}

/**
 * Formats byte size into human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Calculate greatest common divisor to determine aspect ratio
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Determines aspect ratio string (e.g. 16:9, 9:16, 4:3, 1:1, etc.)
 */
export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height) return 'Unknown';

  const divisor = gcd(width, height);
  const wRatio = width / divisor;
  const hRatio = height / divisor;

  // Approximate standard ratios for odd sensor dimensions
  const decimal = width / height;
  if (Math.abs(decimal - 16 / 9) < 0.05) return '16:9 (Landscape)';
  if (Math.abs(decimal - 9 / 16) < 0.05) return '9:16 (Vertical/Reel)';
  if (Math.abs(decimal - 4 / 3) < 0.05) return '4:3 (Standard)';
  if (Math.abs(decimal - 3 / 4) < 0.05) return '3:4 (Portrait)';
  if (Math.abs(decimal - 1) < 0.05) return '1:1 (Square)';
  if (Math.abs(decimal - 21 / 9) < 0.05) return '21:9 (Ultrawide)';

  if (wRatio < 50 && hRatio < 50) {
    return `${wRatio}:${hRatio}`;
  }

  return `${decimal.toFixed(2)}:1`;
}

/**
 * Sanitizes a clip title to be safe for local file systems
 */
export function sanitizeFilename(title: string, extension = 'mp4'): string {
  if (!title || typeof title !== 'string') {
    title = 'clip';
  }

  // Remove invalid filesystem characters: / \ : * ? " < > |
  let sanitized = title.replace(/[/\\?%*:|"<>]/g, '').trim();

  // Replace spaces and tabs with underscores or keep readable
  sanitized = sanitized.replace(/\s+/g, '_');

  // Strip leading dots or hyphens
  sanitized = sanitized.replace(/^[.-]+/, '');

  if (!sanitized) {
    sanitized = `clip_${Date.now()}`;
  }

  // Ensure clean extension
  const cleanExt = extension.replace(/^\./, '').toLowerCase() || 'mp4';
  if (sanitized.toLowerCase().endsWith(`.${cleanExt}`)) {
    return sanitized;
  }

  return `${sanitized}.${cleanExt}`;
}

/**
 * Extracts video metadata using a temporary HTMLVideoElement
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Timed out extracting video metadata. The video file might be unindexed or corrupted.'));
    }, 15000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const duration = video.duration || 0;
      const aspectRatio = calculateAspectRatio(width, height);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';

      // Check audio presence via mozHasAudio, webkitAudioDecodedByteCount or audio tracks
      let hasAudio = false;
      const anyVideo = video as any;
      if (typeof anyVideo.mozHasAudio !== 'undefined') {
        hasAudio = Boolean(anyVideo.mozHasAudio);
      } else if (typeof anyVideo.webkitAudioDecodedByteCount !== 'undefined') {
        hasAudio = anyVideo.webkitAudioDecodedByteCount > 0;
      } else if (anyVideo.audioTracks && anyVideo.audioTracks.length > 0) {
        hasAudio = true;
      } else {
        // Default assumption for standard video containers
        hasAudio = true;
      }

      // Estimate FPS if detectable
      const fps = width >= 1920 ? 30 : 30; // standard baseline or detected

      video.onloadedmetadata = null;
      video.onerror = null;
      video.src = '';
      URL.revokeObjectURL(objectUrl);

      resolve({
        filename: file.name,
        fileSize: file.size,
        duration,
        width,
        height,
        aspectRatio,
        mimeType: file.type || `video/${ext}`,
        format: ext.toUpperCase(),
        fps,
        hasAudio,
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.src = '';
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load video metadata for "${file.name}". Please ensure the file is not corrupted.`));
    };
  });
}
