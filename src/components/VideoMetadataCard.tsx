/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VideoMetadata } from '../types';
import { formatBytes } from '../utils/fileValidation';
import { formatSecondsToTime } from '../utils/timeFormat';
import { Volume2, VolumeX, Maximize2, FileVideo } from 'lucide-react';

interface VideoMetadataCardProps {
  metadata: VideoMetadata;
  onRemoveVideo?: () => void;
}

export const VideoMetadataCard: React.FC<VideoMetadataCardProps> = ({ metadata, onRemoveVideo }) => {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-zinc-200/70">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
            <FileVideo className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 truncate" title={metadata.filename}>
              {metadata.filename}
            </h3>
            <p className="text-xs text-zinc-500 font-mono tabular-nums">
              {formatBytes(metadata.fileSize)} · {metadata.format}
            </p>
          </div>
        </div>

        {onRemoveVideo && (
          <button
            onClick={onRemoveVideo}
            className="text-xs text-zinc-500 hover:text-red-600 transition-colors font-medium shrink-0 px-2 py-1 rounded hover:bg-red-50"
          >
            Change Video
          </button>
        )}
      </div>

      {/* Grid of metadata attributes with clean tabular layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div>
          <span className="text-zinc-500 block">Duration</span>
          <span className="font-semibold text-zinc-900 font-mono tabular-nums">
            {formatSecondsToTime(metadata.duration, true)}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block">Resolution</span>
          <span className="font-semibold text-zinc-900 font-mono tabular-nums">
            {metadata.width} × {metadata.height}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block">Aspect Ratio</span>
          <span className="font-semibold text-zinc-900">
            {metadata.aspectRatio}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block">Frame Rate</span>
          <span className="font-semibold text-zinc-900 font-mono tabular-nums">
            {metadata.fps ? `${metadata.fps} fps` : 'Variable'}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block">Audio Stream</span>
          <span className="font-semibold text-zinc-900 flex items-center gap-1">
            {metadata.hasAudio ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                Detected
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
                No Audio
              </>
            )}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block">Container</span>
          <span className="font-semibold text-zinc-900 font-mono">
            {metadata.format}
          </span>
        </div>
      </div>
    </div>
  );
};
