'use client';

import React, { useEffect, useState } from 'react';
import { PlaybackProvider, usePlayback } from '@/context/PlaybackContext';
import { AmbientProvider } from '@/context/AmbientContext';
import SpotifyTopNav from '@/components/spotify/SpotifyTopNav';
import SpotifySidebar from '@/components/spotify/SpotifySidebar';
import SpotifyMainContent from '@/components/spotify/SpotifyMainContent';
import SpotifyBottomPlayer from '@/components/spotify/SpotifyBottomPlayer';
import MobileTabBar from '@/components/spotify/MobileTabBar';
import SpotifyNowPlayingPanel from '@/components/spotify/SpotifyNowPlayingPanel';

function ChillifyShell() {
  const { togglePlay, currentTrack } = usePlayback();
  const [activeView, setActiveView] = useState<string>('home');
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNowPlaying, setShowNowPlaying] = useState<boolean>(true);

  // Global spacebar hotkey for play/pause
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
    // Use h-dvh so mobile browser chrome (address bar) is accounted for
    <div className="h-[100dvh] w-screen bg-black text-white flex flex-col overflow-hidden select-none font-sans">

      {/* 1. Top Navigation Bar */}
      <SpotifyTopNav
        activeView={activeView}
        setActiveView={setActiveView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 2. Main Middle: Sidebar + Main Discovery Content + Right-side Now Playing Panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar — hidden on mobile, visible on md+ (17-19% width) */}
        <div className="hidden md:flex px-2 py-2 h-full shrink-0">
          <SpotifySidebar
            activeView={activeView}
            setActiveView={setActiveView}
            setSearchQuery={setSearchQuery}
          />
        </div>

        {/* Center main scrollable content area (55-60% width) */}
        <div className="flex-1 overflow-hidden min-h-0 md:px-2 md:py-2">
          <SpotifyMainContent
            activeView={activeView}
            setActiveView={setActiveView}
            showVideo={showVideo}
            setShowVideo={setShowVideo}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            extraBottomPadding={currentTrack ? 'pb-[130px] md:pb-0' : 'pb-[64px] md:pb-0'}
            onToggleNowPlaying={() => setShowNowPlaying((prev) => !prev)}
            isNowPlayingOpen={showNowPlaying}
          />
        </div>

        {/* Right Persistent Now Playing Panel (22-25% width on xl+, toggleable) */}
        {showNowPlaying && (
          <div className="hidden xl:flex px-2 py-2 h-full shrink-0">
            <SpotifyNowPlayingPanel
              onClose={() => setShowNowPlaying(false)}
            />
          </div>
        )}
      </div>

      {/* 3. Bottom Player Bar */}
      <div className="md:block shrink-0">
        <SpotifyBottomPlayer
          showVideo={showVideo}
          setShowVideo={setShowVideo}
          activeView={activeView}
          setActiveView={setActiveView}
          onToggleNowPlaying={() => setShowNowPlaying((prev) => !prev)}
          isNowPlayingOpen={showNowPlaying}
        />
      </div>

      {/* 4. Mobile-only bottom tab bar — fixed at very bottom */}
      <MobileTabBar
        activeView={activeView}
        setActiveView={setActiveView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 5. Permanent YouTube Player Container */}
      <div
        id="chillcast-yt-wrapper"
        className={`fixed z-40 transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-[#282828] bg-black ${
          showVideo
            ? 'bottom-[120px] md:bottom-24 right-4 md:right-6 w-72 h-40 md:w-80 md:h-48 lg:w-96 lg:h-56 opacity-100 pointer-events-auto'
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
