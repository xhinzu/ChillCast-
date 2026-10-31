import { NextRequest, NextResponse } from 'next/server';
import { cleanArtistForLyrics, cleanTitleForLyrics } from '@/lib/lyrics/cleanTitle';
import { parseLrc } from '@/lib/lyrics/parseLrc';
import { deriveWordTimingsFromLrc } from '@/lib/lyrics/wordTiming';
import { LyricsResult } from '@/lib/lyrics/providers/types';

interface LRCLIBRecord {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

// In-memory server-side cache
interface CacheEntry {
  data: LyricsResult;
  status: number;
  expiresAt: number;
}

const serverLyricsCache = new Map<string, CacheEntry>();
const POSITIVE_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000;      // 5 minutes for 404s

function stringSimilarity(s1: string, s2: string): number {
  const norm1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const norm2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;

  // Simple token matching
  const words1 = new Set(s1.toLowerCase().split(/\s+/).filter(Boolean));
  const words2 = new Set(s2.toLowerCase().split(/\s+/).filter(Boolean));
  let overlap = 0;
  for (const w of words1) {
    if (words2.has(w)) overlap++;
  }
  return overlap / Math.max(words1.size, words2.size);
}

function scoreCandidate(candidate: LRCLIBRecord, targetTitle: string, targetArtist: string, targetDuration?: number): number {
  let score = 0;

  // Title similarity
  const titleSim = stringSimilarity(candidate.trackName || '', targetTitle);
  score += titleSim * 50;

  // Artist similarity (if artist provided)
  if (targetArtist && candidate.artistName) {
    const artistSim = stringSimilarity(candidate.artistName, targetArtist);
    score += artistSim * 30;
  }

  // Duration proximity (within ~5s is a strong match)
  if (targetDuration && targetDuration > 0 && candidate.duration && candidate.duration > 0) {
    const diff = Math.abs(candidate.duration - targetDuration);
    if (diff <= 3) score += 20;
    else if (diff <= 6) score += 12;
    else if (diff <= 12) score += 5;
    else score -= 10;
  }

  // Bonus if synced lyrics are available
  if (candidate.syncedLyrics) score += 15;

  return score;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawTitle = url.searchParams.get('title') || '';
  const rawArtist = url.searchParams.get('artist') || '';
  const durationStr = url.searchParams.get('duration');
  const trackId = url.searchParams.get('id') || '';

  if (!rawTitle.trim()) {
    return NextResponse.json({ error: 'Title parameter is required' }, { status: 400 });
  }

  const cleanTitle = cleanTitleForLyrics(rawTitle);
  const cleanArtist = cleanArtistForLyrics(rawArtist);
  const duration = durationStr ? Math.round(parseFloat(durationStr)) : undefined;

  const cacheKey = `${trackId}:${cleanTitle.toLowerCase()}:${cleanArtist.toLowerCase()}:${duration || 0}`;

  // Check in-memory cache
  const cached = serverLyricsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, { status: cached.status });
  }

  try {
    let chosenRecord: LRCLIBRecord | null = null;

    // 1. Attempt exact lookup on LRCLIB /api/get
    try {
      const getUrl = new URL('https://lrclib.net/api/get');
      getUrl.searchParams.set('track_name', cleanTitle);
      if (cleanArtist) getUrl.searchParams.set('artist_name', cleanArtist);
      if (duration && duration > 0) getUrl.searchParams.set('duration', duration.toString());

      const getRes = await fetch(getUrl.toString(), {
        headers: {
          'User-Agent': 'Chillify/2.0 (https://github.com/chillcast)',
        },
        signal: AbortSignal.timeout(4500),
      });

      if (getRes.ok) {
        chosenRecord = (await getRes.json()) as LRCLIBRecord;
      }
    } catch (err) {
      // Proceed to fallback search
    }

    // 2. If 404 or missing, fall back to /api/search and pick the best candidate
    if (!chosenRecord) {
      try {
        const searchUrl = new URL('https://lrclib.net/api/search');
        const query = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
        searchUrl.searchParams.set('q', query);

        const searchRes = await fetch(searchUrl.toString(), {
          headers: {
            'User-Agent': 'Chillify/2.0 (https://github.com/chillcast)',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (searchRes.ok) {
          const candidates = (await searchRes.json()) as LRCLIBRecord[];
          if (Array.isArray(candidates) && candidates.length > 0) {
            // Rank candidates by title/artist similarity and ~5s duration proximity
            let bestScore = -1;
            let bestCandidate: LRCLIBRecord | null = null;

            for (const cand of candidates) {
              const sc = scoreCandidate(cand, cleanTitle, cleanArtist, duration);
              if (sc > bestScore) {
                bestScore = sc;
                bestCandidate = cand;
              }
            }

            // Only accept if score threshold meets basic relevance
            if (bestCandidate && bestScore >= 25) {
              chosenRecord = bestCandidate;
            }
          }
        }
      } catch (err) {
        // Search timeout or network error
      }
    }

    // 3. Process candidate or produce not-found
    if (!chosenRecord) {
      const notFoundResult: LyricsResult = {
        source: 'lrclib',
        synced: 'none',
        lines: [],
        plainLyrics: undefined,
        instrumental: false,
        error: 'No matching lyrics found on LRCLIB',
      };

      serverLyricsCache.set(cacheKey, {
        data: notFoundResult,
        status: 404,
        expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS,
      });

      return NextResponse.json(notFoundResult, { status: 404 });
    }

    // Handle instrumental
    if (chosenRecord.instrumental) {
      const instrumentalResult: LyricsResult = {
        source: 'lrclib',
        synced: 'none',
        lines: [],
        instrumental: true,
        trackName: chosenRecord.trackName,
        artistName: chosenRecord.artistName,
      };

      serverLyricsCache.set(cacheKey, {
        data: instrumentalResult,
        status: 200,
        expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
      });

      return NextResponse.json(instrumentalResult);
    }

    // Handle synced lyrics
    if (chosenRecord.syncedLyrics && chosenRecord.syncedLyrics.trim()) {
      const parsedLines = parseLrc(chosenRecord.syncedLyrics);
      const derivedLines = deriveWordTimingsFromLrc(parsedLines, duration || chosenRecord.duration);

      const successResult: LyricsResult = {
        source: 'lrclib',
        synced: 'line',
        lines: derivedLines,
        plainLyrics: chosenRecord.plainLyrics || undefined,
        instrumental: false,
        trackName: chosenRecord.trackName,
        artistName: chosenRecord.artistName,
      };

      serverLyricsCache.set(cacheKey, {
        data: successResult,
        status: 200,
        expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
      });

      return NextResponse.json(successResult);
    }

    // Handle unsynced plain lyrics fallback
    if (chosenRecord.plainLyrics && chosenRecord.plainLyrics.trim()) {
      const plainResult: LyricsResult = {
        source: 'lrclib',
        synced: 'none',
        lines: [],
        plainLyrics: chosenRecord.plainLyrics.trim(),
        instrumental: false,
        trackName: chosenRecord.trackName,
        artistName: chosenRecord.artistName,
      };

      serverLyricsCache.set(cacheKey, {
        data: plainResult,
        status: 200,
        expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
      });

      return NextResponse.json(plainResult);
    }

    // Final fallback if record is empty
    const emptyResult: LyricsResult = {
      source: 'lrclib',
      synced: 'none',
      lines: [],
      error: 'Empty lyric record',
    };

    serverLyricsCache.set(cacheKey, {
      data: emptyResult,
      status: 404,
      expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS,
    });

    return NextResponse.json(emptyResult, { status: 404 });
  } catch (err) {
    console.error('Error in /api/lyrics route handler:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Server error processing lyrics' },
      { status: 500 }
    );
  }
}
