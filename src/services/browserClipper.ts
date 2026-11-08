/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProgressCallback } from './ffmpegService';

/**
 * High-performance browser-native video cutter using HTML5 Canvas & MediaRecorder.
 * 100% client-side, zero external dependencies, hardware accelerated.
 */
export async function cutVideoWithBrowserEngine(
  sourceFile: File,
  startSeconds: number,
  endSeconds: number,
  onProgress?: ProgressCallback
): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    let objectUrl = '';
    let video: HTMLVideoElement | null = null;
    let recorder: MediaRecorder | null = null;
    let audioCtx: AudioContext | null = null;
    let animFrameId: number | null = null;
    let isTerminated = false;

    const cleanup = () => {
      isTerminated = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
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
      if (audioCtx) {
        audioCtx.close().catch(() => {});
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
      // Muted is essential to satisfy browser autoplay restrictions without user gestures
      video.muted = true;

      onProgress?.(5, 'Initializing browser media engine...');

      const loadTimeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out waiting for video to load in browser engine.'));
      }, 15000);

      const onVideoReady = async () => {
        clearTimeout(loadTimeout);
        if (isTerminated || !video) return;

        try {
          const width = video.videoWidth || 1280;
          const height = video.videoHeight || 720;
          const duration = Math.max(0.1, endSeconds - startSeconds);

          onProgress?.(15, `Seeking to start frame (${startSeconds.toFixed(2)}s)...`);

          // Seek to start position
          video.currentTime = Math.max(0, startSeconds);

          await new Promise<void>((seekResolve) => {
            if (!video) return seekResolve();
            const onSeeked = () => {
              video?.removeEventListener('seeked', onSeeked);
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked);
            // Safety timeout for seek
            setTimeout(seekResolve, 2000);
          });

          // Canvas for frame extraction
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });

          if (!ctx) {
            cleanup();
            return reject(new Error('Could not create Canvas 2D context.'));
          }

          // Video stream at 30 fps
          const canvasStream = canvas.captureStream(30);
          const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

          // Attempt audio track capture via Web Audio (graceful fallback if unsupported/silent)
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              audioCtx = new AudioContextClass();
              // Unmute video internally for audio node capture while keeping element muted on speakers
              const unmutedVideo = video;
              unmutedVideo.muted = false;
              const sourceNode = audioCtx.createMediaElementSource(unmutedVideo);
              const audioDest = audioCtx.createMediaStreamDestination();
              sourceNode.connect(audioDest);

              // Keep silent locally so user doesn't hear high-speed scrubbing
              const silentGain = audioCtx.createGain();
              silentGain.gain.value = 0;
              sourceNode.connect(silentGain);
              silentGain.connect(audioCtx.destination);

              audioDest.stream.getAudioTracks().forEach((t) => tracks.push(t));
              await audioCtx.resume();
            }
          } catch (audioErr) {
            console.warn('Audio capture fallback (video will render without audio):', audioErr);
            if (video) video.muted = true;
          }

          const combinedStream = new MediaStream(tracks);

          // Find supported mime type
          let selectedMimeType = 'video/webm;codecs=vp9,opus';
          if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
            selectedMimeType = 'video/webm;codecs=vp8,opus';
          }
          if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
            selectedMimeType = 'video/webm';
          }
          if (!MediaRecorder.isTypeSupported(selectedMimeType) && MediaRecorder.isTypeSupported('video/mp4')) {
            selectedMimeType = 'video/mp4';
          }

          const videoBitsPerSecond = width * height >= 1920 * 1080 ? 12000000 : 8000000;
          recorder = new MediaRecorder(combinedStream, {
            mimeType: selectedMimeType,
            videoBitsPerSecond,
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: selectedMimeType });
            const url = URL.createObjectURL(blob);
            cleanup();
            onProgress?.(100, 'Clip rendered successfully!');
            resolve({ blob, url });
          };

          recorder.onerror = (e) => {
            cleanup();
            reject(new Error(`MediaRecorder failed: ${e}`));
          };

          // Frame draw loop
          const drawFrame = () => {
            if (isTerminated || !video) return;

            if (video.ended || video.currentTime >= endSeconds) {
              if (recorder && recorder.state === 'recording') {
                recorder.stop();
              }
              return;
            }

            ctx.drawImage(video, 0, 0, width, height);

            const elapsed = Math.max(0, video.currentTime - startSeconds);
            const ratio = Math.min(Math.max(elapsed / duration, 0), 1);
            const percent = Math.min(Math.round(20 + ratio * 75), 96);
            onProgress?.(percent, `Rendering video frames (${percent}%)...`);

            animFrameId = requestAnimationFrame(drawFrame);
          };

          recorder.start(100);
          await video.play().catch(() => {
            // If play rejected, ensure muted and retry
            if (video) {
              video.muted = true;
              return video.play();
            }
          });

          drawFrame();

          video.ontimeupdate = () => {
            if (video && video.currentTime >= endSeconds) {
              video.pause();
              if (recorder && recorder.state === 'recording') {
                recorder.stop();
              }
            }
          };

          video.onended = () => {
            if (recorder && recorder.state === 'recording') {
              recorder.stop();
            }
          };
        } catch (innerErr) {
          cleanup();
          reject(innerErr);
        }
      };

      video.onloadedmetadata = () => onVideoReady();
      video.onerror = () => {
        clearTimeout(loadTimeout);
        const err = video?.error;
        const detail = err ? `(Code ${err.code}: ${err.message || 'decode error'})` : '';
        cleanup();
        reject(new Error(`Browser could not decode the source video container ${detail}`.trim()));
      };

      // Set source after listeners are attached
      video.src = objectUrl;

      if (video.readyState >= 1) {
        onVideoReady();
      }
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}
