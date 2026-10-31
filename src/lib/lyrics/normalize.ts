/**
 * Robust Music Metadata Normalization Engine
 * Handles YouTube video titles, VEVO channels, featured artists, and reverse artist-title splits.
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
  /\s*(?:\||\/\/|-)\s*(?:official\s+(?:music\s+)?video|official\s+audio|lyrics?|visualizer|audio|hd|4k|hq|clean|explicit|slowed|reverb).*$/gi;

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
        .split(/[,&]|\band\b/i)
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
 * Clean base track title of parenthetical noise tags and video metadata.
 */
export function cleanTitleTags(rawTitle: string): { title: string; isLive: boolean } {
  let cleaned = rawTitle;
  let isLive = false;

  if (LIVE_REGEX.test(cleaned)) {
    isLive = true;
    cleaned = cleaned.replace(LIVE_REGEX, '');
  }

  // Remove trailing metadata like "| Official Music Video"
  cleaned = cleaned.replace(TRAILING_NOISE_REGEX, '');

  // Remove bracketed noise: (Lyrics), [Official Video], (4K), etc.
  cleaned = cleaned.replace(BRACKETED_NOISE_REGEX, '');

  // Strip empty brackets left behind: (), [], {}
  cleaned = cleaned.replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, '');

  // Remove quotes and leading/trailing separators
  cleaned = cleaned.replace(/^["'“”‘’\s\-_|:]+|["'“”‘’\s\-_|:]+$/g, '').trim();

  return { title: cleaned, isLive };
}

/**
 * Core Normalizer: Takes raw title and optional artist/channel, and produces
 * an ordered list of candidate { artist, title } pairs from highest to lowest confidence.
 */
export function normalizeTrackCandidates(rawTitle: string, rawArtist?: string): CandidatePair[] {
  if (!rawTitle) return [];

  const candidates: CandidatePair[] = [];
  const cleanChannel = cleanChannelName(rawArtist || '');

  // 1. First extract featured artists and clean noise from raw title
  const { title: titleWithoutNoise, isLive } = cleanTitleTags(rawTitle);
  const { cleaned: baseTitle, featured: titleFeatured } = extractFeaturedArtists(titleWithoutNoise);
  const { cleaned: channelCleaned, featured: channelFeatured } = extractFeaturedArtists(cleanChannel);
  const allFeatured = Array.from(new Set([...titleFeatured, ...channelFeatured]));

  // 2. Check for standard separator patterns: "Artist - Title", "Title - Artist", "Artist: Title"
  const separatorMatch = baseTitle.match(/\s+[-–—:]\s+/);

  if (separatorMatch && separatorMatch.index !== undefined) {
    const part1 = baseTitle.slice(0, separatorMatch.index).trim();
    let part2 = baseTitle.slice(separatorMatch.index + separatorMatch[0].length).trim();

    if (part1 && part2) {
      // If part2 contains secondary pipes (e.g. "Big Dawgs | Kalmi" or "Tauba Tauba | Bad Newz | Vicky Kaushal")
      let secondaryFeatured = [...allFeatured];
      if (part2.includes('|')) {
        const p2Segments = part2.split('|').map((s) => s.trim()).filter(Boolean);
        part2 = p2Segments[0]; // e.g. "Big Dawgs" or "Tauba Tauba"
        secondaryFeatured.push(...p2Segments.slice(1));
      }

      const p1 = cleanTitleTags(part1).title;
      const p2 = cleanTitleTags(part2).title;

      const p1MatchesChannel = cleanChannel && tokenSetRatio(p1, cleanChannel) > 0.6;
      const p2MatchesChannel = cleanChannel && tokenSetRatio(p2, cleanChannel) > 0.6;

      if (p1MatchesChannel) {
        // Confident: "Artist - Title"
        candidates.push({
          artist: p1,
          title: p2,
          featuredArtists: Array.from(new Set(secondaryFeatured)),
          isLive,
          confidence: 0.98,
        });
        candidates.push({
          artist: p2,
          title: p1,
          featuredArtists: Array.from(new Set(secondaryFeatured)),
          isLive,
          confidence: 0.65,
        });
      } else if (p2MatchesChannel) {
        // Confident: "Title - Artist" (reverse)
        candidates.push({
          artist: p2,
          title: p1,
          featuredArtists: Array.from(new Set(secondaryFeatured)),
          isLive,
          confidence: 0.98,
        });
        candidates.push({
          artist: p1,
          title: p2,
          featuredArtists: Array.from(new Set(secondaryFeatured)),
          isLive,
          confidence: 0.65,
        });
      } else {
        // Standard: Part 1 = Artist, Part 2 = Title
        candidates.push({
          artist: p1,
          title: p2,
          featuredArtists: Array.from(new Set(secondaryFeatured)),
          isLive,
          confidence: 0.92,
        });
        // Reverse: Part 2 = Artist, Part 1 = Title
        candidates.push({
          artist: p2,
          title: p1,
          featuredArtists: Array.from(new Set(secondaryFeatured)),
          isLive,
          confidence: 0.75,
        });
      }
    }
  }

  // 3. Multi-pipe regional titles (e.g. "Aavesham | Illuminati | Sushin Shyam | Dabzee")
  if (baseTitle.includes('|') && !separatorMatch) {
    const rawSegments = baseTitle
      .split('|')
      .map((s) => cleanTitleTags(s.trim()).title)
      .filter((s) => s.length > 0);

    if (rawSegments.length >= 2) {
      const seg0 = rawSegments[0];
      const seg1 = rawSegments[1];
      const artists = rawSegments.slice(2);

      // In Indian tracks, composers/singers appear in segment 2 onwards:
      if (artists.length > 0) {
        for (let aIdx = 0; aIdx < artists.length; aIdx++) {
          const artistCandidate = artists[aIdx];
          const otherArtists = artists.filter((_, i) => i !== aIdx);

          // Pair with seg0 (primary song name: "Chaleya | Jawan")
          candidates.push({
            artist: artistCandidate,
            title: seg0,
            featuredArtists: Array.from(new Set([...allFeatured, ...otherArtists])),
            isLive,
            confidence: 0.96 - aIdx * 0.05,
          });

          // Pair with seg1 (alternate song name when seg0 is movie: "Aavesham | Illuminati")
          candidates.push({
            artist: artistCandidate,
            title: seg1,
            featuredArtists: Array.from(new Set([...allFeatured, ...otherArtists])),
            isLive,
            confidence: 0.93 - aIdx * 0.05,
          });
        }
      } else if (rawSegments.length === 2) {
        candidates.push({
          artist: seg1,
          title: seg0,
          featuredArtists: allFeatured,
          isLive,
          confidence: 0.88,
        });
        candidates.push({
          artist: seg0,
          title: seg1,
          featuredArtists: allFeatured,
          isLive,
          confidence: 0.85,
        });
      }
    }
  }

  // 4. Pair with clean channel if channel is informative
  if (cleanChannel && cleanChannel.length > 1) {
    const rawClean = cleanTitleTags(baseTitle.split('|')[0]).title;

    let titleWithoutChannel = rawClean;
    const channelLower = cleanChannel.toLowerCase();
    if (titleWithoutChannel.toLowerCase().startsWith(channelLower)) {
      titleWithoutChannel = titleWithoutChannel.slice(channelLower.length).replace(/^[\s\-_:]+/, '').trim();
    } else if (titleWithoutChannel.toLowerCase().endsWith(channelLower)) {
      titleWithoutChannel = titleWithoutChannel.slice(0, -channelLower.length).replace(/[\s\-_:]+$/, '').trim();
    }

    if (titleWithoutChannel && titleWithoutChannel !== rawClean) {
      candidates.push({
        artist: cleanChannel,
        title: titleWithoutChannel,
        featuredArtists: allFeatured,
        isLive,
        confidence: 0.88,
      });
    } else {
      candidates.push({
        artist: cleanChannel,
        title: rawClean,
        featuredArtists: allFeatured,
        isLive,
        confidence: 0.7,
      });
    }
  }

  // 5. Raw fallback pair (title without noise tags)
  const fallbackTitle = cleanTitleTags(baseTitle).title;
  if (fallbackTitle) {
    candidates.push({
      artist: channelCleaned || '',
      title: fallbackTitle,
      featuredArtists: allFeatured,
      isLive,
      confidence: 0.5,
    });
  }

  // 6. Deduplicate candidates by lowercase (artist + title) while keeping highest confidence
  const seen = new Map<string, CandidatePair>();
  for (const cand of candidates) {
    const key = `${normalizeString(cand.artist)}::${normalizeString(cand.title)}`;
    if (!seen.has(key) || seen.get(key)!.confidence < cand.confidence) {
      seen.set(key, cand);
    }
  }

  // Sort by confidence descending
  return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
}
