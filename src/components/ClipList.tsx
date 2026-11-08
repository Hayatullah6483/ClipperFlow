/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Clip } from '../types';
import { ClipItem } from './ClipItem';
import { Scissors, Trash2, RefreshCw } from 'lucide-react';

interface ClipListProps {
  clips: Clip[];
  targetClipCount?: number;
  onChangeTargetClipCount?: () => void;
  sourceVideoUrl: string;
  sourceExtension: string;
  onProcessClip: (clipId: string) => void;
  onProcessAllPending: () => void;
  onPreviewClip: (clip: Clip) => void;
  onDownloadClip: (clip: Clip) => void;
  onRenameClip: (clipId: string, newTitle: string) => void;
  onDeleteClip: (clipId: string) => void;
  onClearAllClips: () => void;
  onJumpToTime: (time: number) => void;
  isProcessingBatch?: boolean;
}

export const ClipList: React.FC<ClipListProps> = ({
  clips,
  targetClipCount = 20,
  onChangeTargetClipCount,
  sourceVideoUrl,
  sourceExtension,
  onProcessClip,
  onProcessAllPending,
  onPreviewClip,
  onDownloadClip,
  onRenameClip,
  onDeleteClip,
  onClearAllClips,
  onJumpToTime,
  isProcessingBatch = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'ready' | 'pending'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const pendingCount = clips.filter((c) => c.status === 'pending').length;
  const readyCount = clips.filter((c) => c.status === 'ready').length;
  const processingClips = clips.filter((c) => c.status === 'processing');
  const processingCount = processingClips.length;
  const activeProcessingClip = processingClips[0];

  const filteredClips = clips.filter((clip) => {
    if (filter === 'ready') return clip.status === 'ready';
    if (filter === 'pending') return clip.status === 'pending' || clip.status === 'processing';
    return true;
  });

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col h-full">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#E32636]" />
              Background Clips Queue
            </h2>
            <button
              type="button"
              onClick={onChangeTargetClipCount}
              className="text-xs font-semibold text-zinc-500 hover:text-[#E32636] font-mono tabular-nums transition-colors"
              title="Adjust target clip count (1-20)"
            >
              ({clips.length} / {Math.max(targetClipCount, clips.length)} planned)
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeProcessingClip
              ? `Trimming "${activeProcessingClip.title}" (${Math.min(100, Math.max(1, Math.round(activeProcessingClip.progress)))}%) in background — keep cutting more clips!`
              : 'Queue up to 20 clips and process them in the background while you continue editing.'}
          </p>
        </div>

        {/* Global Batch Actions */}
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={onProcessAllPending}
              disabled={isProcessingBatch}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] disabled:opacity-50 rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Process all pending clips in background queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${processingCount > 0 ? 'animate-spin' : ''}`} />
              <span>Process Pending ({pendingCount})</span>
            </button>
          )}

          {clips.length > 0 && (
            <>
              {showClearConfirm ? (
                <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                  <span className="text-[11px] text-red-700 font-medium px-1">Clear all?</span>
                  <button
                    onClick={() => {
                      onClearAllClips();
                      setShowClearConfirm(false);
                    }}
                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-0.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-[11px] rounded"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                  title="Clear all clips from current list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Planned Session Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mb-1 tabular-nums">
          <span>Session Progress: {clips.length} of {Math.max(targetClipCount, clips.length)} clips created</span>
          <span>
            {readyCount} ready ·{' '}
            {activeProcessingClip ? (
              <strong className="text-[#E32636]">
                1 active ({Math.min(100, Math.max(1, Math.round(activeProcessingClip.progress)))}%)
              </strong>
            ) : (
              `${processingCount} active`
            )}{' '}
            · {pendingCount} queued
          </span>
        </div>
        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, (readyCount / Math.max(targetClipCount, clips.length, 1)) * 100)}%` }}
          />
          <div
            className="bg-[#E32636] h-full transition-all duration-300"
            style={{ width: `${Math.min(100, (processingCount / Math.max(targetClipCount, clips.length, 1)) * 100)}%` }}
          />
          <div
            className="bg-zinc-300 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, (pendingCount / Math.max(targetClipCount, clips.length, 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs & Status Summary */}
      {clips.length > 0 && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All ({clips.length})
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                filter === 'ready'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Ready ({readyCount})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                filter === 'pending'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Queue ({pendingCount + processingCount})
            </button>
          </div>

          {onChangeTargetClipCount && (
            <button
              type="button"
              onClick={onChangeTargetClipCount}
              className="text-[11px] font-semibold text-zinc-600 hover:text-[#E32636] transition-colors whitespace-nowrap"
            >
              Set Clip Target ({targetClipCount})
            </button>
          )}
        </div>
      )}

      {/* Clip Items Container */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[600px] pr-1">
        {clips.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
              <Scissors className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800">
              Ready for your {targetClipCount} planned {targetClipCount === 1 ? 'clip' : 'clips'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Select your timeline for Clip 1 on the left and press <strong>Process in Background & Cut Next</strong> to immediately start trimming Clip 2, 3, ... up to {targetClipCount}.
            </p>
          </div>
        ) : filteredClips.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs">
            No clips match the selected filter.
          </div>
        ) : (
          filteredClips.map((clip, idx) => (
            <ClipItem
              key={clip.id}
              clip={clip}
              index={idx}
              sourceVideoUrl={sourceVideoUrl}
              sourceExtension={sourceExtension}
              onProcess={onProcessClip}
              onPreview={onPreviewClip}
              onDownload={onDownloadClip}
              onRename={onRenameClip}
              onDelete={onDeleteClip}
              onJumpToTime={onJumpToTime}
            />
          ))
        )}
      </div>
    </div>
  );
};
