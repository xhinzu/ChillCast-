'use client';

import { DEFAULT_STARTER_PLAYLISTS } from '@/lib/music-data';
import type { SavedPlaylistItem, CustomPlaylistTrack } from '@/components/spotify/AddSourceModal';
import { playlistSyncEngine, isPlaylistDeleted } from '@/lib/sync/playlist-sync';

export const PLAYLISTS_STORAGE_KEY = 'chillify_saved_playlists';
export const PLAYLISTS_UPDATED_EVENT = 'chillify_playlists_updated';

function isValidPlaylist(p: unknown): p is SavedPlaylistItem {
  if (!p || typeof p !== 'object') return false;
  const pl = p as Record<string, unknown>;
  const hasId = typeof pl.id === 'string' && pl.id.trim().length > 0;
  const hasTitle =
    (typeof pl.title === 'string' && pl.title.trim().length > 0) ||
    (typeof pl.name === 'string' && pl.name.trim().length > 0);
  return Boolean(hasId && hasTitle);
}

/**
 * Normalizes any playlist object (legacy or synced) into a guaranteed valid SavedPlaylistItem
 */
export function normalizePlaylist(p: any): SavedPlaylistItem {
  const isLiked =
    p.id === 'liked-songs' ||
    p.id === '00000000-0000-4000-8000-000000000001' ||
    p.kind === 'liked' ||
    p.title === 'Liked Songs' ||
    p.name === 'Liked Songs';

  const id = isLiked ? 'liked-songs' : String(p.id);
  const title =
    (typeof p.title === 'string' && p.title.trim()) ||
    (typeof p.name === 'string' && p.name.trim()) ||
    (isLiked ? 'Liked Songs' : 'Custom Playlist');

  let tracks: CustomPlaylistTrack[] = [];
  if (Array.isArray(p.tracks) && p.tracks.length > 0) {
    tracks = p.tracks;
  } else if (Array.isArray(p.items)) {
    tracks = p.items.map((it: any) => ({
      id: it.track?.sourceId || it.id || '',
      title: it.track?.title || 'Unknown',
      artist: it.track?.artist || 'Unknown',
      duration:
        typeof it.track?.durationSec === 'number'
          ? `${Math.floor(it.track.durationSec / 60)}:${String(
              Math.floor(it.track.durationSec % 60)
            ).padStart(2, '0')}`
          : (it.duration || '0:00'),
      thumbnail: it.track?.thumbnail || it.thumbnail,
      addedAt: it.added_at ? new Date(it.added_at).getTime() : (it.addedAt || Date.now()),
    }));
  }

  const trackCount = tracks.length;
  const subtitle =
    p.subtitle ||
    `${trackCount} song${trackCount === 1 ? '' : 's'} • ${
      isLiked ? 'Liked Songs' : 'Custom Playlist'
    }`;
  const firstThumb = tracks.length > 0 && tracks[0].thumbnail ? tracks[0].thumbnail : undefined;
  const coverUrl = p.coverUrl || p.cover_url || firstThumb;

  return {
    ...p,
    id,
    title,
    subtitle,
    type: p.type || 'custom',
    targetUrl: p.targetUrl || '',
    icon: p.icon || (isLiked ? 'heart' : 'music'),
    coverUrl,
    cover_url: coverUrl,
    tracks,
    description: p.description,
    createdAt:
      typeof p.createdAt === 'number'
        ? p.createdAt
        : (p.created_at ? new Date(p.created_at).getTime() : Date.now()),
  };
}

/**
 * Retrieve saved playlists from localStorage safely.
 * Filters out nulls, undefineds, or empty/corrupted objects, and respects deletion tombstones.
 */
export function getSavedPlaylists(): SavedPlaylistItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    if (!raw) return DEFAULT_STARTER_PLAYLISTS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_STARTER_PLAYLISTS;

    const valid = parsed
      .filter(isValidPlaylist)
      .map(normalizePlaylist)
      .filter((p) => !isPlaylistDeleted(p.id) && !isPlaylistDeleted((p as any).syncId));

    // Keep valid playlists (liked-songs is persisted when user actually likes a song)
    return valid.length > 0 ? valid : DEFAULT_STARTER_PLAYLISTS;
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

  const valid = playlists.filter(isValidPlaylist).map(normalizePlaylist);
  try {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(valid));
    // Dispatch local custom event for same-window reactive updates
    window.dispatchEvent(
      new CustomEvent(PLAYLISTS_UPDATED_EVENT, { detail: { playlists: valid } })
    );
    window.dispatchEvent(new CustomEvent('myujiku_playlists_updated'));
    // Dispatch storage event for cross-window / tab synchronization
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('[PlaylistStorage] Error saving playlists:', err);
  }
}

/**
 * Adds or updates a playlist (deduplicating by ID, preserving all other playlists).
 */
export function addOrUpdatePlaylist(item: SavedPlaylistItem): SavedPlaylistItem[] {
  if (!isValidPlaylist(item)) return getSavedPlaylists();

  const normalizedItem = normalizePlaylist(item);
  const current = getSavedPlaylists();
  const index = current.findIndex((p) => p.id === normalizedItem.id);

  let updated: SavedPlaylistItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...current[index], ...normalizedItem };
  } else {
    // Preserve liked-songs at index 0 if present, otherwise prepend
    const likedIndex = current.findIndex((p) => p.id === 'liked-songs');
    if (likedIndex === 0) {
      updated = [current[0], normalizedItem, ...current.slice(1)];
    } else {
      updated = [normalizedItem, ...current];
    }
  }

  saveSavedPlaylists(updated);
  return updated;
}

/**
 * Deletes a playlist by its ID (except liked-songs which is cleared instead of deleted).
 * Actively informs the sync engine to soft-delete in Supabase cloud and prevent resurrection.
 */
export function deletePlaylist(playlistId: string): SavedPlaylistItem[] {
  // 1. Actively record tombstone and propagate deletion to cloud
  playlistSyncEngine.deletePlaylist(playlistId);

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
