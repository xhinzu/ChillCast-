'use client';

import React from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { AdapterType } from '@/types/playback';

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
  const { activeAdapterType, switchAdapter, playbackState } = usePlayback();

  return (
    <header className="h-14 w-full bg-black flex items-center justify-between px-4 sm:px-6 shrink-0 z-40 select-none">
      {/* Left: Brand & Navigation arrows */}
      <div className="flex items-center gap-4">
        <div
          onClick={() => setActiveView('home')}
          className="flex items-center gap-2 cursor-pointer group"
          title="Chillify Home"
        >
          {/* Spotify Wave Icon in Green */}
          <div className="w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center text-black shadow-md transition-transform group-hover:scale-105">
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

        {/* Browser-style nav pills */}
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
            title="Next View"
          >
            ›
          </button>
        </div>
      </div>

      {/* Center: Spotify-style Search Input */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-[#b3b3b3] text-sm">
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="What do you want to play?"
            className="w-full h-10 rounded-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white placeholder-[#b3b3b3] text-xs pl-10 pr-4 outline-none border border-transparent focus:border-white transition-all"
          />
        </div>
      </div>

      {/* Right: Adapter Badges, Views & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Adapter Switcher Dropdown / Pills */}
        <div className="flex items-center bg-[#181818] p-1 rounded-full border border-[#282828] text-xs">
          {(['local', 'youtube', 'spotify'] as AdapterType[]).map((type) => {
            const isActive = activeAdapterType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => switchAdapter(type)}
                className={`px-2.5 py-1 rounded-full capitalize font-medium text-[11px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1db954] text-black font-bold shadow-sm'
                    : 'text-[#b3b3b3] hover:text-white'
                }`}
              >
                {type === 'youtube' ? 'YouTube' : type}
              </button>
            );
          })}
        </div>

        {/* State pulse */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181818] border border-[#282828] text-[11px] text-[#b3b3b3]">
          <span
            className={`w-2 h-2 rounded-full ${
              playbackState === 'playing'
                ? 'bg-[#1db954] animate-pulse'
                : 'bg-zinc-600'
            }`}
          />
          <span className="capitalize">{playbackState}</span>
        </div>

        {/* User Profile avatar */}
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
