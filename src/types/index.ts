/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VideoMetadata {
  filename: string;
  fileSize: number;
  duration: number; // in seconds
  width: number;
  height: number;
  aspectRatio: string;
  mimeType: string;
  format: string;
  fps?: number;
  hasAudio: boolean;
  audioChannelCount?: number;
  sampleRate?: number;
}

export type ProcessingMode = 'stream-copy' | 'accurate-reencode';

export type ClipStatus = 'pending' | 'processing' | 'ready' | 'error';

export type ActiveTab = 'landing' | 'studio' | 'history';

export interface Clip {
  id: string;
  projectId: string;
  title: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  duration: number; // in seconds
  startTimeFormatted: string; // HH:MM:SS
  endTimeFormatted: string; // HH:MM:SS
  durationFormatted: string; // HH:MM:SS
  processingMode: ProcessingMode;
  status: ClipStatus;
  progress: number; // 0 to 100
  progressMessage?: string;
  blobUrl?: string;
  blobSize?: number;
  thumbnailUrl?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  metadata?: VideoMetadata;
  thumbnailUrl?: string;
  clips: Clip[];
}

export interface TimestampValidation {
  isValid: boolean;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  errorMessage?: string;
}

export interface StorageInfo {
  quota?: number;
  usage?: number;
  percentageUsed?: number;
}

export interface FirebaseOptionalConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  appId?: string;
  isEnabled: boolean;
}
