/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, AlertCircle, Film } from 'lucide-react';
import { formatSecondsToTime } from '../utils/timeFormat';

interface LiveClipPlayerProps {
  sourceUrl?: string;
  startTime: number;
  endTime: number;
  autoPlay?: boolean;
  className?: string;
  onTimeUpdate?: (currentClipRelativeTime: number) => void;
}

export const LiveClipPlayer: React.FC<LiveClipPlayerProps> = ({
  sourceUrl,
  startTime,
  endTime,
  autoPlay = false,
  className = '',
  onTimeUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [isLooping, setIsLooping] = useState(true);
  const [hasError, setHasError] = useState(false);

  const duration = Math.max(0.1, endTime - startTime);

  // Set initial time to startTime
  useEffect(() => {
    setHasError(false);
    if (sourceUrl && videoRef.current) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
      if (autoPlay) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [startTime, endTime, sourceUrl]);

  if (!sourceUrl) {
    return (
      <div className={`aspect-video w-full bg-zinc-950 rounded-lg flex flex-col items-center justify-center p-4 text-center border border-zinc-800 ${className}`}>
        <Film className="w-8 h-8 text-zinc-600 mb-2" />
        <p className="text-xs font-semibold text-zinc-300">Video Source Not Loaded</p>
        <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
          Please upload or re-link your video to preview this clip.
        </p>
      </div>
    );
  }

  const togglePlay = () => {
    if (!videoRef.current || hasError) return;
    if (videoRef.current.paused) {
      if (videoRef.current.currentTime >= endTime - 0.05 || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    onTimeUpdate?.(curr - startTime);

    if (curr >= endTime) {
      if (isLooping) {
        videoRef.current.currentTime = startTime;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = startTime;
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const relativeTime = parseFloat(e.target.value);
    const absoluteTime = startTime + relativeTime;
    setCurrentTime(absoluteTime);
    if (videoRef.current) {
      videoRef.current.currentTime = absoluteTime;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    videoRef.current.muted = next;
  };

  const elapsedClip = Math.max(0, Math.min(duration, currentTime - startTime));

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden flex flex-col group ${className}`}>
      {/* Video Viewport */}
      <div
        className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center cursor-pointer select-none"
        onClick={togglePlay}
      >
        {hasError ? (
          <div className="flex flex-col items-center justify-center p-4 text-center text-zinc-400 text-xs">
            <AlertCircle className="w-6 h-6 text-red-500 mb-1.5" />
            <p className="font-semibold text-zinc-200">Video source expired or unavailable</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Please re-select the source video to preview</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={sourceUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setHasError(true)}
              playsInline
              muted={isMuted}
            />

            {!isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity">
                <div className="w-10 h-10 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center shadow-md transform hover:scale-110 transition-transform pl-0.5">
                  <Play className="w-5 h-5 fill-zinc-900" />
                </div>
              </div>
            )}

            {/* Live Segment Badge */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-white flex items-center gap-1 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E32636] animate-pulse"></span>
              <span>LIVE PREVIEW</span>
            </div>
          </>
        )}
      </div>

      {/* Mini Scrubber & Controls */}
      {!hasError && (
        <div className="bg-zinc-900 px-3 py-2 text-white border-t border-zinc-800">
          <div className="flex items-center gap-2 mb-1.5">
            <input
              type="range"
              min={0}
              max={duration}
              step={0.01}
              value={elapsedClip}
              onChange={handleSeek}
              className="w-full h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-[#E32636]"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>

              <button
                onClick={toggleMute}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <span className="font-mono text-[11px] text-zinc-300 tabular-nums">
                {formatSecondsToTime(elapsedClip, true)} / {formatSecondsToTime(duration, true)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-1 rounded text-[10px] font-mono transition-colors flex items-center gap-0.5 ${
                  isLooping ? 'text-[#E32636] bg-red-950/40' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={isLooping ? 'Looping enabled' : 'Looping disabled'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>LOOP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
