/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, HelpCircle, Zap, Sliders, ShieldCheck, Keyboard, FileVideo } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">User Guide & Shortcuts</h2>
              <p className="text-xs text-zinc-500">AI Clipper processing engine documentation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Quick Start Steps */}
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-2.5">
              How AI Clipper Works
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-600 leading-relaxed">
              <li>
                <strong className="text-zinc-800">Select or drop a video:</strong> Upload your MP4, MOV, MKV, WebM, AVI or M4V file.
              </li>
              <li>
                <strong className="text-zinc-800">Set timestamps:</strong> Type your exact START and END times in <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-zinc-800">HH:MM:SS</code> format (or use the player's quick buttons).
              </li>
              <li>
                <strong className="text-zinc-800">Choose processing mode:</strong> Stream Copy for instant lossless cuts, or Frame-Accurate for precision editing.
              </li>
              <li>
                <strong className="text-zinc-800">Preview & Download:</strong> Inspect the clip with full audio in the preview player, give it a custom title, and download it directly.
              </li>
            </ol>
          </div>

          {/* Stream Copy vs Re-encode comparison */}
          <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50 space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Understanding Processing Modes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-zinc-200">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 mb-1">
                  <Zap className="w-4 h-4 text-[#E32636]" />
                  Stream Copy (-c copy)
                </div>
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  Extracts video and audio packets directly without decoding or recompressing. 100% bit-for-bit identical quality, resolution, framerate, and audio fidelity. Cuts align with the nearest keyframe.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-zinc-200">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 mb-1">
                  <Sliders className="w-4 h-4 text-zinc-700" />
                  Frame-Accurate Transcode
                </div>
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  Decodes every frame and cuts at the exact millisecond requested, outputting high-fidelity H.264 video at CRF 18 with AAC audio.
                </p>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Table */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2.5">
              <Keyboard className="w-4 h-4 text-zinc-700" />
              Keyboard Shortcuts
            </div>
            <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-100 text-zinc-600 font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2 text-right">Shortcut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  <tr>
                    <td className="px-3 py-2">Play / Pause Video</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">Space</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Seek ±1 Second</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">← / →</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Seek ±5 Seconds</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">Shift + ← / →</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Set Current Time as START</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">[</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Set Current Time as END</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">]</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5 GB Limit Advice */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
            <h4 className="font-bold text-zinc-900">5 GB Limit & Device Memory Notice</h4>
            <p className="leading-relaxed">
              AI Clipper supports files up to 5 GB. Since processing occurs locally in browser memory via WebAssembly, your computer should have adequate free RAM. For large 4K files, Stream Copy mode is recommended for highest speed and lowest memory consumption.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#E32636] hover:bg-[#cb1f2e] rounded-lg shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
