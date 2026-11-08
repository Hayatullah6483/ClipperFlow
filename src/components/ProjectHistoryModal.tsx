/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  FolderOpen,
  Trash2,
  Clock,
  Film,
  ExternalLink,
  AlertCircle,
  FileCheck,
  Edit2,
  Check,
} from 'lucide-react';
import { Project } from '../types';
import { formatBytes } from '../utils/fileValidation';
import { formatSecondsToTime } from '../utils/timeFormat';

interface ProjectHistoryModalProps {
  projects: Project[];
  activeProjectId?: string;
  onSelectProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteProject: (projectId: string) => void;
  onClearAllHistory: () => void;
  onClose: () => void;
}

export const ProjectHistoryModal: React.FC<ProjectHistoryModalProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onRenameProject,
  onDeleteProject,
  onClearAllHistory,
  onClose,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 max-h-[85vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Project History</h2>
              <p className="text-xs text-zinc-500">
                IndexedDB browser storage ({projects.length} {projects.length === 1 ? 'project' : 'projects'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice on browser storage */}
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-200/60 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Project and clip configurations are stored securely inside your browser's IndexedDB. Reopening a project will restore your clip timestamps and titles. If the video file is not already in memory, you'll be prompted to re-link your source video.
          </p>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {projects.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              <FolderOpen className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <p className="font-semibold text-zinc-700">No saved projects yet</p>
              <p className="text-xs text-zinc-400 mt-1">
                Upload a video and create clips; your projects will appear here automatically.
              </p>
            </div>
          ) : (
            projects.map((project) => {
              const isActive = project.id === activeProjectId;
              const dateStr = new Date(project.updatedAt || project.createdAt).toLocaleDateString(
                undefined,
                { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
              );

              return (
                <div
                  key={project.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-[#E32636] bg-red-50/15'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {editingId === project.id ? (
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2 py-1 text-sm font-bold border border-[#E32636] rounded focus:outline-none"
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
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3
                            className="text-sm font-bold text-zinc-900 truncate cursor-pointer hover:text-[#E32636]"
                            onClick={() => {
                              onSelectProject(project.id);
                              onClose();
                            }}
                          >
                            {project.name}
                          </h3>
                          <button
                            onClick={() => startRename(project)}
                            className="text-zinc-400 hover:text-zinc-600 p-0.5"
                            title="Rename project"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {isActive && (
                            <span className="text-[10px] uppercase font-bold text-[#E32636] bg-red-100/70 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500">
                        {project.metadata?.filename && (
                          <span className="flex items-center gap-1 text-zinc-700 font-medium">
                            <Film className="w-3 h-3 text-zinc-400" />
                            {project.metadata.filename}
                          </span>
                        )}
                        <span>{project.clips.length} {project.clips.length === 1 ? 'clip' : 'clips'}</span>
                        <span>·</span>
                        <span>Updated {dateStr}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onSelectProject(project.id);
                          onClose();
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          isActive
                            ? 'bg-zinc-200 text-zinc-800'
                            : 'bg-[#E32636] hover:bg-[#cb1f2e] text-white'
                        }`}
                      >
                        {isActive ? 'Current' : 'Open'}
                      </button>

                      <button
                        onClick={() => onDeleteProject(project.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Clear All History */}
        {projects.length > 0 && (
          <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs">
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-red-700 font-semibold">Delete all project history?</span>
                <button
                  onClick={() => {
                    onClearAllHistory();
                    setShowClearConfirm(false);
                  }}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
                >
                  Confirm Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2.5 py-1 bg-zinc-200 text-zinc-700 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:underline font-medium"
              >
                Clear all project history
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-zinc-300 rounded-lg font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
