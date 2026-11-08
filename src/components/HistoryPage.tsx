/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FolderOpen,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  Film,
  Clock,
  Scissors,
  ArrowRight,
  HardDrive,
  Download,
  Calendar,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, StorageInfo } from '../types';
import { formatBytes } from '../utils/fileValidation';
import { formatSecondsToTime } from '../utils/timeFormat';

interface HistoryPageProps {
  projects: Project[];
  activeProjectId?: string;
  onSelectProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteProject: (projectId: string) => void;
  onClearAllHistory: () => void;
  onOpenStudio: () => void;
  storageInfo?: StorageInfo;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onRenameProject,
  onDeleteProject,
  onClearAllHistory,
  onOpenStudio,
  storageInfo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'clips' | 'name'>('newest');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Compute aggregate stats
  const totalClips = useMemo(() => {
    return projects.reduce((acc, p) => acc + (p.clips?.length || 0), 0);
  }, [projects]);

  const totalDurationClipped = useMemo(() => {
    return projects.reduce((acc, p) => {
      const pDur = (p.clips || []).reduce((clipAcc, c) => clipAcc + (c.duration || 0), 0);
      return acc + pDur;
    }, 0);
  }, [projects]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
          p.name.toLowerCase().includes(query) ||
          p.metadata?.filename.toLowerCase().includes(query) ||
          p.clips.some((c) => c.title.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
        if (sortBy === 'oldest') return (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt);
        if (sortBy === 'clips') return (b.clips?.length || 0) - (a.clips?.length || 0);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [projects, searchQuery, sortBy]);

  const startRename = (project: Project) => {
    setEditingId(project.id);
    setEditingName(project.name);
  };

  const handleSaveRename = (projectId: string) => {
    if (editingName.trim()) {
      onRenameProject(projectId, editingName.trim());
    }
    setEditingId(null);
  };

  const handleExportProjectJson = (project: Project) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_clipping_project.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-zinc-50/60 text-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <span>AI Clipper</span>
              <span>/</span>
              <span className="text-zinc-900 font-semibold">Project History</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-2.5">
              <FolderOpen className="w-7 h-7 text-[#E32636]" />
              Project Archive & History
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              All clipping projects and timestamp records stored locally in your browser's IndexedDB.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenStudio}
              className="px-4 py-2 text-xs font-bold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] rounded-xl shadow-sm transition-colors inline-flex items-center gap-2"
            >
              <Scissors className="w-4 h-4" />
              <span>Open Studio</span>
            </button>
          </div>
        </div>

        {/* Aggregate Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs">
            <span className="text-xs text-zinc-500 font-medium block">Total Projects</span>
            <span className="text-2xl font-extrabold text-zinc-900 font-mono mt-1 block">
              {projects.length}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs">
            <span className="text-xs text-zinc-500 font-medium block">Total Clips Created</span>
            <span className="text-2xl font-extrabold text-[#E32636] font-mono mt-1 block">
              {totalClips}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs">
            <span className="text-xs text-zinc-500 font-medium block">Total Time Clipped</span>
            <span className="text-2xl font-extrabold text-zinc-900 font-mono mt-1 block">
              {formatSecondsToTime(totalDurationClipped)}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs">
            <span className="text-xs text-zinc-500 font-medium block">IndexedDB Storage</span>
            <span className="text-2xl font-extrabold text-zinc-900 font-mono mt-1 block">
              {formatBytes(storageInfo?.usage || 0)}
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, clips or filenames..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#E32636] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort & Bulk Clear */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="text-zinc-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#E32636]"
              >
                <option value="newest">Recently Updated</option>
                <option value="oldest">Oldest First</option>
                <option value="clips">Most Clips</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>

            {projects.length > 0 && (
              <>
                {showClearConfirm ? (
                  <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-lg border border-red-200">
                    <span className="text-[11px] text-red-700 font-semibold px-1">Delete all?</span>
                    <button
                      onClick={() => {
                        onClearAllHistory();
                        setShowClearConfirm(false);
                      }}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded"
                    >
                      Yes, Clear
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2 py-0.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-[11px] rounded"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                    title="Clear all project history from browser"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Projects Cards List */}
        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-zinc-300 p-8">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#E32636] flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 stroke-[1.8]" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">No Projects in History</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Once you upload videos and save clipping projects, your full history and timestamp records will be preserved here.
              </p>
              <button
                onClick={onOpenStudio}
                className="mt-6 px-5 py-2.5 text-xs font-bold text-white bg-[#E32636] hover:bg-[#cb1f2e] rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5" />
                Launch Clipper Studio
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-zinc-200 text-zinc-500 text-xs">
              No projects match "{searchQuery}".
            </div>
          ) : (
            filteredProjects.map((project) => {
              const isActive = project.id === activeProjectId;
              const dateStr = new Date(project.updatedAt || project.createdAt).toLocaleDateString(
                undefined,
                { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
              );

              return (
                <motion.div
                  layout
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-white rounded-xl border p-5 transition-all shadow-2xs hover:shadow-xs ${
                    isActive ? 'border-[#E32636] ring-2 ring-[#E32636]/10' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Project Identity */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        {editingId === project.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="px-2.5 py-1 text-sm font-bold border border-[#E32636] rounded-md focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(project.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveRename(project.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3
                              className="text-base font-bold text-zinc-950 truncate hover:text-[#E32636] cursor-pointer transition-colors"
                              onClick={() => onSelectProject(project.id)}
                            >
                              {project.name}
                            </h3>
                            <button
                              onClick={() => startRename(project)}
                              className="text-zinc-400 hover:text-zinc-600 p-0.5"
                              title="Rename project"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isActive && (
                              <span className="text-[10px] uppercase font-bold text-[#E32636] bg-red-100/80 px-2 py-0.5 rounded-full">
                                Active in Studio
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                        {project.metadata?.filename && (
                          <span className="flex items-center gap-1.5 text-zinc-700 font-medium">
                            <Film className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="truncate max-w-xs">{project.metadata.filename}</span>
                          </span>
                        )}

                        {project.metadata && (
                          <>
                            <span className="font-mono">{project.metadata.width}×{project.metadata.height}</span>
                            <span>·</span>
                            <span className="font-mono">{formatBytes(project.metadata.fileSize)}</span>
                            <span>·</span>
                            <span className="font-mono">{formatSecondsToTime(project.metadata.duration)}</span>
                          </>
                        )}

                        <span className="flex items-center gap-1 text-zinc-400">
                          <Calendar className="w-3 h-3" />
                          {dateStr}
                        </span>
                      </div>

                      {/* Clips Pill Strip */}
                      {project.clips && project.clips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-zinc-100">
                          <span className="text-[11px] font-semibold text-zinc-400 mr-1">
                            {project.clips.length} {project.clips.length === 1 ? 'clip' : 'clips'}:
                          </span>
                          {project.clips.slice(0, 5).map((c) => (
                            <span
                              key={c.id}
                              className="text-[11px] font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-700 flex items-center gap-1"
                            >
                              <span className="font-sans font-semibold truncate max-w-[120px]">{c.title}</span>
                              <span className="text-zinc-400">({c.durationFormatted})</span>
                            </span>
                          ))}
                          {project.clips.length > 5 && (
                            <span className="text-[11px] text-zinc-400">
                              +{project.clips.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      <button
                        onClick={() => handleExportProjectJson(project)}
                        className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition-colors"
                        title="Export project configuration JSON"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteProject(project.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-zinc-200 hover:border-red-200"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onSelectProject(project.id)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-zinc-200 text-zinc-800'
                            : 'bg-[#E32636] hover:bg-[#cb1f2e] text-white shadow-2xs'
                        }`}
                      >
                        <span>{isActive ? 'Continue in Studio' : 'Open in Studio'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
