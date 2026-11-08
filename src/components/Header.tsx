/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Scissors, LogOut } from 'lucide-react';
import { ActiveTab } from '../types';
import { User } from '../services/firebaseService';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  currentProjectName?: string;
  hasActiveVideo?: boolean;
  onNewProject?: () => void;
  user?: User | null;
  onSignInGoogle?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenHelp,
  user,
  onSignInGoogle,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onTabChange('landing')}
          className="text-lg font-extrabold tracking-tight text-zinc-950 hover:text-[#E32636] transition-colors whitespace-nowrap shrink-0 focus:outline-none"
        >
          AI Clipper
        </button>

        {/* Zone 2: 4–5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
          <button
            onClick={() => onTabChange('landing')}
            className={`hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'landing' ? 'text-zinc-950 font-bold underline underline-offset-8 decoration-[#E32636] decoration-2' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onTabChange('studio')}
            className={`hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'studio' ? 'text-zinc-950 font-bold underline underline-offset-8 decoration-[#E32636] decoration-2' : ''
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'history' ? 'text-zinc-950 font-bold underline underline-offset-8 decoration-[#E32636] decoration-2' : ''
            }`}
          >
            History
          </button>
          <button
            onClick={onOpenHelp}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            Guide
          </button>
          <button
            onClick={onOpenSettings}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: 1 primary action (Google Sign In or User Session Action) */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              onClick={onSignOut}
              className="px-4 py-2 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 border border-zinc-200"
              title={`Signed in as ${user.displayName || user.email}. Click to sign out.`}
            >
              <span className="truncate max-w-[140px]">
                {user.displayName || user.email || 'Account'}
              </span>
              <LogOut className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          ) : (
            <button
              onClick={onSignInGoogle}
              className="px-4 py-2 text-xs font-bold text-white bg-[#E32636] hover:bg-[#cb1f2e] active:bg-[#b01a27] rounded-lg shadow-2xs transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
