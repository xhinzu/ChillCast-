import { NextRequest, NextResponse } from 'next/server';
import { normalizeTrackCandidates, normalizeString, CandidatePair } from '@/lib/lyrics/normalize';
import { searchLrclibWithCandidates, RankedResult } from '@/lib/lyrics/searchLrclib';
import { fetchLyricsOvh } from '@/lib/lyrics/providers/lyricsOvh';
import { parseLrc } from '@/lib/lyrics/parseLrc';
import { deriveWordTimingsFromLrc } from '@/lib/lyrics/wordTiming';
import { LyricsResult } from '@/lib/lyrics/providers/types';

// In-memory server-side cache
interface CacheEntry {
  data: LyricsResult;
  status: number;
  expiresAt: number;
}

const serverLyricsCache = new Map<string, CacheEntry>();
const POSITIVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for successful lyrics
const NEGATIVE_CACHE_TTL_MS = 10 * 60 * 1000;          // 10 minutes max for not-found

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawTitle = url.searchParams.get('title') || '';
  const rawArtist = url.searchParams.get('artist') || '';
  const manualTitle = url.searchParams.get('manualTitle') || '';
  const manualArtist = url.searchParams.get('manualArtist') || '';
  const durationStr = url.searchParams.get('duration');
  const trackId = url.searchParams.get('id') || '';
  const bypassCache = url.searchParams.get('bypassCache') === 'true';

  if (!rawTitle.trim() && !manualTitle.trim()) {
    return NextResponse.json({ error: 'Title parameter is required' }, { status: 400 });
  }

  const duration = durationStr ? Math.round(parseFloat(durationStr)) : undefined;

  // Generate candidates using metadata normalization engine
  const candidates: CandidatePair[] = normalizeTrackCandidates(rawTitle, rawArtist);

  // If manual override was supplied, give it top priority
  if (manualTitle.trim()) {
    candidates.unshift({
      artist: manualArtist.trim(),
      title: manualTitle.trim(),
      featuredArtists: [],
      isLive: false,
      confidence: 1.0,
    });
  }

  const primaryCandidate = candidates[0] || { artist: rawArtist, title: rawTitle };
  const normKeyArtist = normalizeString(primaryCandidate.artist);
  const normKeyTitle = normalizeString(primaryCandidate.title);

  const posCacheKey = `pos:${trackId || 'any'}:${normKeyArtist}::${normKeyTitle}`;
  const negCacheKey = `neg:${normKeyArtist}::${normKeyTitle}`;

  // Log diagnostic lookup details
  console.debug(`[lyrics-lookup] Query: rawTitle="${rawTitle}", rawArtist="${rawArtist}", duration=${duration}s, trackId="${trackId}"`);
  console.debug(`[lyrics-lookup] Generated ${candidates.length} candidates:`, candidates.map(c => `[${c.artist} - ${c.title} (conf: ${c.confidence.toFixed(2)})]`).join(', '));

  // Bypass cache if requested
  if (bypassCache) {
    serverLyricsCache.delete(posCacheKey);
    serverLyricsCache.delete(negCacheKey);
  } else {
    // Check positive cache
    const cachedPos = serverLyricsCache.get(posCacheKey);
    if (cachedPos && cachedPos.expiresAt > Date.now()) {
      console.debug(`[lyrics-lookup] Positive cache hit for key: ${posCacheKey}`);
      return NextResponse.json(cachedPos.data, { status: cachedPos.status });
    }

    // Check negative cache (<= 10 mins)
    const cachedNeg = serverLyricsCache.get(negCacheKey);
    if (cachedNeg && cachedNeg.expiresAt > Date.now()) {
      console.debug(`[lyrics-lookup] Negative cache hit (<10m) for key: ${negCacheKey}`);
      return NextResponse.json(cachedNeg.data, { status: cachedNeg.status });
    }
  }

  try {
    // -------------------------------------------------------------
    // Step 1: Multi-candidate search across LRCLIB (with 6-step fallback ladder)
    // -------------------------------------------------------------
    const lrclibMatch: RankedResult | null = await searchLrclibWithCandidates(candidates, duration);

    if (lrclibMatch) {
      const rec = lrclibMatch.record;
      console.debug(`[lyrics-lookup] LRCLIB matched: "${rec.artistName}" - "${rec.trackName}" (score: ${lrclibMatch.score}, durationMismatch: ${lrclibMatch.durationMismatch})`);

      // Handle instrumental
      if (rec.instrumental) {
        const instrumentalResult: LyricsResult = {
          source: 'lrclib',
          synced: 'none',
          lines: [],
          instrumental: true,
          trackName: rec.trackName,
          artistName: rec.artistName,
          matchedTitle: rec.trackName,
          matchedArtist: rec.artistName,
          durationMismatch: lrclibMatch.durationMismatch,
        };

        serverLyricsCache.set(posCacheKey, {
          data: instrumentalResult,
          status: 200,
          expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
        });

        return NextResponse.json(instrumentalResult);
      }

      // Handle synced lyrics
      if (rec.syncedLyrics && rec.syncedLyrics.trim()) {
        const parsedLines = parseLrc(rec.syncedLyrics);
        const derivedLines = deriveWordTimingsFromLrc(parsedLines, duration || rec.duration);

        const successResult: LyricsResult = {
          source: 'lrclib',
          synced: 'line',
          lines: derivedLines,
          plainLyrics: rec.plainLyrics || undefined,
          instrumental: false,
          trackName: rec.trackName,
          artistName: rec.artistName,
          matchedTitle: rec.trackName,
          matchedArtist: rec.artistName,
          durationMismatch: lrclibMatch.durationMismatch,
        };

        serverLyricsCache.set(posCacheKey, {
          data: successResult,
          status: 200,
          expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
        });

        return NextResponse.json(successResult);
      }

      // Handle unsynced plain lyrics on LRCLIB
      if (rec.plainLyrics && rec.plainLyrics.trim()) {
        const plainResult: LyricsResult = {
          source: 'lrclib',
          synced: 'none',
          lines: [],
          plainLyrics: rec.plainLyrics.trim(),
          instrumental: false,
          trackName: rec.trackName,
          artistName: rec.artistName,
          matchedTitle: rec.trackName,
          matchedArtist: rec.artistName,
          durationMismatch: lrclibMatch.durationMismatch,
        };

        serverLyricsCache.set(posCacheKey, {
          data: plainResult,
          status: 200,
          expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
        });

        return NextResponse.json(plainResult);
      }
    }

    // -------------------------------------------------------------
    // Step 2: Fallback to lyrics.ovh (Plain lyrics API)
    // -------------------------------------------------------------
    console.debug(`[lyrics-lookup] LRCLIB yielded no lyrics. Trying lyrics.ovh fallback across candidates...`);
    for (const cand of candidates.slice(0, 3)) {
      if (cand.artist && cand.title) {
        const ovhLyrics = await fetchLyricsOvh(cand.artist, cand.title);
        if (ovhLyrics) {
          console.debug(`[lyrics-lookup] lyrics.ovh hit for "${cand.artist}" - "${cand.title}"`);
          const ovhResult: LyricsResult = {
            source: 'lyrics.ovh',
            synced: 'none',
            lines: [],
            plainLyrics: ovhLyrics,
            instrumental: false,
            trackName: cand.title,
            artistName: cand.artist,
            matchedTitle: cand.title,
            matchedArtist: cand.artist,
            durationMismatch: false,
          };

          serverLyricsCache.set(posCacheKey, {
            data: ovhResult,
            status: 200,
            expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
          });

          return NextResponse.json(ovhResult);
        }
      }
    }

    // -------------------------------------------------------------
    // Step 3: Experimental Providers (if enabled via flag)
    // -------------------------------------------------------------
    if (process.env.LYRICS_EXPERIMENTAL_PROVIDERS === 'true') {
      try {
        const { fetchNetEaseLyrics } = await import('@/lib/lyrics/providers/netease');
        for (const cand of candidates.slice(0, 2)) {
          if (cand.title) {
            const neteaseResult = await fetchNetEaseLyrics(cand.title, cand.artist, duration);
            if (neteaseResult && (neteaseResult.lines.length > 0 || neteaseResult.plainLyrics)) {
              console.debug(`[lyrics-lookup] NetEase experimental provider hit for "${cand.title}"`);
              serverLyricsCache.set(posCacheKey, {
                data: neteaseResult,
                status: 200,
                expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
              });
              return NextResponse.json(neteaseResult);
            }
          }
        }
      } catch {
        // Experimental provider error ignored
      }

      try {
        if (trackId) {
          const { fetchYouTubeCaptions } = await import('@/lib/lyrics/providers/youtubeCaptions');
          const ytResult = await fetchYouTubeCaptions(trackId);
          if (ytResult && ytResult.lines.length > 0) {
            console.debug(`[lyrics-lookup] YouTube captions provider hit for trackId ${trackId}`);
            serverLyricsCache.set(posCacheKey, {
              data: ytResult,
              status: 200,
              expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
            });
            return NextResponse.json(ytResult);
          }
        }
      } catch {
        // Experimental provider error ignored
      }
    }

    // -------------------------------------------------------------
    // Step 4: Check Community Lyrics (Upstash Redis)
    // -------------------------------------------------------------
    try {
      const { getCommunityLyrics } = await import('@/lib/lyrics/communityRedis');
      const communityMatch = await getCommunityLyrics(trackId, primaryCandidate.artist, primaryCandidate.title);
      if (communityMatch && (communityMatch.lines.length > 0 || communityMatch.plainLyrics)) {
        console.debug(`[lyrics-lookup] Community lyrics hit for trackId ${trackId}`);
        serverLyricsCache.set(posCacheKey, {
          data: communityMatch,
          status: 200,
          expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
        });
        return NextResponse.json(communityMatch);
      }
    } catch {
      // ignore
    }

    // -------------------------------------------------------------
    // Step 5: No matching lyrics found across any provider
    // -------------------------------------------------------------
    console.debug(`[lyrics-lookup] No lyrics found for "${rawTitle}". Setting negative cache for 10 min.`);
    const notFoundResult: LyricsResult = {
      source: 'none',
      synced: 'none',
      lines: [],
      plainLyrics: undefined,
      instrumental: false,
      error: 'No matching lyrics found on LRCLIB or fallbacks',
    };

    serverLyricsCache.set(negCacheKey, {
      data: notFoundResult,
      status: 404,
      expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS,
    });

    return NextResponse.json(notFoundResult, { status: 404 });
  } catch (err) {
    console.error('Error in /api/lyrics route handler:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Server error processing lyrics' },
      { status: 500 }
    );
  }
}
