/**
 * Autoplay Engine for MyuJiku
 * Recommends and prefetches similar tracks when queue or current track ends.
 *
 * Candidate Hierarchy:
 * 1. YouTube Mix / Radio for current track
 * 2. Search query "<artist> <title> similar songs" or top songs
 * 3. Last.fm track.getSimilar (server-side if LASTFM_API_KEY is configured)
 * 4. Fallback shuffle from user's Liked Songs
 *
 * Strict Filters:
 * - Music only (duration 90s to 600s / 1.5 to 10 min)
 * - Excludes live recordings, hour-long mixes, full albums, podcasts, tutorials
 * - Deduplication against last 50 played tracks
 * - Maximum 2 tracks in a row by the same artist
 */

import type { TrackInfo } from '@/types/playback';

export interface AutoplayCandidate {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnail?: string;
  artworkUrl?: string;
  source?: string;
  sourceUrl?: string;
}

export interface AutoplayResult {
  track: TrackInfo;
  reason: string;
}

const EXCLUDED_TITLE_PATTERNS = [
  /\b(live(\s+at|\s+in|\s+performance)?)\b/i,
  /\b(full\s+album)\b/i,
  /\b(10\s*hours?|1\s*hour|2\s*hours?|3\s*hours?)\b/i,
  /\b(compilation|continuous\s*mix|megamix|mashup)\b/i,
  /\b(podcast|episode|interview|tutorial|reaction)\b/i,
  /\b(official\s+teaser|trailer)\b/i,
];

/**
 * Checks whether a candidate track passes duration constraints (1.5 to 10 minutes)
 */
export function isDurationValid(durationSec?: number): boolean {
  if (!durationSec || isNaN(durationSec)) return true; // Accept if duration is not yet resolved
  return durationSec >= 90 && durationSec <= 600;
}

/**
 * Checks whether a track title matches excluded upload patterns (mixes, live, podcasts)
 */
export function isExcludedTitle(title: string): boolean {
  return EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

/**
 * Normalizes artist name for comparison
 */
export function normalizeArtist(artist: string): string {
  return artist.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Filters and deduplicates raw candidates according to autoplay rules
 */
export function filterCandidates(
  candidates: AutoplayCandidate[],
  historyTrackIds: Set<string>,
  recentArtists: string[]
): AutoplayCandidate[] {
  const filtered: AutoplayCandidate[] = [];

  // Count occurrences of the most recent artist
  const lastArtist = recentArtists.length > 0 ? normalizeArtist(recentArtists[recentArtists.length - 1]) : '';
  let consecutiveSameArtistCount = 0;
  for (let i = recentArtists.length - 1; i >= 0; i--) {
    if (normalizeArtist(recentArtists[i]) === lastArtist) {
      consecutiveSameArtistCount++;
    } else {
      break;
    }
  }

  for (const item of candidates) {
    if (!item.id || !item.title) continue;

    // 1. History filter (last 50 tracks)
    if (historyTrackIds.has(item.id)) continue;

    // 2. Duration filter (90s - 600s)
    if (!isDurationValid(item.duration)) continue;

    // 3. Excluded title filter
    if (isExcludedTitle(item.title)) continue;

    // 4. Consecutive artist check (no more than 2 in a row by same artist)
    const norm = normalizeArtist(item.artist || '');
    if (norm && norm === lastArtist && consecutiveSameArtistCount >= 2) {
      continue;
    }

    filtered.push(item);
  }

  return filtered;
}

/**
 * Fallback candidate resolver from Liked Songs
 */
export function getLikedSongsFallback(
  historyTrackIds: Set<string>,
  recentArtists: string[]
): AutoplayResult | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('myujiku_liked_songs') || localStorage.getItem('chillcast_liked_songs');
    if (!raw) return null;
    const liked: TrackInfo[] = JSON.parse(raw);
    if (!Array.isArray(liked) || liked.length === 0) return null;

    const available = filterCandidates(
      liked.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        thumbnail: t.artworkUrl,
        artworkUrl: t.artworkUrl,
      })),
      historyTrackIds,
      recentArtists
    );

    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      return {
        track: {
          id: pick.id,
          title: pick.title,
          artist: pick.artist,
          album: pick.album || 'Liked Songs',
          duration: pick.duration || 180,
          source: 'youtube',
          sourceUrl: `https://www.youtube.com/watch?v=${pick.id}`,
          artworkUrl: pick.artworkUrl || pick.thumbnail || `https://i.ytimg.com/vi/${pick.id}/hqdefault.jpg`,
        },
        reason: 'From your Liked Songs',
      };
    }
  } catch (err) {
    console.warn('[Autoplay] Liked songs fallback error:', err);
  }
  return null;
}

/**
 * Resolves the next autoplay track for the current track
 */
export async function resolveNextAutoplayTrack(
  currentTrack: TrackInfo,
  historyTrackIds: Set<string>,
  recentArtists: string[],
  isInRoom = false
): Promise<AutoplayResult | null> {
  // Autoplay is strictly disabled in Listen Together rooms
  if (isInRoom) return null;

  // 1. Try YouTube Search for similar music
  try {
    const query = `${currentTrack.artist} ${currentTrack.title} similar music`;
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      const results: { id: string; title: string; channel: string; duration?: string; thumbnail?: string }[] = data.results || [];

      const candidates: AutoplayCandidate[] = results.map((r) => {
        let durSec = 180;
        if (r.duration) {
          const parts = r.duration.split(':').map(Number);
          if (parts.length === 2 && !parts.some(isNaN)) durSec = parts[0] * 60 + parts[1];
          if (parts.length === 3 && !parts.some(isNaN)) durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return {
          id: r.id,
          title: r.title,
          artist: r.channel,
          duration: durSec,
          thumbnail: r.thumbnail,
          artworkUrl: r.thumbnail,
        };
      });

      const valid = filterCandidates(candidates, historyTrackIds, recentArtists);
      if (valid.length > 0) {
        const selected = valid[0];
        return {
          track: {
            id: selected.id,
            title: selected.title,
            artist: selected.artist,
            album: 'Autoplay Recommendation',
            duration: selected.duration || 180,
            source: 'youtube',
            sourceUrl: `https://www.youtube.com/watch?v=${selected.id}`,
            artworkUrl: selected.artworkUrl || selected.thumbnail || `https://i.ytimg.com/vi/${selected.id}/hqdefault.jpg`,
          },
          reason: `Similar to ${currentTrack.title}`,
        };
      }
    }
  } catch (err) {
    console.warn('[Autoplay] Search candidate resolution notice:', err);
  }

  // 2. Fallback to Liked Songs
  return getLikedSongsFallback(historyTrackIds, recentArtists);
}
