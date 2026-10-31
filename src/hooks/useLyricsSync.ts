'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { SyncedLyricLine, LyricWord } from '@/lib/lyrics/providers/types';
import { usePlayback } from '@/context/PlaybackContext';

interface UseLyricsSyncOptions {
  lines: SyncedLyricLine[];
  offsetSeconds?: number;
  speed?: number;
  stageElementRef?: React.RefObject<HTMLElement | null>;
}

interface LyricsSyncState {
  lineIndex: number;
  wordIndex: number;
}

export function useLyricsSync({
  lines,
  offsetSeconds = 0,
  speed = 1.0,
  stageElementRef,
}: UseLyricsSyncOptions) {
  const {
    isPlaying,
    playbackState,
    getCurrentTime,
    getPlaybackRate,
    currentTime,
    activeAdapter,
  } = usePlayback();

  // Low-frequency React state: ONLY updates when line or word index changes!
  const [syncState, setSyncState] = useState<LyricsSyncState>({
    lineIndex: -1,
    wordIndex: -1,
  });

  // High-frequency per-frame values stored in refs for 60fps animations
  const progressRef = useRef<number>(0);
  const lineProgressRef = useRef<number>(0);
  const effectiveTimeRef = useRef<number>(0);

  // Keep track of current indices in refs to avoid redundant setStates
  const lastLineIndexRef = useRef<number>(-1);
  const lastWordIndexRef = useRef<number>(-1);

  // Keep latest parameters in refs so requestAnimationFrame doesn't capture stale closures
  const linesRef = useRef<SyncedLyricLine[]>(lines);
  const offsetRef = useRef<number>(offsetSeconds);
  const speedRef = useRef<number>(speed);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const getClockRef = useRef<() => number>(getCurrentTime);
  const getRateRef = useRef<() => number>(getPlaybackRate);

  useEffect(() => {
    linesRef.current = lines;
    offsetRef.current = offsetSeconds;
    speedRef.current = speed;
    isPlayingRef.current = isPlaying;
    getClockRef.current = getCurrentTime;
    getRateRef.current = getPlaybackRate;
  });

  // High-precision clock interpolation state
  const lastKnownTimeRef = useRef<number>(currentTime || 0);
  const lastKnownAtRef = useRef<number>(0);

  // Re-anchor on external seek or coarse timeupdate from store
  useEffect(() => {
    if (typeof currentTime === 'number' && !isNaN(currentTime)) {
      lastKnownTimeRef.current = currentTime;
      lastKnownAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
  }, [currentTime]);

  // Unified evaluation logic used for both continuous rAF frames and instant seek events
  const evaluateSync = useCallback(() => {
    const currentLines = linesRef.current;
    if (!currentLines || currentLines.length === 0) {
      if (lastLineIndexRef.current !== -1 || lastWordIndexRef.current !== -1) {
        lastLineIndexRef.current = -1;
        lastWordIndexRef.current = -1;
        setSyncState({ lineIndex: -1, wordIndex: -1 });
      }
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 1. Read live hardware/adapter clock
    let sample = lastKnownTimeRef.current;
    if (getClockRef.current) {
      try {
        const live = getClockRef.current();
        if (typeof live === 'number' && !isNaN(live)) {
          sample = live;
        }
      } catch {
        // ignore
      }
    }

    // 2. Detect adapter clock updates and re-anchor interpolation
    if (Math.abs(sample - lastKnownTimeRef.current) > 0.005) {
      lastKnownTimeRef.current = sample;
      lastKnownAtRef.current = now;
    }

    // 3. Sub-frame continuous interpolation
    let rawClock = lastKnownTimeRef.current;
    if (isPlayingRef.current) {
      const elapsedSec = (now - lastKnownAtRef.current) / 1000;
      const rate = getRateRef.current ? getRateRef.current() : 1.0;
      // Cap forward extrapolation to 0.75s between coarse ticks
      const interpolatedOffset = Math.min(0.75, Math.max(0, elapsedSec * (rate > 0 ? rate : 1.0)));
      rawClock = lastKnownTimeRef.current + interpolatedOffset;
    }

    // 4. Apply unified transform: lyricTime(t) = speed * t + offset
    const currentSpeed = speedRef.current ?? 1.0;
    const currentOffset = offsetRef.current ?? 0;
    const effectiveTime = Math.max(0, currentSpeed * rawClock + currentOffset);
    effectiveTimeRef.current = effectiveTime;

    // 5. Binary search or optimized scan for active line
    let activeLineIdx = -1;
    for (let i = 0; i < currentLines.length; i++) {
      const line = currentLines[i];
      if (effectiveTime >= line.start && effectiveTime < line.end) {
        activeLineIdx = i;
        break;
      }
      if (effectiveTime >= line.start) {
        activeLineIdx = i;
      }
    }

    // 6. Word-level progression inside active line
    let activeWordIdx = -1;
    let wordProg = 0;
    let lineProg = 0;

    if (activeLineIdx >= 0 && activeLineIdx < currentLines.length) {
      const activeLine = currentLines[activeLineIdx];
      const lineSpan = Math.max(0.01, activeLine.end - activeLine.start);
      lineProg = Math.max(0, Math.min(1, (effectiveTime - activeLine.start) / lineSpan));

      const words = activeLine.words;
      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        if (effectiveTime >= word.start && effectiveTime <= word.end) {
          activeWordIdx = w;
          const wordSpan = Math.max(0.01, word.end - word.start);
          wordProg = Math.max(0, Math.min(1, (effectiveTime - word.start) / wordSpan));
          break;
        }
        if (effectiveTime >= word.start) {
          activeWordIdx = w;
          wordProg = 1;
        }
      }
    }

    // Update refs & CSS variables
    progressRef.current = wordProg;
    lineProgressRef.current = lineProg;

    const stageEl = stageElementRef?.current;
    if (stageEl) {
      stageEl.style.setProperty('--word-progress', wordProg.toFixed(3));
      stageEl.style.setProperty('--line-progress', lineProg.toFixed(3));
    }

    // Dispatch React state update ONLY when line or word index transitions
    if (
      activeLineIdx !== lastLineIndexRef.current ||
      activeWordIdx !== lastWordIndexRef.current
    ) {
      lastLineIndexRef.current = activeLineIdx;
      lastWordIndexRef.current = activeWordIdx;
      setSyncState({
        lineIndex: activeLineIdx,
        wordIndex: activeWordIdx,
      });
    }
  }, [stageElementRef]);

  // Start / stop rAF loop according to playback state and mounting
  useEffect(() => {
    let animFrameId: number | null = null;
    let isCancelled = false;

    const loop = () => {
      if (isCancelled) return;
      evaluateSync();
      animFrameId = requestAnimationFrame(loop);
    };

    // Run first frame immediately
    evaluateSync();

    // Loop runs continuously while playing or buffering
    if (isPlaying || playbackState === 'playing' || playbackState === 'buffering') {
      animFrameId = requestAnimationFrame(loop);
    }

    return () => {
      isCancelled = true;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, [isPlaying, playbackState, evaluateSync]);

  // Immediate evaluation when lines or offset change
  useEffect(() => {
    evaluateSync();
  }, [lines, offsetSeconds, evaluateSync]);

  const activeLine: SyncedLyricLine | null =
    syncState.lineIndex >= 0 && syncState.lineIndex < lines.length
      ? lines[syncState.lineIndex]
      : null;

  const activeWord: LyricWord | null =
    activeLine && syncState.wordIndex >= 0 && syncState.wordIndex < activeLine.words.length
      ? activeLine.words[syncState.wordIndex]
      : null;

  return {
    lineIndex: syncState.lineIndex,
    wordIndex: syncState.wordIndex,
    activeLine,
    activeWord,
    progressRef,
    lineProgressRef,
    effectiveTimeRef,
  };
}
