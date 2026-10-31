/**
 * Robust Music Metadata Normalization Engine
 * Handles YouTube video titles, VEVO channels, featured artists, repeated artist patterns,
 * en-dashes, em-dashes, and regional Indian film/music title formats.
 */

export interface CandidatePair {
  artist: string;
  title: string;
  featuredArtists: string[];
  isLive: boolean;
  confidence: number; // 0 to 1.0 (higher = more confident)
}

// Common noise tags found in YouTube music titles
const BRACKETED_NOISE_REGEX =
  /(\(|\[|\{)\s*(?:official\s+(?:music\s+)?video|official\s+audio|official|lyric(?:s)?(?:\s+video)?|visualizer|audio|hd|hq|4k|remaster(?:ed)?(?:\s+\d{4})?|explicit|clean|full\s+song|with\s+lyrics|topic|prod(?:\.|\s+by)\s+[^)\]}]+|slowed(?:\s*\+?\s*reverb)?|speed\s*up)\s*(\)|\]|\})/gi;

const LIVE_REGEX = /(\(|\[|\{)\s*(?:live(?:\s+at|\s+version|\s+session|\s+performance)?)\s*(\)|\]|\})/gi;

const FEAT_REGEX = /(?:\(|\[|\{)?\s*\b(?:feat|ft|featuring)(?:\.|\b)\s+([^()\]}]+)(\)|\]|\})?/gi;

const TRAILING_NOISE_REGEX =
  /\s*(?:\||\/\/|-|–|—)\s*(?:official\s+(?:music\s+)?video|official\s+audio|lyrics?|visualizer|audio|hd|4k|hq|clean|explicit|slowed|reverb|prod(?:\.|\s+by)\s+[^|()\]}\-_–—]+).*$/gi;

const PROD_BY_REGEX = /\s*(?:\||\/\/|-|–|—)?\s*prod(?:\.|\s+by)\s+[^|()\]}\-_–—]+/gi;

/**
 * Splits CamelCase strings while preserving existing spaces.
 * e.g. "TheWeekndVEVO" -> "The Weeknd VEVO", "TravisScott" -> "Travis Scott"
 */
function splitCamelCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

/**
 * Normalizes channel / uploader names into clean artist candidates.
 * Strips VEVO, " - Topic", "Official", "Records", etc.
 */
export function cleanChannelName(rawChannel: string): string {
  if (!rawChannel) return '';

  let cleaned = rawChannel.trim();

  // 1. Remove " - Topic" appended by YouTube Music distributor feeds
  cleaned = cleaned.replace(/\s*-\s*Topic$/i, '');

  // 2. Remove common channel suffixes
  cleaned = cleaned.replace(
    /\s*(?:VEVO|Official(?:\s+Channel)?|Records|Entertainment|Music(?:\s+Channel)?|Channel)$/i,
    ''
  );

  // 3. Handle CamelCase VEVO/names like "TheWeeknd" or "TravisScott"
  cleaned = splitCamelCase(cleaned);

  // 4. Remove any remaining VEVO tags
  cleaned = cleaned.replace(/\bVEVO\b/gi, '').trim();

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Splits an artist string into distinct artists by commas, &, x, and.
 * e.g. "Hanumankind, Kalmi" -> ["Hanumankind", "Kalmi"]
 * e.g. "ROSÉ & Bruno Mars" -> ["ROSÉ", "Bruno Mars"]
 */
export function parseArtistList(artistStr: string): string[] {
  if (!artistStr) return [];
  return artistStr
    .split(/[,/&+]|\s+(?:and|x)\s+/i)
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

/**
 * Extracts featured artists from a string and returns the cleaned base string
 * plus an array of featured artist names.
 */
export function extractFeaturedArtists(input: string): { cleaned: string; featured: string[] } {
  const featured: string[] = [];
  let cleaned = input;

  // Extract from feat. / ft. patterns
  cleaned = cleaned.replace(FEAT_REGEX, (match, artists) => {
    if (artists) {
      const names = artists
        .split(/[,&+]|\s+(?:and|x)\s+/i)
        .map((n: string) => n.trim())
        .filter(Boolean);
      featured.push(...names);
    }
    return '';
  });

  return {
    cleaned: cleaned.replace(/\s+/g, ' ').trim(),
    featured,
  };
}

/**
 * Normalizes a text string by removing diacritics, punctuation, and extra whitespace.
 */
export function normalizeString(str: string): string {
  return (
    str
      // Decompose accents/diacritics: e.g. "ROSÉ" -> "ROSE"
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Token-Set Fuzzy Similarity Ratio (0.0 to 1.0)
 * Similar to RapidFuzz token_set_ratio: robust against word re-ordering,
 * duplicates, and subset titles.
 */
export function tokenSetRatio(s1: string, s2: string): number {
  const norm1 = normalizeString(s1);
  const norm2 = normalizeString(s2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  const set1 = new Set(norm1.split(/\s+/).filter(Boolean));
  const set2 = new Set(norm2.split(/\s+/).filter(Boolean));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  if (intersection.size === 0) return 0;

  // If one string's tokens are entirely contained within the other
  if (intersection.size === set1.size || intersection.size === set2.size) {
    const minSize = Math.min(set1.size, set2.size);
    const maxSize = Math.max(set1.size, set2.size);
    return Math.max(0.75, minSize / maxSize);
  }

  // Jaccard token set similarity
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

/**
 * Deduplicates featured artists so none repeat or duplicate primary artists.
 */
export function deduplicateArtists(primaryArtists: string[], featuredArtists: string[]): string[] {
  const normPrimary = new Set(primaryArtists.map((a) => normalizeString(a)));
  const result: string[] = [];
  const seenNorm = new Set<string>();

  for (const feat of featuredArtists) {
    const norm = normalizeString(feat);
    if (!norm || normPrimary.has(norm) || seenNorm.has(norm)) {
      continue;
    }
    // Discard if exact substring of a primary artist
    let isSubset = false;
    for (const p of normPrimary) {
      if (p.includes(norm) || norm.includes(p)) {
        isSubset = true;
        break;
      }
    }
    if (!isSubset) {
      seenNorm.add(norm);
      result.push(feat);
    }
  }

  return result;
}

/**
 * Clean base track title of parenthetical noise tags, video metadata, and producer credits.
 */
export function cleanTitleTags(rawTitle: string): { title: string; isLive: boolean } {
  let cleaned = rawTitle;
  let isLive = false;

  if (LIVE_REGEX.test(cleaned)) {
    isLive = true;
    cleaned = cleaned.replace(LIVE_REGEX, '');
  }

  // Remove trailing metadata like "| Official Music Video" or "- Official Video"
  cleaned = cleaned.replace(TRAILING_NOISE_REGEX, '');

  // Strip producer clauses: "| Prod. Kalmi", "Prod. by X"
  cleaned = cleaned.replace(PROD_BY_REGEX, '');

  // Remove bracketed noise: (Lyrics), [Official Video], (4K), etc.
  cleaned = cleaned.replace(BRACKETED_NOISE_REGEX, '');

  // Strip empty brackets left behind: (), [], {}
  cleaned = cleaned.replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, '');

  // Remove quotes and leading/trailing separators
  cleaned = cleaned.replace(/^["'“”‘’\s\-_–—|:]+|["'“”‘’\s\-_–—|:]+$/g, '').trim();

  return { title: cleaned, isLive };
}

/**
 * Checks if two segment strings refer to the same artist.
 * e.g. "Hanumankind, Kalmi" and "Hanumankind" -> true
 * e.g. "The Weeknd" and "The Weeknd" -> true
 */
function areArtistsEquivalent(a1: string, a2: string): boolean {
  const norm1 = normalizeString(a1);
  const norm2 = normalizeString(a2);
  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;
  if (tokenSetRatio(a1, a2) >= 0.7) return true;

  const list1 = parseArtistList(a1).map(normalizeString);
  const list2 = parseArtistList(a2).map(normalizeString);

  for (const item1 of list1) {
    if (list2.includes(item1)) return true;
  }
  return false;
}

/**
 * Core Normalizer: Takes raw title and optional artist/channel, and produces
 * an ordered list of candidate { artist, title } pairs from highest to lowest confidence.
 */
export function normalizeTrackCandidates(rawTitle: string, rawArtist?: string): CandidatePair[] {
  if (!rawTitle) return [];

  const candidates: CandidatePair[] = [];
  const cleanChannel = cleanChannelName(rawArtist || '');

  // 1. First clean noise tags and extract featured artists
  const { title: titleWithoutNoise, isLive } = cleanTitleTags(rawTitle);
  const { cleaned: baseTitle, featured: titleFeatured } = extractFeaturedArtists(titleWithoutNoise);
  const { cleaned: channelCleaned, featured: channelFeatured } = extractFeaturedArtists(cleanChannel);
  const rawFeatured = [...titleFeatured, ...channelFeatured];

  // 2. Check if title has pipes: e.g. "Karan Aujla - Tauba Tauba | Bad Newz | Vicky Kaushal"
  // or "Aavesham | Illuminati | Sushin Shyam | Dabzee"
  const pipeSegments = baseTitle
    .split(/\s*\|\s*/)
    .map((s) => cleanTitleTags(s).title)
    .filter(Boolean);

  const hasPipe = pipeSegments.length > 1;
  const firstPipeSeg = pipeSegments[0] || '';
  const hasHyphenInFirstPipeSeg = /\s+[-–—:]\s+/.test(firstPipeSeg);

  // If there's a hyphen/dash inside the first pipe segment, that segment is the primary "Artist - Title"
  // e.g. "Karan Aujla - Tauba Tauba" before "| Bad Newz | Vicky Kaushal"
  if (hasPipe && hasHyphenInFirstPipeSeg) {
    const dashMatch = firstPipeSeg.match(/\s+[-–—:]\s+/);
    if (dashMatch && dashMatch.index !== undefined) {
      const p1 = cleanTitleTags(firstPipeSeg.slice(0, dashMatch.index)).title;
      const p2 = cleanTitleTags(firstPipeSeg.slice(dashMatch.index + dashMatch[0].length)).title;

      const p1Artists = parseArtistList(p1);
      const cleanFeat = deduplicateArtists(p1Artists, [...rawFeatured, ...pipeSegments.slice(1)]);

      candidates.push({
        artist: p1,
        title: p2,
        featuredArtists: cleanFeat,
        isLive,
        confidence: 0.98,
      });

      candidates.push({
        artist: p2,
        title: p1,
        featuredArtists: cleanFeat,
        isLive,
        confidence: 0.65,
      });
    }
  }

  // 3. Multi-segment split across standard dash separators:
  // Hyphen "-", En Dash "–" (\u2013), Em Dash "—" (\u2014)
  // e.g. "Hanumankind, Kalmi - Hanumankind – Big Dawgs"
  const dashSegments = firstPipeSeg
    .split(/\s+[-–—:]\s+/)
    .map((s) => cleanTitleTags(s).title)
    .filter((s) => s.length > 0);

  // Check if any segment is a producer clause
  const nonProducerSegments: string[] = [];
  const extractedFeatured = [...rawFeatured];

  for (const seg of dashSegments) {
    if (/^prod(?:\.|\s+by)\s+/i.test(seg)) {
      const prodArtist = seg.replace(/^prod(?:\.|\s+by)\s+/i, '').trim();
      if (prodArtist) extractedFeatured.push(prodArtist);
    } else {
      nonProducerSegments.push(seg);
    }
  }

  // 4. Handle Repeated Artist Pattern ("Artist - Artist – Title")
  // e.g. ["Hanumankind, Kalmi", "Hanumankind", "Big Dawgs"]
  if (nonProducerSegments.length >= 3) {
    const seg0 = nonProducerSegments[0];
    const seg1 = nonProducerSegments[1];
    const segLast = nonProducerSegments[nonProducerSegments.length - 1];

    if (areArtistsEquivalent(seg0, seg1)) {
      const primaryArtists = parseArtistList(seg0);
      const cleanFeat = deduplicateArtists(primaryArtists, extractedFeatured);

      // Prefer full combined artist from seg0 with real title from segLast
      candidates.push({
        artist: seg0,
        title: segLast,
        featuredArtists: cleanFeat,
        isLive,
        confidence: 0.99,
      });

      // Also candidate with singular artist
      if (seg1 !== seg0) {
        candidates.push({
          artist: seg1,
          title: segLast,
          featuredArtists: cleanFeat,
          isLive,
          confidence: 0.94,
        });
      }
    }
  }

  // 5. Standard 2-segment split ("Artist - Title" or "Title - Artist")
  if (nonProducerSegments.length >= 2) {
    const part1 = nonProducerSegments[0];
    const part2 = nonProducerSegments[nonProducerSegments.length - 1];

    const p1Artists = parseArtistList(part1);
    const p2Artists = parseArtistList(part2);

    const cleanFeatP1 = deduplicateArtists(p1Artists, extractedFeatured);
    const cleanFeatP2 = deduplicateArtists(p2Artists, extractedFeatured);

    const p1MatchesChannel = cleanChannel && tokenSetRatio(part1, cleanChannel) > 0.6;
    const p2MatchesChannel = cleanChannel && tokenSetRatio(part2, cleanChannel) > 0.6;

    if (p1MatchesChannel) {
      // Confident: Part 1 is Artist, Part 2 is Title
      candidates.push({
        artist: part1,
        title: part2,
        featuredArtists: cleanFeatP1,
        isLive,
        confidence: 0.98,
      });
      candidates.push({
        artist: part2,
        title: part1,
        featuredArtists: cleanFeatP2,
        isLive,
        confidence: 0.65,
      });
    } else if (p2MatchesChannel) {
      // Confident: Part 2 is Artist, Part 1 is Title (Reverse)
      candidates.push({
        artist: part2,
        title: part1,
        featuredArtists: cleanFeatP2,
        isLive,
        confidence: 0.98,
      });
      candidates.push({
        artist: part1,
        title: part2,
        featuredArtists: cleanFeatP1,
        isLive,
        confidence: 0.65,
      });
    } else {
      // Standard: Part 1 = Artist, Part 2 = Title
      candidates.push({
        artist: part1,
        title: part2,
        featuredArtists: cleanFeatP1,
        isLive,
        confidence: 0.93,
      });
      // Reverse: Part 2 = Artist, Part 1 = Title
      candidates.push({
        artist: part2,
        title: part1,
        featuredArtists: cleanFeatP2,
        isLive,
        confidence: 0.75,
      });
    }
  }

  // 6. Pure Multi-pipe regional titles (e.g. "Aavesham | Illuminati | Sushin Shyam | Dabzee" or "Aasa Kooda | Sai Abhyankkar | ...")
  if (hasPipe && !hasHyphenInFirstPipeSeg && pipeSegments.length >= 2) {
    const seg0 = pipeSegments[0];
    const seg1 = pipeSegments[1];

    // Case A: Song | Artist (e.g. "Aasa Kooda | Sai Abhyankkar | The Route")
    const pArtistsSeg1 = parseArtistList(seg1);
    candidates.push({
      artist: seg1,
      title: seg0,
      featuredArtists: deduplicateArtists(pArtistsSeg1, [...extractedFeatured, ...pipeSegments.slice(2)]),
      isLive,
      confidence: 0.96,
    });

    // Case B: Movie | Song | Singers (e.g. "Aavesham | Illuminati | Sushin Shyam | Dabzee")
    if (pipeSegments.length >= 3) {
      const artists = pipeSegments.slice(2);
      const combinedArtists = artists.join(', ');
      const pArtistsCombined = parseArtistList(combinedArtists);

      candidates.push({
        artist: combinedArtists,
        title: seg1,
        featuredArtists: deduplicateArtists(pArtistsCombined, extractedFeatured),
        isLive,
        confidence: 0.95,
      });

      for (let aIdx = 0; aIdx < artists.length; aIdx++) {
        const art = artists[aIdx];
        const otherArtists = artists.filter((_, i) => i !== aIdx);

        // Pair with seg1 (song title: "Illuminati")
        candidates.push({
          artist: art,
          title: seg1,
          featuredArtists: deduplicateArtists(parseArtistList(art), [...extractedFeatured, ...otherArtists]),
          isLive,
          confidence: 0.93 - aIdx * 0.03,
        });

        // Pair with seg0 (alternate song title: "Chaleya | Jawan")
        candidates.push({
          artist: art,
          title: seg0,
          featuredArtists: deduplicateArtists(parseArtistList(art), [...extractedFeatured, ...otherArtists]),
          isLive,
          confidence: 0.91 - aIdx * 0.03,
        });
      }
    }
  }

  // 7. Channel-derived candidate
  if (cleanChannel && cleanChannel.length > 1) {
    const rawClean = cleanTitleTags(baseTitle.split('|')[0]).title;
    let titleWithoutChannel = rawClean;
    const channelLower = cleanChannel.toLowerCase();

    if (titleWithoutChannel.toLowerCase().startsWith(channelLower)) {
      titleWithoutChannel = titleWithoutChannel.slice(channelLower.length).replace(/^[\s\-_–—:]+/, '').trim();
    } else if (titleWithoutChannel.toLowerCase().endsWith(channelLower)) {
      titleWithoutChannel = titleWithoutChannel.slice(0, -channelLower.length).replace(/[\s\-_–—:]+$/, '').trim();
    }

    const cleanFeat = deduplicateArtists(parseArtistList(cleanChannel), extractedFeatured);

    if (titleWithoutChannel && titleWithoutChannel !== rawClean) {
      candidates.push({
        artist: cleanChannel,
        title: titleWithoutChannel,
        featuredArtists: cleanFeat,
        isLive,
        confidence: 0.89,
      });
    } else {
      candidates.push({
        artist: cleanChannel,
        title: rawClean,
        featuredArtists: cleanFeat,
        isLive,
        confidence: 0.72,
      });
    }
  }

  // 8. Raw fallback candidate
  const fallbackTitle = cleanTitleTags(baseTitle).title;
  if (fallbackTitle) {
    const cleanFeat = deduplicateArtists(parseArtistList(channelCleaned), extractedFeatured);
    candidates.push({
      artist: channelCleaned || '',
      title: fallbackTitle,
      featuredArtists: cleanFeat,
      isLive,
      confidence: 0.5,
    });
  }

  // 9. Deduplicate candidates by lowercase (artist + title) keeping highest confidence
  const seen = new Map<string, CandidatePair>();
  for (const cand of candidates) {
    const key = `${normalizeString(cand.artist)}::${normalizeString(cand.title)}`;
    if (!seen.has(key) || seen.get(key)!.confidence < cand.confidence) {
      seen.set(key, cand);
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Formats a clean "Artist – Title" string for the header display,
 * preventing duplicate featured artists and stripping video noise.
 */
export function formatCleanDisplayTrack(
  rawTitle: string,
  rawArtist?: string
): {
  cleanArtist: string;
  cleanTitle: string;
  displayHeader: string;
  featuredArtists: string[];
  rawTitle: string;
} {
  const candidates = normalizeTrackCandidates(rawTitle, rawArtist);
  const best = candidates[0] || {
    artist: rawArtist || '',
    title: rawTitle || '',
    featuredArtists: [],
  };

  const cleanArtist = best.artist.trim();
  const cleanTitle = best.title.trim();
  const featured = best.featuredArtists || [];

  let displayHeader = cleanArtist ? `${cleanArtist} – ${cleanTitle}` : cleanTitle;
  if (featured.length > 0) {
    const featStr = featured.join(', ');
    if (!displayHeader.toLowerCase().includes(featStr.toLowerCase())) {
      displayHeader += ` (feat. ${featStr})`;
    }
  }

  return {
    cleanArtist,
    cleanTitle,
    displayHeader,
    featuredArtists: featured,
    rawTitle,
  };
}
