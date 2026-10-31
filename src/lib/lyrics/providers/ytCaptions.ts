/**
 * YouTube Caption Timing Provider (Experimental, default OFF)
 *
 * RULES & REQUIREMENTS:
 * - Server-side only.
 * - Captions are used ONLY as a timing source, NEVER displayed as lyrics text to users.
 * - Prefer manual tracks, then auto-generated.
 * - Return word-level timings when available, otherwise line-level.
 * - Cache hits: 7 days. Cache misses: 10 minutes.
 * - Ignore tracks that are mostly "[Music]" / sound effect tags or cover < 40% of duration.
 * - Fail silently: any error or timeout (4s) returns null.
 */

export interface CaptionCueWord {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface CaptionTiming {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
  words?: CaptionCueWord[];
}

interface CaptionTrackInfo {
  baseUrl: string;
  name?: { simpleText?: string };
  vssId?: string;
  languageCode?: string;
  kind?: string; // 'asr' indicates automatic speech recognition
}

// In-memory server cache: 7 days hits, 10 minutes misses
interface CacheEntry {
  data: CaptionTiming[] | null;
  expiresAt: number;
}

const captionCache = new Map<string, CacheEntry>();
const POSITIVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const NEGATIVE_CACHE_TTL_MS = 10 * 60 * 1000;          // 10 minutes

/**
 * Checks if a text segment is a sound-effect tag such as [Music], (Music), [Applause], ♪, etc.
 */
export function isSoundEffectTag(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/^[♪♫\s]+$/.test(trimmed)) return true;

  if (/^\[[\s\S]*\]$/.test(trimmed) || /^\([\s\S]*\)$/.test(trimmed)) {
    const inner = trimmed.slice(1, -1).trim().toLowerCase();
    if (
      /music|applause|cheer|laughter|laugh|gasp|sigh|groan|scream|screaming|beatbox|whistling|singing|instrumental|intro|outro|sound effect/i.test(
        inner
      ) ||
      inner.length === 0
    ) {
      return true;
    }
  }

  // Pure tag without brackets
  const lower = trimmed.toLowerCase();
  if (lower === 'music' || lower === 'applause' || lower === 'laughter' || lower === '[music]' || lower === '(music)') {
    return true;
  }

  return false;
}

/**
 * Checks if caption track is mostly sound effects / noise tags.
 * Rejects tracks where >= 60% of cues are sound effects or fewer than 5 speech words exist.
 */
export function isMostlySoundEffects(cues: CaptionTiming[]): boolean {
  if (!cues || cues.length === 0) return true;

  let soundEffectCount = 0;
  let speechWordCount = 0;

  for (const cue of cues) {
    if (isSoundEffectTag(cue.text)) {
      soundEffectCount++;
    } else {
      const words = cue.text
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0 && !isSoundEffectTag(w));
      speechWordCount += words.length;
    }
  }

  const soundEffectRatio = soundEffectCount / cues.length;
  if (soundEffectRatio >= 0.6 || speechWordCount < 5) {
    return true;
  }

  return false;
}

/**
 * Rejects caption tracks that cover less than 40% of the song's duration.
 */
export function hasInsufficientDuration(cues: CaptionTiming[], songDuration?: number): boolean {
  if (!cues || cues.length === 0) return true;
  if (!songDuration || songDuration <= 15) return false;

  const validCues = cues.filter((c) => !isSoundEffectTag(c.text));
  if (validCues.length === 0) return true;

  const firstStart = validCues[0].start;
  const lastEnd = validCues[validCues.length - 1].end;
  const coverageSpan = Math.max(0, lastEnd - firstStart);

  if (coverageSpan < 0.4 * songDuration) {
    return true;
  }

  return false;
}

/**
 * Server-only fetch of YouTube caption cues for a given videoId.
 * Enforces a strict 4s timeout and fails silently on any error.
 */
export async function fetchYouTubeCaptionCues(
  videoId: string,
  songDuration?: number
): Promise<CaptionTiming[] | null> {
  if (!videoId || videoId.trim().length < 5) return null;

  const cleanId = videoId.trim();

  // Check cache
  const cached = captionCache.get(cleanId);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.data) return null;
    // If cached data exists, verify duration check against songDuration
    if (songDuration && hasInsufficientDuration(cached.data, songDuration)) {
      return null;
    }
    return cached.data;
  }

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(cleanId)}`;
    const pageRes = await fetch(watchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!pageRes.ok) {
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

    const html = await pageRes.text();
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|<\/script>)/);
    if (!match || !match[1]) {
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

interface TimedTextSegment {
  utf8?: string;
  tOffsetMs?: number;
}

interface TimedTextEvent {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: TimedTextSegment[];
}

interface YouTubePlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrackInfo[];
    };
  };
}

    let playerResponse: YouTubePlayerResponse | null = null;
    try {
      playerResponse = JSON.parse(match[1]) as YouTubePlayerResponse;
    } catch {
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

    const tracks: CaptionTrackInfo[] | undefined =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

    // Preference ladder:
    // 1. Manual English track (kind !== 'asr')
    // 2. Any manual track
    // 3. Auto-generated English track (kind === 'asr')
    // 4. Any auto-generated track
    const manualEn = tracks.find((t) => t.languageCode?.startsWith('en') && t.kind !== 'asr');
    const manualAny = tracks.find((t) => t.kind !== 'asr');
    const autoEn = tracks.find((t) => t.languageCode?.startsWith('en') && t.kind === 'asr');
    const autoAny = tracks.find((t) => t.kind === 'asr');

    const selectedTrack = manualEn || manualAny || autoEn || autoAny || tracks[0];
    if (!selectedTrack?.baseUrl) {
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

    // Fetch caption XML/JSON3
    const captionUrl = `${selectedTrack.baseUrl}&fmt=json3`;
    const captionRes = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!captionRes.ok) {
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

    const captionJson = (await captionRes.json()) as { events?: TimedTextEvent[] };
    const events = captionJson?.events;

    if (!Array.isArray(events) || events.length === 0) {
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

    const cues: CaptionTiming[] = [];

    for (const evt of events) {
      if (!evt.segs || !Array.isArray(evt.segs)) continue;

      const segText = evt.segs.map((s) => s.utf8 || '').join('').trim();
      if (!segText || segText === '\n') continue;

      const eventStartMs = evt.tStartMs || 0;
      const start = eventStartMs / 1000;
      const dur = (evt.dDurationMs || 0) / 1000;
      const end = dur > 0 ? start + dur : start + 2.0;

      // Extract word-level timing if available in segs
      const hasWordOffsets = evt.segs.some((s) => typeof s.tOffsetMs === 'number' && s.tOffsetMs > 0);
      let words: CaptionCueWord[] | undefined = undefined;

      if (hasWordOffsets) {
        words = [];
        const validSegs = evt.segs.filter((s) => (s.utf8 || '').trim().length > 0 && s.utf8 !== '\n');
        for (let i = 0; i < validSegs.length; i++) {
          const s = validSegs[i];
          const wText = (s.utf8 || '').trim();
          const wStart = (eventStartMs + (s.tOffsetMs || 0)) / 1000;
          const nextSeg = validSegs[i + 1];
          const wEnd = nextSeg && typeof nextSeg.tOffsetMs === 'number'
            ? (eventStartMs + nextSeg.tOffsetMs) / 1000
            : Math.max(wStart + 0.15, end);

          words.push({
            text: wText,
            start: wStart,
            end: Math.max(wStart + 0.05, wEnd),
          });
        }
      }

      cues.push({
        text: segText.replace(/\n+/g, ' '),
        start,
        end,
        words: words && words.length > 0 ? words : undefined,
      });
    }

    if (cues.length === 0) {
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

    // Filter 1: Check if mostly sound effects
    if (isMostlySoundEffects(cues)) {
      console.debug(`[ytCaptions] Video ${cleanId} rejected: mostly sound-effect tags.`);
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

    // Filter 2: Check if duration coverage is less than 40%
    if (songDuration && hasInsufficientDuration(cues, songDuration)) {
      console.debug(`[ytCaptions] Video ${cleanId} rejected: caption coverage < 40% of duration (${songDuration}s).`);
      captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
      return null;
    }

    // Cache hit: 7 days
    captionCache.set(cleanId, {
      data: cues,
      expiresAt: Date.now() + POSITIVE_CACHE_TTL_MS,
    });

    return cues;
  } catch {
    // Fail silently
    captionCache.set(cleanId, { data: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
    return null;
  }
}
