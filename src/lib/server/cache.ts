import fs from 'fs';
import path from 'path';

interface CacheEntry {
  videoId: string;
  artist: string;
  title: string;
  cachedAt: string;
}

class YouTubeSearchCache {
  private cacheFilePath: string;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private isLoaded = false;

  constructor() {
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // In serverless / read-only environments fallback to memory
      }
    }
    this.cacheFilePath = path.join(dataDir, 'youtube-cache.json');
    this.loadFromDisk();
  }

  private normalizeKey(artist: string, title: string): string {
    const clean = (str: string) =>
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return `${clean(artist)} - ${clean(title)}`;
  }

  private loadFromDisk() {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const data = JSON.parse(raw) as Record<string, CacheEntry>;
        for (const [k, v] of Object.entries(data)) {
          this.memoryCache.set(k, v);
        }
      }
    } catch (e) {
      console.warn('Failed to load youtube cache from disk, using memory:', e);
    }
    this.isLoaded = true;
  }

  private saveToDisk() {
    try {
      const obj: Record<string, CacheEntry> = {};
      this.memoryCache.forEach((v, k) => {
        obj[k] = v;
      });
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save youtube cache to disk:', e);
    }
  }

  public get(artist: string, title: string): CacheEntry | null {
    this.loadFromDisk();
    const key = this.normalizeKey(artist, title);
    return this.memoryCache.get(key) || null;
  }

  public set(artist: string, title: string, videoId: string): void {
    this.loadFromDisk();
    const key = this.normalizeKey(artist, title);
    const entry: CacheEntry = {
      videoId,
      artist,
      title,
      cachedAt: new Date().toISOString(),
    };
    this.memoryCache.set(key, entry);
    this.saveToDisk();
  }

  public getStats(): { totalCached: number } {
    this.loadFromDisk();
    return { totalCached: this.memoryCache.size };
  }
}

// Global singleton instance across Next.js API route invocations
const globalForCache = globalThis as unknown as { youtubeSearchCache?: YouTubeSearchCache };
export const youtubeSearchCache =
  globalForCache.youtubeSearchCache || new YouTubeSearchCache();
if (process.env.NODE_ENV !== 'production') {
  globalForCache.youtubeSearchCache = youtubeSearchCache;
}
