/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates an authentic local video file right in the browser using Canvas & Web Audio.
 * Perfect for immediate testing when users don't have a video file on hand.
 */
export async function generateSampleVideoFile(durationSeconds = 12): Promise<File> {
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

      // Audio setup
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const audioDest = audioCtx.createMediaStreamDestination();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // 440 Hz standard concert A
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime); // gentle volume
      osc.connect(gain);
      gain.connect(audioDest);
      osc.start();

      const canvasStream = canvas.captureStream(30);
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ];
      const stream = new MediaStream(combinedTracks);

      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType) && MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 });
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
        const hue = Math.floor((elapsed * 30) % 360);
        ctx.fillStyle = `hsl(${hue}, 45%, 15%)`;
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

        // Animated circles
        ctx.fillStyle = '#E32636';
        const circleX = width / 2 + Math.sin(elapsed * 2) * 200;
        const circleY = height / 2 + Math.cos(elapsed * 2) * 60;
        ctx.beginPath();
        ctx.arc(circleX, circleY, 32, 0, Math.PI * 2);
        ctx.fill();

        // Branding
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AI Clipper Demo Video', width / 2, height / 2 - 40);

        // Timer
        const currentSecs = elapsed.toFixed(2);
        ctx.font = '500 24px "JetBrains Mono", monospace';
        ctx.fillStyle = '#E4E4E7';
        ctx.fillText(`Time: 00:00:${currentSecs.padStart(5, '0')} / 00:00:${durationSeconds.toString().padStart(2, '0')}.00`, width / 2, height / 2 + 20);

        ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#A1A1AA';
        ctx.fillText('1280 × 720 · 30 FPS · 440Hz Stereo Audio Track', width / 2, height / 2 + 65);

        // Beep frequency modulation
        if (Math.floor(elapsed) !== Math.floor(elapsed - 0.03)) {
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          setTimeout(() => {
            try {
              osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            } catch {}
          }, 80);
        }

        animId = requestAnimationFrame(draw);
      };

      recorder.onstop = () => {
        cancelAnimationFrame(animId);
        try {
          osc.stop();
          audioCtx.close();
        } catch {}

        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: mimeType });
        const file = new File([blob], `sample_test_video.${extension}`, { type: mimeType });
        resolve(file);
      };

      recorder.start(100);
      draw();
    } catch (err) {
      reject(err);
    }
  });
}
