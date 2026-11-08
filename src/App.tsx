/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { HistoryPage } from './components/HistoryPage';
import { Dropzone } from './components/Dropzone';
import { VideoPlayer } from './components/VideoPlayer';
import { VideoMetadataCard } from './components/VideoMetadataCard';
import { TimestampForm } from './components/TimestampForm';
import { ClipList } from './components/ClipList';
import { ClipPreviewModal } from './components/ClipPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { DesktopGuard } from './components/DesktopGuard';
import { ClipCountModal } from './components/ClipCountModal';

import { Project, Clip, VideoMetadata, ProcessingMode, ActiveTab, StorageInfo } from './types';
import { extractVideoMetadata, sanitizeFilename } from './utils/fileValidation';
import { formatSecondsToTime } from './utils/timeFormat';
import { processClip } from './services/videoProcessor';
import { ffmpegService } from './services/ffmpegService';
import { generateSampleVideoFile } from './utils/sampleVideoGenerator';
import {
  saveProject,
  getAllProjects,
  getProject,
  deleteProject,
  clearAllProjects,
  getStorageQuota,
} from './services/indexedDbService';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  logoutUser,
  User,
} from './services/firebaseService';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, LogIn, Layers } from 'lucide-react';

export default function App() {
  // Navigation Page state
  const [activeTab, setActiveTab] = useState<ActiveTab>('landing');

  // Google Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Toast / Status Banner state (replaces window.alert)
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  // Video & File state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  // Planned Clip Count state (1 to 20)
  const [targetClipCount, setTargetClipCount] = useState<number>(5);
  const [showClipCountModal, setShowClipCountModal] = useState<boolean>(false);

  // Playhead & Scrubber state
  const [currentTime, setCurrentTime] = useState(0);
  const [targetStartTime, setTargetStartTime] = useState<number | undefined>(undefined);
  const [targetEndTime, setTargetEndTime] = useState<number | undefined>(undefined);

  // Current Project & Clips state
  const [currentProject, setCurrentProject] = useState<Project>({
    id: `proj_${Date.now()}`,
    name: 'Untitled Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    clips: [],
  });
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({});

  // Processing state
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Modals state
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Hidden file input for global upload triggers
  const hiddenUploadInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Load project history on mount
  useEffect(() => {
    loadProjectsList();
    getStorageQuota().then((info) => setStorageInfo(info));
  }, []);

  const loadProjectsList = async () => {
    try {
      const projects = await getAllProjects();
      setAllProjects(projects);
      const quota = await getStorageQuota();
      setStorageInfo(quota);
    } catch (e) {
      console.warn('Failed to load projects from IndexedDB:', e);
    }
  };

  // Keep project saved in IndexedDB (debounced so live progress percentage ticks remain 60fps smooth)
  useEffect(() => {
    if (currentProject.clips.length === 0 && !metadata) return;
    const timer = setTimeout(() => {
      saveProject(currentProject)
        .then(() => loadProjectsList())
        .catch((e) => console.warn('Autosave project error:', e));
    }, 600);
    return () => clearTimeout(timer);
  }, [currentProject, metadata]);

  // Google Sign-In handler
  const handleSignInGoogle = async () => {
    try {
      const signedInUser = await signInWithGoogle();
      showToast(`Signed in as ${signedInUser.displayName || signedInUser.email}`, 'success');
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast(err?.message || 'Google sign-in could not be completed.', 'error');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      showToast('Signed out of Google account.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Sign-out failed.', 'error');
    }
  };

  // Handle Video Selection — Prompts user for how many clips (1 to 20) they want to cut
  const handleVideoSelected = async (file: File) => {
    try {
      setIsLoadingVideo(true);

      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      const knownDur = (file as any).__knownDuration || 0;
      const meta = await extractVideoMetadata(file, knownDur);
      const url = URL.createObjectURL(file);

      // Pre-warm FFmpeg WebAssembly engine in background so it is ready when user clicks Process
      ffmpegService.preload();

      setSourceFile(file);
      setVideoUrl(url);
      setMetadata(meta);
      setCurrentTime(0);
      setTargetStartTime(0);
      const safeEnd = meta.duration > 0 ? Math.min(15, meta.duration) : 15;
      setTargetEndTime(safeEnd);

      const updatedProject: Project = {
        id: `proj_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: meta,
        clips: [],
      };
      setCurrentProject(updatedProject);
      await saveProject(updatedProject);
      await loadProjectsList();

      setActiveTab('studio');
      // Prompt user how many clips they will cut (up to 20)
      setShowClipCountModal(true);
    } catch (err: any) {
      showToast('Error loading video: ' + (err?.message || 'Unknown error.'), 'error');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // Handle Clip Count confirmation (1 to 20 clips)
  const handleConfirmClipCount = async (count: number, preCreateSlots: boolean) => {
    const clampedCount = Math.min(20, Math.max(1, count));
    setTargetClipCount(clampedCount);
    setShowClipCountModal(false);

    if (preCreateSlots && metadata && metadata.duration > 0) {
      const totalDur = metadata.duration;
      const segmentLength = Math.max(0.5, Math.floor((totalDur / clampedCount) * 100) / 100);
      const generatedClips: Clip[] = [];

      for (let i = 0; i < clampedCount; i++) {
        const start = Math.round(i * segmentLength * 1000) / 1000;
        const end =
          i === clampedCount - 1
            ? Math.round(totalDur * 1000) / 1000
            : Math.round((i + 1) * segmentLength * 1000) / 1000;
        const dur = Math.max(0.2, Math.round((end - start) * 1000) / 1000);

        generatedClips.push({
          id: `clip_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          projectId: currentProject.id,
          title: `Clip ${i + 1}`,
          startTime: start,
          endTime: end,
          duration: dur,
          startTimeFormatted: formatSecondsToTime(start, true),
          endTimeFormatted: formatSecondsToTime(end, true),
          durationFormatted: formatSecondsToTime(dur, true),
          processingMode: 'accurate-reencode',
          status: 'pending',
          progress: 0,
          createdAt: Date.now() + i,
        });
      }

      const updatedProj = {
        ...currentProject,
        clips: generatedClips,
        updatedAt: Date.now(),
      };
      setCurrentProject(updatedProj);
      await saveProject(updatedProj);
      showToast(
        `Created ${clampedCount} timeline slots. Click Process on any clip or Process Pending to cut in background!`,
        'success'
      );
    } else {
      showToast(
        `Session configured for up to ${clampedCount} clips. Set timestamps for Clip #1 and click Process in Background!`,
        'success'
      );
    }
  };

  // 1-Click Sample generator (fast 3-second HD test pattern)
  const handleTrySampleFromLanding = async () => {
    try {
      setIsLoadingVideo(true);
      setActiveTab('studio');
      showToast('Generating 3-second HD test video pattern...', 'info');
      const sampleFile = await generateSampleVideoFile(3);
      await handleVideoSelected(sampleFile);
    } catch (err: any) {
      showToast('Failed to generate sample: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // Start new project
  const handleNewProject = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    setSourceFile(null);
    setVideoUrl('');
    setMetadata(null);
    setCurrentTime(0);

    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name: 'New Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      clips: [],
    };
    setCurrentProject(newProj);
    setActiveTab('studio');
  };

  // Add Clip & optionally process in background immediately without blocking the UI
  const handleAddClip = async ({
    title,
    startTime,
    endTime,
    processingMode,
    processImmediately = false,
  }: {
    title: string;
    startTime: number;
    endTime: number;
    processingMode: ProcessingMode;
    processImmediately?: boolean;
  }) => {
    const exactStart = Math.round(startTime * 1000) / 1000;
    const exactEnd = Math.round(endTime * 1000) / 1000;
    const duration = Math.max(0.1, Math.round((exactEnd - exactStart) * 1000) / 1000);

    const newClip: Clip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId: currentProject.id,
      title,
      startTime: exactStart,
      endTime: exactEnd,
      duration,
      startTimeFormatted: formatSecondsToTime(exactStart, true),
      endTimeFormatted: formatSecondsToTime(exactEnd, true),
      durationFormatted: formatSecondsToTime(duration, true),
      processingMode,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
    };

    setCurrentProject((prev) => {
      const updatedClips = [...prev.clips, newClip];
      const updatedProj = { ...prev, clips: updatedClips, updatedAt: Date.now() };
      saveProject(updatedProj).catch(() => {});
      return updatedProj;
    });

    if (processImmediately) {
      // Launch non-blocking background execution passing newClip directly
      // so the user can immediately trim the 2nd, 3rd, 4th... 20th clip!
      executeClipProcessing(newClip.id, newClip);
      showToast(
        `${newClip.title} (${newClip.startTimeFormatted} → ${newClip.endTimeFormatted}) started in background. You can now cut your next clip!`,
        'info'
      );
    } else {
      showToast(`${newClip.title} added to queue.`, 'info');
    }
  };

  // Non-blocking background clip processor
  const executeClipProcessing = async (clipId: string, directClip?: Clip) => {
    if (!sourceFile) {
      showToast('Source video is not in memory. Please re-select your video file.', 'error');
      return;
    }

    const clipToProcess =
      directClip || currentProject.clips.find((c) => c.id === clipId);
    if (!clipToProcess) return;

    let highestPercent = 2;

    updateClipState(clipId, {
      status: 'processing',
      progress: highestPercent,
      progressMessage: 'Starting clip processor (2%)...',
      error: undefined,
    });

    try {
      const result = await processClip(
        sourceFile,
        clipToProcess.startTime,
        clipToProcess.endTime,
        clipToProcess.processingMode,
        (percentage, message) => {
          highestPercent = Math.max(highestPercent, Math.min(99, Math.round(percentage)));
          updateClipState(clipId, {
            status: 'processing',
            progress: highestPercent,
            progressMessage: message || `Processing (${highestPercent}%)...`,
          });
        },
        { width: metadata?.width, height: metadata?.height }
      );

      const dimsLabel =
        metadata && metadata.width && metadata.height
          ? `${metadata.width}×${metadata.height} (${metadata.aspectRatio})`
          : undefined;

      updateClipState(clipId, {
        status: 'ready',
        progress: 100,
        progressMessage: 'Completed (100%) — Original ratio preserved',
        blobUrl: result.url,
        blobSize: result.blob.size,
        outputExtension: result.extension,
        outputMimeType: result.mimeType,
        outputDimensions: dimsLabel,
        completedAt: Date.now(),
      });

      showToast(
        `${clipToProcess.title} processed (100%) in original ratio (${dimsLabel || '1:1 Original'}) — ready to download!`,
        'success'
      );
    } catch (err: any) {
      console.error('Clip processing error:', err);
      updateClipState(clipId, {
        status: 'error',
        progress: 0,
        error: err?.message || 'Processing failed. You can retry with Exact Frame mode.',
      });
    }
  };

  // Process all pending clips in background sequence without locking the UI
  const handleProcessAllPending = async () => {
    if (!sourceFile) {
      showToast('Source video is required in memory to process clips.', 'error');
      return;
    }

    setIsProcessingBatch(true);
    const pendingClips = currentProject.clips.filter((c) => c.status === 'pending');

    // Launch all pending clips into the background worker queue
    pendingClips.forEach((clip) => {
      updateClipState(clip.id, {
        status: 'processing',
        progress: 2,
        progressMessage: 'Waiting in background queue...',
      });
    });

    for (const clip of pendingClips) {
      await executeClipProcessing(clip.id, clip);
    }

    setIsProcessingBatch(false);
  };

  // Helper to update a clip's properties in state & project
  const updateClipState = (clipId: string, partial: Partial<Clip>) => {
    setCurrentProject((prev) => {
      const updatedClips = prev.clips.map((c) => (c.id === clipId ? { ...c, ...partial } : c));
      return { ...prev, clips: updatedClips, updatedAt: Date.now() };
    });

    setPreviewClip((prev) => {
      if (prev && prev.id === clipId) {
        return { ...prev, ...partial };
      }
      return prev;
    });
  };

  // Rename Clip
  const handleRenameClip = (clipId: string, newTitle: string) => {
    updateClipState(clipId, { title: newTitle.trim() });
  };

  // Delete Clip
  const handleDeleteClip = (clipId: string) => {
    setCurrentProject((prev) => {
      const clipToDelete = prev.clips.find((c) => c.id === clipId);
      if (clipToDelete?.blobUrl) {
        URL.revokeObjectURL(clipToDelete.blobUrl);
      }
      const filtered = prev.clips.filter((c) => c.id !== clipId);
      return { ...prev, clips: filtered, updatedAt: Date.now() };
    });
  };

  // Clear All Clips
  const handleClearAllClips = () => {
    currentProject.clips.forEach((c) => {
      if (c.blobUrl) URL.revokeObjectURL(c.blobUrl);
    });

    setCurrentProject((prev) => ({
      ...prev,
      clips: [],
      updatedAt: Date.now(),
    }));
  };

  // Download Clip with required title and sanitized filename
  const handleDownloadClip = (clip: Clip) => {
    if (!clip.blobUrl) {
      executeClipProcessing(clip.id, clip);
      showToast(`Processing "${clip.title}" in background before download...`, 'info');
      return;
    }

    const trimmedTitle = clip.title.trim();
    if (!trimmedTitle) {
      showToast('A valid clip title is required before downloading.', 'error');
      return;
    }

    const ext = clip.outputExtension || 'mp4';
    const filename = sanitizeFilename(trimmedTitle, ext);

    const a = document.createElement('a');
    a.href = clip.blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Select project from History
  const handleSelectProject = async (projectId: string) => {
    const proj = await getProject(projectId);
    if (!proj) return;

    setCurrentProject(proj);
    setMetadata(proj.metadata || null);
    setActiveTab('studio');
  };

  const handleRenameProject = async (projectId: string, newName: string) => {
    const proj = await getProject(projectId);
    if (!proj) return;
    proj.name = newName;
    proj.updatedAt = Date.now();
    await saveProject(proj);
    if (currentProject.id === projectId) {
      setCurrentProject({ ...currentProject, name: newName });
    }
    await loadProjectsList();
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
    await loadProjectsList();
    if (currentProject.id === projectId) {
      handleNewProject();
    }
  };

  const handleClearAllHistory = async () => {
    await clearAllProjects();
    await loadProjectsList();
  };

  const sourceExtension = metadata?.format?.toLowerCase() || 'mp4';

  return (
    <DesktopGuard>
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col selection:bg-red-100 selection:text-red-900">
        {/* Hidden global upload input */}
        <input
          ref={hiddenUploadInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mp4,.mov,.mkv,.webm,.avi,.m4v"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleVideoSelected(e.target.files[0]);
              e.target.value = '';
            }
          }}
        />

        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenHelp={() => setShowHelpModal(true)}
          currentProjectName={currentProject.name}
          hasActiveVideo={Boolean(sourceFile)}
          onNewProject={handleNewProject}
          user={user}
          onSignInGoogle={handleSignInGoogle}
          onSignOut={handleSignOut}
        />

        {/* Toast Notification Banner */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="fixed top-20 right-6 z-50 max-w-md bg-zinc-950 text-white px-4 py-3 rounded-xl shadow-xl border border-zinc-800 flex items-center gap-3 text-xs"
            >
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-[#E32636] shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="leading-snug flex-1">{toastMessage.text}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="text-zinc-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Pages Transition Container */}
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'landing' && (
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <LandingPage
                  onOpenStudio={() => setActiveTab('studio')}
                  onTrySample={handleTrySampleFromLanding}
                  onUploadClick={() => {
                    hiddenUploadInputRef.current?.click();
                    setActiveTab('studio');
                  }}
                  savedProjectCount={allProjects.length}
                  onOpenHistory={() => setActiveTab('history')}
                  user={user}
                  onSignInGoogle={handleSignInGoogle}
                />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <HistoryPage
                  projects={allProjects}
                  activeProjectId={currentProject.id}
                  onSelectProject={handleSelectProject}
                  onRenameProject={handleRenameProject}
                  onDeleteProject={handleDeleteProject}
                  onClearAllHistory={handleClearAllHistory}
                  onOpenStudio={() => setActiveTab('studio')}
                  storageInfo={storageInfo}
                />
              </motion.div>
            )}

            {activeTab === 'studio' && (
              <motion.div
                key="studio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-5">
                  {/* Optional Google Account Sync Bar in Studio */}
                  {isAuthReady && !user && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="text-zinc-600">
                        <strong className="text-zinc-900">PC/Laptop Studio Mode:</strong> Sign in with your Google Account to save your default clip count (up to 20) and precision settings across sessions.
                      </div>
                      <button
                        onClick={handleSignInGoogle}
                        className="px-3 py-1.5 font-semibold text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <LogIn className="w-3.5 h-3.5 text-[#E32636]" />
                        <span>Sign in with Google</span>
                      </button>
                    </div>
                  )}

                  {!sourceFile || !videoUrl ? (
                    /* Empty / Upload View */
                    <Dropzone onVideoSelected={handleVideoSelected} isLoading={isLoadingVideo} />
                  ) : (
                    /* Active Studio Workspace */
                    <div className="space-y-6">
                      {/* Metadata Card + Quick Clip Count Adjuster */}
                      {metadata && (
                        <div className="space-y-3">
                          <VideoMetadataCard
                            metadata={metadata}
                            onRemoveVideo={() => {
                              setSourceFile(null);
                              setVideoUrl('');
                            }}
                          />
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 border border-zinc-200/80 rounded-xl px-4 py-2.5 text-xs">
                            <div className="flex items-center gap-2 text-zinc-700">
                              <Layers className="w-4 h-4 text-[#E32636]" />
                              <span>
                                Planned Clips for this Video:{' '}
                                <strong className="font-mono text-zinc-950">{targetClipCount} clips</strong> (up to 20 max)
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setShowClipCountModal(true)}
                                className="font-semibold text-[#E32636] hover:underline"
                              >
                                Change Clip Count (1–20)
                              </button>
                              <span className="text-zinc-300">·</span>
                              <button
                                onClick={() => hiddenUploadInputRef.current?.click()}
                                className="font-medium text-zinc-600 hover:text-zinc-950"
                              >
                                Upload Different Video
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Split Grid: Video Player + Manual Inputs on Left, Clips Queue on Right */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Column (7 cols): Video Player & Manual Timestamp Inputs */}
                        <div className="lg:col-span-7 space-y-5">
                          {/* Video Player */}
                          <VideoPlayer
                            videoUrl={videoUrl}
                            duration={metadata?.duration || 0}
                            currentTime={currentTime}
                            onTimeUpdate={setCurrentTime}
                            onSetStartTime={(time) => setTargetStartTime(time)}
                            onSetEndTime={(time) => setTargetEndTime(time)}
                            highlightRange={
                              targetStartTime !== undefined && targetEndTime !== undefined
                                ? { start: targetStartTime, end: targetEndTime }
                                : undefined
                            }
                          />

                          {/* Mandatory Manual Timestamp Entry Form with Live Audition & Background Queue */}
                          <TimestampForm
                            videoDuration={metadata?.duration || 0}
                            sourceVideoUrl={videoUrl}
                            initialStartTime={targetStartTime}
                            initialEndTime={targetEndTime}
                            onAddClip={handleAddClip}
                            clipCount={currentProject.clips.length}
                            targetClipCount={targetClipCount}
                            onChangeTargetClipCount={() => setShowClipCountModal(true)}
                            onAuditionRange={(start) => setCurrentTime(start)}
                          />
                        </div>

                        {/* Right Column (5 cols): Clips List & Background Queue with LIVE PREVIEW for each clip */}
                        <div className="lg:col-span-5 h-full">
                          <ClipList
                            clips={currentProject.clips}
                            targetClipCount={targetClipCount}
                            onChangeTargetClipCount={() => setShowClipCountModal(true)}
                            sourceVideoUrl={videoUrl}
                            sourceExtension={sourceExtension}
                            onProcessClip={(id) => executeClipProcessing(id)}
                            onProcessAllPending={handleProcessAllPending}
                            onPreviewClip={(clip) => setPreviewClip(clip)}
                            onDownloadClip={handleDownloadClip}
                            onRenameClip={handleRenameClip}
                            onDeleteClip={handleDeleteClip}
                            onClearAllClips={handleClearAllClips}
                            onJumpToTime={(t) => setCurrentTime(t)}
                            isProcessingBatch={isProcessingBatch}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </main>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>
              <strong>AI Clipper</strong> — Desktop & Laptop In-Browser Video Workstation. Zero Server Uploads.
            </p>
            <div className="flex items-center gap-4 text-zinc-400">
              <button onClick={() => setActiveTab('landing')} className="hover:text-zinc-700">Home</button>
              <button onClick={() => setActiveTab('studio')} className="hover:text-zinc-700">Studio</button>
              <button onClick={() => setActiveTab('history')} className="hover:text-zinc-700">History</button>
              <button onClick={() => setShowHelpModal(true)} className="hover:text-zinc-700">Guide</button>
            </div>
          </div>
        </footer>

        {/* Post-Upload Clip Count Selector Modal (1 to 20 Clips) */}
        <AnimatePresence>
          {showClipCountModal && metadata && (
            <ClipCountModal
              videoName={metadata.filename}
              videoDurationFormatted={formatSecondsToTime(metadata.duration, true)}
              initialCount={targetClipCount}
              onConfirm={handleConfirmClipCount}
              onCancel={() => setShowClipCountModal(false)}
            />
          )}
        </AnimatePresence>

        {/* Clip Preview Modal */}
        {previewClip && (
          <ClipPreviewModal
            clip={previewClip}
            sourceExtension={sourceExtension}
            sourceVideoUrl={videoUrl}
            onClose={() => setPreviewClip(null)}
            onRename={handleRenameClip}
            onDownload={handleDownloadClip}
          />
        )}

        {/* Settings Modal */}
        {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}

        {/* Help & Guide Modal */}
        {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      </div>
    </DesktopGuard>
  );
}
