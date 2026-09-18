'use client';

import React, { useRef, useState } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { useAmbient } from '@/context/AmbientContext';
import { DEFAULT_CHILL_PLAYLIST_ID } from '@/lib/adapters/youtube-adapter';

interface SpotifySidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  showLyrics: boolean;
  setShowLyrics: (show: boolean) => void;
}

const PLAYLIST_ITEMS = [
  {
    id: 'lofi-girl',
    title: 'Lofi Girl Chill Beats',
    subtitle: 'Playlist • YouTube',
    type: 'youtube',
    playlistId: DEFAULT_CHILL_PLAYLIST_ID,
    color: 'from-amber-600 to-rose-900',
    icon: '☕',
  },
  {
    id: 'peaceful-piano',
    title: 'Peaceful Ambient Piano',
    subtitle: 'Playlist • YouTube',
    type: 'youtube',
    playlistId: 'PLrAlXlq_A37_e_G0e4M98QpL9lX_1N3QZ',
    color: 'from-sky-700 to-indigo-900',
    icon: '🎹',
  },
  {
    id: 'chillwave',
    title: 'Chillwave Night Drive',
    subtitle: 'Playlist • YouTube',
    type: 'youtube',
    playlistId: 'PLRBp0Fe2GpgnZOm5rOwEl373551tAmL91',
    color: 'from-purple-700 to-pink-900',
    icon: '🌌',
  },
  {
    id: 'rainy-afternoon',
    title: 'Rainy Afternoon Lofi',
    subtitle: 'Playlist • YouTube',
    type: 'youtube',
    playlistId: 'PLOzDu-MXXLhiQZkyO3bF_9F_90Lg2aA9S',
    color: 'from-blue-700 to-slate-900',
    icon: '🌧️',
  },
  {
    id: 'sp-lofi-beats',
    title: 'Lo-Fi Beats (Spotify)',
    subtitle: 'Playlist • Spotify',
    type: 'spotify',
    playlistId: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    color: 'from-emerald-700 to-teal-900',
    icon: '🎧',
  },
  {
    id: 'sp-peaceful-piano',
    title: 'Peaceful Piano (Spotify)',
    subtitle: 'Playlist • Spotify',
    type: 'spotify',
    playlistId: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
    color: 'from-teal-700 to-cyan-900',
    icon: '🌿',
  },
];

export default function SpotifySidebar({
  activeView,
  setActiveView,
  showLyrics,
  setShowLyrics,
}: SpotifySidebarProps) {
  const { loadPlaylist, switchAdapter, loadCustomLocalFile } = usePlayback();
  const { applyPreset, activeCount } = useAmbient();
  const [filterCategory, setFilterCategory] = useState<'all' | 'playlists' | 'ambient'>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectPlaylist = (item: (typeof PLAYLIST_ITEMS)[0]) => {
    if (item.type === 'youtube') {
      switchAdapter('youtube');
      loadPlaylist(item.playlistId);
    } else if (item.type === 'spotify') {
      switchAdapter('spotify');
      loadPlaylist(item.playlistId);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      switchAdapter('local');
      loadCustomLocalFile(file);
    }
  };

  return (
    <aside className="w-64 sm:w-72 md:w-80 h-full flex flex-col gap-2 shrink-0 select-none pb-2">
      {/* Top Navigation Block */}
      <nav className="bg-[#121212] rounded-lg p-3 sm:p-4 flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveView('home');
            setShowLyrics(false);
          }}
          className={`flex items-center gap-4 px-3 py-2.5 rounded-md font-bold text-sm transition-colors cursor-pointer ${
            activeView === 'home' && !showLyrics
              ? 'text-white'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h5v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6h5V7.577l-7.5-4.33zm-8.83 5.148 7.33-4.23a2 2 0 0 1 2 0l7.33 4.23A1 1 0 0 1 21 9.247V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.247a1 1 0 0 1 .67-.952z" />
          </svg>
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('mixer');
            setShowLyrics(false);
          }}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md font-bold text-sm transition-colors cursor-pointer ${
            activeView === 'mixer' && !showLyrics
              ? 'text-white'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5.75A.75.75 0 0 1 3.75 5h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75zm0 6.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12zm0 6.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75z" />
            </svg>
            <span>Ambient Mixer</span>
          </div>
          {activeCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#1db954] shadow-sm shadow-[#1db954]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowLyrics(!showLyrics)}
          className={`flex items-center justify-between px-3 py-2.5 rounded-md font-bold text-sm transition-colors cursor-pointer ${
            showLyrics ? 'text-[#1db954]' : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm5 7a1 1 0 0 0-2 0 4 4 0 0 1-8 0 1 1 0 0 0-2 0 6 6 0 0 0 5 5.91V18H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-3v-3.09A6 6 0 0 0 17 9z" />
            </svg>
            <span>Live Lyrics</span>
          </div>
          {showLyrics && (
            <span className="text-[10px] uppercase font-bold text-[#1db954] tracking-wider">
              ON
            </span>
          )}
        </button>
      </nav>

      {/* "Your Library" Block */}
      <section className="bg-[#121212] rounded-lg p-3 sm:p-4 flex-1 flex flex-col overflow-hidden">
        {/* Library Header */}
        <div className="flex items-center justify-between text-[#b3b3b3] mb-3">
          <div className="flex items-center gap-3 font-bold text-sm hover:text-white transition-colors cursor-pointer">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.5 2.134a1 1 0 0 1 1 0l6 3.464a1 1 0 0 1 .5.866V18a1 1 0 0 1-.5.866l-6 3.464a1 1 0 0 1-1 0l-6-3.464a1 1 0 0 1-.5-.866V6.464a1 1 0 0 1 .5-.866l6-3.464zM4.75 5a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V5.75A.75.75 0 0 0 6.25 5h-1.5z" />
            </svg>
            <span>Your Library</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Upload local track */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-full hover:bg-[#282828] text-white flex items-center justify-center text-lg transition-colors cursor-pointer"
              title="Add local audio file"
            >
              +
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'playlists', 'ambient'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                filterCategory === cat
                  ? 'bg-white text-black'
                  : 'bg-[#242424] text-white hover:bg-[#2a2a2a]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Scrollable Library List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {/* Ambient Presets in Library */}
          {(filterCategory === 'all' || filterCategory === 'ambient') && (
            <div className="space-y-1 mb-2">
              <div
                onClick={() => applyPreset('rainyNight')}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1f1f1f] cursor-pointer group transition-colors"
              >
                <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center text-xl shrink-0 shadow">
                  🌧️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-[#1db954] transition-colors">
                    Rainy Night Ambience
                  </p>
                  <p className="text-xs text-[#b3b3b3] truncate">Preset • Rain & Thunder</p>
                </div>
              </div>

              <div
                onClick={() => applyPreset('forestCanopy')}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1f1f1f] cursor-pointer group transition-colors"
              >
                <div className="w-12 h-12 rounded bg-gradient-to-br from-emerald-900 to-teal-950 flex items-center justify-center text-xl shrink-0 shadow">
                  🌲
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-[#1db954] transition-colors">
                    Forest Canopy Ambience
                  </p>
                  <p className="text-xs text-[#b3b3b3] truncate">Preset • Birds & Breeze</p>
                </div>
              </div>
            </div>
          )}

          {/* Music Playlists */}
          {(filterCategory === 'all' || filterCategory === 'playlists') && (
            <div className="space-y-1">
              {PLAYLIST_ITEMS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectPlaylist(item)}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1f1f1f] cursor-pointer group transition-colors"
                >
                  <div
                    className={`w-12 h-12 rounded bg-gradient-to-br ${item.color} flex items-center justify-center text-xl shrink-0 shadow`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#1db954] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#b3b3b3] truncate">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Local Audio Upload Item */}
          <div
            onClick={() => {
              switchAdapter('local');
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1f1f1f] cursor-pointer group transition-colors mt-2 border-t border-[#242424]"
          >
            <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center text-xl shrink-0 shadow">
              📁
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate group-hover:text-[#1db954] transition-colors">
                Upload Custom Audio
              </p>
              <p className="text-xs text-[#b3b3b3] truncate">Local File • .mp3, .wav, .flac</p>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
