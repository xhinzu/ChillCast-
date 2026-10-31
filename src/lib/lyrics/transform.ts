import { SyncedLyricLine, LyricWord } from './providers/types';

export interface LyricTransform {
  speed: number;  // range 0.5 to 2.0, default 1.0
  offset: number; // in seconds, default 0.0
}

const TRANSFORM_KEY_PREFIX = 'chillify_lyric_transform:';
const OFFSET_KEY_PREFIX = 'chillify_lyric_offset:';

/**
 * Load { speed, offset } for a track from localStorage.
 * Falls back to legacy chillify_lyric_offset: if present.
 */
export function loadLyricTransform(trackId: string): LyricTransform {
  if (typeof window === 'undefined' || !trackId) {
    return { speed: 1.0, offset: 0.0 };
  }

  try {
    const raw = localStorage.getItem(`${TRANSFORM_KEY_PREFIX}${trackId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.speed === 'number' && typeof parsed.offset === 'number') {
        const speed = Math.max(0.5, Math.min(2.0, Number(parsed.speed.toFixed(2))));
        const offset = Number(parsed.offset.toFixed(2));
        return { speed, offset };
      }
    }

    // Fallback: check legacy offset key
    const legacyOffset = localStorage.getItem(`${OFFSET_KEY_PREFIX}${trackId}`);
    if (legacyOffset !== null) {
      const parsedOffset = parseFloat(legacyOffset);
      if (!isNaN(parsedOffset)) {
        return { speed: 1.0, offset: Number(parsedOffset.toFixed(2)) };
      }
    }
  } catch {
    // ignore
  }

  return { speed: 1.0, offset: 0.0 };
}

/**
 * Persist { speed, offset } for a track in localStorage and notify listeners.
 */
export function saveLyricTransform(trackId: string, transform: LyricTransform): void {
  if (typeof window === 'undefined' || !trackId) return;

  const sanitized: LyricTransform = {
    speed: Math.max(0.5, Math.min(2.0, Number(transform.speed.toFixed(2)))),
    offset: Number(transform.offset.toFixed(2)),
  };

  try {
    localStorage.setItem(`${TRANSFORM_KEY_PREFIX}${trackId}`, JSON.stringify(sanitized));
    // Also keep legacy offset key synchronized
    localStorage.setItem(`${OFFSET_KEY_PREFIX}${trackId}`, String(sanitized.offset));
  } catch {
    // ignore
  }

  // Broadcast to all active components
  window.dispatchEvent(
    new CustomEvent('chillify_lyric_transform_updated', {
      detail: { trackId, transform: sanitized },
    })
  );
}

/**
 * Continuity rule when speed changes at current playback time t0:
 * lyricTime(t0) = oldSpeed * t0 + oldOffset
 * newLyricTime(t0) = newSpeed * t0 + newOffset
 * Setting them equal yields:
 * newOffset = lyricTime(t0) - newSpeed * t0
 */
export function calculateContinuityOffset(
  t0: number,
  oldTransform: LyricTransform,
  newSpeed: number
): number {
  const currentLyricTime = oldTransform.speed * t0 + oldTransform.offset;
  const newOffset = currentLyricTime - newSpeed * t0;
  return Number(newOffset.toFixed(2));
}

/**
 * Generate estimated timestamps for unsynced plain-text lyrics:
 * - Spreads lines across track duration starting after ~5% intro and ending before ~4% outro.
 * - Weights each line by character count, plus a small extra weight for section breaks/blank lines.
 */
export function estimatePlainLyricsTimings(
  plainLyrics: string,
  totalDurationSeconds?: number
): SyncedLyricLine[] {
  if (!plainLyrics || typeof plainLyrics !== 'string') return [];

  const rawLines = plainLyrics.split('\n');
  const validEntries: { text: string; isSectionBreakBefore: boolean }[] = [];
  let pendingBreak = false;

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      pendingBreak = true;
    } else {
      validEntries.push({ text: trimmed, isSectionBreakBefore: pendingBreak });
      pendingBreak = false;
    }
  }

  if (validEntries.length === 0) return [];

  // Use track duration or default to 180s
  const duration = totalDurationSeconds && totalDurationSeconds > 10 ? totalDurationSeconds : 180;
  const introSec = duration * 0.05; // 5% intro
  const outroSec = duration * 0.04; // 4% outro
  const lyricWindow = Math.max(10, duration - introSec - outroSec);

  // Calculate weights based on character length + section break bonuses
  const weights = validEntries.map((entry) => {
    const charLen = Math.max(12, entry.text.length);
    const breakBonus = entry.isSectionBreakBefore ? 18 : 0;
    return charLen + breakBonus;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let currentCursor = introSec;
  const result: SyncedLyricLine[] = [];

  for (let i = 0; i < validEntries.length; i++) {
    const entry = validEntries[i];
    const fraction = weights[i] / totalWeight;
    const lineDuration = Math.max(1.2, fraction * lyricWindow);

    const start = Number(currentCursor.toFixed(2));
    const end = Number((currentCursor + lineDuration).toFixed(2));
    currentCursor += lineDuration;

    // Break line into words with estimated timings
    const wordsRaw = entry.text.split(/\s+/).filter(Boolean);
    const words: LyricWord[] = [];
    if (wordsRaw.length > 0) {
      const wordTotalChars = wordsRaw.reduce((sum, w) => sum + Math.max(2, w.length), 0);
      let wordCursor = start;
      for (const w of wordsRaw) {
        const wFraction = Math.max(2, w.length) / wordTotalChars;
        const wDur = wFraction * lineDuration;
        const wStart = Number(wordCursor.toFixed(2));
        const wEnd = Number((wordCursor + wDur).toFixed(2));
        wordCursor += wDur;
        words.push({ text: w, start: wStart, end: wEnd });
      }
    } else {
      words.push({ text: entry.text, start, end });
    }

    result.push({
      id: i,
      start,
      end,
      text: entry.text,
      words,
    });
  }

  return result;
}
