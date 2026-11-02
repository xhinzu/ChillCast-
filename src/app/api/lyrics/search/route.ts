import { NextRequest, NextResponse } from 'next/server';
import { sanitizeQueryText, tokenSetRatio, normalizeString } from '@/lib/lyrics/normalize';
import { LRCLIBRecord } from '@/lib/lyrics/searchLrclib';

export interface SearchCandidateItem {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  diffSeconds?: number;
  syncedType: 'word' | 'line' | 'plain' | 'instrumental';
  syncedLyrics?: string;
  plainLyrics?: string;
  instrumental: boolean;
  previewLines: string[];
  score: number;
}

async function fetchLrclibJson<T>(url: string, timeoutMs = 4500): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Chillify/2.0 (https://github.com/xhinzu/ChillCast-)',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function extractFirst4Lines(text: string, isSynced: boolean): string[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const result: string[] = [];

  for (const rawLine of lines) {
    let clean = rawLine.trim();
    if (!clean) continue;

    // If synced, strip [mm:ss.xx] tags and <mm:ss.xx> word tags
    if (isSynced) {
      clean = clean
        .replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '')
        .replace(/<\d{2}:\d{2}\.\d{2,3}>/g, '')
        .trim();
    }

    // Skip metadata headers like [ar: ...], [ti: ...]
    if (/^\[(ti|ar|al|by|offset|length):/i.test(rawLine.trim())) {
      continue;
    }

    if (clean) {
      result.push(clean);
      if (result.length >= 4) break;
    }
  }

  return result;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawTitle = url.searchParams.get('title') || '';
  const rawArtist = url.searchParams.get('artist') || '';
  const durationStr = url.searchParams.get('duration');

  const title = sanitizeQueryText(rawTitle);
  const artist = sanitizeQueryText(rawArtist);
  const duration = durationStr ? Math.round(parseFloat(durationStr)) : undefined;

  if (!title.trim()) {
    return NextResponse.json({ results: [] });
  }

  const searchUrls: string[] = [];

  // 1. Specific search with track_name & artist_name
  if (artist) {
    const u1 = new URL('https://lrclib.net/api/search');
    u1.searchParams.set('track_name', title);
    u1.searchParams.set('artist_name', artist);
    searchUrls.push(u1.toString());
  }

  // 2. Query search with "artist title"
  const u2 = new URL('https://lrclib.net/api/search');
  u2.searchParams.set('q', artist ? `${artist} ${title}` : title);
  searchUrls.push(u2.toString());

  // 3. Fallback search with title only
  const u3 = new URL('https://lrclib.net/api/search');
  u3.searchParams.set('q', title);
  searchUrls.push(u3.toString());

  const promises = searchUrls.map((u) => fetchLrclibJson<LRCLIBRecord[]>(u, 4500));
  const settled = await Promise.allSettled(promises);

  const seenIds = new Set<number>();
  const candidates: LRCLIBRecord[] = [];

  for (const res of settled) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      for (const rec of res.value) {
        if (rec && rec.id && !seenIds.has(rec.id)) {
          if (rec.syncedLyrics || rec.plainLyrics || rec.instrumental) {
            seenIds.add(rec.id);
            candidates.push(rec);
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Format, score, and rank candidates
  const evaluated: SearchCandidateItem[] = candidates.map((rec) => {
    const isWordSynced = !!(rec.syncedLyrics && /<\d{2}:\d{2}\.\d{2,3}>/.test(rec.syncedLyrics));
    const isLineSynced = !!(rec.syncedLyrics && /\[\d{2}:\d{2}\.\d{2,3}\]/.test(rec.syncedLyrics));

    let syncedType: 'word' | 'line' | 'plain' | 'instrumental' = 'plain';
    if (rec.instrumental) syncedType = 'instrumental';
    else if (isWordSynced) syncedType = 'word';
    else if (isLineSynced) syncedType = 'line';

    const hasSynced = syncedType === 'word' || syncedType === 'line';

    let diffSeconds: number | undefined = undefined;
    if (duration && duration > 0 && rec.duration && rec.duration > 0) {
      diffSeconds = Math.round(rec.duration - duration);
    }

    const titleSim = tokenSetRatio(rec.trackName || '', title);
    const artistSim = artist ? tokenSetRatio(rec.artistName || '', artist) : 0.8;
    const simScore = titleSim * 0.65 + artistSim * 0.35;

    let previewLines: string[] = [];
    if (rec.instrumental) {
      previewLines = ['[Instrumental Track - No Lyrics]'];
    } else if (rec.syncedLyrics) {
      previewLines = extractFirst4Lines(rec.syncedLyrics, true);
    } else if (rec.plainLyrics) {
      previewLines = extractFirst4Lines(rec.plainLyrics, false);
    }

    return {
      id: rec.id,
      trackName: rec.trackName,
      artistName: rec.artistName,
      albumName: rec.albumName,
      duration: rec.duration,
      diffSeconds,
      syncedType,
      syncedLyrics: rec.syncedLyrics,
      plainLyrics: rec.plainLyrics,
      instrumental: rec.instrumental,
      previewLines,
      score: Math.round(simScore * 100),
    };
  });

  // Sort by closeness:
  // 1. Synced with duration diff <= 5s
  // 2. High similarity score
  // 3. Smaller absolute duration diff
  // 4. Synced over plain
  evaluated.sort((a, b) => {
    const aAbsDiff = a.diffSeconds !== undefined ? Math.abs(a.diffSeconds) : 999;
    const bAbsDiff = b.diffSeconds !== undefined ? Math.abs(b.diffSeconds) : 999;

    const aIsSynced = a.syncedType === 'word' || a.syncedType === 'line';
    const bIsSynced = b.syncedType === 'word' || b.syncedType === 'line';

    // Strongly prioritize matches with both high similarity and close duration
    if (aIsSynced && !bIsSynced && aAbsDiff <= 8) return -1;
    if (bIsSynced && !aIsSynced && bAbsDiff <= 8) return 1;

    // High similarity difference (> 15%)
    if (Math.abs(a.score - b.score) > 15) {
      return b.score - a.score;
    }

    // Closer duration
    if (aAbsDiff !== bAbsDiff) {
      return aAbsDiff - bAbsDiff;
    }

    return b.score - a.score;
  });

  // Return up to 16 candidates
  return NextResponse.json({ results: evaluated.slice(0, 16) });
}
