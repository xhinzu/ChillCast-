/**
 * Sequence Alignment for Plain Lyrics to YouTube Caption Timing
 *
 * Requirements:
 * - Normalize both plain lyric words and caption words (lowercase, strip punctuation/diacritics).
 * - Sequence alignment (Needleman-Wunsch) with word similarity threshold >= 0.8.
 * - Map lyric words to caption words and copy over start times.
 * - Interpolate missing word times linearly.
 * - Clamp timings to ensure strict monotonicity.
 * - Derive each lyric line's start from its first word and end from the next line's start.
 * - Quality gate: accept ONLY if >= 50% of lyric words matched with similarity >= 0.8.
 * - Return standard { lines: [{ id, start, end, text, words }], synced: 'word' | 'line', source: 'plain + captions timing' }.
 */

import { CaptionTiming, isSoundEffectTag } from './providers/ytCaptions';
import { SyncedLyricLine, LyricWord } from './providers/types';

export interface AlignmentResult {
  lines: SyncedLyricLine[];
  synced: 'word' | 'line';
  source: 'plain + captions timing';
  qualityScore: number;
}

/**
 * Normalizes a word token for alignment:
 * Lowercases, strips diacritics, and strips non-alphanumeric punctuation.
 */
export function normalizeWord(token: string): string {
  if (!token) return '';
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();
}

/**
 * Computes Levenshtein similarity [0.0, 1.0] between two normalized words.
 */
export function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const lenA = a.length;
  const lenB = b.length;
  const maxLen = Math.max(lenA, lenB);
  if (maxLen === 0) return 1.0;

  // Optimization: length difference too large for >= 0.8 similarity
  if (Math.abs(lenA - lenB) / maxLen > 0.25) return 0.0;

  let prev = Array.from({ length: lenB + 1 }, (_, i) => i);
  let curr = new Array(lenB + 1).fill(0);

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  const dist = prev[lenB];
  return 1 - dist / maxLen;
}

interface InternalLyricWord {
  originalText: string;
  normText: string;
  lineIdx: number;
  wordIdxInLine: number;
  start?: number;
  end?: number;
  matchedCaptionIdx?: number;
  sim?: number;
}

interface InternalCaptionWord {
  originalText: string;
  normText: string;
  start: number;
  end: number;
}

/**
 * Aligns plain lyrics text to caption cues using Needleman-Wunsch sequence alignment.
 * Returns null if quality gate (< 50% matched words with similarity >= 0.8) fails.
 */
export function alignPlainLyricsToCaptions(
  plainLyrics: string,
  captionCues: CaptionTiming[],
  trackDuration?: number
): AlignmentResult | null {
  if (!plainLyrics || !plainLyrics.trim() || !captionCues || captionCues.length === 0) {
    return null;
  }

  // 1. Parse plain lyrics into lines and words
  const rawLines = plainLyrics.split(/\r?\n/);
  const lyricWords: InternalLyricWord[] = [];
  const validLineIndexes: number[] = [];
  let currentValidLine = 0;

  for (let l = 0; l < rawLines.length; l++) {
    const rawLine = rawLines[l].trim();
    // Skip empty lines and metadata lines like [ar: ...]
    if (!rawLine || /^\[[a-zA-Z]{2,8}:.*\]$/.test(rawLine)) {
      continue;
    }

    const tokens = rawLine.split(/\s+/).filter((t) => t.trim().length > 0);
    if (tokens.length === 0) continue;

    validLineIndexes.push(l);
    for (let w = 0; w < tokens.length; w++) {
      const token = tokens[w];
      const norm = normalizeWord(token);
      lyricWords.push({
        originalText: token,
        normText: norm,
        lineIdx: currentValidLine,
        wordIdxInLine: w,
      });
    }
    currentValidLine++;
  }

  if (lyricWords.length === 0) return null;

  // 2. Flatten caption cues into words
  const captionWords: InternalCaptionWord[] = [];
  for (const cue of captionCues) {
    if (isSoundEffectTag(cue.text)) continue;

    if (cue.words && cue.words.length > 0) {
      for (const w of cue.words) {
        const norm = normalizeWord(w.text);
        if (norm.length > 0 && !isSoundEffectTag(w.text)) {
          captionWords.push({
            originalText: w.text,
            normText: norm,
            start: w.start,
            end: w.end,
          });
        }
      }
    } else {
      // Split line-level cue evenly across valid tokens
      const rawTokens = cue.text.split(/\s+/).filter((t) => t.trim().length > 0);
      const validTokens = rawTokens.filter((t) => normalizeWord(t).length > 0 && !isSoundEffectTag(t));
      const cueDur = Math.max(0.5, cue.end - cue.start);
      const count = validTokens.length;

      for (let k = 0; k < count; k++) {
        const token = validTokens[k];
        const norm = normalizeWord(token);
        const wStart = cue.start + (k / count) * cueDur;
        const wEnd = cue.start + ((k + 1) / count) * cueDur;
        captionWords.push({
          originalText: token,
          normText: norm,
          start: wStart,
          end: wEnd,
        });
      }
    }
  }

  if (captionWords.length === 0) return null;

  // 3. Sequence Alignment (Needleman-Wunsch)
  // Let N = lyric words, M = caption words
  const N = lyricWords.length;
  const M = captionWords.length;

  const MATCH_SIM_THRESHOLD = 0.8;
  const GAP_LYRIC = -1.0;     // Penalty for missing caption word
  const GAP_CAPTION = -0.5;   // Smaller penalty for extra caption word / ad-lib

  // Use 1D typed arrays for fast DP computation
  // Dimensions: (N + 1) x (M + 1)
  const cols = M + 1;
  const totalCells = (N + 1) * cols;
  const dp = new Float32Array(totalCells);
  // Pointers: 0 = none, 1 = diag (match), 2 = up (gap lyric), 3 = left (gap caption)
  const ptr = new Uint8Array(totalCells);

  // Initialize first column (lyric gaps)
  for (let i = 1; i <= N; i++) {
    dp[i * cols] = i * GAP_LYRIC;
    ptr[i * cols] = 2;
  }
  // Initialize first row (caption gaps)
  for (let j = 1; j <= M; j++) {
    dp[j] = j * GAP_CAPTION;
    ptr[j] = 3;
  }

  for (let i = 1; i <= N; i++) {
    const lWord = lyricWords[i - 1].normText;
    const rowOffset = i * cols;
    const prevRowOffset = (i - 1) * cols;

    for (let j = 1; j <= M; j++) {
      const cWord = captionWords[j - 1].normText;

      let matchScore = -1.0;
      let sim = 0;
      if (lWord.length > 0 && cWord.length > 0) {
        sim = wordSimilarity(lWord, cWord);
        if (sim >= MATCH_SIM_THRESHOLD) {
          matchScore = 2.0 * sim;
        }
      }

      const scoreDiag = dp[prevRowOffset + (j - 1)] + matchScore;
      const scoreUp = dp[prevRowOffset + j] + GAP_LYRIC;
      const scoreLeft = dp[rowOffset + (j - 1)] + GAP_CAPTION;

      let bestScore = scoreDiag;
      let bestDir: number = 1; // Diag

      if (scoreUp > bestScore) {
        bestScore = scoreUp;
        bestDir = 2; // Up
      }
      if (scoreLeft > bestScore) {
        bestScore = scoreLeft;
        bestDir = 3; // Left
      }

      dp[rowOffset + j] = bestScore;
      ptr[rowOffset + j] = bestDir;
    }
  }

  // 4. Backtrack to recover alignment
  let currI = N;
  let currJ = M;
  let matchedCount = 0;

  while (currI > 0 && currJ > 0) {
    const dir = ptr[currI * cols + currJ];
    if (dir === 1) {
      // Diag
      const lIdx = currI - 1;
      const cIdx = currJ - 1;
      const lWord = lyricWords[lIdx].normText;
      const cWord = captionWords[cIdx].normText;
      const sim = lWord.length > 0 && cWord.length > 0 ? wordSimilarity(lWord, cWord) : 0;

      if (sim >= MATCH_SIM_THRESHOLD) {
        lyricWords[lIdx].start = captionWords[cIdx].start;
        lyricWords[lIdx].end = captionWords[cIdx].end;
        lyricWords[lIdx].matchedCaptionIdx = cIdx;
        lyricWords[lIdx].sim = sim;
        matchedCount++;
      }
      currI--;
      currJ--;
    } else if (dir === 2) {
      // Up (lyric gap)
      currI--;
    } else {
      // Left (caption gap)
      currJ--;
    }
  }

  // 5. Quality Gate:
  // Count words with normText.length > 0
  const validLyricWords = lyricWords.filter((w) => w.normText.length > 0);
  const totalValidWords = validLyricWords.length;
  const qualityRatio = totalValidWords > 0 ? matchedCount / totalValidWords : 0;

  if (qualityRatio < 0.5) {
    console.debug(
      `[alignCaptions] Quality gate rejected: matched ${matchedCount}/${totalValidWords} (${(
        qualityRatio * 100
      ).toFixed(1)}% < 50%)`
    );
    return null;
  }

  // 6. Interpolate missing word timings
  // Calculate average word duration for extrapolation
  let avgWordDelta = 0.35;
  const matchedList = lyricWords
    .map((w, idx) => ({ idx, word: w }))
    .filter((item) => item.word.start !== undefined);

  if (matchedList.length >= 2) {
    const firstMatched = matchedList[0];
    const lastMatched = matchedList[matchedList.length - 1];
    const indexSpan = lastMatched.idx - firstMatched.idx;
    const timeSpan = lastMatched.word.start! - firstMatched.word.start!;
    if (indexSpan > 0 && timeSpan > 0) {
      const calcDelta = timeSpan / indexSpan;
      if (calcDelta >= 0.1 && calcDelta <= 1.5) {
        avgWordDelta = calcDelta;
      }
    }
  }

  for (let i = 0; i < N; i++) {
    if (lyricWords[i].start !== undefined) continue;

    // Find preceding match
    let prevMatch: InternalLyricWord | null = null;
    let prevMatchIdx = -1;
    for (let p = i - 1; p >= 0; p--) {
      if (lyricWords[p].start !== undefined) {
        prevMatch = lyricWords[p];
        prevMatchIdx = p;
        break;
      }
    }

    // Find succeeding match
    let nextMatch: InternalLyricWord | null = null;
    let nextMatchIdx = -1;
    for (let s = i + 1; s < N; s++) {
      if (lyricWords[s].start !== undefined) {
        nextMatch = lyricWords[s];
        nextMatchIdx = s;
        break;
      }
    }

    if (prevMatch && nextMatch) {
      // Linear interpolation between prev and next
      const ratio = (i - prevMatchIdx) / (nextMatchIdx - prevMatchIdx);
      const interpolated = prevMatch.start! + ratio * (nextMatch.start! - prevMatch.start!);
      lyricWords[i].start = interpolated;
      lyricWords[i].end = interpolated + avgWordDelta;
    } else if (nextMatch) {
      // Extrapolate backwards before first match
      const extrapolated = Math.max(0, nextMatch.start! - (nextMatchIdx - i) * avgWordDelta);
      lyricWords[i].start = extrapolated;
      lyricWords[i].end = extrapolated + avgWordDelta;
    } else if (prevMatch) {
      // Extrapolate forwards after last match
      let extrapolated = prevMatch.start! + (i - prevMatchIdx) * avgWordDelta;
      if (trackDuration && trackDuration > 0) {
        extrapolated = Math.min(extrapolated, trackDuration - 1);
      }
      lyricWords[i].start = extrapolated;
      lyricWords[i].end = extrapolated + avgWordDelta;
    } else {
      // Fallback: estimate from 0
      lyricWords[i].start = i * avgWordDelta;
      lyricWords[i].end = (i + 1) * avgWordDelta;
    }
  }

  // 7. Monotonicity Clamping:
  // Ensure start times are strictly non-decreasing and words don't collide backwards
  for (let i = 1; i < N; i++) {
    const prevStart = lyricWords[i - 1].start!;
    if (lyricWords[i].start! <= prevStart) {
      lyricWords[i].start = prevStart + 0.02;
    }
  }

  for (let i = 0; i < N; i++) {
    const currStart = lyricWords[i].start!;
    const nextStart = i < N - 1 ? lyricWords[i + 1].start! : currStart + 1.5;
    lyricWords[i].end = Math.max(currStart + 0.05, nextStart);
  }

  // 8. Derive each lyric line's start from its first word and end from next line's start
  const linesMap = new Map<number, InternalLyricWord[]>();
  for (const w of lyricWords) {
    const arr = linesMap.get(w.lineIdx) || [];
    arr.push(w);
    linesMap.set(w.lineIdx, arr);
  }

  const sortedLineIndexes = Array.from(linesMap.keys()).sort((a, b) => a - b);
  const syncedLines: SyncedLyricLine[] = [];

  for (let idx = 0; idx < sortedLineIndexes.length; idx++) {
    const lineKey = sortedLineIndexes[idx];
    const wordsInLine = linesMap.get(lineKey) || [];
    if (wordsInLine.length === 0) continue;

    const lineStart = wordsInLine[0].start!;
    let lineEnd: number;

    if (idx < sortedLineIndexes.length - 1) {
      const nextLineKey = sortedLineIndexes[idx + 1];
      const nextWords = linesMap.get(nextLineKey) || [];
      lineEnd = nextWords.length > 0 ? nextWords[0].start! : lineStart + 3.0;
    } else {
      // Last line: end after last word plus padding
      const lastWord = wordsInLine[wordsInLine.length - 1];
      lineEnd = lastWord.end! + 2.0;
      if (trackDuration && trackDuration > 0) {
        lineEnd = Math.min(lineEnd, trackDuration);
      }
    }

    lineEnd = Math.max(lineStart + 0.2, lineEnd);

    const lineText = wordsInLine.map((w) => w.originalText).join(' ');
    const formattedWords: LyricWord[] = wordsInLine.map((w) => ({
      text: w.originalText,
      start: Number(w.start!.toFixed(3)),
      end: Number(w.end!.toFixed(3)),
    }));

    syncedLines.push({
      id: idx + 1,
      start: Number(lineStart.toFixed(3)),
      end: Number(lineEnd.toFixed(3)),
      text: lineText,
      words: formattedWords,
    });
  }

  const hasWordTiming = captionCues.some((c) => c.words && c.words.length > 0);

  return {
    lines: syncedLines,
    synced: hasWordTiming ? 'word' : 'line',
    source: 'plain + captions timing',
    qualityScore: Number(qualityRatio.toFixed(3)),
  };
}
