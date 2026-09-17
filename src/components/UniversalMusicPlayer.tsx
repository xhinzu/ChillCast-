'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { AdapterType } from '@/types/playback';
import { DEFAULT_CHILL_PLAYLIST_ID } from '@/lib/adapters/youtube-adapter';
import { SpotifyAdapter, SpotifyMode } from '@/lib/adapters/spotify-adapter';
import { exchangeCodeForToken, redirectToSpotifyAuthorize } from '@/lib/spotify-pkce';

const ADAPTER_OPTIONS: { type: AdapterType; label: string; icon: string; badge?: string }[] = [
  { type: 'local', label: 'Local Audio', icon: '📁' },
  { type: 'youtube', label: 'YouTube Playlist', icon: '▶️' },
  { type: 'spotify', label: 'Spotify', icon: '🎧' },
];

const YOUTUBE_PRESETS = [
  { name: '☕ Lofi Girl Chill Beats', id: DEFAULT_CHILL_PLAYLIST_ID },
  { name: '🎹 Peaceful Ambient Piano', id: 'PLrAlXlq_A37_e_G0e4M98QpL9lX_1N3QZ' },
  { name: '🌌 Chillwave Night Drive', id: 'PLRBp0Fe2GpgnZOm5rOwEl373551tAmL91' },
  { name: '🌧️ Rainy Afternoon Lofi', id: 'PLOzDu-MXXLhiQZkyO3bF_9F_90Lg2aA9S' },
];

const SPOTIFY_PRESETS = [
  { name: '☕ Lo-Fi Beats', url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' },
  { name: '🌿 Peaceful Piano', url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { name: '🌙 Night Rain Study', url: 'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS' },
];

export default function UniversalMusicPlayer() {
  const {
    activeAdapterType,
    activeAdapter,
    currentTrack,
    isPlaying,
    playbackState,
    currentTime,
    duration,
    volume,
    isMuted,
    errorMessage,
    switchAdapter,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    previousTrack,
    loadPlaylist,
    loadCustomLocalFile,
  } = usePlayback();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [youtubeInput, setYoutubeInput] = useState<string>('');
  const [spotifyInput, setSpotifyInput] = useState<string>('');
  const [spotifyMode, setSpotifyMode] = useState<SpotifyMode>('metadata');
  const [isSpotifyConnected, setIsSpotifyConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('spotify_access_token');
    }
    return false;
  });
  const [cacheCount, setCacheCount] = useState<number>(0);
  const [showVideoPreview, setShowVideoPreview] = useState<boolean>(false);

  // Check URL for Spotify PKCE callback code & load cache stats
  useEffect(() => {
    // 1. Fetch cache stats
    fetch('/api/youtube/cache-stats')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.totalCached === 'number') setCacheCount(data.totalCached);
      })
      .catch(() => {});

    // 2. Check for PKCE return in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const spotifyCode = params.get('spotify_code');
      const spotifyError = params.get('spotify_error');

      if (spotifyError) {
        console.error('Spotify login cancelled or failed:', spotifyError);
      } else if (spotifyCode) {
        // Clean URL params
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // Exchange code using PKCE
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
        const redirectUri = `${window.location.origin}/api/auth/callback/spotify`;

        if (clientId) {
          exchangeCodeForToken(clientId, spotifyCode, redirectUri)
            .then((res) => {
              if (res && res.accessToken) {
                if (activeAdapter instanceof SpotifyAdapter) {
                  activeAdapter.setAccessToken(res.accessToken);
                  activeAdapter.setMode('pkce');
                }
                setIsSpotifyConnected(true);
                setSpotifyMode('pkce');
              }
            })
            .catch((err) => console.error('PKCE exchange error:', err));
        }
      }
    }
  }, [activeAdapter]);

  // Spacebar hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadCustomLocalFile(file);
    }
  };

  const handleLoadYouTube = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeInput.trim()) {
      loadPlaylist(youtubeInput.trim());
      setYoutubeInput('');
    }
  };

  const handleLoadSpotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (spotifyInput.trim()) {
      loadPlaylist(spotifyInput.trim());
      setSpotifyInput('');
    }
  };

  const handleSpotifyLogin = async () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      alert(
        'Please add NEXT_PUBLIC_SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_ID to your .env.local file to connect your personal Spotify account.'
      );
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/callback/spotify`;
    await redirectToSpotifyAuthorize(clientId, redirectUri);
  };

  const handleDisconnectSpotify = () => {
    if (activeAdapter instanceof SpotifyAdapter) {
      activeAdapter.clearAccessToken();
    } else {
      localStorage.removeItem('spotify_access_token');
    }
    setIsSpotifyConnected(false);
    setSpotifyMode('metadata');
  };

  const handleSpotifyModeChange = (mode: SpotifyMode) => {
    setSpotifyMode(mode);
    if (activeAdapter instanceof SpotifyAdapter) {
      activeAdapter.setMode(mode);
    }
  };

  return (
    <div className="w-full backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/40 flex flex-col gap-6">
      {/* Top Bar: Adapter Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/30 border border-white/[0.06] self-start flex-wrap">
          {ADAPTER_OPTIONS.map((opt) => {
            const isActive = activeAdapterType === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => switchAdapter(opt.type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  isActive
                    ? 'bg-indigo-500/25 border border-indigo-500/40 text-white shadow-md shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
                {opt.badge && !isActive && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-400">
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Source State Badges */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400 flex-wrap">
          {activeAdapterType === 'youtube' && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              ⚡ Zero API Quota (IFrame API)
            </span>
          )}

          {activeAdapterType === 'spotify' && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {spotifyMode === 'metadata'
                ? `🎯 Cached Search (${cacheCount} tracks cached)`
                : '🎧 PKCE Direct Playback'}
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="capitalize font-mono text-[11px] text-slate-300">
              {playbackState}
            </span>
          </div>
        </div>
      </div>

      {/* --- YouTube Specific Controls --- */}
      {activeAdapterType === 'youtube' && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/20 border border-white/[0.06]">
          <form onSubmit={handleLoadYouTube} className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
                🔗
              </span>
              <input
                type="text"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="Paste YouTube playlist link (youtube.com/playlist?list=...) or video link"
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
            >
              Load Playlist
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Chill Presets:</span>
              {YOUTUBE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadPlaylist(preset.id)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowVideoPreview(!showVideoPreview)}
              className="text-[11px] text-indigo-300 hover:text-indigo-200 ml-auto flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>{showVideoPreview ? 'Hide Video' : '📺 Show Video Preview'}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- Spotify Specific Controls (Dual-Mode) --- */}
      {activeAdapterType === 'spotify' && (
        <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-black/20 border border-white/[0.06]">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => handleSpotifyModeChange('metadata')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  spotifyMode === 'metadata'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🪄 Import & Resolve (Free / No Login)
              </button>
              <button
                type="button"
                onClick={() => handleSpotifyModeChange('pkce')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  spotifyMode === 'pkce'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟢 Spotify SDK (PKCE / Premium)
              </button>
            </div>

            {/* User Auth Status (for PKCE) */}
            {spotifyMode === 'pkce' && (
              <div>
                {isSpotifyConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnectSpotify}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[11px] text-rose-300 transition-colors cursor-pointer"
                  >
                    Disconnect Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSpotifyLogin}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    Connect Spotify Account
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mode B Form: Playlist Import with Server Cache */}
          {spotifyMode === 'metadata' && (
            <div className="flex flex-col gap-2.5">
              <form onSubmit={handleLoadSpotify} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
                    🎵
                  </span>
                  <input
                    type="text"
                    value={spotifyInput}
                    onChange={(e) => setSpotifyInput(e.target.value)}
                    placeholder="Paste Spotify playlist URL (e.g. open.spotify.com/playlist/...)"
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                >
                  Import Playlist
                </button>
              </form>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[11px] text-slate-400 font-medium">Curated Presets:</span>
                {SPOTIFY_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => loadPlaylist(preset.url)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode A Description */}
          {spotifyMode === 'pkce' && (
            <div className="text-xs text-slate-400 p-2 rounded-xl bg-white/[0.02]">
              {isSpotifyConnected
                ? '✅ Connected to Spotify. Streams audio directly to your browser using your personal Spotify account.'
                : '🔒 Log in to your personal Spotify account. Audio streams using your credentials directly through the Spotify Web Playback SDK (requires Spotify Premium).'}
            </div>
          )}
        </div>
      )}

      {/* Video Preview Drawer */}
      <div
        className={`w-full overflow-hidden transition-all duration-500 rounded-2xl ${
          showVideoPreview && activeAdapterType === 'youtube'
            ? 'h-52 sm:h-64 border border-white/[0.08] bg-black/60 shadow-inner'
            : 'h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div id="chillcast-yt-player" className="w-full h-full" />
      </div>

      {/* Offscreen YouTube player container */}
      {(!showVideoPreview || activeAdapterType !== 'youtube') && (
        <div className="fixed -left-[9999px] -top-[9999px] w-1 h-1 pointer-events-none opacity-0">
          <div id="chillcast-yt-player" />
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Main Track Artwork & Controls */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Album Artwork / Spinning Record */}
        <div className="relative group w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
          {/* Glowing Aura */}
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500/30 via-purple-500/20 to-teal-500/20 blur-xl transition-opacity duration-700 ${
              isPlaying ? 'opacity-100' : 'opacity-30'
            }`}
          />

          {/* Artwork Container */}
          <div className="relative w-full h-full rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center">
            {currentTrack?.artworkUrl ? (
              <Image
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                fill
                sizes="144px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-3 flex items-center justify-center ${
                  isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                }`}
              >
                <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-indigo-950/60">
                    <div className="w-6 h-6 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center Play Button Overlay */}
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            <span className="text-xl pl-0.5">{isPlaying ? '⏸' : '▶'}</span>
          </button>
        </div>

        {/* Player Controls & Track Metadata */}
        <div className="flex-1 w-full flex flex-col justify-between gap-4">
          {/* Header Track Info */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentTrack?.source || activeAdapterType}
                </span>
                {currentTrack?.album && (
                  <>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400 line-clamp-1">{currentTrack.album}</span>
                  </>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mt-1 line-clamp-1">
                {currentTrack?.title || 'No Track Selected'}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1">{currentTrack?.artist || 'Ready'}</p>
            </div>

            {/* Custom file button (for Local Audio) */}
            {activeAdapterType === 'local' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Upload local audio file"
                >
                  <span>📁</span> Choose Audio
                </button>
              </div>
            )}
          </div>

          {/* Timeline Scrub Slider */}
          <div className="space-y-1.5">
            <div className="relative flex items-center group">
              <input
                type="range"
                min="0"
                max={duration > 0 ? duration : 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400 group-hover:h-2 transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Previous Track */}
              {(activeAdapterType === 'youtube' || activeAdapterType === 'spotify') && (
                <button
                  type="button"
                  onClick={previousTrack}
                  className="p-2 rounded-xl text-sm text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer"
                  title="Previous track"
                >
                  ⏮
                </button>
              )}

              {/* Rewind 5s */}
              <button
                type="button"
                onClick={() => seek(Math.max(0, currentTime - 5))}
                className="p-2 rounded-xl text-sm text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Rewind 5s"
              >
                ⏪
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={togglePlay}
                className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-xs flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25 cursor-pointer"
              >
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
                <span>{isPlaying ? '⏸' : '▶'}</span>
              </button>

              {/* Forward 5s */}
              <button
                type="button"
                onClick={() => seek(Math.min(duration, currentTime + 5))}
                className="p-2 rounded-xl text-sm text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Forward 5s"
              >
                ⏩
              </button>

              {/* Next Track */}
              {(activeAdapterType === 'youtube' || activeAdapterType === 'spotify') && (
                <button
                  type="button"
                  onClick={nextTrack}
                  className="p-2 rounded-xl text-sm text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer"
                  title="Next track"
                >
                  ⏭
                </button>
              )}
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
