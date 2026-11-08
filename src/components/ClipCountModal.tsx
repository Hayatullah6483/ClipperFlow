/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, Scissors, Sparkles, Check, X, Film, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface ClipCountModalProps {
  videoName: string;
  videoDurationFormatted: string;
  initialCount?: number;
  onConfirm: (targetCount: number, preCreateSlots: boolean) => void;
  onCancel?: () => void;
}

export const ClipCountModal: React.FC<ClipCountModalProps> = ({
  videoName,
  videoDurationFormatted,
  initialCount = 5,
  onConfirm,
  onCancel,
}) => {
  const [selectedCount, setSelectedCount] = useState<number>(
    Math.min(20, Math.max(1, initialCount))
  );
  const [preCreateSlots, setPreCreateSlots] = useState<boolean>(false);

  const presetCounts = [1, 3, 5, 10, 15, 20];

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const clamped = Math.min(20, Math.max(1, selectedCount));
    onConfirm(clamped, preCreateSlots);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#E32636] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-950 tracking-tight">
                How many clips will you cut?
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure your multi-clip studio session (up to 20 clips in background queue)
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleConfirm} className="mt-5 space-y-5">
          {/* Source Video Summary */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <Film className="w-4 h-4 text-[#E32636] shrink-0" />
              <span className="font-bold text-zinc-900 truncate">{videoName}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-zinc-600 shrink-0 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{videoDurationFormatted}</span>
            </div>
          </div>

          {/* Interactive Number Display & Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="clip-count-range" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Planned Clips to Cut (1 – 20)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={selectedCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setSelectedCount(Math.min(20, Math.max(1, val)));
                    }
                  }}
                  className="w-16 px-2.5 py-1 text-center font-mono text-base font-extrabold text-[#E32636] bg-red-50/50 border border-red-200 rounded-lg focus:outline-none focus:border-[#E32636] tabular-nums"
                />
                <span className="text-xs font-semibold text-zinc-500">Clips</span>
              </div>
            </div>

            <input
              id="clip-count-range"
              type="range"
              min={1}
              max={20}
              step={1}
              value={selectedCount}
              onChange={(e) => setSelectedCount(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#E32636]"
            />

            {/* Quick Presets */}
            <div className="grid grid-cols-6 gap-2 pt-1">
              {presetCounts.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedCount(num)}
                  className={`py-2 rounded-lg font-mono text-xs font-bold border transition-all tabular-nums ${
                    selectedCount === num
                      ? 'bg-[#E32636] text-white border-[#E32636] shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {num} {num === 1 ? 'Clip' : 'Clips'}
                </button>
              ))}
            </div>
          </div>

          {/* Workflow Explanation / Pre-create option */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={preCreateSlots}
                onChange={(e) => setPreCreateSlots(e.target.checked)}
                className="mt-0.5 rounded accent-[#E32636]"
              />
              <div className="text-xs">
                <span className="font-bold text-zinc-900 block">
                  Pre-generate {selectedCount} evenly spaced timeline slots now
                </span>
                <span className="text-zinc-500 text-[11px] leading-relaxed block mt-0.5">
                  Leave unchecked if you prefer to manually enter timestamps for Clip 1, click Process in background, and immediately continue cutting Clip 2, 3, ... up to {selectedCount}.
                </span>
              </div>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="submit"
              className="w-full py-3 px-5 text-sm font-bold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-2"
            >
              <Scissors className="w-4 h-4" />
              <span>
                Start Cutting {selectedCount} {selectedCount === 1 ? 'Clip' : 'Clips'} in Studio
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
