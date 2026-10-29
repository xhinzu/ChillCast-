'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { useAmbient } from '@/context/AmbientContext';
import { YouTubeSearchResult } from '@/app/api/youtube/search/route';
import { SavedPlaylistItem, CustomPlaylistTrack } from './AddSourceModal';
import { TrackInfo } from '@/types/playback';
import { ENGLISH_TRACKS, MALAYALAM_TRACKS, CuratedTrack } from '@/lib/curated-tracks';
import DualVinylMixer from '@/components/mixer/DualVinylMixer';
import {
  ALL_GENRE_TRENDING_SONGS,
  DEFAULT_STARTER_PLAYLISTS,
  TrendingSong,
  trendingSongToTrackInfo,
} from '@/lib/music-data';
import {
  HeartIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  SearchIcon,
  TrashIcon,
  MixerSlidersIcon,
  MusicNoteIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMuteIcon,
  AmbientSoundIcon,
  PlaylistCoverIcon,
} from '@/components/common/MinimalIcons';

interface SpotifyMainContentProps {
  activeView: string;
  setActiveView: (view: string) => void;
  showVideo: boolean;
  setShowVideo: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery?: (query: string) => void;
  /** Extra Tailwind classes injected by parent for mobile bottom-padding compensation */
  extraBottomPadding?: string;
  onToggleNowPlaying?: () => void;
  isNowPlayingOpen?: boolean;
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
  setSearchQuery,
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
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedPlaylists(parsed);
          return;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STARTER_PLAYLISTS));
      setSavedPlaylists(DEFAULT_STARTER_PLAYLISTS);
    } catch {
      setSavedPlaylists(DEFAULT_STARTER_PLAYLISTS);
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
    // Clear search and return to home page
    setSearchQuery?.('');
    setActiveView('home');
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
      icon: 'headphones',
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
      duration: parseDurationSeconds(t.duration || '0:00'),
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

  const isSearchActive = activeView === 'search' && searchQuery.trim().length > 0;
  const isPlaylistsView = activeView === 'playlists';
  const isAmbienceView = activeView === 'ambience' || activeView === 'mixer';
  const isVinylView = activeView === 'vinyl';
  const isHomeView = !isSearchActive && !isPlaylistView && !isPlaylistsView && !isAmbienceView && !isVinylView;
  const customPlaylistsOnly = savedPlaylists.filter((p) => p.type === 'custom');

  // Track which curated playlist is currently playing
  const isEnglishPlaying = isPlaying && ENGLISH_TRACKS.some((t) => t.id === currentTrack?.id);
  const isMalayalamPlaying = isPlaying && MALAYALAM_TRACKS.some((t) => t.id === currentTrack?.id);

  // Play all songs of a curated category continuously as a playlist
  const handlePlayCuratedPlaylist = (category: 'english' | 'malayalam') => {
    let tracks: CuratedTrack[] = [];
    let albumName = '';
    if (category === 'english') {
      tracks = ENGLISH_TRACKS;
      albumName = 'English Vibes';
    } else {
      tracks = MALAYALAM_TRACKS;
      albumName = 'Malayalam Favorites';
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

  // Check if track is liked
  const isTrackLiked = (trackId: string) => {
    const likedPl = savedPlaylists.find((p) => p.id === 'liked-songs');
    return likedPl?.tracks?.some((t) => t.id === trackId) || false;
  };

  // Toggle track like
  const handleToggleTrackLike = (track: {
    id: string;
    title: string;
    artist: string;
    duration?: string;
    thumbnail?: string;
  }) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let prev: SavedPlaylistItem[] = stored ? JSON.parse(stored) : [];

      let likedPlaylist = prev.find((p) => p.id === 'liked-songs');
      if (!likedPlaylist) {
        likedPlaylist = {
          id: 'liked-songs',
          title: 'Liked Songs',
          subtitle: '0 songs • Liked Songs',
          type: 'custom',
          targetUrl: '',
          icon: 'heart',
          tracks: [],
          description: 'Your favorite liked tracks on Chillify',
          createdAt: Date.now(),
        };
        prev = [likedPlaylist, ...prev];
      }

      const prevTracks = likedPlaylist.tracks || [];
      const alreadyLiked = prevTracks.some((t) => t.id === track.id);

      let newTracks: CustomPlaylistTrack[];
      if (alreadyLiked) {
        newTracks = prevTracks.filter((t) => t.id !== track.id);
        setAddedToast(`Removed "${track.title}" from Liked Songs`);
      } else {
        const newTrack: CustomPlaylistTrack = {
          id: track.id,
          title: track.title,
          artist: track.artist,
          duration: track.duration || '3:30',
          thumbnail: track.thumbnail || `https://img.youtube.com/vi/${track.id}/hqdefault.jpg`,
          addedAt: Date.now(),
        };
        newTracks = [newTrack, ...prevTracks];
        setAddedToast(`Added "${track.title}" to Liked Songs`);
      }

      setTimeout(() => setAddedToast(null), 2500);

      const updated = prev.map((p) => {
        if (p.id === 'liked-songs') {
          return {
            ...p,
            tracks: newTracks,
            subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} • Liked Songs`,
          };
        }
        return p;
      });

      savePlaylists(updated);
    } catch {
      // ignore
    }
  };

  // Play Trending list starting at index
  const handlePlayTrending = (startIndex = 0) => {
    const trackInfos: TrackInfo[] = ALL_GENRE_TRENDING_SONGS.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: 'Trending Hits',
      duration: parseDurationSeconds(s.duration),
      source: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${s.id}`,
      artworkUrl: s.thumbnail,
    }));
    playCustomTrackList(trackInfos, startIndex);
  };

  return (
    <main className={`flex-1 h-full overflow-y-auto bg-[#101010] rounded-lg relative pb-12 select-none ${extraBottomPadding}`}>
      {/* Top Ambient Accent Banner */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-[#1c1c1c] via-[#121212] to-transparent pointer-events-none opacity-60" />

      {/* Main Content Container */}
      <div className="relative z-10 px-4 sm:px-8 py-6 space-y-8">
        {/* Error Notification Toast */}
        {errorMessage && (
          <div className="px-4 py-2.5 rounded-lg bg-[#222222] border border-rose-600/40 text-rose-200 text-xs flex items-center justify-between shadow-lg">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Notification Toast */}
        {addedToast && (
          <div className="fixed top-16 right-8 z-50 px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 border border-zinc-200">
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
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-3 py-1.5 rounded-full border border-rose-800/40 transition-colors cursor-pointer"
                  title="Delete Playlist"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Delete Playlist</span>
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
              className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 sm:p-8 rounded-2xl border border-[#2a2a2a] bg-gradient-to-b from-[#1e1e1e] to-[#121212] shadow-2xl"
            >
              {/* Artwork Tile */}
              <div
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#262626] to-[#141414] border border-[#333333] shadow-2xl shrink-0"
              >
                <PlaylistCoverIcon iconKey={currentPlaylist.icon} className="w-16 h-16 sm:w-20 sm:h-20 text-zinc-300" />
              </div>

              {/* Header Info */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 min-w-0">
                <span className="text-[11px] font-extrabold tracking-widest text-[#888888] uppercase">
                  {currentPlaylist.id === 'liked-songs' ? 'FAVORITES' : 'CUSTOM PLAYLIST'}
                </span>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight break-words">
                  {currentPlaylist.title}
                </h1>
                {currentPlaylist.description && (
                  <p className="text-xs sm:text-sm text-[#888888]">
                    {currentPlaylist.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-[#888888] mt-1 font-medium">
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
                    ? 'bg-white hover:bg-zinc-200 text-black hover:scale-105 cursor-pointer shadow-white/10'
                    : 'bg-[#222222] text-[#666666] cursor-not-allowed opacity-60'
                }`}
                title="Play Entire Playlist"
              >
                <PlayIcon className="w-7 h-7 fill-current ml-1" />
              </button>
              <span className="text-xs text-[#888888] font-medium">
                {currentPlaylist.tracks && currentPlaylist.tracks.length > 0
                  ? 'Click to start continuous playback'
                  : 'Add songs below to start playing'}
              </span>
            </div>

            {/* In-Playlist Quick Search */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#161616] border border-[#262626] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SearchIcon className="w-4 h-4 text-zinc-400" />
                  <span>Add Songs to &ldquo;{currentPlaylist.title}&rdquo;</span>
                </h3>
                {isInlineSearching && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                              : 'bg-white hover:bg-zinc-200 text-black cursor-pointer'
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
              <div className="p-12 text-center bg-[#161616] rounded-xl border border-[#242424] text-[#888888] space-y-3 flex flex-col items-center justify-center">
                <MusicNoteIcon className="w-12 h-12 text-zinc-600" />
                <h3 className="text-base font-bold text-white">This playlist is empty</h3>
                <p className="text-xs max-w-md mx-auto text-[#888888]">
                  Search for songs using the search bar above or use the main YouTube search at the top to add tracks to your playlist.
                </p>
              </div>
            ) : (
              <div className="bg-[#161616] rounded-xl border border-[#242424] overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#282828] text-[11px] font-bold text-[#888888] uppercase tracking-wider">
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
                      <div className="col-span-1 flex items-center justify-center text-xs text-[#888888]">
                        <span className="group-hover:hidden">{idx + 1}</span>
                        <span className="hidden group-hover:inline text-white font-bold">
                          <PlayIcon className="w-3 h-3 fill-current inline" />
                        </span>
                      </div>

                      {/* Title & Artist */}
                      <div className="col-span-6 sm:col-span-7 flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded overflow-hidden bg-zinc-900 shrink-0">
                          {track.thumbnail ? (
                            <Image
                              src={track.thumbnail}
                              alt={track.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                              <MusicNoteIcon className="w-4 h-4 text-zinc-500" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-zinc-200 transition-colors">
                            {track.title}
                          </p>
                          <p className="text-[11px] text-[#888888] truncate">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="col-span-3 sm:col-span-2 text-right text-xs font-mono text-[#888888]">
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
                  <svg className="w-8 h-8 text-rose-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
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
                    className="px-4 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-semibold cursor-pointer transition-colors shadow"
                  >
                    Retry Search
                  </button>
                </div>
              ) : (
                <div className="p-12 text-center bg-[#181818] rounded-xl border border-[#242424] text-[#b3b3b3] space-y-2">
                  <SearchIcon className="w-8 h-8 text-[#666666] mx-auto" />
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
                <MusicNoteIcon className="w-10 h-10 mx-auto text-[#666666]" />
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
                          ? 'bg-[#222222] border border-white/30 text-white'
                          : 'bg-[#181818] border border-[#242424] hover:bg-[#202020]'
                      }`}
                    >
                      {/* Icon */}
                      <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-[#202020] border border-[#2c2c2c] shadow-md">
                        <PlaylistCoverIcon icon={pl.icon} isLiked={pl.id === 'liked-songs'} size="md" />
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
        {/* VIEW 3: HOME VIEW (Personalized Discovery & Trending Songs)   */}
        {/* ------------------------------------------------------------- */}
        {isHomeView && (
          <section aria-label="Home Music Discovery" className="space-y-8">
            {/* Header Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#222222]/60 via-[#181818]/40 to-transparent p-5 rounded-2xl border border-[#282828]">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {greeting}
                </h1>
                <p className="text-xs sm:text-sm text-[#b3b3b3] mt-1">
                  Welcome to <strong className="text-white">Chillify</strong> — your personal ambient lo-fi music sanctuary.
                </p>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SECTION A: YOUR PLAYLISTS (Horizontal Cards Layout)       */}
            {/* ========================================================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Your Playlists
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#181818] text-[#b3b3b3] border border-[#282828]">
                    {savedPlaylists.length}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveView('playlists')}
                  className="text-xs text-[#b3b3b3] hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  View Library →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {savedPlaylists.map((pl) => {
                  const isCurrentPlaylistPlaying =
                    isPlaying && pl.tracks?.some((t) => t.id === currentTrack?.id);
                  const isLiked = pl.id === 'liked-songs';
                  const songCount = pl.tracks ? pl.tracks.length : 0;

                  return (
                    <div
                      key={pl.id}
                      onClick={() => {
                        if (pl.type === 'custom') {
                          setActiveView(`playlist:${pl.id}`);
                        } else {
                          loadPlaylist(pl.targetUrl, pl.type);
                        }
                      }}
                      className={`group relative p-3 rounded-2xl border transition-all duration-300 cursor-pointer select-none flex flex-col justify-between overflow-hidden shadow-md ${
                        isCurrentPlaylistPlaying
                          ? 'bg-[#222222] border-white/40 ring-1 ring-white/20 scale-[1.02]'
                          : 'bg-[#181818] hover:bg-[#202020] border-[#262626] hover:border-[#383838] hover:scale-[1.02]'
                      }`}
                      title={`Open "${pl.title}"`}
                    >
                      {/* Top Artwork / Icon & Play Overlay */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2.5 flex items-center justify-center bg-black/60 shadow-inner">
                        {isLiked ? (
                          <div className="w-full h-full bg-gradient-to-br from-[#282828] to-[#141414] border border-[#333333] flex items-center justify-center shadow-md">
                            <HeartIcon className="w-8 h-8 text-white fill-white" />
                          </div>
                        ) : pl.tracks && pl.tracks.length > 0 && pl.tracks[0].thumbnail ? (
                          <Image
                            src={pl.tracks[0].thumbnail}
                            alt={pl.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-[#202020] border border-[#2a2a2a] flex items-center justify-center">
                            <PlaylistCoverIcon icon={pl.icon} isLiked={false} size="sm" />
                          </div>
                        )}

                        {/* Floating Play Button */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCurrentPlaylistPlaying) {
                              togglePlay();
                            } else {
                              handlePlayCustomPlaylist(pl, 0);
                            }
                          }}
                          className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
                            isCurrentPlaylistPlaying
                              ? 'bg-white text-black opacity-100 scale-100 shadow-white/20'
                              : 'bg-white text-black hover:bg-neutral-200 opacity-0 group-hover:opacity-100 group-hover:scale-105'
                          }`}
                          title="Play Playlist"
                        >
                          {isCurrentPlaylistPlaying ? (
                            <PauseIcon className="w-3.5 h-3.5 text-black" />
                          ) : (
                            <PlayIcon className="w-3.5 h-3.5 text-black ml-0.5" />
                          )}
                        </div>
                      </div>

                      {/* Name & Count */}
                      <div className="min-w-0">
                        <h3
                          className={`text-xs font-bold truncate transition-colors ${
                            isCurrentPlaylistPlaying ? 'text-white' : 'text-white group-hover:text-white'
                          }`}
                        >
                          {pl.title}
                        </h3>
                        <p className="text-[10px] text-[#8e8b98] truncate mt-0.5">
                          {songCount} {songCount === 1 ? 'song' : 'songs'}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Inline "+ Create Playlist" Card */}
                <div
                  onClick={() => setShowCreateInline(true)}
                  className="group relative p-3 rounded-2xl border border-dashed border-[#2e2e2e] hover:border-white/50 bg-[#181818] hover:bg-[#202020] transition-all duration-200 cursor-pointer select-none flex flex-col items-center justify-center text-center space-y-2 min-h-[140px]"
                  title="Create a new playlist"
                >
                  <div className="w-10 h-10 rounded-full bg-[#242424] group-hover:bg-white text-[#b3b3b3] group-hover:text-black flex items-center justify-center text-xl transition-colors font-bold">
                    ＋
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-white transition-colors">
                      New Playlist
                    </p>
                    <p className="text-[10px] text-[#8e8b98]">Create custom mix</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SECTION B: TRENDING SONGS (Minimal, Clean)                */}
            {/* ========================================================= */}
            <div className="space-y-3">
              <div className="bg-[#181818] p-4 sm:p-5 rounded-2xl border border-[#242424] shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Trending Songs
                  </h2>
                </div>

                {/* Minimal Single-Row Song List (Song & Artist on left, Duration and Like at the very horizontal end) */}
                <div className="flex flex-col gap-1.5 w-full">
                  {ALL_GENRE_TRENDING_SONGS.map((song, idx) => {
                    const isThisPlaying = isPlaying && currentTrack?.id === song.id;
                    const liked = isTrackLiked(song.id);

                    return (
                      <div
                        key={song.id}
                        onClick={() => handlePlayTrending(idx)}
                        className={`flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl transition-all cursor-pointer group border w-full ${
                          isThisPlaying
                            ? 'bg-[#222222] border-white/30 text-white shadow-md'
                            : 'border-transparent hover:border-[#2c2c2c] hover:bg-[#1f1f1f]'
                        }`}
                      >
                        {/* Left: Thumbnail & Title/Artist */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Track Artwork / Play state */}
                          <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-black shrink-0 border border-[#282828] group-hover:border-[#444444] transition-colors">
                            <Image
                              src={song.thumbnail}
                              alt={song.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div
                              className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${
                                isThisPlaying ? 'opacity-100 bg-black/50' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isThisPlaying ? (
                                <div className="flex items-end gap-0.5 h-3">
                                  <span className="w-0.5 bg-white rounded-full animate-bounce h-2" />
                                  <span className="w-0.5 bg-white rounded-full animate-bounce h-3 delay-75" />
                                  <span className="w-0.5 bg-white rounded-full animate-bounce h-1.5 delay-150" />
                                </div>
                              ) : (
                                <PlayIcon className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                          </div>

                          {/* Song Title & Artist Name Only */}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                                isThisPlaying ? 'text-white' : 'text-white group-hover:text-white'
                              }`}
                            >
                              {song.title}
                            </p>
                            <p className="text-[11px] text-[#a1a1aa] truncate mt-0.5">
                              {song.artist}
                            </p>
                          </div>
                        </div>

                        {/* Far Right: Duration and Like button at the very horizontal end */}
                        <div className="flex items-center gap-4 shrink-0 ml-auto">
                          <span className="text-xs font-mono text-[#888888]">
                            {song.duration}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTrackLike(song);
                            }}
                            className="p-1.5 rounded-full hover:scale-110 transition-transform cursor-pointer text-[#888888] hover:text-white"
                            title={liked ? 'Unlike' : 'Like'}
                          >
                            <HeartIcon className="w-4 h-4" filled={liked} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW: DUAL VINYL MUSIC MIXER                                  */}
        {/* ------------------------------------------------------------- */}
        {isVinylView && (
          <section aria-label="Dual Vinyl Music Mixer" className="space-y-4">
            <DualVinylMixer savedPlaylists={savedPlaylists} className="h-full" />
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: AMBIENCE METER & SOUNDSCAPE MIXER                     */}
        {/* ------------------------------------------------------------- */}
        {isAmbienceView && (
          <section
            aria-label="Ambient Soundscape Mixer"
            className="bg-[#181818] p-5 sm:p-6 rounded-xl border border-[#242424] shadow-lg space-y-4"
          >
            {/* Section Header & Master Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#282828]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
                  <MixerSlidersIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Ambient Soundscape Mixer
                    {activeCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-black">
                        {activeCount} ACTIVE
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[#b3b3b3]">
                    10 real-time procedural soundscapes: rain, wind, birds, crickets, thunder, drums, bass, people speaking, ocean waves & fireplace
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
                    {isMasterMuted || masterVolume === 0 ? (
                      <VolumeMuteIcon className="w-4 h-4 text-[#888888]" />
                    ) : (
                      <VolumeHighIcon className="w-4 h-4 text-[#b3b3b3]" />
                    )}
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
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#242424] hover:bg-neutral-800 text-[#b3b3b3] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <StopIcon className="w-3.5 h-3.5 text-[#b3b3b3]" />
                  <span>Stop All</span>
                </button>
              </div>
            </div>

            {/* 10 Ambient Soundscape Channels Grid */}
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
                        ? 'bg-[#222222] border-white/40 shadow-lg ring-1 ring-white/20 scale-[1.01]'
                        : 'bg-[#181818] hover:bg-[#202020] border-[#282828] hover:border-[#383838]'
                    }`}
                    title={`Click to ${isPlayingChannel ? 'turn off' : 'turn on'} ${sound.name}`}
                  >
                    <div className="flex items-center justify-between">
                      <AmbientSoundIcon soundId={sound.id} className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />

                      {/* Active Glowing Status Indicator */}
                      {isPlayingChannel ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                          <span className="text-[10px] font-extrabold text-white tracking-wider">
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
                        {isMutedChannel ? (
                          <VolumeMuteIcon className="w-3.5 h-3.5 text-[#666666]" />
                        ) : (
                          <VolumeLowIcon className="w-3.5 h-3.5 text-[#b3b3b3]" />
                        )}
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

        {/* Footer Info & Creator Socials */}
        <footer className="pt-8 border-t border-[#242424] flex flex-col sm:flex-row items-center justify-between text-xs text-[#b3b3b3] gap-3">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span className="font-semibold text-white">Chillify</span>
            <span className="text-[#555555]">•</span>
            <span>Creator&apos;s Socials</span>
            <div className="flex items-center gap-2 ml-1">
              {/* 1. Discord Button */}
              <a
                href="https://discord.gg/FwEcerDJB5"
                target="_blank"
                rel="noopener noreferrer"
                title="Discord: xhinzuu"
                className="w-7 h-7 rounded-full bg-[#1e1e1e] hover:bg-[#5865F2] text-[#b3b3b3] hover:text-white flex items-center justify-center transition-all hover:scale-110 border border-[#2e2e2e] hover:border-[#5865F2] shadow-sm cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>

              {/* 2. GitHub Button */}
              <a
                href="https://github.com/Xhinzu"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub: Xhinzu"
                className="w-7 h-7 rounded-full bg-[#1e1e1e] hover:bg-white hover:text-black text-[#b3b3b3] flex items-center justify-center transition-all hover:scale-110 border border-[#2e2e2e] hover:border-white shadow-sm cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>

              {/* 3. Instagram Button */}
              <a
                href="https://instagram.com/sree._.de.v"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram: sree._.de.v"
                className="w-7 h-7 rounded-full bg-[#1e1e1e] hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] text-[#b3b3b3] hover:text-white flex items-center justify-center transition-all hover:scale-110 border border-[#2e2e2e] hover:border-pink-500 shadow-sm cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
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
                          : 'bg-[#202020] hover:bg-[#262626] border-[#2a2a2a] hover:border-white/30 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlaylistCoverIcon icon={pl.icon} isLiked={pl.id === 'liked-songs'} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{pl.title}</p>
                          <p className="text-[10px] text-[#b3b3b3]">{pl.tracks?.length || 0} songs</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-white">
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
                className="w-full py-2 px-3 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                  className="w-full bg-[#121212] text-white text-xs px-3.5 py-2.5 rounded-lg border border-[#333333] focus:border-white/40 outline-none"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateAndAdd(playlistTargetVideo)}
                    className="flex-1 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors cursor-pointer"
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
