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
  const isVinyl = activeView === 'vinyl';
  const isLyrics = activeView === 'lyrics';
  const isAmbience = activeView === 'ambience' || activeView === 'mixer';
  const isPlaylists = activeView === 'playlists' || activeView.startsWith('playlist:');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[54px] bg-[#0c0c0c] border-t border-[#1e1e1e] flex items-center justify-around z-50">
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => {
          setActiveView('home');
          setSearchQuery('');
        }}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isHome ? 'text-white' : 'text-[#777777]'
        }`}
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h5v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6h5V7.577l-7.5-4.33z" />
        </svg>
        <span className="text-[10px] font-semibold">Home</span>
      </button>

      {/* 2. Dual Vinyl */}
      <button
        type="button"
        onClick={() => {
          setActiveView('vinyl');
          setSearchQuery('');
        }}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isVinyl ? 'text-white font-bold' : 'text-[#777777]'
        }`}
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
        </svg>
        <span className="text-[10px] font-semibold">Vinyl</span>
      </button>

      {/* 3. Lyrics */}
      <button
        type="button"
        onClick={() => {
          setActiveView('lyrics');
          setSearchQuery('');
        }}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isLyrics ? 'text-white font-bold' : 'text-[#777777]'
        }`}
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
        <span className="text-[10px] font-semibold">Lyrics</span>
      </button>

      {/* 3. Ambience */}
      <button
        type="button"
        onClick={() => {
          setActiveView('ambience');
          setSearchQuery('');
        }}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer relative ${
          isAmbience ? 'text-white font-bold' : 'text-[#777777]'
        }`}
      >
        <div className="relative">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
          </svg>
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-white shadow-sm" />
          )}
        </div>
        <span className="text-[10px] font-semibold">Ambience</span>
      </button>

      {/* 4. Playlists */}
      <button
        type="button"
        onClick={() => {
          setActiveView('playlists');
          setSearchQuery('');
        }}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isPlaylists ? 'text-white' : 'text-[#777777]'
        }`}
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
        </svg>
        <span className="text-[10px] font-semibold">Playlists</span>
      </button>
    </nav>
  );
}
