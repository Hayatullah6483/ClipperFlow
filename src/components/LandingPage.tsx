/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Zap,
  ShieldCheck,
  Film,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Tv,
  HardDrive,
  Download,
  Monitor,
  Layers,
  Play,
  LogIn,
} from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../services/firebaseService';

interface LandingPageProps {
  onOpenStudio: () => void;
  onTrySample: () => void;
  onUploadClick: () => void;
  savedProjectCount?: number;
  onOpenHistory?: () => void;
  user?: User | null;
  onSignInGoogle?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenStudio,
  onTrySample,
  onUploadClick,
  savedProjectCount = 0,
  onOpenHistory,
  user,
  onSignInGoogle,
}) => {
  // Interactive animated playhead in the Hero Studio Showcase
  const [simulatedProgress, setSimulatedProgress] = useState(32);

  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedProgress((prev) => (prev >= 96 ? 12 : prev + 3));
    }, 350);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-red-100 selection:text-red-900 overflow-x-hidden">
      {/* Subtle Ambient Architectural Backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[640px] pointer-events-none overflow-hidden opacity-60">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[780px] h-[520px] bg-gradient-to-b from-red-100/50 via-zinc-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-14 pb-20 md:pt-20 md:pb-28 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* Unboxed Clean Editorial Kicker (Zero-Pill Compliance) */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-zinc-600 mb-5"
          >
            <span className="text-[#E32636] font-bold">PC & Laptop Workstation Exclusive</span>
            <span aria-hidden="true">·</span>
            <span>Exact Millisecond Frame Cuts</span>
            <span aria-hidden="true">·</span>
            <span>Up to 20 Parallel Background Clips</span>
          </motion.div>

          {/* Main Display Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl lg:text-[64px] font-extrabold tracking-tight text-zinc-950 leading-[1.06] text-balance"
          >
            Cut Exact Video Timestamps While Your Queue Renders in the Background.
          </motion.h1>

          {/* Concrete Value Proposition */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed text-balance"
          >
            Built strictly for desktop and laptop editors. Enter <span className="font-mono font-semibold text-zinc-800">00:10:00</span> (or <span className="font-mono font-semibold text-zinc-800">00;10;00</span>) and cut dead-on at <span className="font-mono font-semibold text-zinc-800">00:10:00.000</span>—never drifting a single second. Queue up to 20 clips in the background without waiting between cuts.
          </motion.p>

          {/* Primary Action Bar */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3.5"
          >
            <button
              onClick={onUploadClick}
              className="px-7 py-3.5 text-sm font-bold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] rounded-xl shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2 group whitespace-nowrap shrink-0"
            >
              <Film className="w-4 h-4" />
              <span>Upload Video & Choose Clip Count</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onTrySample}
              className="px-6 py-3.5 text-sm font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-4 h-4 text-[#E32636]" />
              <span>Test 1-Click HD Sample</span>
            </button>

            {!user && onSignInGoogle && (
              <button
                onClick={onSignInGoogle}
                className="px-5 py-3.5 text-sm font-semibold text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4 text-[#E32636]" />
                <span>Sign in with Google</span>
              </button>
            )}

            {savedProjectCount > 0 && onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="px-5 py-3.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl border border-transparent hover:border-zinc-200 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <HardDrive className="w-4 h-4 text-zinc-500" />
                <span>Saved Projects ({savedProjectCount})</span>
              </button>
            )}
          </motion.div>

          {/* Clean Unboxed Technical Metadata Line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-500"
          >
            <span>100% Local Browser WASM</span>
            <span aria-hidden="true">·</span>
            <span>Two-Stage Exact Millisecond Seek</span>
            <span aria-hidden="true">·</span>
            <span>Up to 20 Clips per Batch</span>
            <span aria-hidden="true">·</span>
            <span>Zero Watermarks</span>
          </motion.div>
        </div>

        {/* Interactive Animated Workstation Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 max-w-5xl mx-auto rounded-2xl border border-zinc-200 bg-zinc-950 p-3 sm:p-5 shadow-2xl relative group cursor-pointer"
          onClick={onOpenStudio}
          title="Click to open AI Clipper Workstation"
        >
          {/* Workstation Top Bar */}
          <div className="flex items-center justify-between pb-3.5 px-2 border-b border-zinc-800 text-xs text-zinc-400">
            <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
              <Monitor className="w-3.5 h-3.5 text-[#E32636]" />
              <span>AI Clipper Desktop Workstation — Exact Frame Pipeline</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400 tabular-nums">
              <span>Target: 10 Clips</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">Background Worker Ready</span>
            </div>
          </div>

          {/* Split Workstation Interior */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
            {/* Left: Precision Scrubber & Timestamp Deck */}
            <div className="md:col-span-7 bg-zinc-900 rounded-xl overflow-hidden flex flex-col justify-between p-5 border border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-400 pb-3 border-b border-zinc-800/80">
                <span className="font-semibold text-white">Currently Editing: Clip #4 of 10</span>
                <span className="font-mono text-[11px] text-emerald-400">Two-Stage Exact Seek Active</span>
              </div>

              <div className="my-6 flex flex-col items-center justify-center text-center">
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  transition={{ duration: 0.18 }}
                  className="w-14 h-14 rounded-2xl bg-[#E32636] flex items-center justify-center text-white mb-3 shadow-lg"
                >
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </motion.div>
                <p className="text-sm font-bold text-white">
                  Non-Blocking Multi-Clip Timeline
                </p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  While Clip #2 is transcoding in the background, immediately set timestamps for Clip #3, #4, up to #20.
                </p>
              </div>

              {/* Exact Timestamp Readout Bar */}
              <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <div>
                    <span className="text-zinc-500 mr-1.5">START:</span>
                    <span className="text-white font-bold">00:10:00.000</span>
                  </div>
                  <span className="text-[#E32636] font-bold">EXACT 30.000s CUT</span>
                  <div>
                    <span className="text-zinc-500 mr-1.5">END:</span>
                    <span className="text-white font-bold">00:10:30.000</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                  <motion.div
                    className="absolute left-[22%] w-[42%] h-full bg-[#E32636] rounded-full"
                    animate={{ opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Live Parallel Background Queue */}
            <div className="md:col-span-5 bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex flex-col justify-between space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#E32636]" />
                  Background Processing Queue
                </span>
                <span className="text-[11px] text-zinc-400 font-mono tabular-nums">4 / 10 Planned</span>
              </div>

              <div className="space-y-2.5">
                {/* Clip 1: Ready */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">01. Opening Keynote Hook</p>
                    <p className="text-[11px] font-mono text-zinc-400 tabular-nums">00:02:00.000 → 00:02:45.000</p>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-emerald-400">
                    Ready · MP4
                  </span>
                </div>

                {/* Clip 2: Actively Processing in Background */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-[#E32636]/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white">02. Exact 10-Min Milestone</p>
                    <span className="text-[11px] font-mono font-bold text-[#E32636] tabular-nums">
                      {simulatedProgress}%
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400 tabular-nums">00:10:00.000 → 00:10:30.000</p>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="bg-[#E32636] h-full transition-all duration-300"
                      style={{ width: `${simulatedProgress}%` }}
                    />
                  </div>
                </div>

                {/* Clip 3: Queued next */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-zinc-200">03. Architecture Breakdown</p>
                    <p className="text-[11px] font-mono text-zinc-400 tabular-nums">00:14:15.000 → 00:15:00.000</p>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Queued in BG
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-zinc-300 text-[11px] font-medium">
                <span>Click to launch Studio & select up to 20 clips</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#E32636]" />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Asymmetric Bento Grid — Core Engineering Capabilities */}
      <section className="py-16 md:py-24 bg-zinc-50 border-y border-zinc-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight text-balance">
              Engineered for Zero-Drift Cuts and Non-Stop Multi-Clip Throughput
            </h2>
            <p className="text-sm text-zinc-600 mt-2">
              Every subsystem is tuned for desktop browsers so you can cut, preview, and export up to 20 clips per video without waiting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Marquee Capability (col-span-2) */}
            <div className="md:col-span-2 bg-white p-7 rounded-2xl border border-zinc-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#E32636]">
                  01. Two-Stage Post-Input Frame Decoding
                </span>
                <h3 className="text-xl font-bold text-zinc-950 mt-2">
                  Select 00:10:00 — Get Strictly 00:10:00.000, Never 00:10:01
                </h3>
                <p className="text-sm text-zinc-600 mt-2.5 leading-relaxed">
                  Standard video cutters place the seek flag before the input file, forcing the decoder to snap to the nearest camera keyframe 1 to 3 seconds away. AI Clipper combines a fast pre-seek with an exact post-input frame decoder (<span className="font-mono text-xs text-zinc-800">-i input -ss exact -t duration</span>) and supports both colon (<span className="font-mono text-xs text-zinc-800">00:10:00</span>) and semicolon (<span className="font-mono text-xs text-zinc-800">00;10;00</span>) timecode entry.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-4 text-xs text-zinc-500 font-mono tabular-nums">
                <span>Precision: ±0.001s</span>
                <span aria-hidden="true">·</span>
                <span>Master Quality: libx264 CRF 17</span>
                <span aria-hidden="true">·</span>
                <span>Audio: 192kbps AAC</span>
              </div>
            </div>

            {/* Capability 2 (col-span-1) */}
            <div className="bg-white p-7 rounded-2xl border border-zinc-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-zinc-900">
                  02. Non-Blocking Background Queue
                </span>
                <h3 className="text-lg font-bold text-zinc-950 mt-2">
                  Cut Clip #2, #3, #10 While Clip #1 Renders
                </h3>
                <p className="text-xs text-zinc-600 mt-2.5 leading-relaxed">
                  Upon uploading a video, choose how many clips you plan to cut (1 to 20). Press <strong>Process in Background & Cut Next</strong> on Clip 1 and immediately scrub and queue your remaining clips while our background worker processes each cut sequentially.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 text-xs font-mono text-zinc-600">
                Up to 20 clips per batch session
              </div>
            </div>

            {/* Capability 3 (col-span-1) */}
            <div className="bg-white p-7 rounded-2xl border border-zinc-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-zinc-900">
                  03. Live Range Audition Player
                </span>
                <h3 className="text-lg font-bold text-zinc-950 mt-2">
                  Instant Real-Time Preview for Every Clip
                </h3>
                <p className="text-xs text-zinc-600 mt-2.5 leading-relaxed">
                  Every queued and completed clip card includes an embedded Live Preview player with real-time bounded looping and audio—verify your exact in and out points before or after transcoding.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 text-xs font-mono text-zinc-600">
                0-second audition latency
              </div>
            </div>

            {/* Capability 4 (col-span-2) */}
            <div className="md:col-span-2 bg-white p-7 rounded-2xl border border-zinc-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  04. Desktop Hardware Architecture & Google Workspace Auth
                </span>
                <h3 className="text-xl font-bold text-zinc-950 mt-2">
                  PC & Laptop Exclusive with 100% Local Privacy
                </h3>
                <p className="text-sm text-zinc-600 mt-2.5 leading-relaxed">
                  Mobile phones are strictly blocked to guarantee dedicated desktop RAM and multi-core WebAssembly performance for up to 5 GB source files. Sign in with your Google account to sync your studio preferences while keeping 100% of your video footage strictly inside your local browser memory.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-4 text-xs text-zinc-500 font-mono">
                <span>Max File Size: 5 GB</span>
                <span aria-hidden="true">·</span>
                <span>Containers: MP4 / MOV / MKV / WebM / AVI</span>
                <span aria-hidden="true">·</span>
                <span>0 Bytes Uploaded to Cloud</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="py-16 md:py-24 max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Why Desktop Editors Choose AI Clipper
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1.5">
            Direct technical comparison against cloud upload clippers and basic keyframe splitters.
          </p>
        </div>

        <div className="border border-zinc-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100/80 border-b border-zinc-200 text-zinc-700 font-bold">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Capability</th>
                <th className="py-3.5 px-4 sm:px-6 text-[#E32636]">AI Clipper Workstation</th>
                <th className="py-3.5 px-4 sm:px-6 text-zinc-500">Cloud Video Cutters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-zinc-900">Timestamp Accuracy (e.g. 00:10:00)</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Exact 00:10:00.000 (Two-Stage Frame Decode)</span>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-zinc-500">Drifts to 00:10:01+ (Keyframe snapping)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-zinc-900">Background Multi-Clip Workflow</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-zinc-900">
                  Trim 2nd, 3rd... 20th clip while 1st processes in background
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-zinc-500">Blocks screen until single clip finishes</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-zinc-900">Post-Upload Clip Planning</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-zinc-900">
                  Interactive 1–20 Clip Selector with optional slot generation
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-zinc-500">1 clip at a time</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-zinc-900">Hardware Enforcement</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-zinc-900">
                  Strictly PC & Laptop Only (Phones Prohibited)
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-zinc-500">Crashes on large files on mobile browsers</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-zinc-900">Privacy & Server Uploads</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-zinc-900">
                  100% Local RAM & IndexedDB · Zero Cloud Upload
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-zinc-500">Requires uploading gigabytes to remote servers</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Conversion Banner */}
      <section className="py-16 bg-zinc-950 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-balance">
            Ready to Cut Up to 20 Exact Clips from Your Source Video?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Upload your MP4, MOV, MKV, or WebM file on your PC or laptop, pick your clip count, and start queuing frame-accurate cuts.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={onUploadClick}
              className="px-8 py-3.5 text-sm font-bold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] rounded-xl shadow-lg transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Film className="w-4 h-4" />
              <span>Select Video & Launch Studio</span>
            </button>
            <button
              onClick={onTrySample}
              className="px-6 py-3.5 text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Load Instant HD Sample Video
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
