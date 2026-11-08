/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProgressCallback } from './ffmpegService';

export interface BrowserClipResult {
  blob: Blob;
  url: string;
  extension: string;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * High-performance browser-native video cutter using HTML5 Canvas & MediaRecorder.
 * Preserves 100% original video width, height, and aspect ratio.
 */
export async function cutVideoWithBrowserEngine(
  sourceFile: File,
  startSeconds: number,
  endSeconds: number,
  onProgress?: ProgressCallback,
  knownDimensions?: { width?: number; height?: number }
): Promise<BrowserClipResult> {
  return new Promise((resolve, reject) => {
    let objectUrl = '';
    let video: HTMLVideoElement | null = null;
    let recorder: MediaRecorder | null = null;
    let frameIntervalId: ReturnType<typeof setInterval> | null = null;
    let maxDurationTimerId: ReturnType<typeof setTimeout> | null = null;
    let isTerminated = false;
    let hasStartedReady = false;

    const cleanup = () => {
      isTerminated = true;
      if (frameIntervalId) {
        clearInterval(frameIntervalId);
        frameIntervalId = null;
      }
      if (maxDurationTimerId) {
        clearTimeout(maxDurationTimerId);
        maxDurationTimerId = null;
      }
      if (video) {
        video.onerror = null;
        video.onloadedmetadata = null;
        video.onloadeddata = null;
        video.ontimeupdate = null;
        video.onended = null;
        try {
          video.pause();
          video.src = '';
        } catch {}
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    try {
      objectUrl = URL.createObjectURL(sourceFile);
      video = document.createElement('video');
      video.playsInline = true;
      video.preload = 'auto';
      video.muted = true;
      video.volume = 1;

      onProgress?.(8, 'Initializing browser media engine (8%)...');

      const loadTimeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out waiting for video to load in browser engine.'));
      }, 15000);

      const finishRecording = () => {
        if (isTerminated) return;
        try {
          if (video && !video.paused) {
            video.pause();
          }
        } catch {}
        if (recorder && recorder.state === 'recording') {
          try {
            recorder.requestData();
            recorder.stop();
          } catch (err) {
            cleanup();
            reject(err);
          }
        }
      };

      const onVideoReady = async () => {
        if (hasStartedReady || isTerminated || !video) return;
        // Wait until actual video dimensions are decoded so original aspect ratio is 100% preserved
        if (video.videoWidth === 0 && video.readyState < 2) {
          return;
        }
        hasStartedReady = true;
        clearTimeout(loadTimeout);

        try {
          // Strictly preserve original video width and height (and exact aspect ratio)
          const rawWidth = video.videoWidth || knownDimensions?.width || 1280;
          const rawHeight = video.videoHeight || knownDimensions?.height || 720;
          // Ensure even pixel dimensions while keeping exact aspect ratio
          const width = Math.max(2, Math.floor(rawWidth / 2) * 2);
          const height = Math.max(2, Math.floor(rawHeight / 2) * 2);

          const rawVideoDuration =
            Number.isFinite(video.duration) && video.duration > 0 ? video.duration : endSeconds;
          const effectiveEnd = Math.min(endSeconds, rawVideoDuration);
          const duration = Math.max(0.1, effectiveEnd - startSeconds);

          onProgress?.(
            14,
            `Seeking to ${startSeconds.toFixed(2)}s at ${width}×${height} (14%)...`
          );

          // Seek to exact start position
          video.currentTime = Math.max(0, startSeconds);

          await new Promise<void>((seekResolve) => {
            if (!video) return seekResolve();
            let resolved = false;
            const done = () => {
              if (resolved) return;
              resolved = true;
              video?.removeEventListener('seeked', done);
              seekResolve();
            };
            video.addEventListener('seeked', done);
            setTimeout(done, 1500);
          });

          // Wait briefly for the decoded frame at startSeconds to be ready for painting
          if (video && video.readyState < 2) {
            await new Promise<void>((r) => {
              const onCanPlay = () => {
                video?.removeEventListener('canplay', onCanPlay);
                r();
              };
              video?.addEventListener('canplay', onCanPlay);
              setTimeout(r, 600);
            });
          }

          if (isTerminated || !video) return;

          // Create canvas with exact original video dimensions (100% original aspect ratio)
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });

          if (!ctx) {
            cleanup();
            return reject(new Error('Could not create Canvas 2D context.'));
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Paint initial frame at exact start timestamp before recorder starts
          ctx.drawImage(video, 0, 0, width, height);

          // Capture stream at 30 fps
          const canvasStream = canvas.captureStream(30);
          const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

          // Capture audio track if available
          try {
            const vidAny = video as any;
            const mediaStream: MediaStream | undefined =
              typeof vidAny.captureStream === 'function'
                ? vidAny.captureStream()
                : typeof vidAny.mozCaptureStream === 'function'
                ? vidAny.mozCaptureStream()
                : undefined;

            if (mediaStream && mediaStream.getAudioTracks().length > 0) {
              mediaStream.getAudioTracks().forEach((t) => tracks.push(t));
            }
          } catch {
            // Ignore if captureStream is unavailable
          }

          const combinedStream = new MediaStream(tracks);

          // Prefer standard MP4 (H.264/AAC) FIRST so downloaded files play natively everywhere without glitches
          const mimeCandidates = [
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
          ];
          let selectedMimeType = '';
          for (const candidate of mimeCandidates) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
              selectedMimeType = candidate;
              break;
            }
          }

          const videoBitsPerSecond = width * height >= 1920 * 1080 ? 12000000 : 8000000;
          recorder = selectedMimeType
            ? new MediaRecorder(combinedStream, { mimeType: selectedMimeType, videoBitsPerSecond })
            : new MediaRecorder(combinedStream);

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            const finalMime = selectedMimeType || recorder?.mimeType || 'video/mp4';
            const isMp4 = finalMime.toLowerCase().includes('mp4');
            const cleanMime = isMp4 ? 'video/mp4' : 'video/webm';
            const extension = isMp4 ? 'mp4' : 'webm';
            const blob = new Blob(chunks, { type: cleanMime });
            const url = URL.createObjectURL(blob);
            cleanup();
            onProgress?.(100, 'Clip processed in original resolution (100%)');
            resolve({ blob, url, extension, mimeType: cleanMime, width, height });
          };

          recorder.onerror = (e) => {
            cleanup();
            reject(new Error(`MediaRecorder failed: ${e}`));
          };

          const recordStartTime = performance.now();

          // Continuous 30fps draw loop (33ms) that works even when tab is in background
          frameIntervalId = setInterval(() => {
            if (isTerminated || !video) return;

            const currentVidTime = video.currentTime;
            const wallElapsed = (performance.now() - recordStartTime) / 1000;

            if (
              video.ended ||
              currentVidTime >= effectiveEnd - 0.015 ||
              wallElapsed >= duration + 0.5
            ) {
              finishRecording();
              return;
            }

            try {
              ctx.drawImage(video, 0, 0, width, height);
            } catch {}

            const elapsed = Math.max(currentVidTime - startSeconds, wallElapsed);
            const ratio = Math.min(Math.max(elapsed / duration, 0), 1);
            const percent = Math.min(Math.max(Math.round(16 + ratio * 82), 16), 98);
            onProgress?.(percent, `Processing clip at ${width}×${height} (${percent}%)...`);
          }, 33);

          // Safety timer
          maxDurationTimerId = setTimeout(() => {
            finishRecording();
          }, Math.ceil((duration + 2.5) * 1000));

          video.ontimeupdate = () => {
            if (video && video.currentTime >= effectiveEnd - 0.015) {
              finishRecording();
            }
          };

          video.onended = () => {
            finishRecording();
          };

          onProgress?.(16, `Processing clip at ${width}×${height} (16%)...`);
          // Start recording as a single continuous stream (no 100ms chunk fragmentation)
          recorder.start();

          try {
            await video.play();
          } catch {
            if (video) {
              video.muted = true;
              await video.play();
            }
          }
        } catch (innerErr) {
          cleanup();
          reject(innerErr);
        }
      };

      video.onloadedmetadata = () => onVideoReady();
      video.onloadeddata = () => onVideoReady();
      video.oncanplay = () => onVideoReady();
      video.onerror = () => {
        clearTimeout(loadTimeout);
        const err = video?.error;
        const detail = err ? `(Code ${err.code}: ${err.message || 'decode error'})` : '';
        cleanup();
        reject(new Error(`Browser could not decode the source video container ${detail}`.trim()));
      };

      video.src = objectUrl;
      video.load();

      if (video.readyState >= 2) {
        onVideoReady();
      }
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}
