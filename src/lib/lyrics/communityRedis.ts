import { Redis } from '@upstash/redis';
import { LyricsResult } from './providers/types';
import { normalizeString } from './normalize';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      redisInstance = new Redis({ url, token });
      return redisInstance;
    } catch (e) {
      console.warn('[community-lyrics] Failed to initialize Redis client:', e);
      return null;
    }
  }

  return null;
}

export async function getCommunityLyrics(
  trackId: string,
  artist?: string,
  title?: string
): Promise<LyricsResult | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    // 1. Check by trackId first
    if (trackId) {
      const byId = await redis.get<LyricsResult>(`chillify:community:id:${trackId}`);
      if (byId) return byId;
    }

    // 2. Check by normalized artist + title
    if (artist && title) {
      const key = `chillify:community:name:${normalizeString(artist)}::${normalizeString(title)}`;
      const byName = await redis.get<LyricsResult>(key);
      if (byName) return byName;
    }

    return null;
  } catch (err) {
    console.warn('[community-lyrics] Redis read error:', err);
    return null;
  }
}

export async function saveCommunityLyrics(
  trackId: string,
  artist: string,
  title: string,
  lyricsResult: LyricsResult
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const pipe = redis.pipeline();

    if (trackId) {
      pipe.set(`chillify:community:id:${trackId}`, lyricsResult);
    }

    if (artist && title) {
      const key = `chillify:community:name:${normalizeString(artist)}::${normalizeString(title)}`;
      pipe.set(key, lyricsResult);
    }

    await pipe.exec();
    return true;
  } catch (err) {
    console.warn('[community-lyrics] Redis write error:', err);
    return false;
  }
}
