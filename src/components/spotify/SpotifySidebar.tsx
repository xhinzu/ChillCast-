'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { useAmbient } from '@/context/AmbientContext';
import AddSourceModal, { SavedPlaylistItem } from './AddSourceModal';

interface SpotifySidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const STORAGE_KEY = 'chillify_saved_playlists';

export default function SpotifySidebar({
  activeView,
  setActiveView,
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
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSavedPlaylists(parsed);
          }
        }
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
        {/* Top Navigation Block */}
        <nav className="bg-[#121212] rounded-lg p-3 sm:p-4 flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-md font-bold text-sm transition-colors cursor-pointer ${
              activeView === 'home'
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
            onClick={() => setActiveView('ambience')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-md font-bold text-sm transition-colors cursor-pointer ${
              activeView === 'ambience' || activeView === 'mixer'
                ? 'text-white'
                : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5.75A.75.75 0 0 1 3.75 5h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75zm0 6.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12zm0 6.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75z" />
              </svg>
              <span>Ambience</span>
            </div>
            {activeCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#1d90f5] shadow-sm shadow-[#1d90f5]" />
            )}
          </button>
        </nav>

        {/* "Your Library" Block */}
        <section className="bg-[#121212] rounded-lg p-3 sm:p-4 flex-1 flex flex-col overflow-hidden">
          {/* Library Header with + Button */}
          <div className="flex items-center justify-between text-[#b3b3b3] mb-3">
            <div className="flex items-center gap-3 font-bold text-sm hover:text-white transition-colors">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.5 2.134a1 1 0 0 1 1 0l6 3.464a1 1 0 0 1 .5.866V18a1 1 0 0 1-.5.866l-6 3.464a1 1 0 0 1-1 0l-6-3.464a1 1 0 0 1-.5-.866V6.464a1 1 0 0 1 .5-.866l6-3.464zM4.75 5a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V5.75A.75.75 0 0 0 6.25 5h-1.5z" />
              </svg>
              <span>Playlists</span>
            </div>

            {/* "+" Button opens the "What method are you choosing?" modal */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-8 h-8 rounded-full hover:bg-[#282828] text-white flex items-center justify-center text-xl transition-colors cursor-pointer hover:scale-105"
              title="Add YouTube, Spotify, or Local playlist"
            >
              +
            </button>
          </div>

          {/* Scrollable Saved Playlists List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {savedPlaylists.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#181818] border border-dashed border-[#2e2e2e] text-center my-4 space-y-2">
                <p className="text-xs font-semibold text-white">Your library is empty</p>
                <p className="text-[11px] text-[#b3b3b3]">
                  Like any song or click the <strong className="text-white">+</strong> button above to create playlists.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 px-3 py-1.5 bg-[#1d90f5] hover:bg-[#3b82f6] text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
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
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition-colors ${
                        isActive
                          ? 'bg-[#1f2d3d] border border-[#1d90f5]/40 text-white'
                          : 'hover:bg-[#1f1f1f]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isLikedPlaylist ? (
                          <div className="w-10 h-10 rounded bg-gradient-to-br from-[#1d90f5] via-[#2f66ff] to-[#7928ca] flex items-center justify-center text-white text-sm shrink-0 shadow-md">
                            💙
                          </div>
                        ) : (
                          <div
                            className={`w-10 h-10 rounded flex items-center justify-center text-lg shrink-0 shadow ${
                              isActive ? 'bg-[#1d90f5]/20 text-[#1d90f5]' : 'bg-[#242424]'
                            }`}
                          >
                            {item.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-semibold truncate transition-colors ${
                              isActive ? 'text-[#1d90f5]' : 'text-white group-hover:text-[#1d90f5]'
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[10px] text-[#b3b3b3] truncate">
                            {isLikedPlaylist ? `📌 ${displaySubtitle}` : displaySubtitle}
                          </p>
                        </div>
                      </div>

                      {!isLikedPlaylist && (
                        <button
                          type="button"
                          onClick={(e) => handleRemovePlaylist(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-[#777] hover:text-rose-400 text-xs p-1 transition-opacity cursor-pointer"
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
          <div className="pt-2 border-t border-[#242424] shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1f1f1f] cursor-pointer group transition-colors"
            >
              <div className="w-10 h-10 rounded bg-[#242424] flex items-center justify-center text-lg shrink-0 shadow">
                📁
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate group-hover:text-[#1d90f5] transition-colors">
                  Upload Custom Audio
                </p>
                <p className="text-[10px] text-[#b3b3b3] truncate">Local File • .mp3, .wav, .flac</p>
              </div>
            </div>
          </div>
        </section>
      </aside>

      {/* "What method are you choosing?" Modal */}
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
