import fs from 'fs';
import path from 'path';

export interface CachedSearchResult {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

interface SearchCacheEntry {
  query: string;
  results: CachedSearchResult[];
  cachedAt: number;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ENTRIES = 500;

class SearchQueryCache {
  private cacheFilePath: string;
  private memoryCache: Map<string, SearchCacheEntry> = new Map();
  private isLoaded = false;

  constructor() {
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // Fallback to memory in serverless/read-only environments
      }
    }
    this.cacheFilePath = path.join(dataDir, 'search-query-cache.json');
    this.loadFromDisk();
  }

  private normalizeQuery(q: string): string {
    return q
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private loadFromDisk() {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const data = JSON.parse(raw) as Record<string, SearchCacheEntry>;
        const now = Date.now();
        for (const [k, v] of Object.entries(data)) {
          if (v.expiresAt > now) {
            this.memoryCache.set(k, v);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load search cache from disk, using in-memory only:', e);
    }
    this.isLoaded = true;
  }

  private saveToDisk() {
    try {
      const obj: Record<string, SearchCacheEntry> = {};
      const now = Date.now();
      this.memoryCache.forEach((v, k) => {
        if (v.expiresAt > now) {
          obj[k] = v;
        }
      });
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save search cache to disk:', e);
    }
  }

  public get(query: string): CachedSearchResult[] | null {
    this.loadFromDisk();
    const key = this.normalizeQuery(query);
    if (!key) return null;

    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.results;
  }

  public set(query: string, results: CachedSearchResult[], ttlMs: number = DEFAULT_TTL_MS): void {
    this.loadFromDisk();
    const key = this.normalizeQuery(query);
    if (!key || results.length === 0) return;

    // Prune if over capacity
    if (this.memoryCache.size >= MAX_ENTRIES) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) this.memoryCache.delete(firstKey);
    }

    const now = Date.now();
    const entry: SearchCacheEntry = {
      query,
      results,
      cachedAt: now,
      expiresAt: now + ttlMs,
    };

    this.memoryCache.set(key, entry);
    this.saveToDisk();
  }

  public size(): number {
    this.loadFromDisk();
    return this.memoryCache.size;
  }
}

// Global singleton instance across Next.js API route invocations
const globalForCache = globalThis as unknown as { searchQueryCache?: SearchQueryCache };
export const searchQueryCache =
  globalForCache.searchQueryCache || new SearchQueryCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.searchQueryCache = searchQueryCache;
}
