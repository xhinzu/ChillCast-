import { LyricsProvider, LyricsResult } from './types';

const CLIENT_CACHE_KEY_PREFIX = 'chillify_lyric_cache:';
const CLIENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for positive lyrics
const CLIENT_NEGATIVE_TTL_MS = 10 * 60 * 1000;   // 10 minutes for not-found

interface ClientCacheWrapper {
  timestamp: number;
  expiresAt: number;
  result: LyricsResult;
}

export class LrclibProvider implements LyricsProvider {
  readonly name = 'lrclib';

  public async getLyrics(track: {
    id: string;
    title: string;
    artist: string;
    duration?: number;
  }): Promise<LyricsResult> {
    if (!track.title || !track.title.trim()) {
      return {
        source: this.name,
        synced: 'none',
        lines: [],
        error: 'No track title specified',
      };
    }

    const storageKey = `${CLIENT_CACHE_KEY_PREFIX}${track.id || track.title.toLowerCase()}`;

    // 1. Check client localStorage cache
    if (typeof window !== 'undefined') {
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
    if (track.duration && track.duration > 0) {
      query.set('duration', Math.round(track.duration).toString());
    }

    try {
      const res = await fetch(`/api/lyrics?${query.toString()}`);
      const data = (await res.json()) as LyricsResult;

      // 3. Cache result in localStorage
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
