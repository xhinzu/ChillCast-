'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { TrackInfo } from '@/types/playback';
import { SavedPlaylistItem } from '@/components/spotify/AddSourceModal';
import {
  ALL_GENRE_TRENDING_SONGS,
  trendingSongToTrackInfo,
} from '@/lib/music-data';

interface SongSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (track: TrackInfo) => void;
  deckName: 'Deck A' | 'Deck B';
  savedPlaylists: SavedPlaylistItem[];
}

export default function SongSelectorModal({
  isOpen,
  onClose,
  onSelectSong,
  deckName,
  savedPlaylists,
}: SongSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'viral' | 'playlists'>('all');

  // Flatten all songs from library and playlists
  const allAvailableSongs: TrackInfo[] = useMemo(() => {
    const list: TrackInfo[] = [];
    const seen = new Set<string>();

    // 1. Trending Songs (All genres)
    for (const song of ALL_GENRE_TRENDING_SONGS) {
      if (!seen.has(song.id)) {
        seen.add(song.id);
        list.push(trendingSongToTrackInfo(song));
      }
    }

    // 2. Saved Playlists tracks
    for (const pl of savedPlaylists) {
      if (pl.tracks) {
        for (const t of pl.tracks) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            list.push({
              id: t.id,
              title: t.title,
              artist: t.artist,
              duration: 210,
              artworkUrl: t.thumbnail,
              source: 'youtube',
              sourceUrl: `https://www.youtube.com/watch?v=${t.id}`,
            });
          }
        }
      }
    }

    return list;
  }, [savedPlaylists]);

  const filteredSongs = useMemo(() => {
    let result = allAvailableSongs;

    if (activeTab === 'playlists') {
      const plSongIds = new Set<string>();
      for (const pl of savedPlaylists) {
        if (pl.tracks) {
          for (const t of pl.tracks) plSongIds.add(t.id);
        }
      }
      result = result.filter((s) => plSongIds.has(s.id));
    } else if (activeTab === 'viral') {
      const viralIds = new Set(ALL_GENRE_TRENDING_SONGS.slice(0, 10).map((s) => s.id));
      result = result.filter((s) => viralIds.has(s.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allAvailableSongs, activeTab, searchQuery, savedPlaylists]);

  if (!isOpen) return null;

  const isDeckA = deckName === 'Deck A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0f0e13] border border-orange-500/40 rounded-2xl shadow-2xl shadow-orange-950/60 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#25202c] flex items-center justify-between shrink-0 bg-gradient-to-r from-orange-950/40 via-purple-950/30 to-[#0f0e13]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isDeckA ? '🎃' : '💀'}</span>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    isDeckA
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  }`}
                >
                  {deckName}
                </span>
                <h3 className="text-base font-extrabold text-white">Load Spooky Track</h3>
              </div>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                Select any trending track or custom playlist song to spin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b1922] hover:bg-[#282533] text-[#a1a1aa] hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer border border-[#2b2636]"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-[#221e2a] bg-[#14121a] shrink-0">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-[#ff7518] text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by track title or artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-[#1c1924] border border-[#2e2938] focus:border-[#ff7518] text-white text-xs outline-none transition-all placeholder-[#716e7a]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-xs text-[#716e7a] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#ff7518] text-black shadow-md shadow-orange-500/30'
                  : 'bg-[#1b1922] text-[#a1a1aa] hover:text-white border border-[#2a2636]'
              }`}
            >
              🔥 All Trending ({allAvailableSongs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('viral')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'viral'
                  ? 'bg-[#ff7518] text-black shadow-md shadow-orange-500/30'
                  : 'bg-[#1b1922] text-[#a1a1aa] hover:text-white border border-[#2a2636]'
              }`}
            >
              📱 Top Viral
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('playlists')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'playlists'
                  ? 'bg-[#ff7518] text-black shadow-md shadow-orange-500/30'
                  : 'bg-[#1b1922] text-[#a1a1aa] hover:text-white border border-[#2a2636]'
              }`}
            >
              💀 Your Playlists ({savedPlaylists.length})
            </button>
          </div>
        </div>

        {/* Songs List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-[#1e1b26]/50">
          {filteredSongs.length > 0 ? (
            filteredSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => {
                  onSelectSong(song);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#1a1722] cursor-pointer group transition-all border border-transparent hover:border-orange-500/30"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                  <div className="w-11 h-11 rounded-lg overflow-hidden relative bg-[#1c1924] shrink-0 border border-[#2b2636] group-hover:border-[#ff7518] transition-colors">
                    {song.artworkUrl ? (
                      <Image
                        src={song.artworkUrl}
                        alt={song.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">
                        🎃
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-[#ff7518] transition-colors">
                      {song.title}
                    </p>
                    <p className="text-[11px] text-[#8e8b98] truncate mt-0.5">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-orange-950/40 border border-orange-500/40 text-orange-400 group-hover:bg-[#ff7518] group-hover:text-black font-extrabold text-[11px] transition-all"
                  >
                    Load into {deckName}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-[#716e7a] text-xs">
              <span className="text-3xl block mb-2">🦇</span>
              No spooky tracks found matching &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0c0b0f] border-t border-[#221e2a] flex items-center justify-between text-[11px] text-[#716e7a] shrink-0">
          <span>🎃 Ready to mix on {deckName}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-[#a1a1aa] hover:text-white cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
