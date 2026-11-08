import { SavedPlaylistItem, CustomPlaylistTrack } from './playlist-storage';

export interface SharedPlaylistData {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    duration?: string;
    thumbnail?: string;
  }>;
}

/**
 * Encodes a playlist into a URL-safe base64 string
 */
export function encodePlaylistShareData(playlist: SavedPlaylistItem): string {
  const data: SharedPlaylistData = {
    id: playlist.id,
    title: playlist.title,
    description: playlist.subtitle,
    coverUrl: playlist.coverUrl || playlist.tracks?.[0]?.thumbnail,
    tracks: (playlist.tracks || []).slice(0, 50).map((t: CustomPlaylistTrack) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
    })),
  };
  const json = JSON.stringify(data);
  if (typeof window !== 'undefined') {
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  return Buffer.from(json, 'utf-8').toString('base64url');
}

/**
 * Decodes a URL-safe base64 string into playlist data
 */
export function decodePlaylistShareData(raw: string): SharedPlaylistData | null {
  if (!raw) return null;
  try {
    let base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    let json: string;
    if (typeof window !== 'undefined') {
      json = decodeURIComponent(escape(atob(base64)));
    } else {
      json = Buffer.from(base64, 'base64').toString('utf-8');
    }
    return JSON.parse(json) as SharedPlaylistData;
  } catch (err) {
    console.warn('[PlaylistShare] Failed to decode playlist:', err);
    return null;
  }
}

/**
 * Builds the canonical public share link for a playlist
 */
export function getPublicPlaylistShareUrl(playlist: SavedPlaylistItem): string {
  const encoded = encodePlaylistShareData(playlist);
  let baseOrigin = 'https://myujiku.vercel.app';
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost') && !origin.includes('tauri') && !origin.includes('127.0.0.1')) {
      baseOrigin = origin;
    }
  }
  return `${baseOrigin}/playlist/${encodeURIComponent(playlist.id)}?d=${encoded}`;
}
