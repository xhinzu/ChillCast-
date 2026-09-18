'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { useAmbient } from '@/context/AmbientContext';
import { DEFAULT_CHILL_PLAYLIST_ID } from '@/lib/adapters/youtube-adapter';
import { SpotifyAdapter, SpotifyMode } from '@/lib/adapters/spotify-adapter';
import { exchangeCodeForToken, redirectToSpotifyAuthorize } from '@/lib/spotify-pkce';
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

const QUICK_CARDS = [
  {
    id: 'lofi-girl',
    title: 'Lofi Girl Chill Beats',
    subtitle: 'YouTube • Chill Lo-Fi',
    type: 'youtube',
    playlistId: DEFAULT_CHILL_PLAYLIST_ID,
    color: 'from-amber-700/80 to-amber-950',
    icon: '☕',
  },
  {
    id: 'rainy-night',
    title: 'Rainy Night Ambience',
    subtitle: 'Soundscape • Procedural',
    type: 'ambient-preset',
    preset: 'rainyNight' as const,
    color: 'from-blue-700/80 to-blue-950',
    icon: '🌧️',
  },
  {
    id: 'peaceful-piano',
    title: 'Peaceful Ambient Piano',
    subtitle: 'YouTube • Ambient Beats',
    type: 'youtube',
    playlistId: 'PLrAlXlq_A37_e_G0e4M98QpL9lX_1N3QZ',
    color: 'from-indigo-700/80 to-indigo-950',
    icon: '🎹',
  },
  {
    id: 'forest-canopy',
    title: 'Forest Canopy Soundscape',
    subtitle: 'Soundscape • Procedural',
    type: 'ambient-preset',
    preset: 'forestCanopy' as const,
    color: 'from-emerald-700/80 to-emerald-950',
    icon: '🌲',
  },
  {
    id: 'chillwave',
    title: 'Chillwave Night Drive',
    subtitle: 'YouTube • Synthwave',
    type: 'youtube',
    playlistId: 'PLRBp0Fe2GpgnZOm5rOwEl373551tAmL91',
    color: 'from-purple-700/80 to-purple-950',
    icon: '🌌',
  },
  {
    id: 'sp-lofi-beats',
    title: 'Lo-Fi Beats (Spotify)',
    subtitle: 'Spotify • Official Playlist',
    type: 'spotify',
    playlistId: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    color: 'from-teal-700/80 to-teal-950',
    icon: '🎧',
  },
];

const FEATURED_PLAYLISTS = [
  {
    id: 'lofi-beats',
    title: 'Lofi Girl - Chill Beats',
    description: 'The world famous relaxing lofi study and chill beat collection.',
    type: 'youtube',
    playlistId: DEFAULT_CHILL_PLAYLIST_ID,
    color: 'from-orange-600 to-amber-900',
    icon: '☕',
  },
  {
    id: 'piano-ambient',
    title: 'Peaceful Ambient Piano',
    description: 'Soothing piano notes blended with subtle ambient textures.',
    type: 'youtube',
    playlistId: 'PLrAlXlq_A37_e_G0e4M98QpL9lX_1N3QZ',
    color: 'from-sky-600 to-blue-900',
    icon: '🎹',
  },
  {
    id: 'chillwave-drive',
    title: 'Chillwave Night Drive',
    description: 'Synth-infused relaxing beats for nocturnal focus & relaxation.',
    type: 'youtube',
    playlistId: 'PLRBp0Fe2GpgnZOm5rOwEl373551tAmL91',
    color: 'from-fuchsia-600 to-purple-950',
    icon: '🌌',
  },
  {
    id: 'rainy-afternoon-beats',
    title: 'Rainy Afternoon Lofi',
    description: 'Melancholic chill chords recorded for rainy study afternoons.',
    type: 'youtube',
    playlistId: 'PLOzDu-MXXLhiQZkyO3bF_9F_90Lg2aA9S',
    color: 'from-blue-600 to-slate-900',
    icon: '🌧️',
  },
  {
    id: 'sp-peaceful-piano',
    title: 'Peaceful Piano',
    description: 'Peaceful piano music from Spotify for relaxation, reading & sleep.',
    type: 'spotify',
    playlistId: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
    color: 'from-emerald-600 to-teal-950',
    icon: '🌿',
  },
];

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
    activeAdapter,
    currentTrack,
    isPlaying,
    errorMessage,
    switchAdapter,
    togglePlay,
    loadPlaylist,
    loadCustomLocalFile,
  } = usePlayback();

  const {
    ambientSounds,
    soundStates,
    masterVolume,
    isMasterMuted,
    activeCount,
    activePreset,
    toggleSound,
    setSoundVolume,
    toggleSoundMute,
    setMasterVolume,
    toggleMasterMute,
    applyPreset,
  } = useAmbient();

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

  // Dynamic greeting based on time of day
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  // Handle Spotify PKCE exchange
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const spotifyCode = params.get('spotify_code');
      const spotifyError = params.get('spotify_error');

      if (spotifyError) {
        console.error('Spotify login failed:', spotifyError);
      } else if (spotifyCode) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

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

  const handleQuickCardClick = (card: (typeof QUICK_CARDS)[number]) => {
    if (card.type === 'youtube' && card.playlistId) {
      switchAdapter('youtube');
      loadPlaylist(card.playlistId);
    } else if (card.type === 'spotify' && card.playlistId) {
      switchAdapter('spotify');
      loadPlaylist(card.playlistId);
    } else if (card.type === 'ambient-preset' && card.preset) {
      applyPreset(card.preset);
    }
  };

  const handleLoadYouTube = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeInput.trim()) {
      switchAdapter('youtube');
      loadPlaylist(youtubeInput.trim());
      setYoutubeInput('');
    }
  };

  const handleLoadSpotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (spotifyInput.trim()) {
      switchAdapter('spotify');
      loadPlaylist(spotifyInput.trim());
      setSpotifyInput('');
    }
  };

  const handleSpotifyLogin = async () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      alert(
        'Please configure NEXT_PUBLIC_SPOTIFY_CLIENT_ID in your .env.local file to connect your Spotify account.'
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

  // If Lyrics view is active, show the full lyrics screen
  if (showLyrics) {
    return (
      <main className="flex-1 h-full overflow-hidden bg-[#121212] rounded-lg">
        <SpotifyLyricsView onClose={() => setShowLyrics(false)} />
      </main>
    );
  }

  // Filter cards by search query if user types in search bar
  const query = searchQuery.toLowerCase().trim();
  const filteredQuickCards = QUICK_CARDS.filter(
    (c) => !query || c.title.toLowerCase().includes(query) || c.subtitle.toLowerCase().includes(query)
  );
  const filteredFeatured = FEATURED_PLAYLISTS.filter(
    (f) => !query || f.title.toLowerCase().includes(query) || f.description.toLowerCase().includes(query)
  );

  return (
    <main className="flex-1 h-full overflow-y-auto bg-[#121212] rounded-lg relative pb-12 select-none">
      {/* Top Ambient Gradient Accent Banner */}
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-[#193a26] via-[#112418] to-transparent pointer-events-none opacity-80" />

      {/* Main Content Container */}
      <div className="relative z-10 px-4 sm:px-8 py-6 space-y-8">
        {/* Error Notification Toast */}
        {errorMessage && (
          <div className="px-4 py-2.5 rounded-lg bg-rose-900/40 border border-rose-600/40 text-rose-200 text-xs flex items-center justify-between shadow-lg">
            <span>⚠️ {errorMessage}</span>
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

        {/* Greeting Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-[#b3b3b3] mt-1">
            Welcome to <strong className="text-white">Chillify 🥰</strong> — your ambient lo-fi soundscape sanctuary.
          </p>
        </div>

        {/* 1. Quick 6-Grid (Spotify Home Style) */}
        <section aria-label="Quick Access">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredQuickCards.map((card) => (
              <div
                key={card.id}
                onClick={() => handleQuickCardClick(card)}
                className="flex items-center bg-[#282828]/60 hover:bg-[#282828] rounded-md overflow-hidden cursor-pointer group transition-colors shadow-md relative"
              >
                {/* Thumbnail Icon */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-inner`}
                >
                  {card.icon}
                </div>

                {/* Title */}
                <div className="flex-1 px-4 py-2 min-w-0">
                  <p className="font-bold text-sm text-white truncate">{card.title}</p>
                  <p className="text-xs text-[#b3b3b3] truncate mt-0.5">{card.subtitle}</p>
                </div>

                {/* Floating Spotify Green Play Button on Hover */}
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-[#1db954] text-black shadow-lg shadow-black/40 flex items-center justify-center mr-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-105 transition-all duration-200 shrink-0 cursor-pointer"
                  title="Play"
                >
                  <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Ambient Soundscape Mixer Shelf */}
        <section
          aria-label="Ambient Soundscape Mixer"
          className="bg-[#181818] p-5 sm:p-6 rounded-xl border border-[#242424] shadow-lg"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#282828]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1db954]/15 text-[#1db954] flex items-center justify-center text-xl font-bold">
                🎛️
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Ambient Soundscape Mixer
                  {activeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1db954] text-black">
                      {activeCount} ACTIVE
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#b3b3b3]">
                  Synthesize real-time background rain, wind, forest birds, crickets, & thunder
                </p>
              </div>
            </div>

            {/* Master Ambient Volume & Presets */}
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

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('rainyNight')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    activePreset === 'rainyNight'
                      ? 'bg-[#1db954] text-black'
                      : 'bg-[#282828] text-white hover:bg-[#333]'
                  }`}
                >
                  🌧️ Rainy Night
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('forestCanopy')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    activePreset === 'forestCanopy'
                      ? 'bg-[#1db954] text-black'
                      : 'bg-[#282828] text-white hover:bg-[#333]'
                  }`}
                >
                  🌲 Forest Canopy
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('muteAll')}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#282828] hover:bg-rose-900/40 text-[#b3b3b3] hover:text-rose-200 transition-colors cursor-pointer"
                >
                  ⏹️ Stop All
                </button>
              </div>
            </div>
          </div>

          {/* 5 Ambient Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4">
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
                      ? 'bg-[#242424] border-[#1db954]/50 shadow-md shadow-[#1db954]/5'
                      : 'bg-[#1c1c1c] border-[#282828] hover:border-[#3a3a3a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{sound.icon}</span>
                    <button
                      type="button"
                      onClick={() => toggleSound(sound.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                        isPlayingChannel
                          ? 'bg-[#1db954] text-black'
                          : 'bg-[#282828] text-[#b3b3b3] hover:text-white'
                      }`}
                    >
                      {isPlayingChannel ? 'Active' : 'Off'}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">{sound.name}</h3>
                    <p className="text-[11px] text-[#b3b3b3] line-clamp-1">{sound.description}</p>
                  </div>

                  {/* Volume Slider & Mute */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#2a2a2a]">
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

        {/* 3. Featured Playlists Shelf */}
        <section aria-label="Featured Playlists">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Made for Relaxing & Study</h2>
              <p className="text-xs text-[#b3b3b3]">Curated chill vibes ready to stream instantly</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredFeatured.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.type === 'youtube') {
                    switchAdapter('youtube');
                    loadPlaylist(item.playlistId);
                  } else {
                    switchAdapter('spotify');
                    loadPlaylist(item.playlistId);
                  }
                }}
                className="spotify-card p-4 rounded-lg cursor-pointer group flex flex-col justify-between relative shadow-lg"
              >
                {/* Artwork Tile */}
                <div className="relative w-full aspect-square rounded-md overflow-hidden mb-3 bg-zinc-800 shadow-md">
                  <div
                    className={`w-full h-full bg-gradient-to-br ${item.color} flex items-center justify-center text-4xl`}
                  >
                    {item.icon}
                  </div>

                  {/* Floating Green Play Button */}
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1db954] text-black shadow-xl flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-105 transition-all duration-200 cursor-pointer"
                    title="Play"
                  >
                    <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>

                {/* Meta */}
                <div>
                  <h3 className="font-bold text-sm text-white truncate group-hover:underline">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#b3b3b3] line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Stream Source Adapters & Custom Link Importers */}
        <section aria-label="Stream Adapters" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* YouTube Importer Card */}
          <div className="bg-[#181818] p-5 rounded-xl border border-[#242424] flex flex-col justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-base font-bold">
                ▶️
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Import Any YouTube Playlist or Track</h3>
                <p className="text-[11px] text-[#b3b3b3]">Zero API Quota • Stream high fidelity IFrame audio</p>
              </div>
            </div>

            <form onSubmit={handleLoadYouTube} className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="Paste YouTube playlist or video URL..."
                className="flex-1 bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-xs text-white placeholder-[#b3b3b3] px-3 py-2 rounded-md outline-none border border-transparent focus:border-white transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-full transition-all cursor-pointer shrink-0"
              >
                Load
              </button>
            </form>
          </div>

          {/* Spotify Importer & PKCE Card */}
          <div className="bg-[#181818] p-5 rounded-xl border border-[#242424] flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1db954]/20 text-[#1db954] flex items-center justify-center text-base font-bold">
                  🎧
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Spotify Dual-Mode</h3>
                  <p className="text-[11px] text-[#b3b3b3]">Metadata resolver or PKCE direct streaming</p>
                </div>
              </div>

              {isSpotifyConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnectSpotify}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-rose-900/30 text-rose-300 hover:bg-rose-900/50 cursor-pointer"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSpotifyLogin}
                  className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#1db954] text-black hover:scale-105 transition-transform cursor-pointer"
                >
                  Connect Account
                </button>
              )}
            </div>

            <form onSubmit={handleLoadSpotify} className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={spotifyInput}
                onChange={(e) => setSpotifyInput(e.target.value)}
                placeholder="Paste Spotify playlist URL (open.spotify.com/playlist/...)"
                className="flex-1 bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-xs text-white placeholder-[#b3b3b3] px-3 py-2 rounded-md outline-none border border-transparent focus:border-white transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-full transition-all cursor-pointer shrink-0"
              >
                Import
              </button>
            </form>
          </div>
        </section>

        {/* Footer info */}
        <footer className="pt-8 border-t border-[#242424] flex flex-col sm:flex-row items-center justify-between text-xs text-[#b3b3b3] gap-2">
          <span>Chillify 🥰 • Exact Spotify Replica Ambient Music Player</span>
          <span className="text-[#1db954]">Powered by Web Audio API & Next.js</span>
        </footer>
      </div>
    </main>
  );
}
