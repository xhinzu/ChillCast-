'use client';

import { DEFAULT_STARTER_PLAYLISTS } from '@/lib/music-data';
import type { SavedPlaylistItem, CustomPlaylistTrack } from '@/components/spotify/AddSourceModal';

export const PLAYLISTS_STORAGE_KEY = 'chillify_saved_playlists';
export const PLAYLISTS_UPDATED_EVENT = 'chillify_playlists_updated';

function isValidPlaylist(p: unknown): p is SavedPlaylistItem {
  if (!p || typeof p !== 'object') return false;
  const pl = p as Partial<SavedPlaylistItem>;
  return (
    typeof pl.id === 'string' &&
    pl.id.trim().length > 0 &&
    typeof pl.title === 'string' &&
    pl.title.trim().length > 0
  );
}

/**
 * Retrieve saved playlists from localStorage safely.
 * Filters out nulls, undefineds, or empty/corrupted objects.
 */
export function getSavedPlaylists(): SavedPlaylistItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    if (!raw) return DEFAULT_STARTER_PLAYLISTS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_STARTER_PLAYLISTS;

    const valid = parsed.filter(isValidPlaylist);

    // Ensure liked-songs is always present if not already
    const hasLiked = valid.some((p) => p.id === 'liked-songs');
    if (!hasLiked && valid.length > 0) {
      const liked: SavedPlaylistItem = {
        id: 'liked-songs',
        title: 'Liked Songs',
        subtitle: '0 songs • Liked Songs',
        type: 'custom',
        targetUrl: '',
        icon: 'heart',
        tracks: [],
        description: 'Your favorite liked tracks on ChillCast',
        createdAt: 0,
      };
      return [liked, ...valid];
    }

    return valid;
  } catch (err) {
    console.warn('[PlaylistStorage] Error reading saved playlists:', err);
    return DEFAULT_STARTER_PLAYLISTS;
  }
}

/**
 * Persist playlists to localStorage and notify all listeners across windows and components.
 */
export function saveSavedPlaylists(playlists: SavedPlaylistItem[]): void {
  if (typeof window === 'undefined') return;

  const valid = playlists.filter(isValidPlaylist);
  try {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(valid));
    // Dispatch local custom event for same-window reactive updates
    window.dispatchEvent(
      new CustomEvent(PLAYLISTS_UPDATED_EVENT, { detail: { playlists: valid } })
    );
    // Dispatch storage event for cross-window / tab synchronization
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('[PlaylistStorage] Error saving playlists:', err);
  }
}

/**
 * Adds or updates a playlist (deduplicating by ID).
 */
export function addOrUpdatePlaylist(item: SavedPlaylistItem): SavedPlaylistItem[] {
  if (!isValidPlaylist(item)) return getSavedPlaylists();

  const current = getSavedPlaylists();
  const index = current.findIndex((p) => p.id === item.id);

  let updated: SavedPlaylistItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = item;
  } else {
    updated = [item, ...current];
  }

  saveSavedPlaylists(updated);
  return updated;
}

/**
 * Deletes a playlist by its ID (except liked-songs which is cleared instead of deleted).
 */
export function deletePlaylist(playlistId: string): SavedPlaylistItem[] {
  const current = getSavedPlaylists();

  let updated: SavedPlaylistItem[];
  if (playlistId === 'liked-songs') {
    updated = current.map((p) =>
      p.id === 'liked-songs'
        ? { ...p, tracks: [], subtitle: '0 songs • Liked Songs' }
        : p
    );
  } else {
    updated = current.filter((p) => p.id !== playlistId);
  }

  saveSavedPlaylists(updated);
  return updated;
}

/**
 * Adds a track to a specific custom playlist.
 */
export function addTrackToPlaylist(
  playlistId: string,
  track: CustomPlaylistTrack
): SavedPlaylistItem[] {
  const current = getSavedPlaylists();
  let found = current.some((p) => p.id === playlistId);

  let working = current;
  if (!found && playlistId === 'liked-songs') {
    const virtualLiked: SavedPlaylistItem = {
      id: 'liked-songs',
      title: 'Liked Songs',
      subtitle: '0 songs • Liked Songs',
      type: 'custom',
      targetUrl: '',
      icon: 'heart',
      tracks: [],
      description: 'Your favorite liked tracks on ChillCast',
      createdAt: Date.now(),
    };
    working = [virtualLiked, ...working];
    found = true;
  }

  const updated = working.map((p) => {
    if (p.id === playlistId) {
      const prevTracks = p.tracks || [];
      // Prevent duplicates in the same playlist
      if (prevTracks.some((t: CustomPlaylistTrack) => t.id === track.id)) {
        return p;
      }
      const newTracks = [track, ...prevTracks];
      return {
        ...p,
        tracks: newTracks,
        subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} • ${
          p.id === 'liked-songs' ? 'Liked Songs' : 'Custom Playlist'
        }`,
      };
    }
    return p;
  });

  saveSavedPlaylists(updated);
  return updated;
}

/**
 * Removes a track from a custom playlist.
 */
export function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string
): SavedPlaylistItem[] {
  const current = getSavedPlaylists();
  const updated = current.map((p) => {
    if (p.id === playlistId) {
      const prevTracks = p.tracks || [];
      const newTracks = prevTracks.filter((t: CustomPlaylistTrack) => t.id !== trackId);
      return {
        ...p,
        tracks: newTracks,
        subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} • ${
          p.id === 'liked-songs' ? 'Liked Songs' : 'Custom Playlist'
        }`,
      };
    }
    return p;
  });

  saveSavedPlaylists(updated);
  return updated;
}

/**
 * Toggles a track in the "Liked Songs" playlist.
 * Returns { updatedPlaylists, isLikedNow }
 */
export function toggleLikedSong(track: {
  id: string;
  title: string;
  artist: string;
  duration?: string;
  thumbnail?: string;
}): { updated: SavedPlaylistItem[]; isLikedNow: boolean } {
  const current = getSavedPlaylists();
  let likedPl = current.find((p) => p.id === 'liked-songs');

  let working = current;
  if (!likedPl) {
    likedPl = {
      id: 'liked-songs',
      title: 'Liked Songs',
      subtitle: '0 songs • Liked Songs',
      type: 'custom',
      targetUrl: '',
      icon: 'heart',
      tracks: [],
      description: 'Your favorite liked tracks on ChillCast',
      createdAt: Date.now(),
    };
    working = [likedPl, ...working];
  }

  const prevTracks = likedPl.tracks || [];
  const alreadyLiked = prevTracks.some((t: CustomPlaylistTrack) => t.id === track.id);

  let newTracks: CustomPlaylistTrack[];
  if (alreadyLiked) {
    newTracks = prevTracks.filter((t: CustomPlaylistTrack) => t.id !== track.id);
  } else {
    const newTrack: CustomPlaylistTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration || '0:00',
      thumbnail: track.thumbnail,
      addedAt: Date.now(),
    };
    newTracks = [newTrack, ...prevTracks];
  }

  const updated = working.map((p) => {
    if (p.id === 'liked-songs') {
      return {
        ...p,
        tracks: newTracks,
        subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} • Liked Songs`,
      };
    }
    return p;
  });

  saveSavedPlaylists(updated);
  return { updated, isLikedNow: !alreadyLiked };
}
