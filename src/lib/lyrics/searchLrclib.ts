import { CandidatePair, normalizeString, tokenSetRatio } from './normalize';

export interface LRCLIBRecord {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

export interface RankedResult {
  record: LRCLIBRecord;
  score: number;
  tier: 1 | 2 | 3 | 4;
  durationMismatch: boolean;
  diffSeconds?: number;
}

// In-memory candidate list cache so re-ranking with a different duration doesn't refetch
const candidateListCache = new Map<string, { records: LRCLIBRecord[]; expiresAt: number }>();
const CANDIDATE_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

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

/**
 * Fetches and aggregates all candidate records from multiple LRCLIB queries,
 * caching the candidate list for fast re-ranking with different durations.
 */
export async function fetchAllLrclibCandidates(
  cand: CandidatePair,
  targetDuration?: number
): Promise<LRCLIBRecord[]> {
  const { artist, title } = cand;
  if (!title) return [];

  const cacheKey = `${normalizeString(artist)}::${normalizeString(title)}`;
  const cached = candidateListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.records;
  }

  const searchUrls: string[] = [];

  // 1. /api/get with artist, track, duration
  if (artist && targetDuration && targetDuration > 0) {
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('track_name', title);
    getUrl.searchParams.set('artist_name', artist);
    getUrl.searchParams.set('duration', targetDuration.toString());
    searchUrls.push(getUrl.toString());
  }

  // 2. /api/get without duration
  if (artist) {
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('track_name', title);
    getUrl.searchParams.set('artist_name', artist);
    searchUrls.push(getUrl.toString());
  }

  // 3. /api/search?track_name=...&artist_name=...
  if (artist) {
    const urlC = new URL('https://lrclib.net/api/search');
    urlC.searchParams.set('track_name', title);
    urlC.searchParams.set('artist_name', artist);
    searchUrls.push(urlC.toString());
  }

  // 4. /api/search?q="artist title"
  const urlD = new URL('https://lrclib.net/api/search');
  urlD.searchParams.set('q', artist ? `${artist} ${title}` : title);
  searchUrls.push(urlD.toString());

  // 5. /api/search?q="title" only
  const urlE = new URL('https://lrclib.net/api/search');
  urlE.searchParams.set('q', title);
  searchUrls.push(urlE.toString());

  // 6. Clean title stripped of punctuation
  const strippedTitle = title.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (strippedTitle && strippedTitle !== title) {
    const urlF = new URL('https://lrclib.net/api/search');
    urlF.searchParams.set('q', artist ? `${artist} ${strippedTitle}` : strippedTitle);
    searchUrls.push(urlF.toString());
  }

  // Execute in parallel
  const promises = searchUrls.map((u) => fetchLrclibJson<any>(u, 5500));
  const settled = await Promise.allSettled(promises);

  const seenIds = new Set<number>();
  const records: LRCLIBRecord[] = [];

  for (const res of settled) {
    if (res.status === 'fulfilled' && res.value) {
      const items: LRCLIBRecord[] = Array.isArray(res.value) ? res.value : [res.value];
      for (const rec of items) {
        if (rec && rec.id && !seenIds.has(rec.id)) {
          // Must have at least syncedLyrics, plainLyrics, or be instrumental
          if (rec.syncedLyrics || rec.plainLyrics || rec.instrumental) {
            seenIds.add(rec.id);
            records.push(rec);
          }
        }
      }
    }
  }

  if (records.length > 0) {
    candidateListCache.set(cacheKey, {
      records,
      expiresAt: Date.now() + CANDIDATE_CACHE_TTL_MS,
    });
  }

  return records;
}

/**
 * Duration-Aware Candidate Selection (Part B)
 * Tiers:
 * (1) Synced candidates with |duration diff| <= 3s
 * (2) Synced candidates with |duration diff| <= 8s
 * (3) Plain candidates with |duration diff| <= 8s
 * (4) Anything else
 * Within a tier: prefer higher title/artist similarity, then smaller duration diff.
 */
export function rankCandidates(
  records: LRCLIBRecord[],
  targetTitle: string,
  targetArtist: string,
  targetDuration?: number
): RankedResult | null {
  if (!records || records.length === 0) return null;

  interface EvaluatedCandidate {
    record: LRCLIBRecord;
    tier: 1 | 2 | 3 | 4;
    simScore: number;
    diff: number;
    hasSynced: boolean;
  }

  const evaluated: EvaluatedCandidate[] = [];

  for (const rec of records) {
    const titleSim = tokenSetRatio(rec.trackName || '', targetTitle);
    if (titleSim < 0.4) continue; // Reject clearly unrelated songs

    const artistSim = targetArtist ? tokenSetRatio(rec.artistName || '', targetArtist) : 0.85;
    const simScore = titleSim * 0.6 + artistSim * 0.4;

    const hasSynced = !!(rec.syncedLyrics && rec.syncedLyrics.trim());
    const hasPlain = !!(rec.plainLyrics && rec.plainLyrics.trim()) || rec.instrumental;

    const diff =
      targetDuration && targetDuration > 0 && rec.duration && rec.duration > 0
        ? Math.abs(rec.duration - targetDuration)
        : 999;

    let tier: 1 | 2 | 3 | 4;

    if (hasSynced && diff <= 3) {
      tier = 1;
    } else if (hasSynced && diff <= 8) {
      tier = 2;
    } else if (hasPlain && diff <= 8) {
      tier = 3;
    } else {
      tier = 4;
    }

    evaluated.push({
      record: rec,
      tier,
      simScore,
      diff,
      hasSynced,
    });
  }

  if (evaluated.length === 0) return null;

  // Sort by Tier first, then within tier:
  // Prefer higher similarity, breaking ties with smaller duration diff
  evaluated.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }

    // Within same tier:
    // If similarity difference is substantial (> 0.15), higher similarity wins
    const simDiff = Math.abs(a.simScore - b.simScore);
    if (simDiff > 0.15) {
      return b.simScore - a.simScore;
    }

    // Otherwise prefer closer duration match
    if (a.diff !== b.diff) {
      return a.diff - b.diff;
    }

    return b.simScore - a.simScore;
  });

  const best = evaluated[0];
  const rec = best.record;

  let durationMismatch = false;
  let diffSeconds: number | undefined = undefined;

  if (best.hasSynced && targetDuration && targetDuration > 0 && rec.duration && rec.duration > 0) {
    const rawDiff = targetDuration - rec.duration;
    if (Math.abs(rawDiff) > 8) {
      durationMismatch = true;
      diffSeconds = Math.round(rawDiff);
    }
  }

  return {
    record: rec,
    score: Math.round(best.simScore * 100),
    tier: best.tier,
    durationMismatch,
    diffSeconds,
  };
}

/**
 * Searches LRCLIB across candidate pairs and selects the best duration-aware candidate.
 */
export async function searchLrclibWithCandidates(
  candidates: CandidatePair[],
  targetDuration?: number
): Promise<RankedResult | null> {
  const allRecords: LRCLIBRecord[] = [];
  const seenIds = new Set<number>();

  for (const cand of candidates) {
    const records = await fetchAllLrclibCandidates(cand, targetDuration);
    for (const r of records) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allRecords.push(r);
      }
    }

    // If we already have records from the top candidate, rank them
    if (allRecords.length > 0) {
      const best = rankCandidates(allRecords, cand.title, cand.artist, targetDuration);
      // If Tier 1 or Tier 2 found, return immediately
      if (best && (best.tier === 1 || best.tier === 2)) {
        return best;
      }
    }
  }

  if (allRecords.length === 0) return null;

  const primaryCand = candidates[0];
  return rankCandidates(
    allRecords,
    primaryCand?.title || '',
    primaryCand?.artist || '',
    targetDuration
  );
}
