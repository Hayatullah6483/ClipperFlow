/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  BookmarkPlus,
  RotateCcw,
} from 'lucide-react';
import { formatSecondsToTime } from '../utils/timeFormat';

interface VideoPlayerProps {
  videoUrl: string;
  duration: number;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onSetStartTime?: (time: number) => void;
  onSetEndTime?: (time: number) => void;
  highlightRange?: { start: number; end: number };
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  duration,
  currentTime,
  onTimeUpdate,
  onSetStartTime,
  onSetEndTime,
  highlightRange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);

  // Sync external seek with video element
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    onTimeUpdate(videoRef.current.currentTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    onTimeUpdate(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.warn('Fullscreen failed:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.warn('Exit fullscreen failed:', err);
      }
    }
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    // Approx 30fps -> ~0.0333s per frame
    const delta = frames * (1 / 30);
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = newTime;
    onTimeUpdate(newTime);
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    onTimeUpdate(newTime);
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(e.shiftKey ? -5 : -1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(e.shiftKey ? 5 : 1);
      } else if (e.key === '[' && onSetStartTime) {
        e.preventDefault();
        if (videoRef.current) onSetStartTime(videoRef.current.currentTime);
      } else if (e.key === ']' && onSetEndTime) {
        e.preventDefault();
        if (videoRef.current) onSetEndTime(videoRef.current.currentTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, onSetStartTime, onSetEndTime]);

  // Calculate highlighted clip segment percentage
  const highlightLeft =
    highlightRange && duration > 0 ? (highlightRange.start / duration) * 100 : 0;
  const highlightWidth =
    highlightRange && duration > 0
      ? Math.max(0, ((highlightRange.end - highlightRange.start) / duration) * 100)
      : 0;

  if (!videoUrl) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden shadow-sm flex flex-col group select-none"
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Video Element */}
      <div className="relative aspect-video flex items-center justify-center bg-black cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
        />

        {/* Center Play Overlay when paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-white/90 hover:bg-white text-zinc-900 flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 pl-1">
              <Play className="w-8 h-8 fill-zinc-900" />
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-zinc-900 text-white px-4 py-3 border-t border-zinc-800">
        {/* Scrubber & Highlight Timeline */}
        <div className="relative mb-2 flex items-center group/scrubber">
          {/* Highlighted clip region */}
          {highlightWidth > 0 && (
            <div
              className="absolute h-1.5 bg-[#E32636]/60 rounded z-0 pointer-events-none"
              style={{
                left: `${highlightLeft}%`,
                width: `${highlightWidth}%`,
              }}
              title="Current Clip Boundary"
            />
          )}

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#E32636] relative z-10 focus:outline-none"
          />
        </div>

        {/* Controls Layout */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left: Playback & Frame Stepping */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors text-white"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            {/* Frame Stepping for surgical precision */}
            <button
              onClick={() => stepFrame(-1)}
              className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[11px] font-mono"
              title="Step backward 1 frame"
            >
              -1 Frame
            </button>

            <button
              onClick={() => stepFrame(1)}
              className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[11px] font-mono"
              title="Step forward 1 frame"
            >
              +1 Frame
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={toggleMute}
                className="w-7 h-7 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-zinc-200" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-700 rounded appearance-none accent-zinc-300 cursor-pointer"
                title="Volume"
              />
            </div>

            {/* Time Indicator with Milliseconds */}
            <div className="font-mono text-zinc-300 text-xs tabular-nums ml-2">
              <span className="text-white font-semibold">{formatSecondsToTime(currentTime, true)}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span className="text-zinc-400">{formatSecondsToTime(duration, true)}</span>
            </div>
          </div>

          {/* Right: Quick Set Buttons & Fullscreen */}
          <div className="flex items-center gap-2">
            {onSetStartTime && (
              <button
                onClick={() => onSetStartTime(currentTime)}
                className="px-2.5 py-1 text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded border border-zinc-700 transition-colors inline-flex items-center gap-1"
                title="Set current playhead as START timestamp (HotKey: [)"
              >
                <BookmarkPlus className="w-3 h-3 text-[#E32636]" />
                Set as Start [
              </button>
            )}

            {onSetEndTime && (
              <button
                onClick={() => onSetEndTime(currentTime)}
                className="px-2.5 py-1 text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded border border-zinc-700 transition-colors inline-flex items-center gap-1"
                title="Set current playhead as END timestamp (HotKey: ])"
              >
                <BookmarkPlus className="w-3 h-3 text-[#E32636]" />
                Set as End ]
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
