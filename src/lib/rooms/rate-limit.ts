/**
 * In-memory sliding window rate limiter.
 * Automatically cleans up expired entries to prevent memory leaks.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 60000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}

/**
 * Checks and updates rate limit for a given key.
 * @param key unique identifier (e.g. `join:${ip}` or `action:${userId}`)
 * @param limit maximum requests allowed in windowMs
 * @param windowMs time window in milliseconds (default 60000 = 1 minute)
 */
export function checkRateLimit(key: string, limit: number, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Remove timestamps outside window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.timestamps.push(now);
  return { allowed: true, remaining: limit - record.timestamps.length };
}

