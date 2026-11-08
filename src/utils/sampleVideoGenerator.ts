/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates an authentic local video file right in the browser using Canvas & Web Audio.
 * Perfect for immediate testing when users don't have a video file on hand.
 */
export async function generateSampleVideoFile(durationSeconds = 3): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      const width = 1280;
      const height = 720;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Canvas context unavailable'));
      }

      // Audio setup (wrapped in try/catch in case browser blocks AudioContext)
      let audioCtx: AudioContext | null = null;
      let osc: OscillatorNode | null = null;
      const combinedTracks: MediaStreamTrack[] = [];

      const canvasStream = canvas.captureStream(30);
      combinedTracks.push(...canvasStream.getVideoTracks());

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const audioDest = audioCtx.createMediaStreamDestination();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioDest);
          osc.start();
          combinedTracks.push(...audioDest.stream.getAudioTracks());
        }
      } catch (audioErr) {
        console.warn('Sample audio track skipped:', audioErr);
      }

      const stream = new MediaStream(combinedTracks);

      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType) && MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3500000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const startTime = performance.now();
      let animId: number;

      const draw = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed >= durationSeconds) {
          if (recorder.state === 'recording') recorder.stop();
          return;
        }

        // Draw dynamic background
        const hue = Math.floor((elapsed * 60) % 360);
        ctx.fillStyle = `hsl(${hue}, 45%, 14%)`;
        ctx.fillRect(0, 0, width, height);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 80) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 80) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Animated circle
        ctx.fillStyle = '#E32636';
        const circleX = width / 2 + Math.sin(elapsed * 3) * 220;
        const circleY = height / 2 + Math.cos(elapsed * 3) * 70;
        ctx.beginPath();
        ctx.arc(circleX, circleY, 34, 0, Math.PI * 2);
        ctx.fill();

        // Branding
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 38px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AI Clipper Master Test Pattern', width / 2, height / 2 - 40);

        // Timer
        const currentSecs = elapsed.toFixed(3);
        ctx.font = '600 28px "JetBrains Mono", monospace';
        ctx.fillStyle = '#E4E4E7';
        ctx.fillText(`Timecode: 00:00:0${currentSecs}`, width / 2, height / 2 + 20);

        ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#A1A1AA';
        ctx.fillText('1280 × 720 · 30 FPS · Frame-Accurate Calibration Source', width / 2, height / 2 + 65);

        animId = requestAnimationFrame(draw);
      };

      recorder.onstop = () => {
        cancelAnimationFrame(animId);
        try {
          osc?.stop();
          audioCtx?.close();
        } catch {}

        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: mimeType });
        const file = new File([blob], `sample_studio_video.${extension}`, { type: mimeType });
        (file as any).__knownDuration = durationSeconds;
        resolve(file);
      };

      recorder.start(50);
      draw();
    } catch (err) {
      reject(err);
    }
  });
}
