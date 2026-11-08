/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Download,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  Eye,
  AlertCircle,
  Clock,
  Loader2,
  Tv,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Clip } from '../types';
import { sanitizeFilename } from '../utils/fileValidation';
import { LiveClipPlayer } from './LiveClipPlayer';

interface ClipItemProps {
  clip: Clip;
  index: number;
  sourceVideoUrl: string;
  sourceExtension: string;
  onProcess: (clipId: string) => void;
  onPreview: (clip: Clip) => void;
  onDownload: (clip: Clip) => void;
  onRename: (clipId: string, newTitle: string) => void;
  onDelete: (clipId: string) => void;
  onJumpToTime: (time: number) => void;
}

export const ClipItem: React.FC<ClipItemProps> = ({
  clip,
  index,
  sourceVideoUrl,
  sourceExtension,
  onProcess,
  onPreview,
  onDownload,
  onRename,
  onDelete,
  onJumpToTime,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(clip.title);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed) {
      onRename(clip.id, trimmed);
    } else {
      setTitleValue(clip.title);
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveTitle();
    if (e.key === 'Escape') {
      setTitleValue(clip.title);
      setIsEditingTitle(false);
    }
  };

  const extensionToUse = clip.outputExtension || 'mp4';
  const expectedDownloadFilename = sanitizeFilename(clip.title, extensionToUse);

  // Use processed blob URL if available, otherwise use sourceVideoUrl bounded to startTime/endTime
  const previewMediaUrl = clip.blobUrl || sourceVideoUrl;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`border rounded-xl p-4 transition-shadow duration-200 ${
        clip.status === 'processing'
          ? 'border-[#E32636] bg-red-50/20 shadow-sm'
          : clip.status === 'ready'
          ? 'border-emerald-200/90 bg-white hover:border-emerald-300 shadow-2xs hover:shadow-xs'
          : clip.status === 'error'
          ? 'border-red-200 bg-white'
          : 'border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs hover:shadow-xs'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Title and Timestamps */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 font-mono">
              #{index + 1}
            </span>

            {isEditingTitle ? (
              <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="px-2 py-0.5 text-sm font-semibold text-zinc-900 border border-[#E32636] rounded focus:outline-none w-full"
                  placeholder="Enter clip title..."
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                  title="Save title"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setTitleValue(clip.title);
                    setIsEditingTitle(false);
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h3
                  className="text-sm font-bold text-zinc-900 truncate cursor-pointer hover:text-[#E32636] transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to rename clip"
                >
                  {clip.title}
                </h3>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors p-0.5"
                  title="Rename clip"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Timestamp Details & Jump */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-600 font-mono tabular-nums">
            <button
              onClick={() => onJumpToTime(clip.startTime)}
              className="hover:text-[#E32636] hover:underline transition-colors inline-flex items-center gap-1"
              title="Jump main video to start time"
            >
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>{clip.startTimeFormatted}</span>
              <span className="text-zinc-400">→</span>
              <span>{clip.endTimeFormatted}</span>
            </button>
            <span className="text-zinc-300">·</span>
            <span className="font-semibold text-zinc-800">
              Duration: {clip.durationFormatted}
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-[11px] text-zinc-500 font-sans">
              {clip.outputDimensions
                ? `Original Size: ${clip.outputDimensions}`
                : 'Original Ratio Preserved'}
            </span>
          </div>
        </div>

        {/* Status Indicator & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Preview Toggle Button */}
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 border ${
              showLivePreview
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
            title="Toggle Live Video Preview"
          >
            <Tv className="w-3.5 h-3.5 text-[#E32636]" />
            <span>Live Preview</span>
            {showLivePreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {clip.status === 'pending' && (
            <button
              onClick={() => onProcess(clip.id)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Process Clip
            </button>
          )}

          {clip.status === 'processing' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-[#E32636]/40 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E32636]" />
              <span className="text-xs font-mono font-bold text-[#E32636] tabular-nums">
                Processing {Math.min(100, Math.max(1, Math.round(clip.progress)))}%
              </span>
            </div>
          )}

          {clip.status === 'ready' && (
            <>
              <button
                onClick={() => onPreview(clip)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors inline-flex items-center gap-1.5 border border-zinc-200"
                title="Open full preview modal"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-600" />
                Modal
              </button>

              <button
                onClick={() => onDownload(clip)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5"
                title={`Download ${expectedDownloadFilename}`}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </>
          )}

          {clip.status === 'error' && (
            <button
              onClick={() => onProcess(clip.id)}
              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}

          {/* Delete Button with inline confirmation */}
          {showConfirmDelete ? (
            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
              <span className="text-[11px] text-red-700 font-medium px-1">Delete?</span>
              <button
                onClick={() => onDelete(clip.id)}
                className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded"
              >
                Yes
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-1.5 py-0.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-[11px] rounded"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete clip"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar with Live Percentage for Active Processing */}
      {clip.status === 'processing' && (
        <div className="mt-3 pt-3 border-t border-red-200/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[11px] font-medium text-zinc-700 truncate">
              {clip.progressMessage || 'Trimming exact frames in background...'}
            </span>
            <span className="font-mono text-xs font-extrabold text-[#E32636] tabular-nums ml-2 shrink-0">
              {Math.min(100, Math.max(1, Math.round(clip.progress)))}%
            </span>
          </div>
          <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-[#E32636] h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(clip.progress, 4))}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>
        </div>
      )}

      {/* Error Message banner */}
      {clip.status === 'error' && clip.error && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-red-50 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="leading-snug">{clip.error}</p>
        </div>
      )}

      {/* Expandable Live Preview Viewport */}
      <AnimatePresence>
        {showLivePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t border-zinc-100 overflow-hidden"
          >
            <div className="rounded-lg overflow-hidden border border-zinc-300/80 shadow-inner">
              <LiveClipPlayer
                sourceUrl={previewMediaUrl}
                startTime={clip.blobUrl ? 0 : clip.startTime}
                endTime={clip.blobUrl ? clip.duration : clip.endTime}
                autoPlay={true}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 px-0.5">
              <span>
                {clip.blobUrl ? 'Previewing rendered output' : 'Instant live audition from source'}
              </span>
              <span className="font-mono tabular-nums">
                {clip.startTimeFormatted} → {clip.endTimeFormatted}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
