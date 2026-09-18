'use client';

import React, { useEffect, useState } from 'react';
import { PlaybackProvider, usePlayback } from '@/context/PlaybackContext';
import { AmbientProvider } from '@/context/AmbientContext';
import SpotifyTopNav from '@/components/spotify/SpotifyTopNav';
import SpotifySidebar from '@/components/spotify/SpotifySidebar';
import SpotifyMainContent from '@/components/spotify/SpotifyMainContent';
import SpotifyBottomPlayer from '@/components/spotify/SpotifyBottomPlayer';

function ChillifyShell() {
  const { togglePlay } = usePlayback();
  const [activeView, setActiveView] = useState<string>('home');
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Global spacebar hotkey for Spotify play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden select-none font-sans">
      {/* 1. Spotify Top Navigation Bar */}
      <SpotifyTopNav
        activeView={activeView}
        setActiveView={setActiveView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 2. Main Middle Split Layout: Left Sidebar + Main Scrollable Area */}
      <div className="flex-1 flex px-2 gap-2 overflow-hidden min-h-0">
        <SpotifySidebar
          activeView={activeView}
          setActiveView={setActiveView}
        />

        <SpotifyMainContent
          activeView={activeView}
          setActiveView={setActiveView}
          showVideo={showVideo}
          setShowVideo={setShowVideo}
          searchQuery={searchQuery}
        />
      </div>

      {/* 3. Bottom Persistent Spotify Playback Bar */}
      <SpotifyBottomPlayer
        showVideo={showVideo}
        setShowVideo={setShowVideo}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* 4. Permanent YouTube Player Container (Never destroyed by React) */}
      <div
        id="chillcast-yt-wrapper"
        className={`fixed z-40 transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-[#282828] bg-black ${
          showVideo
            ? 'bottom-[85px] md:bottom-24 right-4 md:right-6 w-72 h-40 md:w-80 md:h-48 lg:w-96 lg:h-56 opacity-100 pointer-events-auto'
            : 'w-1 h-1 -left-[9999px] -top-[9999px] opacity-0 pointer-events-none'
        }`}
      >
        <div id="chillcast-yt-player" className="w-full h-full" />
      </div>
    </div>
  );
}

export default function ChillCastApp() {
  return (
    <PlaybackProvider>
      <AmbientProvider>
        <ChillifyShell />
      </AmbientProvider>
    </PlaybackProvider>
  );
}
