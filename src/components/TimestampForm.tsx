/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertCircle,
  Plus,
  PlayCircle,
  HelpCircle,
  Sparkles,
  Zap,
  Sliders,
  Tv,
} from 'lucide-react';
import { validateTimestamps, formatSecondsToTime, parseTimeToSeconds } from '../utils/timeFormat';
import { ProcessingMode } from '../types';
import { LiveClipPlayer } from './LiveClipPlayer';

interface TimestampFormProps {
  videoDuration: number;
  sourceVideoUrl?: string;
  initialStartTime?: number;
  initialEndTime?: number;
  onAddClip: (clipData: {
    title: string;
    startTime: number;
    endTime: number;
    processingMode: ProcessingMode;
    processImmediately?: boolean;
  }) => void;
  clipCount: number;
  targetClipCount?: number;
  onChangeTargetClipCount?: () => void;
  onAuditionRange?: (start: number, end: number) => void;
}

export const TimestampForm: React.FC<TimestampFormProps> = ({
  videoDuration,
  sourceVideoUrl,
  initialStartTime = 0,
  initialEndTime,
  onAddClip,
  clipCount,
  targetClipCount = 20,
  onChangeTargetClipCount,
  onAuditionRange,
}) => {
  // Default end time to min(initialStartTime + 15s, videoDuration)
  const defaultEnd = initialEndTime ?? Math.min(initialStartTime + 15, videoDuration || 60);

  const [startTimeInput, setStartTimeInput] = useState(formatSecondsToTime(initialStartTime, true));
  const [endTimeInput, setEndTimeInput] = useState(formatSecondsToTime(defaultEnd, true));
  const [titleInput, setTitleInput] = useState(`Clip ${clipCount + 1}`);
  // Default to accurate-reencode for exact frame-level cutting matching user's timestamps
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('accurate-reencode');
  const [validation, setValidation] = useState(
    validateTimestamps(startTimeInput, endTimeInput, videoDuration)
  );
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [showAuditionPlayer, setShowAuditionPlayer] = useState(false);

  // Update validation whenever inputs or video duration change
  useEffect(() => {
    const res = validateTimestamps(startTimeInput, endTimeInput, videoDuration);
    setValidation(res);
  }, [startTimeInput, endTimeInput, videoDuration]);

  // Update inputs if external props change
  useEffect(() => {
    if (initialStartTime !== undefined) {
      setStartTimeInput(formatSecondsToTime(initialStartTime, true));
    }
  }, [initialStartTime]);

  useEffect(() => {
    if (initialEndTime !== undefined && initialEndTime > 0) {
      setEndTimeInput(formatSecondsToTime(initialEndTime, true));
    }
  }, [initialEndTime]);

  // Update default title when count changes if unmodified
  useEffect(() => {
    if (/^Clip \d+$/.test(titleInput.trim()) || titleInput.trim() === '') {
      setTitleInput(`Clip ${clipCount + 1}`);
    }
  }, [clipCount]);

  const nudgeTime = (type: 'start' | 'end', deltaSeconds: number) => {
    const current = type === 'start' ? parseTimeToSeconds(startTimeInput) : parseTimeToSeconds(endTimeInput);
    if (isNaN(current)) return;
    const nudged = Math.max(0, Math.min(videoDuration || 999999, current + deltaSeconds));
    if (type === 'start') {
      setStartTimeInput(formatSecondsToTime(nudged, true));
    } else {
      setEndTimeInput(formatSecondsToTime(nudged, true));
    }
  };

  const handleAudition = () => {
    if (!validation.isValid) return;
    if (onAuditionRange) {
      onAuditionRange(validation.startSeconds, validation.endSeconds);
    }
    setShowAuditionPlayer(!showAuditionPlayer);
  };

  const handleSubmit = (processImmediately: boolean) => {
    if (!validation.isValid) return;

    const trimmedTitle = titleInput.trim() || `Clip ${clipCount + 1}`;

    onAddClip({
      title: trimmedTitle,
      startTime: validation.startSeconds,
      endTime: validation.endSeconds,
      processingMode,
      processImmediately,
    });

    // Advance immediately for next clip so user can trim 2nd, 3rd, 4th... 20th clip while background works!
    setTitleInput(`Clip ${clipCount + 2}`);
    const nextStart = Math.min(validation.endSeconds, Math.max(0, (videoDuration || 60) - 1));
    const nextEnd = Math.min(nextStart + 15, videoDuration || 60);
    setStartTimeInput(formatSecondsToTime(nextStart, true));
    setEndTimeInput(formatSecondsToTime(nextEnd > nextStart ? nextEnd : videoDuration, true));
    setShowAuditionPlayer(false);
  };

  const nextClipIndex = clipCount + 1;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#E32636]" />
              Manual Timestamp Selection
            </h2>
            <button
              type="button"
              onClick={onChangeTargetClipCount}
              className="text-xs font-mono font-semibold text-zinc-600 hover:text-[#E32636] transition-colors"
              title="Click to adjust planned clip count (up to 20)"
            >
              Clip #{nextClipIndex} of {Math.max(targetClipCount, nextClipIndex)} planned
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Enter exact <span className="font-mono text-zinc-700">HH:MM:SS</span> or <span className="font-mono text-zinc-700">HH;MM;SS</span> cut points. Trimming runs in the background while you prepare your next clip.
          </p>
        </div>

        {sourceVideoUrl && validation.isValid && (
          <button
            type="button"
            onClick={handleAudition}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors inline-flex items-center gap-1.5 ${
              showAuditionPlayer
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-red-50 text-[#E32636] border-red-200 hover:bg-red-100'
            }`}
            title="Audition current cut range before creating clip"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{showAuditionPlayer ? 'Hide Audition' : 'Live Audition'}</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Clip Title Input */}
        <div>
          <label htmlFor="clip-title-input" className="block text-xs font-semibold text-zinc-700 mb-1">
            Clip Title <span className="text-zinc-400 font-normal">(Used for downloaded file)</span>
          </label>
          <input
            id="clip-title-input"
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="e.g. Goal Moment, Key Discussion, Scene 1"
            className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E32636]/20 focus:border-[#E32636] transition-colors"
          />
        </div>

        {/* Start and End Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* START TIME */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="start-time-input" className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                START TIME
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => nudgeTime('start', -1)}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                  title="Nudge -1 second"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('start', -0.1)}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                  title="Nudge -0.1 second (100ms)"
                >
                  -.1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('start', 0.1)}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                  title="Nudge +0.1 second (100ms)"
                >
                  +.1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('start', 1)}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                  title="Nudge +1 second"
                >
                  +1s
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                id="start-time-input"
                type="text"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                onBlur={() => {
                  const parsed = parseTimeToSeconds(startTimeInput);
                  if (!isNaN(parsed)) {
                    setStartTimeInput(formatSecondsToTime(parsed, true));
                  }
                }}
                placeholder="00:10:00.000"
                className={`w-full px-3 py-2.5 text-sm font-mono font-medium rounded-lg border focus:outline-none transition-colors tabular-nums ${
                  !validation.isValid && validation.errorMessage?.includes('START')
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                    : 'border-zinc-300 bg-white focus:border-[#E32636] focus:ring-2 focus:ring-[#E32636]/20'
                }`}
              />
            </div>
          </div>

          {/* END TIME */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="end-time-input" className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                END TIME
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => nudgeTime('end', -1)}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                  title="Nudge -1 second"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('end', -0.1)}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                  title="Nudge -0.1 second (100ms)"
                >
                  -.1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('end', 0.1)}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                  title="Nudge +0.1 second (100ms)"
                >
                  +.1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('end', 1)}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-600"
                  title="Nudge +1 second"
                >
                  +1s
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                id="end-time-input"
                type="text"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                onBlur={() => {
                  const parsed = parseTimeToSeconds(endTimeInput);
                  if (!isNaN(parsed)) {
                    setEndTimeInput(formatSecondsToTime(parsed, true));
                  }
                }}
                placeholder="00:10:30.000"
                className={`w-full px-3 py-2.5 text-sm font-mono font-medium rounded-lg border focus:outline-none transition-colors tabular-nums ${
                  !validation.isValid && validation.errorMessage?.includes('END')
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                    : 'border-zinc-300 bg-white focus:border-[#E32636] focus:ring-2 focus:ring-[#E32636]/20'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Real-Time Duration Calculation */}
        <div className="py-2.5 px-3 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-between text-xs">
          <span className="text-zinc-600 font-medium">
            Exact Cut Range ({validation.isValid ? `${formatSecondsToTime(validation.startSeconds, true)} → ${formatSecondsToTime(validation.endSeconds, true)}` : 'Invalid'}):
          </span>
          <span className="font-mono font-bold text-zinc-900 text-sm tabular-nums">
            {validation.isValid
              ? formatSecondsToTime(validation.durationSeconds, true)
              : '--:--:--'}
          </span>
        </div>

        {/* Validation Error Message */}
        {!validation.isValid && validation.errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="leading-snug">{validation.errorMessage}</p>
          </div>
        )}

        {/* Live Audition Mini-Player */}
        {showAuditionPlayer && sourceVideoUrl && validation.isValid && (
          <div className="border border-zinc-300 rounded-xl overflow-hidden p-3 bg-zinc-950 text-white space-y-2">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-[#E32636]" />
                Auditioning Cut Range ({formatSecondsToTime(validation.durationSeconds, true)})
              </span>
              <span className="font-mono text-zinc-400 text-[11px] tabular-nums">
                {formatSecondsToTime(validation.startSeconds, true)} → {formatSecondsToTime(validation.endSeconds, true)}
              </span>
            </div>
            <LiveClipPlayer
              sourceUrl={sourceVideoUrl}
              startTime={validation.startSeconds}
              endTime={validation.endSeconds}
              autoPlay={true}
            />
          </div>
        )}

        {/* Processing Mode Selection */}
        <div className="pt-2 border-t border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              Precision Cutting Mode
              <button
                type="button"
                onClick={() => setShowModeInfo(!showModeInfo)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
                title="Learn about processing modes"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </label>
            <span className="text-[11px] text-zinc-500 font-mono">
              {processingMode === 'accurate-reencode' ? 'Exact Frame Precision' : 'Keyframe Copy'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                processingMode === 'accurate-reencode'
                  ? 'border-[#E32636] bg-red-50/40 text-zinc-900 shadow-2xs'
                  : 'border-zinc-200 hover:border-zinc-300 text-zinc-600 bg-white'
              }`}
            >
              <input
                type="radio"
                name="processingMode"
                value="accurate-reencode"
                checked={processingMode === 'accurate-reencode'}
                onChange={() => setProcessingMode('accurate-reencode')}
                className="mt-0.5 accent-[#E32636]"
              />
              <div>
                <p className="font-semibold text-zinc-900 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#E32636]" />
                  Exact Frame Precision (Recommended)
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                  Two-stage frame decode cuts strictly at 00:10:00.000, never 00:10:01. Master CRF 17.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                processingMode === 'stream-copy'
                  ? 'border-[#E32636] bg-red-50/40 text-zinc-900 shadow-2xs'
                  : 'border-zinc-200 hover:border-zinc-300 text-zinc-600 bg-white'
              }`}
            >
              <input
                type="radio"
                name="processingMode"
                value="stream-copy"
                checked={processingMode === 'stream-copy'}
                onChange={() => setProcessingMode('stream-copy')}
                className="mt-0.5 accent-[#E32636]"
              />
              <div>
                <p className="font-semibold text-zinc-900 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-zinc-700" />
                  Keyframe Stream Copy
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                  Near-instant zero-transcode cut, but snaps to nearest keyframe boundary.
                </p>
              </div>
            </label>
          </div>

          {showModeInfo && (
            <div className="mt-2.5 p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1.5 leading-relaxed">
              <p>
                <strong>Exact Frame Precision (Default):</strong> Uses a two-stage post-input seek (`-i input -ss exact`) to decode every individual video frame up to your exact start millisecond and encodes the exact duration with libx264 (CRF 17) and AAC. Selecting `00:10:00` cuts strictly at `00:10:00.000`.
              </p>
              <p>
                <strong>Keyframe Stream Copy:</strong> Copies raw video packets directly without decoding. Ultra-fast, but can only split at keyframe packets (I-frames) created by the camera.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons — Non-blocking Background Queue */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={!validation.isValid}
            className="flex-1 py-2.5 px-4 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors border border-zinc-200 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Queue Clip #{nextClipIndex} (Cut Later)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={!validation.isValid}
            className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Process in Background & Cut Next</span>
          </button>
        </div>
      </div>
    </div>
  );
};

