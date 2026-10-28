'use client';

import React from 'react';
import { useAmbient } from '@/context/AmbientContext';

interface MobileTabBarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function MobileTabBar({
  activeView,
  setActiveView,
  setSearchQuery,
}: MobileTabBarProps) {
  const { activeCount } = useAmbient();
  const isHome = activeView === 'home';
  const isAmbience = activeView === 'ambience' || activeView === 'mixer';
  const isPlaylists = activeView === 'playlists' || activeView.startsWith('playlist:');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[54px] bg-[#0c0b10] border-t border-[#24202c] flex items-center justify-around z-50">
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => {
          setActiveView('home');
          setSearchQuery('');
        }}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isHome ? 'text-[#ff7518]' : 'text-[#777777]'
        }`}
      >
        <span className="text-lg">🎃</span>
        <span className="text-[10px] font-semibold">Home</span>
      </button>

      {/* 2. Ambience */}
      <button
        type="button"
        onClick={() => setActiveView('ambience')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer relative ${
          isAmbience ? 'text-[#ff7518]' : 'text-[#777777]'
        }`}
      >
        <div className="relative">
          <span className="text-lg">🦇</span>
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#ff7518] shadow-sm shadow-[#ff7518]" />
          )}
        </div>
        <span className="text-[10px] font-semibold">Ambience</span>
      </button>

      {/* 3. Playlist */}
      <button
        type="button"
        onClick={() => setActiveView('playlists')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isPlaylists ? 'text-[#ff7518]' : 'text-[#777777]'
        }`}
      >
        <span className="text-lg">💀</span>
        <span className="text-[10px] font-semibold">Playlists</span>
      </button>
    </nav>
  );
}
