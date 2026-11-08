'use client';

import React from 'react';
import { TrackInfo } from '@/types/playback';
import { SavedPlaylistItem, CustomPlaylistTrack } from './AddSourceModal';
import { addTrackToPlaylist } from '@/lib/playlist-storage';
import { MusicNoteIcon, HeartIcon } from '@/components/common/MinimalIcons';

interface AddToPlaylistMenuProps {
  currentTrack: TrackInfo | null;
  duration: number;
  savedPlaylists: SavedPlaylistItem[];
  onClose: () => void;
  onAdded: (playlistTitle: string) => void;
}

function formatTime(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function AddToPlaylistMenu({
  currentTrack,
  duration,
  savedPlaylists,
  onClose,
  onAdded,
}: AddToPlaylistMenuProps) {
  if (!currentTrack) return null;

  // Only show Liked Songs if there are actually liked songs (likesongs > 0)
  const allCustomPlaylists = savedPlaylists
    .filter((p) => p.type === 'custom')
    .filter((p) => {
      const isLiked = p.id === 'liked-songs' || (p as any).kind === 'liked' || p.title === 'Liked Songs';
      if (isLiked) {
        return Boolean(p.tracks && p.tracks.length > 0);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.id === 'liked-songs') return -1;
      if (b.id === 'liked-songs') return 1;
      return 0;
    });

  const handleSelectPlaylist = (pl: SavedPlaylistItem) => {
    if (!currentTrack) return;

    try {
      const newTrack: CustomPlaylistTrack = {
        id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        duration: formatTime(duration),
        thumbnail:
          currentTrack.artworkUrl ||
          `https://img.youtube.com/vi/${currentTrack.id}/hqdefault.jpg`,
        addedAt: Date.now(),
      };

      addTrackToPlaylist(pl.id, newTrack);
      onAdded(pl.title);
      onClose();
    } catch {
      onClose();
    }
  };

  return (
    <div className="w-56 sm:w-64 space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#262626]">
        <p className="text-[10px] font-bold text-[#b3b3b3] uppercase tracking-wider">
          Add to Playlist
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[#888888] hover:text-white p-0.5 rounded transition-colors"
          title="Close menu"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* Playlist Items */}
      <div className="space-y-0.5 max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent py-1">
        {allCustomPlaylists.length === 0 ? (
          <p className="text-[11px] text-[#888888] px-3 py-3 text-center">
            No custom playlists created yet
          </p>
        ) : (
          allCustomPlaylists.map((pl) => {
            const alreadyContains = pl.tracks?.some(
              (t) => t.id === currentTrack.id
            );
            const isLikedPlaylist = pl.id === 'liked-songs';

            return (
              <button
                key={pl.id}
                type="button"
                role="menuitem"
                disabled={alreadyContains}
                aria-disabled={alreadyContains}
                onClick={() => !alreadyContains && handleSelectPlaylist(pl)}
                className={`w-full text-left text-xs px-2.5 py-2 rounded-lg truncate flex items-center justify-between gap-2 transition-colors ${
                  alreadyContains
                    ? 'text-zinc-500 opacity-60 cursor-default bg-white/[0.02]'
                    : 'text-white hover:bg-[#282828] active:bg-[#303030] cursor-pointer'
                }`}
                title={
                  alreadyContains
                    ? `Already in ${pl.title}`
                    : `Add to ${pl.title}`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isLikedPlaylist ? (
                    <HeartIcon
                      filled
                      className={`w-3.5 h-3.5 shrink-0 ${
                        alreadyContains ? 'text-zinc-500' : 'text-zinc-200'
                      }`}
                    />
                  ) : (
                    <MusicNoteIcon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        alreadyContains ? 'text-zinc-600' : 'text-zinc-400'
                      }`}
                    />
                  )}
                  <span className="truncate flex-1 font-medium">{pl.title}</span>
                </div>

                {/* Checked / Disabled state indicator */}
                {alreadyContains && (
                  <span className="text-[10px] font-semibold text-zinc-400 shrink-0 flex items-center gap-1">
                    <span>✓</span> Added
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
