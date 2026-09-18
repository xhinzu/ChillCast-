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
  searchQuery,
  setSearchQuery,
}: MobileTabBarProps) {
  const { activeCount } = useAmbient();

  const isSearch = activeView === 'search' || searchQuery.trim().length > 0;
  const isMixer = activeView === 'mixer';
  const isHome = !isSearch && !isMixer && !activeView.startsWith('playlist:');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[54px] bg-[#0a0a0a] border-t border-[#1a1a1a] flex items-center justify-around z-50 safe-area-inset-bottom">
      {/* Home */}
      <button
        type="button"
        onClick={() => {
          setActiveView('home');
          setSearchQuery('');
        }}
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

      {/* Search */}
      <button
        type="button"
        onClick={() => setActiveView('search')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isSearch ? 'text-white' : 'text-[#6b6b6b]'
        }`}
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          {isSearch ? (
            <path d="M10.533 1.278a9.255 9.255 0 1 0 5.765 16.486l4.989 4.989a.75.75 0 0 0 1.06-1.06l-4.989-4.99a9.255 9.255 0 0 0-6.825-15.425z" />
          ) : (
            <path d="M10.533 1.278a9.255 9.255 0 1 0 5.765 16.486l4.989 4.989a.75.75 0 0 0 1.06-1.06l-4.989-4.99a9.255 9.255 0 0 0-6.825-15.425zm-7.755 9.255a7.755 7.755 0 1 1 15.51 0 7.755 7.755 0 0 1-15.51 0z" />
          )}
        </svg>
        <span className="text-[10px] font-semibold">Search</span>
      </button>

      {/* Mixer */}
      <button
        type="button"
        onClick={() => setActiveView(isMixer ? 'home' : 'mixer')}
        className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors cursor-pointer ${
          isMixer ? 'text-white' : 'text-[#6b6b6b]'
        }`}
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M3 5.75A.75.75 0 0 1 3.75 5h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75zm0 6.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12zm0 6.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75z" />
        </svg>
        {activeCount > 0 && (
          <span className="absolute top-2 right-[calc(50%-8px)] w-2 h-2 rounded-full bg-[#1d90f5] shadow shadow-[#1d90f5]" />
        )}
        <span className="text-[10px] font-semibold">Mixer</span>
      </button>
    </nav>
  );
}
