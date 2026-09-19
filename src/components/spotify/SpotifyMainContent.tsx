'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { useAmbient } from '@/context/AmbientContext';
import { YouTubeSearchResult } from '@/app/api/youtube/search/route';
import { SavedPlaylistItem, CustomPlaylistTrack } from './AddSourceModal';
import { TrackInfo } from '@/types/playback';
import { ENGLISH_TRACKS, MALAYALAM_TRACKS, HINDI_TRACKS, CuratedTrack } from '@/lib/curated-tracks';

interface SpotifyMainContentProps {
  activeView: string;
  setActiveView: (view: string) => void;
  showVideo: boolean;
  setShowVideo: (show: boolean) => void;
  searchQuery: string;
  /** Extra Tailwind classes injected by parent for mobile bottom-padding compensation */
  extraBottomPadding?: string;
}

const STORAGE_KEY = 'chillify_saved_playlists';

function parseDurationSeconds(durStr: string): number {
  const parts = durStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export default function SpotifyMainContent({
  activeView,
  setActiveView,
  showVideo,
  setShowVideo,
  searchQuery,
  extraBottomPadding = '',
}: SpotifyMainContentProps) {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    activeAdapterType,
    errorMessage,
    loadPlaylist,
    playCustomTrackList,
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

  // Playlists loaded from localStorage
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylistItem[]>([]);

  // YouTube Search States (Main Search)
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Add-to-Playlist Modal Popover State
  const [playlistTargetVideo, setPlaylistTargetVideo] = useState<YouTubeSearchResult | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [showCreateInline, setShowCreateInline] = useState<boolean>(false);

  // In-Playlist Quick Search State
  const [inlineSearchQuery, setInlineSearchQuery] = useState<string>('');
  const [inlineSearchResults, setInlineSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isInlineSearching, setIsInlineSearching] = useState<boolean>(false);

  // Load playlists & listen for storage sync
  const loadStoredPlaylists = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedPlaylists(JSON.parse(stored));
      } else {
        setSavedPlaylists([]);
      }
    } catch {
      setSavedPlaylists([]);
    }
  };

  useEffect(() => {
    loadStoredPlaylists();
    const handleSync = () => loadStoredPlaylists();
    window.addEventListener('storage', handleSync);
    window.addEventListener('chillify_playlists_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('chillify_playlists_updated', handleSync);
    };
  }, []);

  const savePlaylists = (updated: SavedPlaylistItem[]) => {
    setSavedPlaylists(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('chillify_playlists_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  };

  // Dynamic greeting based on time of day
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  // Debounced Main Search Query (400ms prevents aggressive request flooding)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const timeout = setTimeout(() => {
      fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.results)) {
            setSearchResults(data.results);
            if (data.results.length === 0 && data.error) {
              setSearchError('Search is temporarily busy. Click below to retry.');
            }
          } else {
            setSearchResults([]);
            if (data.error) {
              setSearchError('Search service temporarily unavailable. Click below to retry.');
            }
          }
        })
        .catch((err) => {
          console.error('Search fetch error:', err);
          setSearchResults([]);
          setSearchError('Network error connecting to search. Click below to retry.');
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Debounced In-Playlist Search Query
  useEffect(() => {
    if (!inlineSearchQuery.trim()) {
      setInlineSearchResults([]);
      setIsInlineSearching(false);
      return;
    }

    setIsInlineSearching(true);
    const timeout = setTimeout(() => {
      fetch(`/api/youtube/search?q=${encodeURIComponent(inlineSearchQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.results)) {
            setInlineSearchResults(data.results);
          } else {
            setInlineSearchResults([]);
          }
        })
        .catch(() => {
          setInlineSearchResults([]);
        })
        .finally(() => {
          setIsInlineSearching(false);
        });
    }, 400);

    return () => clearTimeout(timeout);
  }, [inlineSearchQuery]);

  // NOTE: intentionally NOT async — mobile browsers require audio start
  // to happen within the synchronous user-gesture handler.
  const handlePlaySearchResult = (video: YouTubeSearchResult) => {
    if (typeof window !== 'undefined') {
      const yt = (window as unknown as { __ytAdapter?: { primeAudioStream?: (id: string) => void } }).__ytAdapter;
      yt?.primeAudioStream?.(video.id);
    }
    loadPlaylist(video.id, 'youtube');
  };

  // Add video to an existing or new Custom Playlist
  const handleAddVideoToPlaylist = (playlistId: string, video: YouTubeSearchResult) => {
    const trackItem: CustomPlaylistTrack = {
      id: video.id,
      title: video.title,
      artist: video.channel,
      duration: video.duration,
      thumbnail: video.thumbnail,
      addedAt: Date.now(),
    };

    let targetTitle = 'Playlist';
    const updated = savedPlaylists.map((p) => {
      if (p.id === playlistId) {
        targetTitle = p.title;
        const prevTracks = p.tracks || [];
        // Avoid duplicate videos in the same playlist
        if (prevTracks.some((t) => t.id === video.id)) {
          return p;
        }
        const newTracks = [...prevTracks, trackItem];
        return {
          ...p,
          tracks: newTracks,
          subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} • Custom Playlist`,
        };
      }
      return p;
    });

    savePlaylists(updated);
    setPlaylistTargetVideo(null);
    setAddedToast(`Added "${video.title}" to ${targetTitle}!`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  // Create new custom playlist on the fly and add video
  const handleCreateAndAdd = (video: YouTubeSearchResult) => {
    const title = newPlaylistName.trim() || 'My Custom Playlist';
    const trackItem: CustomPlaylistTrack = {
      id: video.id,
      title: video.title,
      artist: video.channel,
      duration: video.duration,
      thumbnail: video.thumbnail,
      addedAt: Date.now(),
    };

    const newPlaylist: SavedPlaylistItem = {
      id: `custom-${Date.now()}`,
      title,
      subtitle: '1 song • Custom Playlist',
      type: 'custom',
      targetUrl: '',
      icon: '🎵',
      tracks: [trackItem],
      description: 'Custom created playlist',
      createdAt: Date.now(),
    };

    savePlaylists([newPlaylist, ...savedPlaylists]);
    setNewPlaylistName('');
    setShowCreateInline(false);
    setPlaylistTargetVideo(null);
    setAddedToast(`Created "${title}" and added "${video.title}"!`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  // Remove track from active custom playlist
  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    const updated = savedPlaylists.map((p) => {
      if (p.id === playlistId) {
        const prevTracks = p.tracks || [];
        const newTracks = prevTracks.filter((t) => t.id !== trackId);
        return {
          ...p,
          tracks: newTracks,
          subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} • Custom Playlist`,
        };
      }
      return p;
    });
    savePlaylists(updated);
  };

  // Delete entire playlist
  const handleDeletePlaylist = (playlistId: string) => {
    const updated = savedPlaylists.filter((p) => p.id !== playlistId);
    savePlaylists(updated);
    setActiveView('home');
  };

  // Play custom playlist starting from a specific index
  const handlePlayCustomPlaylist = (playlist: SavedPlaylistItem, startIndex = 0) => {
    if (!playlist.tracks || playlist.tracks.length === 0) return;
    const targetTrack = playlist.tracks[startIndex];
    if (targetTrack && typeof window !== 'undefined') {
      const yt = (window as unknown as { __ytAdapter?: { primeAudioStream?: (id: string) => void } }).__ytAdapter;
      yt?.primeAudioStream?.(targetTrack.id);
    }
    const trackInfos: TrackInfo[] = playlist.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: playlist.title,
      duration: parseDurationSeconds(t.duration),
      source: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${t.id}`,
      artworkUrl: t.thumbnail,
    }));
    playCustomTrackList(trackInfos, startIndex);
  };

  // Check current view modes
  const isPlaylistView = activeView.startsWith('playlist:');
  const activePlaylistId = isPlaylistView ? activeView.replace('playlist:', '') : null;
  const currentPlaylist = activePlaylistId
    ? savedPlaylists.find((p) => p.id === activePlaylistId)
    : null;

  const isSearchActive = searchQuery.trim().length > 0 || activeView === 'search';
  const isPlaylistsView = activeView === 'playlists';
  const isAmbienceView = activeView === 'ambience' || activeView === 'mixer';
  const isHomeView = !isSearchActive && !isPlaylistView && !isPlaylistsView && !isAmbienceView;
  const customPlaylistsOnly = savedPlaylists.filter((p) => p.type === 'custom');

  // Track which curated playlist is currently playing
  const isEnglishPlaying = isPlaying && ENGLISH_TRACKS.some((t) => t.id === currentTrack?.id);
  const isMalayalamPlaying = isPlaying && MALAYALAM_TRACKS.some((t) => t.id === currentTrack?.id);
  const isHindiPlaying = isPlaying && HINDI_TRACKS.some((t) => t.id === currentTrack?.id);

  // Play all songs of a curated category continuously as a playlist
  const handlePlayCuratedPlaylist = (category: 'english' | 'malayalam' | 'hindi') => {
    let tracks: CuratedTrack[] = [];
    let albumName = '';
    if (category === 'english') {
      tracks = ENGLISH_TRACKS;
      albumName = 'English Vibes';
    } else if (category === 'malayalam') {
      tracks = MALAYALAM_TRACKS;
      albumName = 'Malayalam Favorites';
    } else {
      tracks = HINDI_TRACKS;
      albumName = 'Top Rated Hindi';
    }

    if (tracks.length === 0) return;

    if (typeof window !== 'undefined') {
      const yt = (window as unknown as { __ytAdapter?: { primeAudioStream?: (id: string) => void } }).__ytAdapter;
      yt?.primeAudioStream?.(tracks[0].id);
    }

    const trackInfos: TrackInfo[] = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: albumName,
      duration: parseDurationSeconds(t.duration),
      source: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${t.id}`,
      artworkUrl: t.thumbnail,
    }));

    playCustomTrackList(trackInfos, 0);
    setAddedToast(`Playing "${albumName}" (${tracks.length} songs)`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  return (
    <main className={`flex-1 h-full overflow-y-auto bg-[#121212] rounded-lg relative pb-12 select-none ${extraBottomPadding}`}>
      {/* Top Ambient Deep Electric Blue Accent Banner */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-[#0c2b4d] via-[#091728] to-transparent pointer-events-none opacity-90" />

      {/* Main Content Container */}
      <div className="relative z-10 px-4 sm:px-8 py-6 space-y-8">
        {/* Error Notification Toast */}
        {errorMessage && (
          <div className="px-4 py-2.5 rounded-lg bg-rose-900/40 border border-rose-600/40 text-rose-200 text-xs flex items-center justify-between shadow-lg">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Action Notification Toast */}
        {addedToast && (
          <div className="fixed top-16 right-8 z-50 px-4 py-2.5 rounded-lg bg-[#1d90f5] text-white font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <span>✓</span>
            <span className="truncate max-w-sm">{addedToast}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: CUSTOM PLAYLIST DETAIL VIEW                            */}
        {/* ------------------------------------------------------------- */}
        {isPlaylistView && currentPlaylist && (
          <section aria-label="Custom Playlist View" className="space-y-6">
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView('home')}
                className="flex items-center gap-2 text-xs font-semibold text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
              >
                <span>←</span> Back to Home
              </button>

              {currentPlaylist.id !== 'liked-songs' ? (
                <button
                  type="button"
                  onClick={() => handleDeletePlaylist(currentPlaylist.id)}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-3 py-1.5 rounded-full border border-rose-800/40 transition-colors cursor-pointer"
                  title="Delete Playlist"
                >
                  🗑️ Delete Playlist
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const updated = savedPlaylists.map((p) =>
                      p.id === 'liked-songs'
                        ? { ...p, tracks: [], subtitle: '0 songs • Liked Songs' }
                        : p
                    );
                    savePlaylists(updated);
                  }}
                  className="text-xs font-semibold text-[#888888] hover:text-rose-300 hover:bg-rose-950/40 px-3 py-1.5 rounded-full border border-[#333333] transition-colors cursor-pointer"
                  title="Clear all liked songs"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Playlist Header Banner */}
            <div
              className={`flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 sm:p-8 rounded-2xl border shadow-2xl ${
                currentPlaylist.id === 'liked-songs'
                  ? 'bg-gradient-to-b from-[#19325c] to-[#121c2b] border-[#2f5ba0]'
                  : 'bg-gradient-to-b from-[#183457] to-[#121c2b] border-[#233d5e]'
              }`}
            >
              {/* Artwork Tile */}
              <div
                className={`w-36 h-36 sm:w-44 sm:h-44 rounded-xl flex items-center justify-center text-5xl sm:text-6xl shadow-2xl shrink-0 ${
                  currentPlaylist.id === 'liked-songs'
                    ? 'bg-gradient-to-br from-[#1d90f5] via-[#2f66ff] to-[#7928ca]'
                    : 'bg-gradient-to-br from-[#1d90f5] to-[#09488a]'
                }`}
              >
                {currentPlaylist.icon || '🎵'}
              </div>

              {/* Header Info */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 min-w-0">
                <span className="text-[11px] font-extrabold tracking-widest text-[#1d90f5] uppercase">
                  {currentPlaylist.id === 'liked-songs' ? 'FAVORITES' : 'CUSTOM PLAYLIST'}
                </span>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight break-words">
                  {currentPlaylist.title}
                </h1>
                {currentPlaylist.description && (
                  <p className="text-xs sm:text-sm text-[#b3b3b3]">
                    {currentPlaylist.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-[#a7a7a7] mt-1 font-medium">
                  <span className="text-white font-bold">Chillify</span>
                  <span>•</span>
                  <span>{currentPlaylist.tracks?.length || 0} songs</span>
                  <span>•</span>
                  <span>Lo-Fi Soundscape</span>
                </div>
              </div>
            </div>

            {/* Action Bar: Big Play Button */}
            <div className="flex items-center gap-4 py-2">
              <button
                type="button"
                disabled={!currentPlaylist.tracks || currentPlaylist.tracks.length === 0}
                onClick={() => handlePlayCustomPlaylist(currentPlaylist, 0)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all ${
                  currentPlaylist.tracks && currentPlaylist.tracks.length > 0
                    ? 'bg-[#1d90f5] hover:scale-105 text-white hover:bg-[#2fa0ff] cursor-pointer'
                    : 'bg-[#2a2a2a] text-[#666666] cursor-not-allowed opacity-60'
                }`}
                title="Play Entire Playlist"
              >
                <svg className="w-7 h-7 fill-current ml-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <span className="text-xs text-[#b3b3b3] font-medium">
                {currentPlaylist.tracks && currentPlaylist.tracks.length > 0
                  ? 'Click to start continuous playback'
                  : 'Add songs below to start playing'}
              </span>
            </div>

            {/* In-Playlist Quick Search (Add music to it right here!) */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#181818] border border-[#262626] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🔍</span> Add Songs to &ldquo;{currentPlaylist.title}&rdquo;
                </h3>
                {isInlineSearching && (
                  <div className="flex items-center gap-2 text-xs text-[#1d90f5]">
                    <div className="w-3.5 h-3.5 border-2 border-[#1d90f5] border-t-transparent rounded-full animate-spin" />
                    <span>Searching...</span>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search song title, artist, or beats to add..."
                  value={inlineSearchQuery}
                  onChange={(e) => setInlineSearchQuery(e.target.value)}
                  className="w-full bg-[#242424] text-white text-xs px-4 py-2.5 rounded-lg border border-[#333333] focus:border-[#1d90f5] outline-none transition-colors"
                />
                {inlineSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setInlineSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs text-[#b3b3b3] hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Inline Search Results Carousel / Dropdown */}
              {inlineSearchResults.length > 0 && (
                <div className="max-h-72 overflow-y-auto space-y-1.5 pt-2 divide-y divide-[#222222]">
                  {inlineSearchResults.map((video) => {
                    const alreadyInPlaylist = currentPlaylist.tracks?.some((t) => t.id === video.id);
                    return (
                      <div
                        key={video.id}
                        className="flex items-center justify-between gap-3 pt-2 pb-1 hover:bg-[#202020] px-2 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative w-12 h-8 rounded overflow-hidden bg-zinc-900 shrink-0">
                            <Image
                              src={video.thumbnail}
                              alt={video.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">{video.title}</p>
                            <p className="text-[10px] text-[#b3b3b3] truncate">{video.channel} • {video.duration}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={alreadyInPlaylist}
                          onClick={() => handleAddVideoToPlaylist(currentPlaylist.id, video)}
                          className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors shrink-0 ${
                            alreadyInPlaylist
                              ? 'bg-[#2a2a2a] text-[#666666] cursor-not-allowed'
                              : 'bg-[#1d90f5] hover:bg-[#2fa0ff] text-white cursor-pointer'
                          }`}
                        >
                          {alreadyInPlaylist ? 'Added' : '＋ Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Playlist Tracks List */}
            {(!currentPlaylist.tracks || currentPlaylist.tracks.length === 0) ? (
              <div className="p-12 text-center bg-[#181818] rounded-xl border border-[#242424] text-[#b3b3b3] space-y-3">
                <span className="text-4xl">🎵</span>
                <h3 className="text-base font-bold text-white">This playlist is empty</h3>
                <p className="text-xs max-w-md mx-auto">
                  Search for songs using the search bar above or use the main YouTube search at the top to add tracks to your playlist.
                </p>
              </div>
            ) : (
              <div className="bg-[#181818] rounded-xl border border-[#242424] overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#282828] text-[11px] font-bold text-[#b3b3b3] uppercase tracking-wider">
                  <span className="col-span-1 text-center">#</span>
                  <span className="col-span-6 sm:col-span-7">Title</span>
                  <span className="col-span-3 sm:col-span-2 text-right">Time</span>
                  <span className="col-span-2 text-right">Action</span>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-[#222222]">
                  {currentPlaylist.tracks.map((track, idx) => (
                    <div
                      key={track.id}
                      onClick={() => handlePlayCustomPlaylist(currentPlaylist, idx)}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[#202020] cursor-pointer group transition-colors select-none"
                    >
                      {/* # / Hover Play */}
                      <div className="col-span-1 flex items-center justify-center text-xs text-[#b3b3b3]">
                        <span className="group-hover:hidden">{idx + 1}</span>
                        <span className="hidden group-hover:inline text-[#1d90f5] font-bold">▶</span>
                      </div>

                      {/* Title & Artist */}
                      <div className="col-span-6 sm:col-span-7 flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded overflow-hidden bg-zinc-900 shrink-0">
                          <Image
                            src={track.thumbnail}
                            alt={track.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#1d90f5] transition-colors">
                            {track.title}
                          </p>
                          <p className="text-[11px] text-[#b3b3b3] truncate">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="col-span-3 sm:col-span-2 text-right text-xs font-mono text-[#b3b3b3]">
                        {track.duration}
                      </div>

                      {/* Actions: Remove Button */}
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTrackFromPlaylist(currentPlaylist.id, track.id);
                          }}
                          className="text-[#666666] hover:text-rose-400 p-1 transition-colors text-sm cursor-pointer"
                          title="Remove from playlist"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: SEARCH RESULTS VIEW (When searching YouTube)          */}
        {/* ------------------------------------------------------------- */}
        {isSearchActive && !isPlaylistView && (
          <section aria-label="Search Results" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  YouTube Results for &ldquo;{searchQuery}&rdquo;
                </h2>
                <p className="text-xs text-[#b3b3b3]">
                  Play official tracks in Chillify or add them to your Custom Playlists
                </p>
              </div>

              {isSearching && (
                <div className="flex items-center gap-2 text-xs text-[#1d90f5] font-medium">
                  <div className="w-4 h-4 border-2 border-[#1d90f5] border-t-transparent rounded-full animate-spin" />
                  <span>Searching songs...</span>
                </div>
              )}
            </div>

            {searchResults.length === 0 && !isSearching ? (
              searchError ? (
                <div className="p-8 text-center bg-[#181818] rounded-xl border border-rose-900/30 text-[#b3b3b3] space-y-3">
                  <span className="text-3xl">⚠️</span>
                  <p className="text-sm font-semibold text-white">{searchError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearching(true);
                      setSearchError(null);
                      fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery.trim())}`)
                        .then((res) => res.json())
                        .then((data) => {
                          if (Array.isArray(data.results)) {
                            setSearchResults(data.results);
                            if (data.results.length === 0 && data.error) {
                              setSearchError('Search is temporarily busy. Click below to retry.');
                            }
                          }
                        })
                        .catch(() => setSearchError('Network error connecting to search.'))
                        .finally(() => setIsSearching(false));
                    }}
                    className="px-4 py-2 rounded-full bg-[#1d90f5] hover:bg-[#2fa0ff] text-white text-xs font-semibold cursor-pointer transition-colors shadow"
                  >
                    Retry Search
                  </button>
                </div>
              ) : (
                <div className="p-12 text-center bg-[#181818] rounded-xl border border-[#242424] text-[#b3b3b3] space-y-2">
                  <span className="text-3xl">🔍</span>
                  <p className="text-sm font-semibold text-white">No songs found</p>
                  <p className="text-xs">Try searching for song titles, artists, or &ldquo;lofi beats&rdquo;.</p>
                </div>
              )
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistTargetVideo(video);
                        }}
                        className="mt-1 w-full py-1.5 px-3 rounded-full bg-[#242424] hover:bg-[#1d90f5] hover:text-white text-[#b3b3b3] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Add to Custom Playlist"
                      >
                        <span>＋</span> Add to Playlist
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW: PLAYLISTS (mobile tab — all saved playlists)             */}
        {/* ------------------------------------------------------------- */}
        {isPlaylistsView && (
          <section aria-label="Your Playlists" className="space-y-4">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Your Playlists</h1>

            {savedPlaylists.length === 0 ? (
              <div className="p-12 text-center bg-[#181818] rounded-xl border border-[#242424] text-[#b3b3b3] space-y-2">
                <span className="text-4xl">🎵</span>
                <p className="text-sm font-semibold text-white">No playlists yet</p>
                <p className="text-xs">Search for songs and add them to a playlist.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedPlaylists.map((pl) => {
                  const isActive = activeView === `playlist:${pl.id}`;
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => setActiveView(`playlist:${pl.id}`)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1d90f5]/15 border border-[#1d90f5]/40'
                          : 'bg-[#181818] border border-[#242424] hover:bg-[#222222]'
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-14 h-14 shrink-0 rounded-lg flex items-center justify-center text-2xl shadow-md ${
                          pl.id === 'liked-songs'
                            ? 'bg-gradient-to-br from-[#1d90f5] via-[#2f66ff] to-[#7928ca]'
                            : 'bg-gradient-to-br from-[#1d90f5] to-[#09488a]'
                        }`}
                      >
                        {pl.icon || '🎵'}
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{pl.title}</p>
                        <p className="text-xs text-[#b3b3b3] truncate">{pl.subtitle}</p>
                      </div>
                      {/* Arrow */}
                      <svg className="w-5 h-5 fill-current text-[#666666] shrink-0" viewBox="0 0 24 24">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: HOME VIEW (3 Small Square Playlist Buttons)           */}
        {/* ------------------------------------------------------------- */}
        {isHomeView && (
          <section aria-label="Home Curated Playlists" className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {greeting}
              </h1>
              <p className="text-xs sm:text-sm text-[#b3b3b3] mt-1">
                Welcome to <strong className="text-white">Chillify 🥰</strong> — your ambient lo-fi soundscape sanctuary.
              </p>
            </div>

            {/* 3 Curated Square Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>🎵</span> Featured Playlists
                </h2>
                <span className="text-[11px] text-[#888888] font-medium">Tap to play continuous mix</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-2xl">
                {/* 1. English Square Button */}
                <div
                  onClick={() => {
                    if (isEnglishPlaying) {
                      togglePlay();
                    } else {
                      handlePlayCuratedPlaylist('english');
                    }
                  }}
                  className={`group relative aspect-square rounded-2xl overflow-hidden p-2.5 sm:p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer select-none shadow-xl border ${
                    isEnglishPlaying
                      ? 'border-[#1d90f5] ring-2 ring-[#1d90f5]/50 scale-[1.02] shadow-[#1d90f5]/20'
                      : 'border-white/10 hover:border-[#1d90f5]/60 hover:scale-[1.03] active:scale-95'
                  }`}
                  title="Play English Vibes Playlist"
                >
                  {/* Background Artwork */}
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={ENGLISH_TRACKS[0].thumbnail}
                      alt="English Vibes"
                      fill
                      sizes="(max-width: 640px) 33vw, 220px"
                      className="object-cover opacity-50 group-hover:opacity-65 transition-all duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute inset-0 bg-blue-950/40 mix-blend-overlay" />
                  </div>

                  {/* Top Badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xl sm:text-2xl drop-shadow">🇬🇧</span>
                    <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/40 backdrop-blur-sm">
                      {ENGLISH_TRACKS.length}
                    </span>
                  </div>

                  {/* Bottom: Name & Play Icon */}
                  <div className="relative z-10 flex items-end justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] sm:text-[10px] text-blue-300 font-bold uppercase tracking-wider">Playlist</p>
                      <h3 className="text-xs sm:text-base font-extrabold text-white truncate leading-tight group-hover:text-[#1d90f5] transition-colors">
                        English
                      </h3>
                      <p className="text-[10px] text-[#b3b3b3] truncate hidden sm:block">
                        Weeknd, NBHD & more
                      </p>
                    </div>

                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-black shadow-2xl transition-all duration-200 shrink-0 ${
                        isEnglishPlaying
                          ? 'bg-[#1d90f5] scale-105 shadow-[#1d90f5]/50'
                          : 'bg-white group-hover:bg-[#1d90f5] group-hover:scale-110 shadow-lg'
                      }`}
                    >
                      {isEnglishPlaying ? (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Malayalam Square Button */}
                <div
                  onClick={() => {
                    if (isMalayalamPlaying) {
                      togglePlay();
                    } else {
                      handlePlayCuratedPlaylist('malayalam');
                    }
                  }}
                  className={`group relative aspect-square rounded-2xl overflow-hidden p-2.5 sm:p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer select-none shadow-xl border ${
                    isMalayalamPlaying
                      ? 'border-[#10b981] ring-2 ring-[#10b981]/50 scale-[1.02] shadow-[#10b981]/20'
                      : 'border-white/10 hover:border-[#10b981]/60 hover:scale-[1.03] active:scale-95'
                  }`}
                  title="Play Malayalam Favorites Playlist"
                >
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={MALAYALAM_TRACKS[0].thumbnail}
                      alt="Malayalam Favorites"
                      fill
                      sizes="(max-width: 640px) 33vw, 220px"
                      className="object-cover opacity-50 group-hover:opacity-65 transition-all duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute inset-0 bg-emerald-950/40 mix-blend-overlay" />
                  </div>

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xl sm:text-2xl drop-shadow">🌴</span>
                    <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 backdrop-blur-sm">
                      {MALAYALAM_TRACKS.length}
                    </span>
                  </div>

                  <div className="relative z-10 flex items-end justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] sm:text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Playlist</p>
                      <h3 className="text-xs sm:text-base font-extrabold text-white truncate leading-tight group-hover:text-[#10b981] transition-colors">
                        Malayalam
                      </h3>
                      <p className="text-[10px] text-[#b3b3b3] truncate hidden sm:block">
                        Illuminati, Cherathukal
                      </p>
                    </div>

                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-black shadow-2xl transition-all duration-200 shrink-0 ${
                        isMalayalamPlaying
                          ? 'bg-[#10b981] scale-105 shadow-[#10b981]/50'
                          : 'bg-white group-hover:bg-[#10b981] group-hover:scale-110 shadow-lg'
                      }`}
                    >
                      {isMalayalamPlaying ? (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Hindi Square Button */}
                <div
                  onClick={() => {
                    if (isHindiPlaying) {
                      togglePlay();
                    } else {
                      handlePlayCuratedPlaylist('hindi');
                    }
                  }}
                  className={`group relative aspect-square rounded-2xl overflow-hidden p-2.5 sm:p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer select-none shadow-xl border ${
                    isHindiPlaying
                      ? 'border-[#f59e0b] ring-2 ring-[#f59e0b]/50 scale-[1.02] shadow-[#f59e0b]/20'
                      : 'border-white/10 hover:border-[#f59e0b]/60 hover:scale-[1.03] active:scale-95'
                  }`}
                  title="Play Top Rated Hindi Playlist"
                >
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={HINDI_TRACKS[0].thumbnail}
                      alt="Top Rated Hindi"
                      fill
                      sizes="(max-width: 640px) 33vw, 220px"
                      className="object-cover opacity-50 group-hover:opacity-65 transition-all duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute inset-0 bg-amber-950/40 mix-blend-overlay" />
                  </div>

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xl sm:text-2xl drop-shadow">🪔</span>
                    <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40 backdrop-blur-sm">
                      {HINDI_TRACKS.length}
                    </span>
                  </div>

                  <div className="relative z-10 flex items-end justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] sm:text-[10px] text-amber-300 font-bold uppercase tracking-wider">Playlist</p>
                      <h3 className="text-xs sm:text-base font-extrabold text-white truncate leading-tight group-hover:text-[#f59e0b] transition-colors">
                        Hindi
                      </h3>
                      <p className="text-[10px] text-[#b3b3b3] truncate hidden sm:block">
                        Tum Se Hi, Kabira, Zara Sa
                      </p>
                    </div>

                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-black shadow-2xl transition-all duration-200 shrink-0 ${
                        isHindiPlaying
                          ? 'bg-[#f59e0b] scale-105 shadow-[#f59e0b]/50'
                          : 'bg-white group-hover:bg-[#f59e0b] group-hover:scale-110 shadow-lg'
                      }`}
                    >
                      {isHindiPlaying ? (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: AMBIENCE METER & SOUNDSCAPE MIXER                     */}
        {/* ------------------------------------------------------------- */}
        {(isAmbienceView || (isHomeView && !isPlaylistView && !isPlaylistsView && !isSearchActive)) && (
          <section
            aria-label="Ambient Soundscape Mixer"
            className={`bg-[#181818] p-5 sm:p-6 rounded-xl border border-[#242424] shadow-lg space-y-4 ${
              isHomeView ? 'hidden md:block' : ''
            }`}
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
                    onClick={() => toggleSound(sound.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3.5 cursor-pointer select-none group relative overflow-hidden ${
                      isPlayingChannel
                        ? 'bg-gradient-to-b from-[#18283d] to-[#121924] border-[#1d90f5] shadow-lg shadow-[#1d90f5]/20 ring-1 ring-[#1d90f5]/40 scale-[1.01]'
                        : 'bg-[#181818] hover:bg-[#222222] border-[#282828] hover:border-[#3a3a3a]'
                    }`}
                    title={`Click to ${isPlayingChannel ? 'turn off' : 'turn on'} ${sound.name}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl transition-transform group-hover:scale-110">
                        {sound.icon}
                      </span>

                      {/* Active Glowing Status Indicator */}
                      {isPlayingChannel ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1d90f5]/20 border border-[#1d90f5]/40">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1d90f5] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1d90f5]"></span>
                          </span>
                          <span className="text-[10px] font-extrabold text-[#1d90f5] tracking-wider">
                            ACTIVE
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#666666] group-hover:text-[#b3b3b3] transition-colors">
                          Click to play
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{sound.name}</h3>
                      <p className="text-[11px] text-[#b3b3b3] line-clamp-1">{sound.description}</p>
                    </div>

                    {/* Volume Slider & Mute */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 pt-2 border-t border-[#282828]"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSoundMute(sound.id);
                        }}
                        className="text-xs text-[#b3b3b3] hover:text-white cursor-pointer transition-colors"
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
                        onChange={(e) => {
                          e.stopPropagation();
                          setSoundVolume(sound.id, parseFloat(e.target.value));
                        }}
                        className="w-full spotify-slider cursor-pointer"
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
        )}

        {/* Footer Info */}
        <footer className="pt-8 border-t border-[#242424] flex flex-col sm:flex-row items-center justify-between text-xs text-[#b3b3b3] gap-2">
          <span>Chillify 🥰 • Exact Spotify Replica Ambient Music Player</span>
          <span className="text-[#1d90f5]">Powered by Web Audio API & Next.js</span>
        </footer>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ADD TO PLAYLIST MODAL POPOVER                                 */}
      {/* ------------------------------------------------------------- */}
      {playlistTargetVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPlaylistTargetVideo(null)}
        >
          <div
            className="w-full max-w-md bg-[#181818] rounded-2xl border border-[#282828] p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
              <div>
                <h3 className="text-base font-bold text-white">Add to Playlist</h3>
                <p className="text-xs text-[#b3b3b3] truncate max-w-xs mt-0.5">
                  &ldquo;{playlistTargetVideo.title}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlaylistTargetVideo(null)}
                className="text-xs text-[#b3b3b3] hover:text-white p-1 rounded-full hover:bg-[#282828]"
              >
                ✕
              </button>
            </div>

            {/* List of User's Custom Playlists */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {customPlaylistsOnly.length === 0 ? (
                <p className="text-xs text-[#b3b3b3] py-2 text-center">
                  No custom playlists yet. Create your first one below!
                </p>
              ) : (
                customPlaylistsOnly.map((pl) => {
                  const alreadyHasTrack = pl.tracks?.some((t) => t.id === playlistTargetVideo.id);
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      disabled={alreadyHasTrack}
                      onClick={() => handleAddVideoToPlaylist(pl.id, playlistTargetVideo)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                        alreadyHasTrack
                          ? 'bg-[#141414] border-[#222222] opacity-60 cursor-not-allowed'
                          : 'bg-[#202020] hover:bg-[#262626] border-[#2a2a2a] hover:border-[#1d90f5] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl">{pl.icon || '🎵'}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{pl.title}</p>
                          <p className="text-[10px] text-[#b3b3b3]">{pl.tracks?.length || 0} songs</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#1d90f5]">
                        {alreadyHasTrack ? 'Added' : '＋ Add'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Inline Create New Playlist Option */}
            {!showCreateInline ? (
              <button
                type="button"
                onClick={() => setShowCreateInline(true)}
                className="w-full py-2 px-3 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] text-[#1d90f5] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>＋</span> Create New Playlist
              </button>
            ) : (
              <div className="space-y-2 pt-2 border-t border-[#282828]">
                <input
                  type="text"
                  placeholder="Enter playlist name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full bg-[#121212] text-white text-xs px-3.5 py-2.5 rounded-lg border border-[#333333] focus:border-[#1d90f5] outline-none"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateAndAdd(playlistTargetVideo)}
                    className="flex-1 py-2 rounded-lg bg-[#1d90f5] hover:bg-[#2fa0ff] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Create & Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateInline(false);
                      setNewPlaylistName('');
                    }}
                    className="px-3 py-2 rounded-lg bg-[#222222] hover:bg-[#282828] text-[#b3b3b3] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
