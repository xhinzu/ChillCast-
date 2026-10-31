import { RawParsedLine } from './parseLrc';
import { LyricWord, SyncedLyricLine } from './providers/types';

const PUNCTUATION_END_REGEX = /[.,!?;:—~…)\]"”’]$/;

/**
 * Derives realistic word-by-word timestamps from line-level synced lyrics.
 * Algorithm:
 * - Line start to next line start defines line duration.
 * - The last line of the song is capped at ~6s.
 * - Extended gaps (>12s, such as instrumental solos) are capped to max 9s per line
 *   to prevent individual words from stretching unrealistically.
 * - Duration is distributed proportionally across words by character length.
 * - Words ending in punctuation receive extra weight (+45%) to reflect natural pauses.
 */
export function deriveWordTimingsFromLrc(
  rawLines: RawParsedLine[],
  songDuration?: number
): SyncedLyricLine[] {
  if (!rawLines || rawLines.length === 0) return [];

  const syncedLines: SyncedLyricLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const current = rawLines[i];
    const lineStart = current.time;

    let lineEnd: number;
    if (i + 1 < rawLines.length) {
      const nextStart = rawLines[i + 1].time;
      const rawSpan = nextStart - lineStart;
      if (rawSpan <= 0) {
        lineEnd = lineStart + 3.0;
      } else if (rawSpan > 12.0) {
        // Long pause or instrumental interlude: cap line duration
        lineEnd = lineStart + Math.min(9.0, rawSpan);
      } else {
        lineEnd = nextStart;
      }
    } else {
      // Last line: cap to ~6 seconds, or remaining track duration
      if (songDuration && songDuration > lineStart) {
        lineEnd = Math.min(lineStart + 6.0, songDuration);
      } else {
        lineEnd = lineStart + 6.0;
      }
    }

    const lineDuration = Math.max(0.5, lineEnd - lineStart);
    const rawTokens = current.text.split(/\s+/).filter(Boolean);

    if (rawTokens.length === 0) {
      syncedLines.push({
        id: current.id,
        start: lineStart,
        end: lineEnd,
        text: current.text,
        words: [
          {
            text: current.text || '♪',
            start: lineStart,
            end: lineEnd,
          },
        ],
      });
      continue;
    }

    // Compute weights
    const weights: number[] = rawTokens.map((token) => {
      let weight = Math.max(1, token.length);
      if (PUNCTUATION_END_REGEX.test(token)) {
        weight *= 1.45; // Extra weight for end-of-clause/pause words
      }
      return weight;
    });

    const totalWeight = weights.reduce((acc, w) => acc + w, 0);

    let runningTime = lineStart;
    const words: LyricWord[] = [];

    for (let w = 0; w < rawTokens.length; w++) {
      const token = rawTokens[w];
      const fraction = weights[w] / totalWeight;
      const wordDuration = fraction * lineDuration;
      const wordStart = runningTime;
      const wordEnd = w === rawTokens.length - 1 ? lineEnd : wordStart + wordDuration;

      words.push({
        text: token,
        start: wordStart,
        end: wordEnd,
      });

      runningTime = wordEnd;
    }

    syncedLines.push({
      id: current.id,
      start: lineStart,
      end: lineEnd,
      text: current.text,
      words,
    });
  }

  return syncedLines;
}
