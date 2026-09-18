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
  const isHome = activeView === 'home' || activeView === 'search';
  const isPlaylists = activeView === 'playlists';
  const isLiked = activeView === 'playlist:liked-songs';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[54px] bg-[#0a0a0a] border-t border-[#1a1a1a] flex items-center justify-around z-50">
      {/* Home */}
      <button
        type="button"
        onClick={() => setActiveView('home')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isHome ? 'text-white' : 'text-[#6b6b6b]'
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

      {/* Playlists */}
      <button
        type="button"
        onClick={() => setActiveView('playlists')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isPlaylists ? 'text-white' : 'text-[#6b6b6b]'
        }`}
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          {isPlaylists ? (
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
          ) : (
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
          )}
        </svg>
        <span className="text-[10px] font-semibold">Playlists</span>
      </button>

      {/* Liked Songs */}
      <button
        type="button"
        onClick={() => setActiveView('playlist:liked-songs')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isLiked ? 'text-[#1d90f5]' : 'text-[#6b6b6b]'
        }`}
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          {isLiked ? (
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          ) : (
            <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
          )}
        </svg>
        <span className="text-[10px] font-semibold">Liked</span>
      </button>
    </nav>
  );
}
