import { NextRequest, NextResponse } from 'next/server';
import { normalizeTrackCandidates, normalizeString, CandidatePair } from '@/lib/lyrics/normalize';
import { searchLrclibWithCandidates, RankedResult } from '@/lib/lyrics/searchLrclib';
import { fetchLyricsOvh } from '@/lib/lyrics/providers/lyricsOvh';
import { parseEnhancedLrc } from '@/lib/lyrics/parseEnhancedLrc';
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

  const expFlag = process.env.LYRICS_EXPERIMENTAL_PROVIDERS === 'true' ? 'exp1' : 'exp0';
  const posCacheKey = `pos:${expFlag}:${trackId || 'any'}:${normKeyArtist}::${normKeyTitle}`;
  const negCacheKey = `neg:${expFlag}:${normKeyArtist}::${normKeyTitle}`;

  // Helper: Try aligning plain lyrics with YouTube caption timing (experimental)
  const tryAlignWithCaptions = async (
    plainText: string,
    videoId: string,
    targetDuration?: number,
    tName?: string,
    aName?: string
  ): Promise<LyricsResult | null> => {
    if (process.env.LYRICS_EXPERIMENTAL_PROVIDERS !== 'true' || !videoId) {
      return null;
    }
    try {
      const { fetchYouTubeCaptionCues } = await import('@/lib/lyrics/providers/ytCaptions');
      const { alignPlainLyricsToCaptions } = await import('@/lib/lyrics/alignCaptions');

      const cues = await fetchYouTubeCaptionCues(videoId, targetDuration);
      if (!cues || cues.length === 0) return null;

      const aligned = alignPlainLyricsToCaptions(plainText, cues, targetDuration);
      if (!aligned || aligned.lines.length === 0) return null;

      console.debug(`[lyrics-lookup] Successfully aligned plain lyrics with YouTube captions for trackId ${videoId} (quality: ${aligned.qualityScore})`);
      return {
        source: 'plain + captions timing',
        synced: aligned.synced,
        lines: aligned.lines,
        plainLyrics: plainText,
        instrumental: false,
        trackName: tName,
        artistName: aName,
        matchedTitle: tName,
        matchedArtist: aName,
        durationMismatch: false,
      };
    } catch (err) {
      console.debug('[lyrics-lookup] Caption alignment failed or timed out:', err);
      return null;
    }
  };

  // Log diagnostic lookup details
  console.debug(`[lyrics-lookup] Query: rawTitle="${rawTitle}", rawArtist="${rawArtist}", duration=${duration}s, trackId="${trackId}", exp=${process.env.LYRICS_EXPERIMENTAL_PROVIDERS === 'true'}`);
  console.debug(`[lyrics-lookup] Generated ${candidates.length} candidates:`, candidates.map(c => `[${c.artist} - ${c.title} (conf: ${c.confidence.toFixed(2)})]`).join(', '));

  const attachSharedOffset = async (data: LyricsResult): Promise<LyricsResult> => {
    if (!trackId) return data;
    try {
      const { getSharedOffset } = await import('@/lib/lyrics/offsetRedis');
      const so = await getSharedOffset(trackId);
      if (so !== null && so !== undefined) {
        return { ...data, sharedOffset: so };
      }
    } catch {}
    return data;
  };

  // Bypass cache if requested
  if (bypassCache) {
    serverLyricsCache.delete(posCacheKey);
    serverLyricsCache.delete(negCacheKey);
  } else {
    // Check positive cache
    const cachedPos = serverLyricsCache.get(posCacheKey);
    if (cachedPos && cachedPos.expiresAt > Date.now()) {
      console.debug(`[lyrics-lookup] Positive cache hit for key: ${posCacheKey}`);
      const withOffset = await attachSharedOffset(cachedPos.data);
      return NextResponse.json(withOffset, { status: cachedPos.status });
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

        return NextResponse.json(await attachSharedOffset(instrumentalResult));
      }

      // Handle synced lyrics
      if (rec.syncedLyrics && rec.syncedLyrics.trim()) {
        const parsed = parseEnhancedLrc(rec.syncedLyrics, { songDuration: duration || rec.duration });

        const successResult: LyricsResult = {
          source: 'lrclib',
          synced: parsed.synced,
          lines: parsed.lines,
          plainLyrics: rec.plainLyrics || undefined,
          rawText: rec.syncedLyrics,
          instrumental: false,
          trackName: rec.trackName,
          artistName: rec.artistName,
          matchedTitle: rec.trackName,
          matchedArtist: rec.artistName,
          durationMismatch: lrclibMatch.durationMismatch,
          diffSeconds: lrclibMatch.diffSeconds,
        };

        serverLyricsCache.set(posCacheKey, {
          data: successResult,
          status: 200,
          expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
        });

        return NextResponse.json(await attachSharedOffset(successResult));
      }

      // Handle unsynced plain lyrics on LRCLIB
      if (rec.plainLyrics && rec.plainLyrics.trim()) {
        const plainText = rec.plainLyrics.trim();
        const alignedResult = await tryAlignWithCaptions(
          plainText,
          trackId,
          duration || rec.duration,
          rec.trackName,
          rec.artistName
        );

        const finalResult: LyricsResult = alignedResult || {
          source: 'lrclib',
          synced: 'none',
          lines: [],
          plainLyrics: plainText,
          instrumental: false,
          trackName: rec.trackName,
          artistName: rec.artistName,
          matchedTitle: rec.trackName,
          matchedArtist: rec.artistName,
          durationMismatch: lrclibMatch.durationMismatch,
          diffSeconds: lrclibMatch.diffSeconds,
        };

        serverLyricsCache.set(posCacheKey, {
          data: finalResult,
          status: 200,
          expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
        });

        return NextResponse.json(await attachSharedOffset(finalResult));
      }
    }

    // -------------------------------------------------------------
    // Step 2: Fallback to lyrics.ovh (Plain lyrics API)
    // Only query when normalized artist/title is confident (confidence >= 0.7)
    // -------------------------------------------------------------
    console.debug(`[lyrics-lookup] LRCLIB yielded no lyrics. Trying lyrics.ovh fallback across candidates...`);
    for (const cand of candidates.slice(0, 3)) {
      if (cand.confidence >= 0.7 && cand.artist.trim() && cand.title.trim()) {
        const ovhLyrics = await fetchLyricsOvh(cand.artist, cand.title);
        if (ovhLyrics) {
          console.debug(`[lyrics-lookup] lyrics.ovh hit for "${cand.artist}" - "${cand.title}"`);
          const alignedResult = await tryAlignWithCaptions(
            ovhLyrics,
            trackId,
            duration,
            cand.title,
            cand.artist
          );

          const finalResult: LyricsResult = alignedResult || {
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
            data: finalResult,
            status: 200,
            expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
          });

          return NextResponse.json(await attachSharedOffset(finalResult));
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
              return NextResponse.json(await attachSharedOffset(neteaseResult));
            }
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
        return NextResponse.json(await attachSharedOffset(communityMatch));
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
