'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { usePlayback } from '@/context/PlaybackContext';

interface ClassicStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  autoScroll?: boolean;
  onLineClick?: (line: SyncedLyricLine, index: number) => void;
  isTapToSyncActive?: boolean;
  isEstimated?: boolean;
}

export default function ClassicStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  autoScroll = true,
  onLineClick,
  isTapToSyncActive = false,
  isEstimated = false,
}: ClassicStageProps) {
  const { seek } = usePlayback();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Manual scroll detection: pauses auto-follow for 4 seconds then resumes
  const isUserScrollingRef = useRef<boolean>(false);
  const userScrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (!lines || lines.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center p-8 text-center text-zinc-500">
        <p className="text-sm font-medium tracking-wide animate-pulse">Waiting for vocals...</p>
      </div>
    );
  }

  // Auto-center active line smoothly
  const scrollToActive = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (!autoScroll || activeLineIndex < 0 || isUserScrollingRef.current) return;
      const activeEl = lineRefs.current.get(activeLineIndex);
      const container = containerRef.current;
      if (activeEl && container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = activeEl.getBoundingClientRect();
        const relativeTop = elRect.top - containerRect.top + container.scrollTop;
        const targetScroll = relativeTop - container.clientHeight / 2 + elRect.height / 2;
        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior,
        });
      }
    },
    [activeLineIndex, autoScroll]
  );

  const handleUserInteractionScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (userScrollTimerRef.current) {
      clearTimeout(userScrollTimerRef.current);
    }
    userScrollTimerRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      scrollToActive('smooth');
    }, 4000);
  }, [scrollToActive]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    };
  }, []);

  // Smooth scroll on activeLineIndex change
  useEffect(() => {
    scrollToActive('smooth');
  }, [activeLineIndex, scrollToActive]);

  // Re-center when the page mounts mid-song or lines finish loading
  useEffect(() => {
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        scrollToActive('auto');
      });
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, [lines, scrollToActive]);

  return (
    <div
      ref={containerRef}
      onWheel={handleUserInteractionScroll}
      onTouchMove={handleUserInteractionScroll}
      className="w-full h-full overflow-y-auto px-4 sm:px-12 py-32 flex flex-col gap-6 sm:gap-8 select-none no-scrollbar text-center sm:text-left"
    >
      {lines.map((line, lIdx) => {
        const isActiveLine = lIdx === activeLineIndex;
        const isPastLine = lIdx < activeLineIndex;

        return (
          <div
            key={line.id}
            ref={(el) => {
              if (el) lineRefs.current.set(lIdx, el);
              else lineRefs.current.delete(lIdx);
            }}
            onClick={() => {
              if ((isTapToSyncActive || isEstimated) && onLineClick) {
                onLineClick(line, lIdx);
              } else {
                seek(line.start);
              }
            }}
            className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-2xl group ${
              isTapToSyncActive
                ? 'hover:bg-amber-500/20 hover:ring-2 hover:ring-amber-400 cursor-crosshair scale-100 opacity-90'
                : isEstimated
                ? isActiveLine
                  ? 'hover:bg-amber-500/10 scale-100 sm:scale-105 origin-left'
                  : 'hover:bg-amber-500/10 opacity-50 hover:opacity-90 scale-95 origin-left'
                : isActiveLine
                ? 'scale-100 sm:scale-105 origin-left'
                : 'opacity-40 hover:opacity-80 scale-95 origin-left'
            }`}
          >
            <p
              className={`text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-relaxed transition-colors duration-200 flex flex-wrap gap-x-2 gap-y-1 justify-center sm:justify-start ${
                isActiveLine
                  ? 'text-[var(--lyric,#ffffff)]'
                  : isPastLine
                  ? 'text-[var(--secondary,#888888)]'
                  : 'text-[var(--secondary,#666666)]'
              }`}
            >
              {line.words.map((word, wIdx) => {
                const isActiveWord = isActiveLine && wIdx === activeWordIndex;
                const isPastWord = isActiveLine && wIdx < activeWordIndex;

                return (
                  <span
                    key={`${lIdx}-${wIdx}-${word.text}`}
                    className={`transition-all duration-150 inline-block rounded-md px-1 py-0.5 ${
                      isActiveWord
                        ? 'text-[var(--highlight,#ef4444)] font-black scale-110 shadow-sm'
                        : isPastWord
                        ? 'text-[var(--lyric,#ffffff)] opacity-95'
                        : isActiveLine
                        ? 'text-[var(--secondary,#888888)] opacity-60'
                        : ''
                    }`}
                  >
                    {word.text}
                  </span>
                );
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
