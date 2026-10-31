import { getRedisClient } from './communityRedis';

// In-memory rate limiting map: ip -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// In-memory fallback offset map if Redis is not configured: videoId -> number[]
const fallbackOffsetMap = new Map<string, number[]>();

export function checkIpRateLimit(ip: string, maxPerMinute = 10): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= maxPerMinute) {
    return false;
  }

  entry.count += 1;
  return true;
}

export function computeMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
  }
  return Number(sorted[mid].toFixed(1));
}

export async function getSharedOffset(videoId: string): Promise<number | null> {
  if (!videoId) return null;
  const redis = getRedisClient();

  if (redis) {
    try {
      const rawList = await redis.lrange<number | string>(`lyrics:offset:${videoId}`, 0, 4);
      if (rawList && rawList.length > 0) {
        const nums = rawList
          .map((v) => parseFloat(String(v)))
          .filter((v) => !isNaN(v) && v >= -120 && v <= 120);
        if (nums.length > 0) {
          return computeMedian(nums);
        }
      }
    } catch (err) {
      console.warn(`[shared-offset] Redis read error for video ${videoId}:`, err);
    }
  }

  // Fallback to in-memory store
  const localList = fallbackOffsetMap.get(videoId);
  if (localList && localList.length > 0) {
    return computeMedian(localList);
  }

  return null;
}

export async function saveSharedOffset(
  videoId: string,
  offsetSeconds: number
): Promise<{ success: boolean; median: number | null; error?: string }> {
  if (!videoId || typeof videoId !== 'string') {
    return { success: false, median: null, error: 'Invalid videoId' };
  }

  if (typeof offsetSeconds !== 'number' || isNaN(offsetSeconds)) {
    return { success: false, median: null, error: 'offsetSeconds must be a number' };
  }

  if (offsetSeconds < -120 || offsetSeconds > 120) {
    return { success: false, median: null, error: 'offsetSeconds must be between -120 and +120' };
  }

  const rounded = Number(offsetSeconds.toFixed(1));

  // Update in-memory fallback
  const localList = fallbackOffsetMap.get(videoId) || [];
  localList.unshift(rounded);
  if (localList.length > 5) localList.length = 5;
  fallbackOffsetMap.set(videoId, localList);
  const fallbackMedian = computeMedian(localList);

  const redis = getRedisClient();
  if (!redis) {
    return { success: true, median: fallbackMedian };
  }

  try {
    const key = `lyrics:offset:${videoId}`;
    await redis.lpush(key, rounded);
    await redis.ltrim(key, 0, 4);

    const rawList = await redis.lrange<number | string>(key, 0, 4);
    const nums = (rawList || [])
      .map((v) => parseFloat(String(v)))
      .filter((v) => !isNaN(v) && v >= -120 && v <= 120);

    const median = computeMedian(nums);
    return { success: true, median };
  } catch (err) {
    console.warn(`[shared-offset] Redis write error for video ${videoId}:`, err);
    return { success: true, median: fallbackMedian };
  }
}
