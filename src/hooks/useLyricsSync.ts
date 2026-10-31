import { useEffect, useRef, useState } from 'react';
import { SyncedLyricLine, LyricWord } from '@/lib/lyrics/providers/types';
import { usePlayback } from '@/context/PlaybackContext';

interface UseLyricsSyncOptions {
  lines: SyncedLyricLine[];
  offsetSeconds?: number;
  stageElementRef?: React.RefObject<HTMLElement | null>;
}

interface LyricsSyncState {
  lineIndex: number;
  wordIndex: number;
}

export function useLyricsSync({
  lines,
  offsetSeconds = 0,
  stageElementRef,
}: UseLyricsSyncOptions) {
  const { isPlaying, activeAdapter, getAudioElement, currentTime } = usePlayback();

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

  // Keep latest parameters in refs so requestAnimationFrame doesn't recreate closures
  const linesRef = useRef<SyncedLyricLine[]>(lines);
  linesRef.current = lines;

  const offsetRef = useRef<number>(offsetSeconds);
  offsetRef.current = offsetSeconds;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentTimePropRef = useRef<number>(currentTime);
  currentTimePropRef.current = currentTime;

  useEffect(() => {
    let animFrameId: number;

    const tick = () => {
      const currentLines = linesRef.current;
      if (!currentLines || currentLines.length === 0) {
        if (lastLineIndexRef.current !== -1 || lastWordIndexRef.current !== -1) {
          lastLineIndexRef.current = -1;
          lastWordIndexRef.current = -1;
          setSyncState({ lineIndex: -1, wordIndex: -1 });
        }
        animFrameId = requestAnimationFrame(tick);
        return;
      }

      // Read highest precision clock available
      let rawClock = currentTimePropRef.current;
      const audioEl = getAudioElement();
      if (audioEl && typeof audioEl.currentTime === 'number' && !isNaN(audioEl.currentTime)) {
        rawClock = audioEl.currentTime;
      } else if (activeAdapter && typeof activeAdapter.getPosition === 'function') {
        const adapterPos = activeAdapter.getPosition();
        if (typeof adapterPos === 'number' && !isNaN(adapterPos) && adapterPos > 0) {
          rawClock = adapterPos;
        }
      }

      const effectiveTime = Math.max(0, rawClock + offsetRef.current);
      effectiveTimeRef.current = effectiveTime;

      // Locate active line
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

      // Locate active word inside the line
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

      // Save high-frequency per-frame values
      progressRef.current = wordProg;
      lineProgressRef.current = lineProg;

      // Inject CSS variables into stage element for compositor performance
      const stageEl = stageElementRef?.current;
      if (stageEl) {
        stageEl.style.setProperty('--word-progress', wordProg.toFixed(3));
        stageEl.style.setProperty('--line-progress', lineProg.toFixed(3));
      }

      // ONLY dispatch React state update when indices change
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

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [activeAdapter, getAudioElement, stageElementRef]);

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
