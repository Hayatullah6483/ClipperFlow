/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Film, AlertCircle, ShieldCheck, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { isSupportedVideoFile, formatBytes } from '../utils/fileValidation';
import { generateSampleVideoFile } from '../utils/sampleVideoGenerator';

interface DropzoneProps {
  onVideoSelected: (file: File) => void;
  isLoading?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onVideoSelected, isLoading = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const validation = isSupportedVideoFile(file);
    if (!validation.supported) {
      setErrorMessage(validation.reason || 'Unsupported video file or file too large.');
      return;
    }

    setErrorMessage(null);
    onVideoSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleTrySample = async () => {
    try {
      setIsGeneratingSample(true);
      setErrorMessage(null);
      const sampleFile = await generateSampleVideoFile(12);
      onVideoSelected(sampleFile);
    } catch (err: any) {
      setErrorMessage('Could not generate sample video: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsGeneratingSample(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
          Professional Local Video Clipper
        </h1>
        <p className="mt-2 text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto">
          Upload any video, set precise timestamps, cut unlimited clips, preview instantly, and download at original quality.
        </p>
      </div>

      {/* Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 ${
          isDragging
            ? 'border-[#E32636] bg-red-50/50 scale-[1.01]'
            : 'border-zinc-300 hover:border-[#E32636] bg-white hover:bg-zinc-50/60 shadow-sm hover:shadow'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mp4,.mov,.mkv,.webm,.avi,.m4v"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isLoading || isGeneratingSample}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#E32636] group-hover:scale-105 transition-transform">
            {isLoading || isGeneratingSample ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 stroke-[2]" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              {isLoading
                ? 'Reading video metadata...'
                : isGeneratingSample
                ? 'Synthesizing HD sample video...'
                : 'Click to upload or drag & drop video'}
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              Supports MP4, MOV, MKV, WebM, AVI & M4V (up to 5 GB)
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] rounded-lg shadow-sm transition-colors inline-flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Film className="w-4 h-4" />
              Select Video from Device
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to accept file</p>
            <p className="text-red-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Privacy Guarantee & Quick Test Bar */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Privacy Card */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              100% Client-Side Privacy
            </h4>
            <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
              All video processing happens strictly inside your local browser via WebAssembly. Your videos are never uploaded to any remote server or AI service.
            </p>
          </div>
        </div>

        {/* Instant Demo Card */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Don't have a video file ready?
            </h4>
            <p className="text-xs text-zinc-600 mt-0.5">
              Generate a test HD pattern with sound in 1 click.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTrySample}
            disabled={isGeneratingSample || isLoading}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5"
          >
            {isGeneratingSample ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E32636]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#E32636]" />
            )}
            Try Sample
          </button>
        </div>
      </div>

      {/* Features Overview */}
      <div className="mt-8 border-t border-zinc-200 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-base font-bold text-zinc-900">Bit-for-Bit Lossless</p>
            <p className="text-xs text-zinc-500 mt-0.5">Stream copy preserves resolution & fps</p>
          </div>
          <div>
            <p className="text-base font-bold text-zinc-900">Sub-Second Precision</p>
            <p className="text-xs text-zinc-500 mt-0.5">Manual HH:MM:SS timestamp control</p>
          </div>
          <div>
            <p className="text-base font-bold text-zinc-900">Unlimited Clips</p>
            <p className="text-xs text-zinc-500 mt-0.5">No repeat video uploads required</p>
          </div>
          <div>
            <p className="text-base font-bold text-zinc-900">No Watermarks</p>
            <p className="text-xs text-zinc-500 mt-0.5">Clean individual clip downloads</p>
          </div>
        </div>
      </div>
    </div>
  );
};
