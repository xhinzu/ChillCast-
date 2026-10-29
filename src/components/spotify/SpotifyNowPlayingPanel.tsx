'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { SavedPlaylistItem, CustomPlaylistTrack } from './AddSourceModal';
import { ALL_GENRE_TRENDING_SONGS, trendingSongToTrackInfo } from '@/lib/music-data';

interface SpotifyNowPlayingPanelProps {
  onClose?: () => void;
  className?: string;
}

function formatDuration(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function SpotifyNowPlayingPanel({
  onClose,
  className = '',
}: SpotifyNowPlayingPanelProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    playCustomTrackList,
    isSpatial8D,
    isMuffled,
  } = usePlayback();

  const [isLiked, setIsLiked] = useState(false);
  const [, setSavedPlaylists] = useState<SavedPlaylistItem[]>([]);

  // Sync liked songs from localStorage
  useEffect(() => {
    const checkLiked = () => {
      try {
        const stored = localStorage.getItem('chillify_saved_playlists');
        if (stored) {
          const parsed: SavedPlaylistItem[] = JSON.parse(stored);
          setSavedPlaylists(parsed);
          if (currentTrack) {
            const likedPl = parsed.find((p) => p.id === 'liked-songs');
            const found = likedPl?.tracks?.some((t) => t.id === currentTrack.id) || false;
            setIsLiked(found);
          }
        }
      } catch {
        // ignore
      }
    };

    checkLiked();
    window.addEventListener('storage', checkLiked);
    window.addEventListener('chillify_playlists_updated', checkLiked);
    return () => {
      window.removeEventListener('storage', checkLiked);
      window.removeEventListener('chillify_playlists_updated', checkLiked);
    };
  }, [currentTrack]);

  const handleToggleLike = () => {
    if (!currentTrack) return;
    try {
      const stored = localStorage.getItem('chillify_saved_playlists');
      let prev: SavedPlaylistItem[] = stored ? JSON.parse(stored) : [];

      let likedPlaylist = prev.find((p) => p.id === 'liked-songs');
      if (!likedPlaylist) {
        likedPlaylist = {
          id: 'liked-songs',
          title: 'Liked Songs',
          subtitle: '0 songs • Liked Songs',
          type: 'custom',
          targetUrl: '',
          icon: '💙',
          tracks: [],
          description: 'Your favorite liked tracks on Chillify',
          createdAt: Date.now(),
        };
        prev = [likedPlaylist, ...prev];
      }

      const prevTracks = likedPlaylist.tracks || [];
      const alreadyLiked = prevTracks.some((t) => t.id === currentTrack.id);

      let newTracks: CustomPlaylistTrack[];
      if (alreadyLiked) {
        newTracks = prevTracks.filter((t) => t.id !== currentTrack.id);
        setIsLiked(false);
      } else {
        const newTrack: CustomPlaylistTrack = {
          id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          duration: formatDuration(currentTrack.duration || 210),
          thumbnail: currentTrack.artworkUrl || '',
          addedAt: Date.now(),
        };
        newTracks = [newTrack, ...prevTracks];
        setIsLiked(true);
      }

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

      localStorage.setItem('chillify_saved_playlists', JSON.stringify(updated));
      window.dispatchEvent(new Event('chillify_playlists_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  };

  const recommendations = ALL_GENRE_TRENDING_SONGS.filter((s) => s.id !== currentTrack?.id).slice(0, 4);

  return (
    <aside
      className={`w-72 lg:w-80 xl:w-84 h-full bg-[#121212] border border-[#242424] rounded-2xl p-4 flex flex-col justify-between overflow-hidden shadow-2xl shadow-black/80 select-none ${className}`}
    >
      {/* 1. Header with Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-[#242424] shrink-0">
        <h3 className="font-bold text-sm text-white tracking-tight">Now Playing</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#181818] hover:bg-[#282828] text-[#b3b3b3] hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
            title="Close Panel"
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
        {!currentTrack ? (
          /* Idle State: ONLY show "No songs playing" without any other text/buttons */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#b3b3b3]">
            <p className="text-sm font-semibold text-[#888888]">No songs playing</p>
          </div>
        ) : (
          /* Active Playing State */
          <>
            {/* Large Artwork */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-[#282828] group">
              {currentTrack.artworkUrl ? (
                <Image
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl bg-[#181818] text-[#555555]">
                  🎵
                </div>
              )}

              {/* Dynamic Equalizer Overlay when playing */}
              {isPlaying && (
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-lg">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-[#1d90f5] rounded-full animate-bounce h-2" />
                    <span className="w-0.5 bg-[#1d90f5] rounded-full animate-bounce h-3 delay-75" />
                    <span className="w-0.5 bg-[#1d90f5] rounded-full animate-bounce h-1.5 delay-150" />
                  </div>
                  <span className="text-[10px] font-bold text-[#1d90f5] uppercase tracking-wider">
                    Playing
                  </span>
                </div>
              )}
            </div>

            {/* Song Title, Artist & Like Button */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="min-w-0 flex-1">
                <h4
                  className="text-base font-bold text-white truncate hover:text-[#1d90f5] transition-colors cursor-pointer"
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </h4>
                <p className="text-xs text-[#b3b3b3] truncate mt-0.5">
                  {currentTrack.artist || 'Unknown Artist'}
                </p>
                {currentTrack.album && (
                  <p className="text-[11px] text-[#777777] truncate mt-0.5">
                    {currentTrack.album}
                  </p>
                )}
              </div>

              {/* Like Button */}
              <button
                type="button"
                onClick={handleToggleLike}
                className={`p-1.5 rounded-full hover:scale-110 transition-transform cursor-pointer shrink-0 ${
                  isLiked ? 'text-[#1d90f5]' : 'text-[#888888] hover:text-white'
                }`}
                title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              >
                {isLiked ? (
                  <svg className="w-6 h-6 fill-current text-[#1d90f5]" viewBox="0 0 24 24">
                    <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Playback Badge & Active Effects */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1e293b] text-[#94a3b8] border border-[#334155]">
                {currentTrack.source === 'local' ? '📁 Local File' : '▶️ YouTube Stream'}
              </span>

              {isSpatial8D && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1d90f5]/20 text-[#1d90f5] border border-[#1d90f5]/40 animate-pulse">
                  🎧 8D Spatial
                </span>
              )}

              {isMuffled && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  🚪 Muffled
                </span>
              )}
            </div>

            {/* Progress Bar & Timestamps */}
            <div className="space-y-1 bg-[#181818] p-3 rounded-xl border border-[#242424]">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
              <div className="w-full bg-[#2a2a2a] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1d90f5] h-full rounded-full transition-all duration-150"
                  style={{
                    width: duration > 0 ? `${Math.min(100, (currentTime / duration) * 100)}%` : '0%',
                  }}
                />
              </div>
            </div>

            {/* Recommended Next Songs */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span>Recommended Next</span>
                <span className="text-[10px] text-[#888888] font-normal">Click to play</span>
              </h4>

              <div className="space-y-1.5">
                {recommendations.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => {
                      const track = trendingSongToTrackInfo(song);
                      playCustomTrackList([track], 0);
                    }}
                    className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-[#1a1a1a] border border-transparent hover:border-[#282828] cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative w-9 h-9 rounded-md overflow-hidden bg-black shrink-0 border border-[#242424]">
                        <Image
                          src={song.thumbnail}
                          alt={song.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-[#1d90f5] transition-colors">
                          {song.title}
                        </p>
                        <p className="text-[10px] text-[#888888] truncate">{song.artist}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-[#666666] shrink-0 group-hover:text-white">
                      ▶
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Footer Branding (only show when playing) */}
      {currentTrack && (
        <div className="pt-3 border-t border-[#242424] text-center text-[10px] text-[#666666] shrink-0">
          Chillify 🥰 • Now Playing View
        </div>
      )}
    </aside>
  );
}
