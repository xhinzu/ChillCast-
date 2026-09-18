'use client';

import React from 'react';
import { usePlayback } from '@/context/PlaybackContext';

interface SpotifyTopNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function SpotifyTopNav({
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
}: SpotifyTopNavProps) {
  const { playbackState } = usePlayback();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim() && activeView !== 'search') {
      setActiveView('search');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (activeView === 'search') {
      setActiveView('home');
    }
  };

  return (
    <header className="h-14 w-full bg-black flex items-center justify-between px-4 sm:px-6 shrink-0 z-40 select-none">
      {/* Left: Brand & Navigation arrows */}
      <div className="flex items-center gap-4">
        <div
          onClick={() => {
            setActiveView('home');
            setSearchQuery('');
          }}
          className="flex items-center gap-2 cursor-pointer group"
          title="Chillify Home"
        >
          {/* Spotify Wave Icon in Electric Blue */}
          <div className="w-8 h-8 rounded-full bg-[#1d90f5] flex items-center justify-center text-black shadow-md transition-transform group-hover:scale-105">
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 0 1-.858.207c-2.35-1.436-5.308-1.76-8.794-.963a.625.625 0 0 1-.28-1.218c3.815-.873 7.078-.504 9.725 1.116.295.18.388.567.207.858zm1.224-2.723a.782.782 0 0 1-1.077.257c-2.69-1.654-6.79-2.133-9.972-1.167a.782.782 0 0 1-.462-1.493c3.637-1.104 8.163-.574 11.254 1.326.37.228.487.712.257 1.077zm.105-2.836C14.692 8.95 9.38 8.773 6.302 9.708a.938.938 0 1 1-.548-1.794c3.518-1.069 9.387-.864 13.13 1.36a.938.938 0 0 1-1.029 1.59z" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
              Chillify
            </span>
            <span className="text-base">🥰</span>
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="hidden sm:flex items-center gap-2 ml-2">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#242424] text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Go to Home"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setActiveView(activeView === 'home' ? 'mixer' : 'home')}
            className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#242424] text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Toggle View"
          >
            ›
          </button>
        </div>
      </div>

      {/* Center: Functional YouTube Music Search Bar */}
      <div className="flex-1 max-w-lg mx-4">
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-[#b3b3b3] text-sm pointer-events-none">
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.533 1.278a9.255 9.255 0 1 0 5.765 16.486l4.989 4.989a.75.75 0 0 0 1.06-1.06l-4.989-4.99a9.255 9.255 0 0 0-6.825-15.425zm-7.755 9.255a7.755 7.755 0 1 1 15.51 0 7.755 7.755 0 0 1-15.51 0z" />
            </svg>
          </span>

          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (searchQuery.trim() && activeView !== 'search') {
                setActiveView('search');
              }
            }}
            placeholder="Search YouTube music, lo-fi beats, songs..."
            className="w-full h-10 rounded-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white placeholder-[#b3b3b3] text-xs pl-10 pr-9 outline-none border border-transparent focus:border-[#1d90f5] transition-all"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 text-[#b3b3b3] hover:text-white text-xs cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right: Status indicator & Profile */}
      <div className="flex items-center gap-3">
        {/* Playback status pulse */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#181818] border border-[#282828] text-xs text-[#b3b3b3]">
          <span
            className={`w-2 h-2 rounded-full ${
              playbackState === 'playing'
                ? 'bg-[#1d90f5] animate-pulse'
                : 'bg-zinc-600'
            }`}
          />
          <span className="capitalize text-[11px] font-medium">{playbackState}</span>
        </div>

        {/* User Profile Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-[#282828] hover:scale-105 transition-transform flex items-center justify-center text-xs font-bold text-white border border-[#3e3e3e] cursor-pointer shadow-md"
          title="Chillify User"
        >
          ☕
        </div>
      </div>
    </header>
  );
}
