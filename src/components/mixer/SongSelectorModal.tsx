'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { TrackInfo } from '@/types/playback';
import { SavedPlaylistItem } from '@/components/spotify/AddSourceModal';
import {
  ALL_GENRE_TRENDING_SONGS,
  trendingSongToTrackInfo,
} from '@/lib/music-data';
import { YouTubeSearchResult } from '@/app/api/youtube/search/route';

interface SongSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (track: TrackInfo) => void;
  deckName: 'Deck A' | 'Deck B';
  savedPlaylists: SavedPlaylistItem[];
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

function parseDurationSeconds(durStr: string): number {
  const parts = durStr.split(':').map(Number);
  if (parts.some(isNaN)) return 210;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 210;
}

export default function SongSelectorModal({
  isOpen,
  onClose,
  onSelectSong,
  deckName,
  savedPlaylists,
}: SongSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'viral' | 'youtube' | 'playlists' | 'custom'>('all');
  const [ytResults, setYtResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Detect direct YouTube URL in search bar or input
  const detectedVideoId = useMemo(() => {
    return extractYouTubeId(searchQuery) || extractYouTubeId(customUrlInput);
  }, [searchQuery, customUrlInput]);

  // Debounced live YouTube Search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2 || detectedVideoId) {
      setYtResults([]);
      setIsSearchingYt(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingYt(true);
      try {
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results)) {
            setYtResults(data.results);
          }
        }
      } catch (err) {
        console.warn('Modal YouTube search error:', err);
      } finally {
        setIsSearchingYt(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, detectedVideoId]);

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

  const filteredLocalSongs = useMemo(() => {
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

  const handleSelectLocalTrack = (song: TrackInfo) => {
    onSelectSong(song);
    onClose();
  };

  const handleSelectYtResult = (item: YouTubeSearchResult) => {
    const track: TrackInfo = {
      id: item.id,
      title: item.title,
      artist: item.channel,
      duration: parseDurationSeconds(item.duration),
      artworkUrl: item.thumbnail,
      source: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${item.id}`,
    };
    onSelectSong(track);
    onClose();
  };

  const handleLoadDirectYtId = (vId: string) => {
    const track: TrackInfo = {
      id: vId,
      title: `YouTube Video (${vId})`,
      artist: 'YouTube',
      duration: 210,
      artworkUrl: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
      source: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${vId}`,
    };
    onSelectSong(track);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const track: TrackInfo = {
      id: `local-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Custom File',
      album: 'Local Upload',
      duration: 180,
      artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      source: 'local',
      sourceUrl: URL.createObjectURL(file),
    };

    onSelectSong(track);
    onClose();
  };

  if (!isOpen) return null;

  const isDeckA = deckName === 'Deck A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0f0e13] border border-orange-500/40 rounded-2xl shadow-2xl shadow-orange-950/60 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#25202c] flex items-center justify-between shrink-0 bg-gradient-to-r from-orange-950/40 via-purple-950/30 to-[#0f0e13]">
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
                <h3 className="text-base font-extrabold text-white">Load Any Song to Spin</h3>
              </div>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                Search any song on YouTube, paste a URL, pick trending, or upload local audio
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

        {/* Search & URL Input Bar */}
        <div className="p-4 border-b border-[#221e2a] bg-[#14121a] shrink-0 space-y-3">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-[#ff7518] text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search any song, artist, album, or paste a YouTube link..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-[#1c1924] border border-[#2e2938] focus:border-[#ff7518] text-white text-xs outline-none transition-all placeholder-[#716e7a]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-xs text-[#716e7a] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Direct YouTube Video Detected Callout */}
          {detectedVideoId && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-950/40 border border-orange-500/50 animate-in fade-in">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔗</span>
                <div>
                  <p className="text-xs font-bold text-white">YouTube Video ID: {detectedVideoId}</p>
                  <p className="text-[11px] text-orange-300">Ready to load directly into {deckName}!</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleLoadDirectYtId(detectedVideoId)}
                className="px-3.5 py-1.5 rounded-lg bg-[#ff7518] hover:bg-orange-400 text-black font-extrabold text-xs transition-all shadow-md cursor-pointer"
              >
                Load Now 🎃
              </button>
            </div>
          )}

          {/* Quick Filter Tabs + Local Upload Button */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#ff7518] text-black shadow-md shadow-orange-500/30'
                    : 'bg-[#1b1922] text-[#a1a1aa] hover:text-white border border-[#2a2636]'
                }`}
              >
                🌐 All & YouTube
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
                🔥 Trending Viral
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
                💀 My Playlists ({savedPlaylists.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'custom'
                    ? 'bg-[#ff7518] text-black shadow-md shadow-orange-500/30'
                    : 'bg-[#1b1922] text-[#a1a1aa] hover:text-white border border-[#2a2636]'
                }`}
              >
                📁 Local Upload / Link
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Songs List & Search Results Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Custom Link / File Upload View */}
          {activeTab === 'custom' && (
            <div className="p-4 rounded-xl bg-[#14121a] border border-[#2e2938] space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📂</span> Upload Local Audio Track
                </h4>
                <p className="text-xs text-[#a1a1aa] mt-1">
                  Upload MP3, WAV, AAC, or FLAC files directly from your computer to scratch and blend on {deckName}.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-4 py-2 rounded-xl bg-orange-950/60 border border-orange-500 text-orange-400 hover:bg-[#ff7518] hover:text-black font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>📁</span> Choose Audio File...
                </button>
              </div>

              <div className="pt-4 border-t border-[#25202c]">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🔗</span> Paste Any YouTube URL
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg bg-[#1c1924] border border-[#2e2938] text-white text-xs outline-none focus:border-[#ff7518]"
                  />
                  <button
                    type="button"
                    disabled={!extractYouTubeId(customUrlInput)}
                    onClick={() => {
                      const vId = extractYouTubeId(customUrlInput);
                      if (vId) handleLoadDirectYtId(vId);
                    }}
                    className="px-3.5 h-9 rounded-lg bg-[#ff7518] hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Load Track
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* YouTube Search Results Section (if search query is active) */}
          {searchQuery.trim().length >= 2 && activeTab !== 'custom' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#ff7518] flex items-center gap-1.5">
                  <span>🌐</span> YouTube Live Results
                  {isSearchingYt && <span className="animate-spin text-xs">⏳</span>}
                </span>
                <span className="text-[10px] text-[#716e7a]">
                  {ytResults.length > 0 ? `${ytResults.length} matches` : 'Searching...'}
                </span>
              </div>

              {ytResults.length > 0 ? (
                <div className="space-y-1 divide-y divide-[#1e1b26]/50">
                  {ytResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectYtResult(item)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#1a1722] cursor-pointer group transition-all border border-transparent hover:border-orange-500/30"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden relative bg-[#1c1924] shrink-0 border border-[#2b2636] group-hover:border-[#ff7518] transition-colors">
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate group-hover:text-[#ff7518] transition-colors">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#8e8b98]">
                            <span className="truncate">{item.channel}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px]">{item.duration}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-2.5 py-1.5 rounded-lg bg-orange-950/40 border border-orange-500/40 text-orange-400 group-hover:bg-[#ff7518] group-hover:text-black font-extrabold text-[11px] transition-all shrink-0"
                      >
                        Load to {deckName}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                !isSearchingYt && (
                  <p className="text-xs text-[#716e7a] px-2 py-1">
                    No online results yet. Try typing a specific song name or artist.
                  </p>
                )
              )}
            </div>
          )}

          {/* Curated / Local Library Songs Section */}
          {activeTab !== 'custom' && (
            <div className="space-y-2">
              <div className="px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#a1a1aa] flex items-center gap-1.5">
                  <span>🔥</span> Catalog & Playlists ({filteredLocalSongs.length})
                </span>
              </div>

              {filteredLocalSongs.length > 0 ? (
                <div className="space-y-1 divide-y divide-[#1e1b26]/50">
                  {filteredLocalSongs.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => handleSelectLocalTrack(song)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#1a1722] cursor-pointer group transition-all border border-transparent hover:border-orange-500/30"
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

                      <button
                        type="button"
                        className="px-2.5 py-1.5 rounded-lg bg-orange-950/40 border border-orange-500/40 text-orange-400 group-hover:bg-[#ff7518] group-hover:text-black font-extrabold text-[11px] transition-all shrink-0"
                      >
                        Load to {deckName}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-[#716e7a] text-xs">
                  No catalog tracks match &quot;{searchQuery}&quot;. Check YouTube results above!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0c0b0f] border-t border-[#221e2a] flex items-center justify-between text-[11px] text-[#716e7a] shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="text-orange-400">🎃</span> Unlimited track support enabled for {deckName}
          </span>
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
