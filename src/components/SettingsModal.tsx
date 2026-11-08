/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  HardDrive,
  Database,
  ShieldCheck,
  Check,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { StorageInfo, FirebaseOptionalConfig } from '../types';
import { getStorageQuota, getSetting, saveSetting } from '../services/indexedDbService';
import { formatBytes } from '../utils/fileValidation';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({});
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseOptionalConfig>({
    isEnabled: false,
    apiKey: '',
    projectId: '',
    authDomain: '',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Load storage quota
    getStorageQuota().then((info) => setStorageInfo(info));

    // Load saved settings
    getSetting<FirebaseOptionalConfig>('firebase_optional_config', {
      isEnabled: false,
      apiKey: '',
      projectId: '',
    }).then((config) => {
      if (config) setFirebaseConfig(config);
    });
  }, []);

  const handleSaveSettings = async () => {
    await saveSetting('firebase_optional_config', firebaseConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Application Settings</h2>
              <p className="text-xs text-zinc-500">Local storage & optional cloud configuration</p>
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
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Browser Storage Quota Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <HardDrive className="w-4 h-4 text-zinc-700" />
              <h3>Browser Storage & Memory</h3>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>IndexedDB Usage:</span>
                <span className="font-mono font-semibold text-zinc-900">
                  {formatBytes(storageInfo.usage || 0)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Available Browser Quota:</span>
                <span className="font-mono font-semibold text-zinc-900">
                  {formatBytes(storageInfo.quota || 0)}
                </span>
              </div>

              {storageInfo.quota && storageInfo.quota > 0 && (
                <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#E32636] h-1.5 rounded-full"
                    style={{ width: `${Math.min(storageInfo.percentageUsed || 0, 100)}%` }}
                  />
                </div>
              )}

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Clips and video processing run entirely in client RAM and IndexedDB. Processing a 5 GB video requires at least 4 GB of free physical memory on your operating system.
              </p>
            </div>
          </div>

          {/* Privacy & Zero-Server Notice */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900">Zero Server Transmission</p>
              <p className="text-emerald-700 mt-0.5 leading-relaxed">
                Core video cutting NEVER transmits any video pixels, audio frames, or media files to Firebase, Google, or any remote servers. Your videos stay 100% on your machine.
              </p>
            </div>
          </div>

          {/* Optional Firebase Section */}
          <div className="space-y-3 border-t border-zinc-200 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                <Database className="w-4 h-4 text-zinc-700" />
                <h3>Optional Firebase Sync</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={firebaseConfig.isEnabled}
                  onChange={(e) =>
                    setFirebaseConfig({ ...firebaseConfig, isEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E32636]"></div>
              </label>
            </div>

            <p className="text-xs text-zinc-500">
              Firebase is completely optional. If enabled, only user settings and clip title histories can be synced across devices with explicit consent.
            </p>

            {firebaseConfig.isEnabled && (
              <div className="space-y-3 bg-zinc-50 border border-zinc-200 p-4 rounded-xl text-xs">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Firebase Project ID
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig.projectId || ''}
                    onChange={(e) =>
                      setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })
                    }
                    placeholder="my-firebase-project"
                    className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md focus:outline-none focus:border-[#E32636]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Firebase API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={firebaseConfig.apiKey || ''}
                    onChange={(e) =>
                      setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })
                    }
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md focus:outline-none focus:border-[#E32636]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Settings Saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100"
            >
              Close
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#E32636] hover:bg-[#cb1f2e] rounded-lg shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
