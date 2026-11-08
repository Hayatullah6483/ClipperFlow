/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, ShieldAlert, Cpu, HardDrive, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface DesktopGuardProps {
  children: React.ReactNode;
}

export const DesktopGuard: React.FC<DesktopGuardProps> = ({ children }) => {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const isPhoneUA = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|webOS/i.test(ua);
      const isSmallScreen = window.innerWidth < 768 && window.matchMedia('(pointer: coarse)').matches;
      setIsMobileDevice(isPhoneUA || isSmallScreen);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (!isMobileDevice) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-7 shadow-2xl space-y-6"
      >
        {/* Icon Cluster */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-[#E32636] relative">
            <Smartphone className="w-6 h-6" />
            <div className="w-8 h-0.5 bg-[#E32636] rotate-45 absolute" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white shadow-inner">
            <Monitor className="w-7 h-7 text-emerald-400" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#E32636] uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Desktop & Laptop Workstation Only</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Mobile Phones Strictly Prohibited
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            <strong>AI Clipper Studio</strong> runs a multi-threaded FFmpeg WebAssembly engine directly in system RAM to cut up to 5 GB master video files with exact millisecond accuracy. Mobile phone browsers are strictly prohibited.
          </p>
        </div>

        {/* Workstation Requirements */}
        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-xl p-4 text-left space-y-3 text-xs">
          <p className="font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
            Why PC or Laptop Hardware is Required:
          </p>
          <div className="flex items-start gap-2.5 text-zinc-400">
            <Cpu className="w-4 h-4 text-[#E32636] shrink-0 mt-0.5" />
            <span>
              <strong className="text-zinc-200">Desktop WebAssembly Engine:</strong> Decodes and transcodes exact video frames at CRF 17 quality without server uploads.
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-zinc-400">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-zinc-200">Concurrent Multi-Clip Background Queue:</strong> Process up to 20 clips simultaneously in the background while scrubbing new timelines.
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-zinc-400">
            <HardDrive className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
            <span>
              <strong className="text-zinc-200">High-Volume Local Memory:</strong> Handles files up to 5 GB directly inside desktop IndexedDB and RAM.
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800 text-[11px] font-mono text-zinc-400">
          Please open this URL on a <span className="text-white font-semibold">Windows PC, Mac, or Linux Laptop</span> to sign in and launch the studio.
        </div>
      </motion.div>
    </div>
  );
};
