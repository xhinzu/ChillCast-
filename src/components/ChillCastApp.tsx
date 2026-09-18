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
  const [showLyrics, setShowLyrics] = useState<boolean>(false);
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
          showLyrics={showLyrics}
          setShowLyrics={setShowLyrics}
        />

        <SpotifyMainContent
          activeView={activeView}
          setActiveView={setActiveView}
          showLyrics={showLyrics}
          setShowLyrics={setShowLyrics}
          showVideo={showVideo}
          setShowVideo={setShowVideo}
          searchQuery={searchQuery}
        />
      </div>

      {/* 3. Bottom Persistent Spotify Playback Bar */}
      <SpotifyBottomPlayer
        showLyrics={showLyrics}
        setShowLyrics={setShowLyrics}
        showVideo={showVideo}
        setShowVideo={setShowVideo}
        activeView={activeView}
        setActiveView={setActiveView}
      />
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
