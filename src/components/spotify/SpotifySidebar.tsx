'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { useAmbient } from '@/context/AmbientContext';
import AddSourceModal, { SavedPlaylistItem } from './AddSourceModal';
import { DEFAULT_STARTER_PLAYLISTS } from '@/lib/music-data';
import {
  HeartIcon,
  PlaylistCoverIcon,
  FolderIcon,
} from '@/components/common/MinimalIcons';

interface SpotifySidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  setSearchQuery?: (query: string) => void;
}

const STORAGE_KEY = 'chillify_saved_playlists';

export default function SpotifySidebar({
  activeView,
  setActiveView,
  setSearchQuery,
}: SpotifySidebarProps) {
  const { loadPlaylist, switchAdapter, loadCustomLocalFile } = usePlayback();
  const { activeCount } = useAmbient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylistItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Load saved playlists from localStorage and sync across events
  useEffect(() => {
    const syncPlaylists = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // One-time cleanup for existing browser state with legacy seeded playlists
            if (localStorage.getItem('chillify_cleaned_starter_v2') !== 'true') {
              const legacyIds = new Set(['chill-vibes', 'ig-viral-mix', 'lofi-midnight']);
              let cleaned = parsed.filter((p: SavedPlaylistItem) => !legacyIds.has(p.id));
              cleaned = cleaned.filter((p: SavedPlaylistItem) => {
                if (p.id === 'liked-songs' && p.tracks && p.tracks.length === 10) {
                  const hasOldStarter = p.tracks.some((t) => t.id === 'z4UDNuTla2k' || t.id === 'kPhpHvnnn0E');
                  return !hasOldStarter;
                }
                return true;
              });
              localStorage.setItem('chillify_cleaned_starter_v2', 'true');
              localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
              setSavedPlaylists(cleaned);
              return;
            }
            setSavedPlaylists(parsed);
            return;
          }
        }
        localStorage.setItem('chillify_cleaned_starter_v2', 'true');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STARTER_PLAYLISTS));
        setSavedPlaylists(DEFAULT_STARTER_PLAYLISTS);
      } catch {
        // ignore
      }
    };

    syncPlaylists();
    window.addEventListener('storage', syncPlaylists);
    window.addEventListener('chillify_playlists_updated', syncPlaylists);
    return () => {
      window.removeEventListener('storage', syncPlaylists);
      window.removeEventListener('chillify_playlists_updated', syncPlaylists);
    };
  }, []);

  const handleSavePlaylist = (item: SavedPlaylistItem) => {
    setSavedPlaylists((prev) => {
      const updated = [item, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (item.type === 'custom') {
      setActiveView(`playlist:${item.id}`);
    } else {
      loadPlaylist(item.targetUrl, item.type);
    }
  };

  const handleRemovePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (activeView === `playlist:${id}`) {
      setActiveView('home');
    }
  };

  const handleSelectPlaylist = (item: SavedPlaylistItem) => {
    if (item.type === 'custom') {
      setActiveView(`playlist:${item.id}`);
    } else {
      loadPlaylist(item.targetUrl, item.type);
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
    <>
      <aside className="hidden md:flex w-64 lg:w-72 xl:w-80 h-full flex-col gap-2 shrink-0 select-none pb-2">
        {/* Top Navigation Block (Black & Grey Theme) */}
        <nav className="bg-[#121212] border border-[#202020] rounded-xl p-3 sm:p-3.5 flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveView('home');
              setSearchQuery?.('');
            }}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              activeView === 'home'
                ? 'text-white bg-[#222222] border border-[#333333]'
                : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h5v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6h5V7.577l-7.5-4.33z" />
            </svg>
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('ambience');
              setSearchQuery?.('');
            }}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              activeView === 'ambience' || activeView === 'mixer'
                ? 'text-white bg-[#222222] border border-[#333333]'
                : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <div className="flex items-center gap-4">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
              </svg>
              <span>Ambience</span>
            </div>
            {activeCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('vinyl');
              setSearchQuery?.('');
            }}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              activeView === 'vinyl'
                ? 'text-white bg-[#222222] border border-[#333333]'
                : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
            </svg>
            <span>Dual Vinyl</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('lyrics');
              setSearchQuery?.('');
            }}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              activeView === 'lyrics'
                ? 'text-white bg-[#222222] border border-[#333333]'
                : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <span>Lyrics</span>
          </button>
        </nav>

        {/* "Your Library" Block */}
        <section className="bg-[#121212] border border-[#202020] rounded-xl p-3 sm:p-4 flex-1 flex flex-col overflow-hidden">
          {/* Library Header with + Button */}
          <div className="flex items-center justify-between text-[#888888] mb-3">
            <div className="flex items-center gap-2.5 font-bold text-sm hover:text-white transition-colors">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M14.5 2.134a1 1 0 0 1 1 0l6 3.464a1 1 0 0 1 .5.866V18a1 1 0 0 1-.5.866l-6 3.464a1 1 0 0 1-1 0l-6-3.464a1 1 0 0 1-.5-.866V6.464a1 1 0 0 1 .5-.866l6-3.464zM4.75 5a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V5.75A.75.75 0 0 0 6.25 5h-1.5z" />
              </svg>
              <span>Playlists</span>
            </div>

            {/* "+" Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-8 h-8 rounded-full bg-[#1c1c1c] hover:bg-[#282828] text-white flex items-center justify-center text-lg transition-colors cursor-pointer border border-[#2a2a2a]"
              title="Add YouTube, Spotify, or Local playlist"
            >
              +
            </button>
          </div>

          {/* Playlists List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {savedPlaylists.length === 0 ? (
              <div className="p-4 bg-[#181818] rounded-lg text-center space-y-2 border border-[#242424]">
                <p className="text-xs font-semibold text-white">Your library is empty</p>
                <p className="text-[11px] text-[#888888]">
                  Like any song or click the <strong className="text-white">+</strong> button above to create playlists.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 px-3 py-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-full transition-colors cursor-pointer"
                >
                  + Add Playlist
                </button>
              </div>
            ) : (
              [...savedPlaylists]
                .sort((a, b) => {
                  if (a.id === 'liked-songs') return -1;
                  if (b.id === 'liked-songs') return 1;
                  return 0;
                })
                .map((item) => {
                  const isActive = activeView === `playlist:${item.id}`;
                  const isLikedPlaylist = item.id === 'liked-songs';
                  const trackCount = item.tracks ? item.tracks.length : null;
                  const displaySubtitle = trackCount !== null
                    ? `${trackCount} ${trackCount === 1 ? 'song' : 'songs'}`
                    : item.subtitle;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectPlaylist(item)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group transition-colors ${
                        isActive
                          ? 'bg-[#222222] border border-[#383838] text-white'
                          : 'hover:bg-[#1a1a1a] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isLikedPlaylist ? (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2a2a2a] to-[#161616] border border-[#3a3a3a] flex items-center justify-center text-white shrink-0 shadow-md">
                            <HeartIcon filled className="w-5 h-5 text-zinc-200" />
                          </div>
                        ) : item.coverUrl ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow border border-[#2a2a2a] relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        ) : item.tracks && item.tracks.length > 0 && item.tracks[0].thumbnail ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow border border-[#2a2a2a] relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.tracks[0].thumbnail} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow border ${
                              isActive
                                ? 'bg-[#2a2a2a] border-[#444444] text-white'
                                : 'bg-[#1e1e1e] border-[#2a2a2a] text-zinc-400'
                            }`}
                          >
                            <PlaylistCoverIcon iconKey={item.icon} className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-semibold truncate transition-colors ${
                              isActive ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[10px] text-[#888888] truncate mt-0.5">
                            {displaySubtitle}
                          </p>
                        </div>
                      </div>

                      {!isLikedPlaylist && (
                        <button
                          type="button"
                          onClick={(e) => handleRemovePlaylist(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-rose-400 text-xs p-1 transition-opacity cursor-pointer"
                          title="Remove playlist"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })
            )}
          </div>

          {/* Upload Local Audio Button (Always available at bottom) */}
          <div className="pt-2 border-t border-[#202020] shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] cursor-pointer group transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 shrink-0 shadow">
                <FolderIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                  Upload Custom Audio
                </p>
                <p className="text-[10px] text-[#888888] truncate">Local File • .mp3, .wav, .flac</p>
              </div>
            </div>
          </div>
        </section>
      </aside>

      {/* Add Playlist Modal */}
      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSavePlaylist={handleSavePlaylist}
        onUploadLocalFile={(file) => {
          switchAdapter('local');
          loadCustomLocalFile(file);
        }}
      />
    </>
  );
}
