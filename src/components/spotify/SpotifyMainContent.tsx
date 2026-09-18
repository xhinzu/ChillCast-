'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { useAmbient } from '@/context/AmbientContext';
import { YouTubeSearchResult } from '@/app/api/youtube/search/route';
import { SavedPlaylistItem } from './AddSourceModal';
import SpotifyLyricsView from './SpotifyLyricsView';

interface SpotifyMainContentProps {
  activeView: string;
  setActiveView: (view: string) => void;
  showLyrics: boolean;
  setShowLyrics: (show: boolean) => void;
  showVideo: boolean;
  setShowVideo: (show: boolean) => void;
  searchQuery: string;
}

const STORAGE_KEY = 'chillify_saved_playlists';

export default function SpotifyMainContent({
  activeView,
  setActiveView,
  showLyrics,
  setShowLyrics,
  showVideo,
  setShowVideo,
  searchQuery,
}: SpotifyMainContentProps) {
  const {
    activeAdapterType,
    errorMessage,
    switchAdapter,
    loadPlaylist,
  } = usePlayback();

  const {
    ambientSounds,
    soundStates,
    masterVolume,
    isMasterMuted,
    activeCount,
    toggleSound,
    setSoundVolume,
    toggleSoundMute,
    setMasterVolume,
    toggleMasterMute,
    applyPreset,
  } = useAmbient();

  // YouTube Search States
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Dynamic greeting based on time of day
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.results)) {
            setSearchResults(data.results);
          } else {
            setSearchResults([]);
          }
        })
        .catch((err) => {
          console.error('Search fetch error:', err);
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handlePlaySearchResult = async (video: YouTubeSearchResult) => {
    await switchAdapter('youtube');
    await loadPlaylist(video.id);
  };

  const handleAddToLibrary = (video: YouTubeSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();

    const newItem: SavedPlaylistItem = {
      id: `saved-${video.id}-${Date.now()}`,
      title: video.title,
      subtitle: `${video.channel} • YouTube`,
      type: 'youtube',
      targetUrl: video.id,
      icon: '▶️',
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const prev: SavedPlaylistItem[] = stored ? JSON.parse(stored) : [];
      const updated = [newItem, ...prev.filter((p) => p.targetUrl !== video.id)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage')); // trigger sync across components
    } catch {
      // ignore
    }

    setAddedToast(`Added "${video.title}" to Your Library!`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  // If Lyrics view is active, show the full lyrics screen
  if (showLyrics) {
    return (
      <main className="flex-1 h-full overflow-hidden bg-[#121212] rounded-lg">
        <SpotifyLyricsView onClose={() => setShowLyrics(false)} />
      </main>
    );
  }

  const isSearchActive = searchQuery.trim().length > 0 || activeView === 'search';

  return (
    <main className="flex-1 h-full overflow-y-auto bg-[#121212] rounded-lg relative pb-12 select-none">
      {/* Top Ambient Deep Electric Blue Accent Banner */}
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-[#0c2642] via-[#091728] to-transparent pointer-events-none opacity-80" />

      {/* Main Content Container */}
      <div className="relative z-10 px-4 sm:px-8 py-6 space-y-8">
        {/* Error Notification Toast */}
        {errorMessage && (
          <div className="px-4 py-2.5 rounded-lg bg-rose-900/40 border border-rose-600/40 text-rose-200 text-xs flex items-center justify-between shadow-lg">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Added to Library Notification Toast */}
        {addedToast && (
          <div className="fixed top-16 right-8 z-50 px-4 py-2.5 rounded-lg bg-[#1d90f5] text-white font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <span>✓</span>
            <span className="truncate max-w-sm">{addedToast}</span>
          </div>
        )}

        {/* Video Preview Drawer (If User toggled Show Video for YouTube) */}
        {showVideo && activeAdapterType === 'youtube' && (
          <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden border border-[#282828] bg-black shadow-2xl p-2">
            <div className="flex items-center justify-between pb-2 px-1 text-xs text-[#b3b3b3]">
              <span className="font-semibold text-white">📺 YouTube Video Preview</span>
              <button
                type="button"
                onClick={() => setShowVideo(false)}
                className="hover:text-white cursor-pointer"
              >
                ✕ Close Preview
              </button>
            </div>
            <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden bg-black">
              <div id="chillcast-yt-player" className="w-full h-full" />
            </div>
          </div>
        )}

        {/* Offscreen YouTube Player Container when video preview is hidden */}
        {(!showVideo || activeAdapterType !== 'youtube') && (
          <div className="fixed -left-[9999px] -top-[9999px] w-1 h-1 pointer-events-none opacity-0">
            <div id="chillcast-yt-player" />
          </div>
        )}

        {/* Top Header & Greeting */}
        {!isSearchActive && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {greeting}
            </h1>
            <p className="text-xs sm:text-sm text-[#b3b3b3] mt-1">
              Welcome to <strong className="text-white">Chillify 🥰</strong> — your ambient lo-fi soundscape sanctuary.
            </p>
          </div>
        )}

        {/* SEARCH RESULTS VIEW (When searching YouTube) */}
        {isSearchActive && (
          <section aria-label="Search Results" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  YouTube Results for &ldquo;{searchQuery}&rdquo;
                </h2>
                <p className="text-xs text-[#b3b3b3]">
                  Play videos directly in Chillify or save them to your library
                </p>
              </div>

              {isSearching && (
                <div className="flex items-center gap-2 text-xs text-[#1d90f5] font-medium">
                  <div className="w-4 h-4 border-2 border-[#1d90f5] border-t-transparent rounded-full animate-spin" />
                  <span>Searching YouTube...</span>
                </div>
              )}
            </div>

            {searchResults.length === 0 && !isSearching ? (
              <div className="p-12 text-center bg-[#181818] rounded-xl border border-[#242424] text-[#b3b3b3] space-y-2">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-semibold text-white">No YouTube videos found</p>
                <p className="text-xs">Try searching for song titles, artists, or &ldquo;lofi beats&rdquo;.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {searchResults.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => handlePlaySearchResult(video)}
                    className="spotify-card p-3.5 rounded-xl cursor-pointer group flex flex-col justify-between relative shadow-lg border border-transparent hover:border-[#2a2a2a]"
                  >
                    {/* Video Thumbnail Tile */}
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 bg-zinc-900 shadow-md">
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 280px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />

                      {/* Video Duration Badge */}
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-medium text-white shadow">
                        {video.duration}
                      </span>

                      {/* Hover Play Button */}
                      <button
                        type="button"
                        className="absolute bottom-2 left-2 w-10 h-10 rounded-full bg-[#1d90f5] text-black shadow-xl flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-105 transition-all duration-200 cursor-pointer"
                        title="Play Track"
                      >
                        <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex flex-col justify-between flex-1 gap-2">
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-2 group-hover:text-[#1d90f5] transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-[11px] text-[#b3b3b3] truncate mt-1">
                          {video.channel}
                        </p>
                      </div>

                      {/* Add to Playlist button */}
                      <button
                        type="button"
                        onClick={(e) => handleAddToLibrary(video, e)}
                        className="mt-1 w-full py-1.5 px-3 rounded-full bg-[#242424] hover:bg-[#1d90f5] hover:text-white text-[#b3b3b3] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Save to Your Library"
                      >
                        <span>+</span> Add to Library
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* AMBIENT SOUNDSCAPE MIXER SHELF (All 13 procedural sounds) */}
        <section
          aria-label="Ambient Soundscape Mixer"
          className="bg-[#181818] p-5 sm:p-6 rounded-xl border border-[#242424] shadow-lg space-y-4"
        >
          {/* Section Header & Master Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#282828]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1d90f5]/15 text-[#1d90f5] flex items-center justify-center text-xl font-bold">
                🎛️
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Ambient Soundscape Mixer
                  {activeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1d90f5] text-white">
                      {activeCount} ACTIVE
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#b3b3b3]">
                  13 real-time procedural soundscapes: rain, wind, birds, drums, bass, cafe chatter, fireplace, chenda melam & more
                </p>
              </div>
            </div>

            {/* Master Volume & Stop All */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-[#121212] px-3 py-1.5 rounded-full border border-[#282828]">
                <button
                  type="button"
                  onClick={toggleMasterMute}
                  className="text-xs text-[#b3b3b3] hover:text-white cursor-pointer"
                  title="Mute Master Ambient"
                >
                  {isMasterMuted || masterVolume === 0 ? '🔇' : '🔊'}
                </button>
                <span className="text-[11px] text-[#b3b3b3] font-medium">Master</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMasterMuted ? 0 : masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-20 spotify-slider"
                />
              </div>

              <button
                type="button"
                onClick={() => applyPreset('muteAll')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#242424] hover:bg-rose-900/40 text-[#b3b3b3] hover:text-rose-200 transition-colors cursor-pointer"
              >
                ⏹️ Stop All
              </button>
            </div>
          </div>

          {/* 13 Ambient Soundscape Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pt-2">
            {ambientSounds.map((sound) => {
              const state = soundStates[sound.id];
              const isPlayingChannel = state?.isPlaying;
              const isMutedChannel = state?.isMuted;
              const vol = state?.volume ?? sound.defaultVolume;

              return (
                <div
                  key={sound.id}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between gap-3 ${
                    isPlayingChannel
                      ? 'bg-[#222730] border-[#1d90f5]/60 shadow-md shadow-[#1d90f5]/10'
                      : 'bg-[#1c1c1c] border-[#282828] hover:border-[#3a3a3a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{sound.icon}</span>
                    <button
                      type="button"
                      onClick={() => toggleSound(sound.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                        isPlayingChannel
                          ? 'bg-[#1d90f5] text-white'
                          : 'bg-[#282828] text-[#b3b3b3] hover:text-white'
                      }`}
                    >
                      {isPlayingChannel ? 'Active' : 'Off'}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{sound.name}</h3>
                    <p className="text-[11px] text-[#b3b3b3] line-clamp-1">{sound.description}</p>
                  </div>

                  {/* Volume Slider & Mute */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#282828]">
                    <button
                      type="button"
                      onClick={() => toggleSoundMute(sound.id)}
                      className="text-xs text-[#b3b3b3] hover:text-white cursor-pointer"
                      title={isMutedChannel ? 'Unmute' : 'Mute'}
                    >
                      {isMutedChannel ? '🔇' : '🔉'}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMutedChannel ? 0 : vol}
                      onChange={(e) => setSoundVolume(sound.id, parseFloat(e.target.value))}
                      className="w-full spotify-slider"
                    />
                    <span className="text-[10px] font-mono text-[#b3b3b3] w-6 text-right">
                      {Math.round((isMutedChannel ? 0 : vol) * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer Info */}
        <footer className="pt-8 border-t border-[#242424] flex flex-col sm:flex-row items-center justify-between text-xs text-[#b3b3b3] gap-2">
          <span>Chillify 🥰 • Exact Spotify Replica Ambient Music Player</span>
          <span className="text-[#1d90f5]">Powered by Web Audio API & Next.js</span>
        </footer>
      </div>
    </main>
  );
}
