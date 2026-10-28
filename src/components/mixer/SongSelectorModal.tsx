'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { TrackInfo } from '@/types/playback';
import { SavedPlaylistItem } from '@/components/spotify/AddSourceModal';
import {
  TRENDING_ENGLISH_SONGS,
  TRENDING_MALAYALAM_SONGS,
  RECOMMENDED_SONGS,
  catalogSongToTrackInfo,
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
  const [activeTab, setActiveTab] = useState<'all' | 'english' | 'malayalam' | 'playlists'>('all');

  // Flatten all songs from library and playlists
  const allAvailableSongs: TrackInfo[] = useMemo(() => {
    const list: TrackInfo[] = [];
    const seen = new Set<string>();

    // 1. English
    for (const song of TRENDING_ENGLISH_SONGS) {
      if (!seen.has(song.id)) {
        seen.add(song.id);
        list.push(catalogSongToTrackInfo(song));
      }
    }

    // 2. Malayalam
    for (const song of TRENDING_MALAYALAM_SONGS) {
      if (!seen.has(song.id)) {
        seen.add(song.id);
        list.push(catalogSongToTrackInfo(song));
      }
    }

    // 3. Recommended
    for (const song of RECOMMENDED_SONGS) {
      if (!seen.has(song.id)) {
        seen.add(song.id);
        list.push(catalogSongToTrackInfo(song));
      }
    }

    // 4. Saved Playlists tracks
    for (const pl of savedPlaylists) {
      if (pl.tracks) {
        for (const t of pl.tracks) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            list.push({
              id: t.id,
              title: t.title,
              artist: t.artist,
              duration: 200,
              artworkUrl: t.thumbnail,
              source: 'youtube',
              sourceUrl: t.id,
            });
          }
        }
      }
    }

    return list;
  }, [savedPlaylists]);

  const filteredSongs = useMemo(() => {
    let result = allAvailableSongs;

    if (activeTab === 'english') {
      const engIds = new Set(TRENDING_ENGLISH_SONGS.map((s) => s.id));
      result = result.filter((s) => engIds.has(s.id));
    } else if (activeTab === 'malayalam') {
      const malIds = new Set(TRENDING_MALAYALAM_SONGS.map((s) => s.id));
      result = result.filter((s) => malIds.has(s.id));
    } else if (activeTab === 'playlists') {
      const plSongIds = new Set<string>();
      for (const pl of savedPlaylists) {
        if (pl.tracks) {
          for (const t of pl.tracks) plSongIds.add(t.id);
        }
      }
      result = result.filter((s) => plSongIds.has(s.id));
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#141414] rounded-2xl border border-[#2a2a2a] p-5 shadow-2xl flex flex-col max-h-[85vh] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#1d90f5] animate-pulse" />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Load Song to <span className="text-[#1d90f5] font-extrabold">{deckName}</span>
              </h3>
              <p className="text-xs text-[#888888]">Choose a track from your library or curated catalog</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#202020] hover:bg-[#2e2e2e] text-[#b3b3b3] hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search song title or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1e1e] text-white text-xs px-3.5 py-2.5 rounded-xl border border-[#333333] focus:border-[#1d90f5] outline-none transition-colors"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-[#888888] hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-[#1d90f5] text-white'
                : 'bg-[#202020] text-[#b3b3b3] hover:text-white'
            }`}
          >
            All Songs ({allAvailableSongs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('english')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'english'
                ? 'bg-[#1d90f5] text-white'
                : 'bg-[#202020] text-[#b3b3b3] hover:text-white'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('malayalam')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'malayalam'
                ? 'bg-[#1d90f5] text-white'
                : 'bg-[#202020] text-[#b3b3b3] hover:text-white'
            }`}
          >
            Malayalam
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('playlists')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'playlists'
                ? 'bg-[#1d90f5] text-white'
                : 'bg-[#202020] text-[#b3b3b3] hover:text-white'
            }`}
          >
            Playlists
          </button>
        </div>

        {/* Songs List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#222222]">
          {filteredSongs.length === 0 ? (
            <div className="py-12 text-center text-[#888888] space-y-2">
              <span className="text-3xl">🔍</span>
              <p className="text-xs">No matching songs found</p>
            </div>
          ) : (
            filteredSongs.map((track) => (
              <div
                key={track.id}
                onClick={() => {
                  onSelectSong(track);
                  onClose();
                }}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#202020] cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-black shrink-0 border border-[#2a2a2a]">
                    <Image
                      src={track.artworkUrl || `https://img.youtube.com/vi/${track.id}/hqdefault.jpg`}
                      alt={track.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-[#1d90f5] transition-colors">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-[#888888] truncate">{track.artist}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-[#242424] group-hover:bg-[#1d90f5] text-[#b3b3b3] group-hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Load 💿
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
