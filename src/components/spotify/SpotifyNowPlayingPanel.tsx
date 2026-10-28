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
          icon: '🎃',
          tracks: [],
          description: 'Your favorite liked tracks on Chillify 🎃',
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
      className={`w-72 lg:w-80 xl:w-84 h-full bg-[#0d0c11] border border-[#231e2c] rounded-2xl p-4 flex flex-col justify-between overflow-hidden shadow-2xl shadow-black/80 select-none ${className}`}
    >
      {/* 1. Header with Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-[#231e2c] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎃</span>
          <h3 className="font-extrabold text-sm text-white tracking-tight">Now Playing</h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#17151e] hover:bg-[#252130] text-[#a1a1aa] hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer border border-[#2c2738]"
            title="Close Panel"
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
        {!currentTrack ? (
          /* Polished Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-[#8e8b98]">
            <div className="w-20 h-20 rounded-full bg-orange-950/30 border border-orange-500/30 flex items-center justify-center text-3xl shadow-lg shadow-orange-950/40 animate-pulse">
              🎃
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">No Song Playing</h4>
              <p className="text-xs text-[#8e8b98] mt-1 max-w-[200px]">
                Choose a song from your playlists or trending music to start listening.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const track = trendingSongToTrackInfo(ALL_GENRE_TRENDING_SONGS[0]);
                playCustomTrackList([track], 0);
              }}
              className="px-4 py-2 rounded-full bg-[#ff7518] hover:bg-[#ff8c00] text-black font-black text-xs shadow-lg shadow-orange-500/30 transition-transform hover:scale-105 cursor-pointer"
            >
              ▶ Play Viral Pick
            </button>
          </div>
        ) : (
          /* Active Playing State */
          <>
            {/* Large Artwork */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-orange-500/30 group">
              {currentTrack.artworkUrl ? (
                <Image
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-[#251006] to-[#0a0401]">
                  🎃
                </div>
              )}

              {/* Dynamic Equalizer Overlay when playing */}
              {isPlaying && (
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-orange-500/40 flex items-center gap-1.5 shadow-lg">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-[#ff7518] rounded-full animate-bounce h-2" />
                    <span className="w-0.5 bg-[#ff7518] rounded-full animate-bounce h-3 delay-75" />
                    <span className="w-0.5 bg-[#ff7518] rounded-full animate-bounce h-1.5 delay-150" />
                  </div>
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                    Playing
                  </span>
                </div>
              )}
            </div>

            {/* Song Title, Artist & Like Button */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="min-w-0 flex-1">
                <h4
                  className="text-base font-extrabold text-white truncate hover:text-[#ff7518] transition-colors cursor-pointer"
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </h4>
                <p className="text-xs text-[#a1a1aa] truncate mt-0.5">
                  {currentTrack.artist || 'Unknown Artist'}
                </p>
                {currentTrack.album && (
                  <p className="text-[11px] text-[#716e7a] truncate mt-0.5">
                    {currentTrack.album}
                  </p>
                )}
              </div>

              {/* Like Button */}
              <button
                type="button"
                onClick={handleToggleLike}
                className="p-2 rounded-full hover:bg-[#1a1722] transition-transform hover:scale-125 cursor-pointer shrink-0 text-xl"
                title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              >
                {isLiked ? '🎃' : '🤍'}
              </button>
            </div>

            {/* Playback Badge & Active Effects */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1e1b26] text-[#a1a1aa] border border-[#2e2938]">
                {currentTrack.source === 'local' ? '📁 Local File' : '▶️ YouTube Stream'}
              </span>

              {isSpatial8D && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse">
                  🎧 8D Spatial
                </span>
              )}

              {isMuffled && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  🚪 Muffled
                </span>
              )}
            </div>

            {/* Progress Bar & Timestamps */}
            <div className="space-y-1 bg-[#14121a] p-3 rounded-xl border border-[#231e2c]">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8e8b98]">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
              <div className="w-full bg-[#24202e] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#ff7518] h-full rounded-full transition-all duration-150 shadow-sm shadow-orange-500"
                  style={{
                    width: duration > 0 ? `${Math.min(100, (currentTime / duration) * 100)}%` : '0%',
                  }}
                />
              </div>
            </div>

            {/* Recommended Next Songs */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-black text-white flex items-center justify-between">
                <span>🦇 Recommended Next</span>
                <span className="text-[10px] text-[#8e8b98] font-normal">Click to play</span>
              </h4>

              <div className="space-y-1.5">
                {recommendations.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => {
                      const track = trendingSongToTrackInfo(song);
                      playCustomTrackList([track], 0);
                    }}
                    className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-[#1a1722] border border-transparent hover:border-orange-500/30 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative w-9 h-9 rounded-md overflow-hidden bg-black shrink-0 border border-[#272332]">
                        <Image
                          src={song.thumbnail}
                          alt={song.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-[#ff7518] transition-colors">
                          {song.title}
                        </p>
                        <p className="text-[10px] text-[#8e8b98] truncate">{song.artist}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-[#666666] shrink-0 group-hover:text-[#ff7518]">
                      ▶
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Footer Branding */}
      <div className="pt-3 border-t border-[#231e2c] text-center text-[10px] text-[#716e7a] shrink-0 font-bold">
        Chillify 🎃 • Haunted Now Playing View 🦇
      </div>
    </aside>
  );
}
