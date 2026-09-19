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
}: MobileTabBarProps) {
  const { activeCount } = useAmbient();
  const isHome = activeView === 'home' || activeView === 'search';
  const isAmbience = activeView === 'ambience' || activeView === 'mixer';
  const isPlaylists = activeView === 'playlists' || activeView.startsWith('playlist:');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[54px] bg-[#0a0a0a] border-t border-[#1a1a1a] flex items-center justify-around z-50">
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => setActiveView('home')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isHome ? 'text-white' : 'text-[#777777]'
        }`}
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          {isHome ? (
            <path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h5v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6h5V7.577l-7.5-4.33z" />
          ) : (
            <path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h5v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6h5V7.577l-7.5-4.33zm-8.83 5.148 7.33-4.23a2 2 0 0 1 2 0l7.33 4.23A1 1 0 0 1 21 9.247V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.247a1 1 0 0 1 .67-.952z" />
          )}
        </svg>
        <span className="text-[10px] font-semibold">Home</span>
      </button>

      {/* 2. Ambience */}
      <button
        type="button"
        onClick={() => setActiveView('ambience')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer relative ${
          isAmbience ? 'text-[#1d90f5]' : 'text-[#777777]'
        }`}
      >
        <div className="relative">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
          </svg>
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#1d90f5] shadow-sm shadow-[#1d90f5]" />
          )}
        </div>
        <span className="text-[10px] font-semibold">Ambience</span>
      </button>

      {/* 3. Playlist */}
      <button
        type="button"
        onClick={() => setActiveView('playlists')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isPlaylists ? 'text-white' : 'text-[#777777]'
        }`}
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
        </svg>
        <span className="text-[10px] font-semibold">Playlist</span>
      </button>
    </nav>
  );
}
