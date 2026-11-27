import { SyncedLyricLine, LyricWord } from '@/lib/lyrics/providers/types';

export interface DiscPhraseWord {
  text: string;
  start: number;
  end: number;
  wordIndexInLine: number;
}

export interface DiscPhrase {
  id: string;
  lineIndex: number;
  phraseIndex: number;
  words: DiscPhraseWord[];
  text: string;
  start: number;
  end: number;
}

export interface DiscPhraseLifecycle {
  visible: boolean;
  p: number;
  opacity: number;
  blurPx: number;
  scale: number;
  fontWeight: number;
  colorMix: number;
}

export interface DiscMotionConfig {
  floatAmount: number;
  tiltAmount: number;
  tiltPeriodSec: number;
  syncTiltToBeat: boolean;
  tiltDeg: number;
  driftXPct: number;
  driftYPct: number;
  driftXPeriodSec: number;
  driftYPeriodSec: number;
  scalePulsePct: number;
  scalePulsePeriodSec: number;
}

export interface DiscCaseTransform {
  translateXPercent: number;
  translateYPercent: number;
  rotateZDeg: number;
  rotateXDeg: number;
  rotateYDeg: number;
  scale: number;
}

export interface DiscSpinConfig {
  spinPeriodSec: number;
  beatPulse: boolean;
  spinModPct: number;
  spinModPeriodSec: number;
}

const TINY_FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'by', 'for',
  'and', 'or', 'but', 'is', 'it', 'i', 'my', 'me', 'we', 'us',
  'he', 'she', 'so', 'if', 'as', 'no', 'up', 'be', 'do', 'go',
  'oh', 'ya', 'im', "i'm", 'u',
]);

const PUNCTUATION_END_RE = /[.,!?;:)\u2014\u2013"'\]]+$/;

function clamp01(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

export function easeOutCubic(p: number): number {
  const t = clamp01(p);
  return 1 - Math.pow(1 - t, 3);
}

function stripPunctuation(word: string): string {
  return word.replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, '');
}

function isOneLetterWord(word: string): boolean {
  const clean = stripPunctuation(word);
  return clean.length === 1;
}

function isTinyFunctionWord(word: string): boolean {
  const clean = stripPunctuation(word).toLowerCase();
  return clean.length <= 1 || TINY_FUNCTION_WORDS.has(clean);
}

function ensureLineWords(line: SyncedLyricLine): LyricWord[] {
  if (Array.isArray(line.words) && line.words.length > 0) {
    return line.words;
  }
  const tokens = (line.text || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const start = line.start ?? 0;
  const end = line.end && line.end > start ? line.end : start + Math.max(1.2, tokens.length * 0.4);
  const step = (end - start) / tokens.length;
  return tokens.map((text, idx) => ({
    text,
    start: start + idx * step,
    end: start + (idx + 1) * step,
  }));
}

/**
 * Splits a synced lyric line into phrases of 1..maxWordsPerPhrase words.
 * Breaks at punctuation and timing gaps > gapThresholdSec (~250ms),
 * merges tiny function words with a neighbor, never leaves a one-letter orphan,
 * and enforces a gapSec (~100ms) blank gap between consecutive phrases so they never overlap.
 */
export function chunkLineIntoPhrases(
  line: SyncedLyricLine,
  lineIndex: number,
  options?: {
    maxWordsPerPhrase?: number;
    gapThresholdSec?: number;
    gapSec?: number;
    nextLineStartSec?: number;
  }
): DiscPhrase[] {
  const maxWords = Math.max(1, Math.min(4, Math.round(options?.maxWordsPerPhrase ?? 3)));
  const gapThreshold = options?.gapThresholdSec ?? 0.25;
  const gapSec = Math.max(0, options?.gapSec ?? 0.1);

  const rawWords = ensureLineWords(line);
  if (rawWords.length === 0) return [];

  const indexedWords: DiscPhraseWord[] = rawWords.map((w, idx) => ({
    text: w.text,
    start: w.start,
    end: w.end > w.start ? w.end : w.start + 0.3,
    wordIndexInLine: idx,
  }));

  // Step 1: Initial grouping by maxWords, punctuation, and timing gap
  const groups: DiscPhraseWord[][] = [];
  let current: DiscPhraseWord[] = [];

  for (let i = 0; i < indexedWords.length; i++) {
    const w = indexedWords[i];
    if (current.length === 0) {
      current.push(w);
      continue;
    }

    const prev = current[current.length - 1];
    const hasTimingGap = w.start - prev.end > gapThreshold;
    const prevEndedWithPunct = PUNCTUATION_END_RE.test(prev.text);
    const hitMax = current.length >= maxWords;

    if (hitMax || hasTimingGap || prevEndedWithPunct) {
      groups.push(current);
      current = [w];
    } else {
      current.push(w);
    }
  }
  if (current.length > 0) {
    groups.push(current);
  }

  // Step 2: Merge single-word tiny function words & any one-letter orphan with a neighbor
  if (groups.length > 1) {
    let changed = true;
    while (changed && groups.length > 1) {
      changed = false;
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        if (g.length === 1 && (isOneLetterWord(g[0].text) || isTinyFunctionWord(g[0].text))) {
          const prev = i > 0 ? groups[i - 1] : null;
          const next = i < groups.length - 1 ? groups[i + 1] : null;
          const mustMergeOneLetter = isOneLetterWord(g[0].text);

          // Prefer merging with smaller neighbor; allow exceeding maxWords only if one-letter orphan
          if (next && (!prev || next.length <= prev.length) && (next.length < maxWords || mustMergeOneLetter)) {
            next.unshift(g[0]);
            groups.splice(i, 1);
            changed = true;
            break;
          } else if (prev && (prev.length < maxWords || mustMergeOneLetter)) {
            prev.push(g[0]);
            groups.splice(i, 1);
            changed = true;
            break;
          } else if (next && mustMergeOneLetter) {
            next.unshift(g[0]);
            groups.splice(i, 1);
            changed = true;
            break;
          }
        }
      }
    }
  }

  // Step 3: Build phrases with non-overlapping end times and ~100ms blank gap
  const phrases: DiscPhrase[] = groups.map((g, pIdx) => {
    const start = g[0].start;
    const rawEnd = g[g.length - 1].end;
    return {
      id: `${lineIndex}:${pIdx}`,
      lineIndex,
      phraseIndex: pIdx,
      words: g,
      text: g.map((w) => w.text).join(' '),
      start,
      end: rawEnd,
    };
  });

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const nextStart =
      i < phrases.length - 1
        ? phrases[i + 1].start
        : options?.nextLineStartSec;

    if (typeof nextStart === 'number' && !isNaN(nextStart)) {
      const cappedEnd = Math.min(phrase.end, nextStart - gapSec);
      phrase.end = Math.max(phrase.start + 0.04, Math.min(cappedEnd, nextStart - 0.001));
    } else {
      phrase.end = Math.max(phrase.start + 0.04, phrase.end);
    }
  }

  return phrases;
}

/**
 * Computes phrase lifecycle visual values for elapsedSec within [0, durationSec].
 * Instant cut-out at end (visible = false when elapsedSec >= durationSec).
 */
export function computePhraseLifecycle(
  elapsedSec: number,
  durationSec: number,
  options?: {
    buildupStrength?: number;
    blurMaxPx?: number;
    longPhraseThresholdSec?: number;
    longPhraseHoldAtSec?: number;
    reducedMotion?: boolean;
  }
): DiscPhraseLifecycle {
  if (elapsedSec < 0 || elapsedSec >= durationSec || durationSec <= 0) {
    return {
      visible: false,
      p: 0,
      opacity: 0,
      blurPx: 0,
      scale: 1,
      fontWeight: 600,
      colorMix: 0,
    };
  }

  const longThreshold = options?.longPhraseThresholdSec ?? 1.2;
  const holdAt = options?.longPhraseHoldAtSec ?? 0.8;
  const effectiveDuration =
    durationSec > longThreshold ? Math.min(durationSec, holdAt) : durationSec;
  const p = clamp01(elapsedSec / Math.max(0.04, effectiveDuration));

  if (options?.reducedMotion) {
    return {
      visible: true,
      p: 1,
      opacity: 1,
      blurPx: 0,
      scale: 1,
      fontWeight: 800,
      colorMix: 1,
    };
  }

  const strength = clamp01(options?.buildupStrength ?? 1);
  const blurMax = options?.blurMaxPx ?? 3;
  const eased = easeOutCubic(p);

  const refOpacity = 0.28 + 0.72 * eased;
  const refBlur = blurMax * (1 - eased);
  const refScale = 0.97 + 0.05 * p;
  const refWeight = 600 + 200 * eased;

  return {
    visible: true,
    p,
    opacity: 1 * (1 - strength) + refOpacity * strength,
    blurPx: refBlur * strength,
    scale: 1 * (1 - strength) + refScale * strength,
    fontWeight: Math.round(800 * (1 - strength) + refWeight * strength),
    colorMix: 1 * (1 - strength) + eased * strength,
  };
}

/**
 * Smooth continuous trigonometric motion for the CD case.
 * Zero random jumps, zero per-line resets.
 */
export function computeCaseMotion(
  timeSec: number,
  config: DiscMotionConfig,
  beatEnergy = 0
): DiscCaseTransform {
  const TAU = Math.PI * 2;
  const fAmt = Math.max(0, config.floatAmount);
  const tAmt = Math.max(0, config.tiltAmount);

  const tiltPeriod = Math.max(0.5, config.tiltPeriodSec);
  const beatBoost = config.syncTiltToBeat ? 1 + beatEnergy * 0.45 : 1;
  const rotateZDeg =
    config.tiltDeg * tAmt * beatBoost * Math.sin((TAU * timeSec) / tiltPeriod);

  const translateXPercent =
    config.driftXPct * fAmt * Math.sin((TAU * timeSec) / Math.max(0.5, config.driftXPeriodSec) + 0.4);
  const translateYPercent =
    config.driftYPct * fAmt * Math.sin((TAU * timeSec) / Math.max(0.5, config.driftYPeriodSec) + 1.9);

  const scale =
    1 + config.scalePulsePct * fAmt * Math.sin((TAU * timeSec) / Math.max(0.5, config.scalePulsePeriodSec) + 0.9);

  const rotateXDeg = 3.8 * fAmt * Math.sin((TAU * timeSec) / 5.1 + 1.1);
  const rotateYDeg = 3.8 * fAmt * Math.cos((TAU * timeSec) / 4.7 + 0.5);

  return {
    translateXPercent,
    translateYPercent,
    rotateZDeg,
    rotateXDeg,
    rotateYDeg,
    scale,
  };
}

/**
 * Computes clockwise angular step (degrees) for the spinning disc.
 * Base speed = 360 / spinPeriodSec (default 9s -> 40 deg/s),
 * modulated by +/-spinModPct (default +/-30%) at spinModPeriodSec (default 1.7s) or beatEnergy.
 */
export function computeDiscSpinStep(
  dtSec: number,
  timeSec: number,
  speedMultiplier: number,
  config: DiscSpinConfig,
  beatEnergy = 0
): number {
  if (dtSec <= 0 || speedMultiplier <= 0) return 0;
  const baseDegPerSec = 360 / Math.max(1, config.spinPeriodSec);
  const mod = config.beatPulse && beatEnergy > 0.05
    ? 1 + config.spinModPct * (beatEnergy * 2 - 0.6)
    : 1 + config.spinModPct * Math.sin((Math.PI * 2 * timeSec) / Math.max(0.3, config.spinModPeriodSec));

  return baseDegPerSec * Math.max(0.2, mod) * speedMultiplier * dtSec;
}

