/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project, StorageInfo, FirebaseOptionalConfig } from '../types';

interface AIClipperDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updated': number };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'ai-clipper-database';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AIClipperDB>> | null = null;

function getDB(): Promise<IDBPDatabase<AIClipperDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AIClipperDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Saves or updates a project in IndexedDB
 * Note: large blob URLs are transient and stripped before persistence to avoid quota errors.
 */
export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  
  // Clone and sanitize clips so we don't store transient blob URLs in IndexedDB
  const sanitizedClips = project.clips.map((clip) => {
    const { blobUrl, ...rest } = clip;
    return rest;
  });

  const projectToSave: Project = {
    ...project,
    updatedAt: Date.now(),
    clips: sanitizedClips as any,
  };

  await db.put('projects', projectToSave);
}

/**
 * Retrieves a project by ID
 */
export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

/**
 * Returns all saved projects, sorted by most recently updated
 */
export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  const projects = await db.getAllFromIndex('projects', 'by-updated');
  return projects.reverse(); // Newest first
}

/**
 * Deletes a project by ID
 */
export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

/**
 * Clears all projects from IndexedDB
 */
export async function clearAllProjects(): Promise<void> {
  const db = await getDB();
  await db.clear('projects');
}

/**
 * Gets storage quota information from the browser
 */
export async function getStorageQuota(): Promise<StorageInfo> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const percentageUsed = quota > 0 ? (usage / quota) * 100 : 0;
      return { quota, usage, percentageUsed };
    } catch (e) {
      console.warn('Storage estimate failed:', e);
    }
  }
  return { quota: 0, usage: 0, percentageUsed: 0 };
}

/**
 * Saves custom setting value
 */
export async function saveSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', value, key);
}

/**
 * Retrieves a custom setting value
 */
export async function getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  try {
    const db = await getDB();
    const val = await db.get('settings', key);
    return val !== undefined ? val : defaultValue;
  } catch {
    return defaultValue;
  }
}
