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
  durationMismatch: boolean;
}

/**
 * Robust fuzzy scoring function for LRCLIB candidates:
 * - Token-set ratio for title and artist
 * - Duration proximity bonus/penalty
 * - Synced lyrics bonus
 * - Duration mismatch flag for discrepancies > 15s
 */
export function scoreCandidate(
  cand: LRCLIBRecord,
  targetTitle: string,
  targetArtist: string,
  targetDuration?: number
): { score: number; durationMismatch: boolean } {
  const titleSim = tokenSetRatio(cand.trackName || '', targetTitle);
  // If targetArtist is not provided, don't penalize
  const artistSim = targetArtist ? tokenSetRatio(cand.artistName || '', targetArtist) : 0.85;

  // Reject immediately if title similarity is clearly low
  if (titleSim < 0.45) {
    return { score: -1, durationMismatch: false };
  }

  let score = titleSim * 50 + artistSim * 30;

  // Prefer synced lyrics over plain
  if (cand.syncedLyrics && cand.syncedLyrics.trim()) {
    score += 15;
  } else if (cand.plainLyrics && cand.plainLyrics.trim()) {
    score += 5;
  }

  let durationMismatch = false;

  // Duration proximity scoring
  if (targetDuration && targetDuration > 0 && cand.duration && cand.duration > 0) {
    const diff = Math.abs(cand.duration - targetDuration);
    if (diff <= 3) {
      score += 15;
    } else if (diff <= 6) {
      score += 10;
    } else if (diff <= 10) {
      score += 5;
    } else if (diff <= 15) {
      score -= 5;
    } else {
      // Discrepancy > 15s: penalize score and flag for UI
      score -= 15;
      durationMismatch = true;
    }
  }

  return { score, durationMismatch };
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

/**
 * Searches LRCLIB for a single candidate pair using the 6-step fallback ladder:
 * a. /api/get with artist_name, track_name, duration
 * b. /api/get without duration
 * c. /api/search?track_name=...&artist_name=...
 * d. /api/search?q="artist title"
 * e. /api/search?q="title" only (then rank by artist similarity)
 * f. Retry with title stripped of punctuation and brackets
 */
export async function searchLrclibForCandidate(
  cand: CandidatePair,
  targetDuration?: number
): Promise<RankedResult | null> {
  const { artist, title } = cand;
  if (!title) return null;

  // --- Step a: /api/get with duration ---
  if (artist && targetDuration && targetDuration > 0) {
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('track_name', title);
    getUrl.searchParams.set('artist_name', artist);
    getUrl.searchParams.set('duration', targetDuration.toString());

    const rec = await fetchLrclibJson<LRCLIBRecord>(getUrl.toString(), 3500);
    if (rec && (rec.syncedLyrics || rec.plainLyrics || rec.instrumental)) {
      const { score, durationMismatch } = scoreCandidate(rec, title, artist, targetDuration);
      if (score >= 35) {
        return { record: rec, score, durationMismatch };
      }
    }
  }

  // --- Step b: /api/get without duration ---
  if (artist) {
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('track_name', title);
    getUrl.searchParams.set('artist_name', artist);

    const rec = await fetchLrclibJson<LRCLIBRecord>(getUrl.toString(), 3500);
    if (rec && (rec.syncedLyrics || rec.plainLyrics || rec.instrumental)) {
      const { score, durationMismatch } = scoreCandidate(rec, title, artist, targetDuration);
      if (score >= 35) {
        return { record: rec, score, durationMismatch };
      }
    }
  }

  // --- Steps c, d, e in parallel search ---
  const searchUrls: string[] = [];

  // c. track_name & artist_name
  if (artist) {
    const urlC = new URL('https://lrclib.net/api/search');
    urlC.searchParams.set('track_name', title);
    urlC.searchParams.set('artist_name', artist);
    searchUrls.push(urlC.toString());
  }

  // d. q="artist title"
  const urlD = new URL('https://lrclib.net/api/search');
  urlD.searchParams.set('q', artist ? `${artist} ${title}` : title);
  searchUrls.push(urlD.toString());

  // e. q="title" only
  const urlE = new URL('https://lrclib.net/api/search');
  urlE.searchParams.set('q', title);
  searchUrls.push(urlE.toString());

  // f. Clean title stripped of all punctuation and brackets
  const strippedTitle = title.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (strippedTitle && strippedTitle !== title) {
    const urlF = new URL('https://lrclib.net/api/search');
    urlF.searchParams.set('q', artist ? `${artist} ${strippedTitle}` : strippedTitle);
    searchUrls.push(urlF.toString());
  }

  // Execute search queries in parallel with a hard 5.5s timeout
  const searchPromises = searchUrls.map((u) => fetchLrclibJson<LRCLIBRecord[]>(u, 5500));
  const settled = await Promise.allSettled(searchPromises);

  const allRecords: LRCLIBRecord[] = [];
  const seenIds = new Set<number>();

  for (const res of settled) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      for (const rec of res.value) {
        if (rec && rec.id && !seenIds.has(rec.id)) {
          seenIds.add(rec.id);
          allRecords.push(rec);
        }
      }
    }
  }

  if (allRecords.length === 0) return null;

  // Rank all candidates by fuzzy score
  let bestRank: RankedResult | null = null;

  for (const rec of allRecords) {
    // Must have at least syncedLyrics, plainLyrics, or be instrumental
    if (!rec.syncedLyrics && !rec.plainLyrics && !rec.instrumental) continue;

    const { score, durationMismatch } = scoreCandidate(rec, title, artist, targetDuration);

    if (score < 25) continue; // Reject low relevance

    if (!bestRank || score > bestRank.score) {
      bestRank = { record: rec, score, durationMismatch };
    } else if (score === bestRank.score && targetDuration && rec.duration && bestRank.record.duration) {
      // Tie breaker: prefer closer duration
      const diffCur = Math.abs(rec.duration - targetDuration);
      const diffBest = Math.abs(bestRank.record.duration - targetDuration);
      if (diffCur < diffBest) {
        bestRank = { record: rec, score, durationMismatch };
      }
    }
  }

  return bestRank;
}

/**
 * Searches LRCLIB sequentially across candidate pairs, stopping at the first good match.
 */
export async function searchLrclibWithCandidates(
  candidates: CandidatePair[],
  targetDuration?: number
): Promise<RankedResult | null> {
  for (const cand of candidates) {
    const match = await searchLrclibForCandidate(cand, targetDuration);
    if (match && match.score >= 30) {
      return match;
    }
  }
  return null;
}
