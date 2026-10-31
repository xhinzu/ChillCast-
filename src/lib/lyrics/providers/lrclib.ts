import { LyricsProvider, LyricsResult } from './types';

const CLIENT_CACHE_KEY_PREFIX = 'chillify_lyric_cache:';
const MANUAL_OVERRIDE_PREFIX = 'chillify_manual_lyrics_override:';
const COMMUNITY_LYRICS_PREFIX = 'chillify_community_lyrics:';
const CLIENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for positive lyrics
const CLIENT_NEGATIVE_TTL_MS = 10 * 60 * 1000;   // 10 minutes for not-found

export interface ManualLyricsOverride {
  artist: string;
  title: string;
}

interface ClientCacheWrapper {
  timestamp: number;
  expiresAt: number;
  result: LyricsResult;
}

export class LrclibProvider implements LyricsProvider {
  readonly name = 'lrclib';

  public async getLyrics(
    track: {
      id: string;
      title: string;
      artist: string;
      duration?: number;
    },
    options?: {
      bypassCache?: boolean;
      manualOverride?: ManualLyricsOverride | null;
    }
  ): Promise<LyricsResult> {
    if (!track.title || !track.title.trim()) {
      return {
        source: this.name,
        synced: 'none',
        lines: [],
        error: 'No track title specified',
      };
    }

    const storageKey = `${CLIENT_CACHE_KEY_PREFIX}${track.id || track.title.toLowerCase()}`;

    // 0. Check community uploaded lyrics first (unless bypassed)
    if (!options?.bypassCache && track.id && typeof window !== 'undefined') {
      try {
        const communityRaw = localStorage.getItem(`${COMMUNITY_LYRICS_PREFIX}${track.id}`);
        if (communityRaw) {
          const parsed = JSON.parse(communityRaw) as LyricsResult;
          if (parsed && (parsed.lines?.length > 0 || parsed.plainLyrics)) {
            return parsed;
          }
        }
      } catch {
        // ignore storage parse error
      }
    }

    // Check manual override from localStorage if not explicitly supplied
    let override: ManualLyricsOverride | null = options?.manualOverride ?? null;
    if (!override && track.id && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`${MANUAL_OVERRIDE_PREFIX}${track.id}`);
        if (saved) {
          override = JSON.parse(saved);
        }
      } catch {
        // ignore storage parse error
      }
    }

    // 1. Check client localStorage cache (unless bypassed or overriding)
    if (!options?.bypassCache && !override && typeof window !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem(storageKey);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as ClientCacheWrapper;
          if (parsed.expiresAt > Date.now()) {
            return parsed.result;
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      } catch {
        // ignore localStorage parsing errors
      }
    }

    // 2. Fetch from our /api/lyrics route handler
    const query = new URLSearchParams({
      title: track.title,
      artist: track.artist || '',
      id: track.id || '',
    });

    if (override) {
      if (override.title) query.set('manualTitle', override.title);
      if (override.artist) query.set('manualArtist', override.artist);
    }

    if (options?.bypassCache) {
      query.set('bypassCache', 'true');
    }

    if (track.duration && track.duration > 0) {
      query.set('duration', Math.round(track.duration).toString());
    }

    try {
      const res = await fetch(`/api/lyrics?${query.toString()}`);
      const data = (await res.json()) as LyricsResult;

      // 3. Cache result in localStorage if valid
      if (typeof window !== 'undefined') {
        try {
          const ttl = res.ok ? CLIENT_CACHE_TTL_MS : CLIENT_NEGATIVE_TTL_MS;
          const wrapper: ClientCacheWrapper = {
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
            result: data,
          };
          localStorage.setItem(storageKey, JSON.stringify(wrapper));
        } catch {
          // localStorage quota or private mode
        }
      }

      return data;
    } catch (err) {
      return {
        source: this.name,
        synced: 'none',
        lines: [],
        error: (err as Error).message || 'Failed to fetch lyrics',
      };
    }
  }
}

export const lrclibProvider = new LrclibProvider();
