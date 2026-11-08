/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  Maximize2,
  Edit2,
  Check,
  Film,
  AlertCircle,
} from 'lucide-react';
import { Clip } from '../types';
import { formatSecondsToTime } from '../utils/timeFormat';
import { sanitizeFilename, formatBytes } from '../utils/fileValidation';

interface ClipPreviewModalProps {
  clip: Clip;
  sourceExtension: string;
  sourceVideoUrl?: string;
  onClose: () => void;
  onRename: (clipId: string, newTitle: string) => void;
  onDownload: (clip: Clip) => void;
}

export const ClipPreviewModal: React.FC<ClipPreviewModalProps> = ({
  clip,
  sourceExtension,
  sourceVideoUrl,
  onClose,
  onRename,
  onDownload,
}) => {
  const mediaUrl = clip.blobUrl || sourceVideoUrl;
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(clip.duration || 0);
  const [title, setTitle] = useState(clip.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const extensionToUse = clip.outputExtension || 'mp4';
  const sanitizedFilename = sanitizeFilename(title, extensionToUse);

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
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSaveTitle = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Clip title cannot be empty.');
      return;
    }
    setTitleError(null);
    onRename(clip.id, trimmed);
    setIsEditingTitle(false);
  };

  const handleDownloadClick = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Please enter a valid clip title before downloading.');
      setIsEditingTitle(true);
      return;
    }

    onRename(clip.id, trimmed);
    onDownload({ ...clip, title: trimmed });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E32636] flex items-center justify-center shrink-0">
              <Film className="w-4 h-4" />
            </div>

            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  className="px-2.5 py-1 text-sm font-bold text-zinc-900 border border-[#E32636] rounded-md focus:outline-none"
                  placeholder="Clip title..."
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-2 py-1 text-xs font-semibold text-white bg-[#E32636] rounded hover:bg-[#cb1f2e]"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="min-w-0 flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 truncate">{title}</h3>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
                  title="Rename clip before download"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Container */}
        <div ref={containerRef} className="relative bg-black aspect-video flex flex-col justify-center items-center">
          {!mediaUrl || mediaError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400">
              <Film className="w-12 h-12 text-zinc-600 mb-2" />
              <p className="text-sm font-semibold text-zinc-200">Clip Video Source Not Available</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                This clip needs to be processed or the source video re-linked to play.
              </p>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={() => setMediaError(true)}
              playsInline
            />
          )}

          {/* Controls Bar */}
          <div className="bg-zinc-900 px-4 py-2.5 flex flex-col gap-2 border-t border-zinc-800 text-white">
            <input
              type="range"
              min={0}
              max={duration || 10}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#E32636]"
            />

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-7 h-7 rounded hover:bg-zinc-800 flex items-center justify-center text-white"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="w-7 h-7 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-300"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="font-mono text-zinc-300 tabular-nums">
                  {formatSecondsToTime(currentTime, true)} / {formatSecondsToTime(duration, true)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-mono">
                  {clip.processingMode === 'stream-copy' ? 'Lossless Stream Copy' : 'CRF 18 Master'}
                </span>
                <button
                  onClick={toggleFullscreen}
                  className="w-7 h-7 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-300"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-600">
            <p>
              Target Download File: <strong className="font-mono text-zinc-900">{sanitizedFilename}</strong>
            </p>
            {clip.blobSize && (
              <p className="text-zinc-500 font-mono mt-0.5">
                Size: {formatBytes(clip.blobSize)} · No watermarks · Preserves resolution & audio
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors flex-1 sm:flex-none"
            >
              Close
            </button>

            <button
              onClick={handleDownloadClick}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] rounded-lg shadow-sm transition-colors inline-flex items-center justify-center gap-2 flex-1 sm:flex-none"
            >
              <Download className="w-4 h-4" />
              Download Clip
            </button>
          </div>
        </div>

        {/* Title Error banner if empty */}
        {titleError && (
          <div className="px-6 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{titleError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
