'use client';

import React from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';

interface ShipStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
}

export default function ShipStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
}: ShipStageProps) {
  const activeLine =
    activeLineIndex >= 0 && activeLineIndex < lines.length
      ? lines[activeLineIndex]
      : null;

  if (!activeLine || !activeLine.words || activeLine.words.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-500 text-sm select-none">
        Waiting for vocals...
      </div>
    );
  }

  // Display a window of words around activeWordIndex or all words in line
  const words = activeLine.words;

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none overflow-hidden relative"
      style={{
        perspective: '1200px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* 3D Drifting Wall Container */}
      <div
        className="relative flex flex-col items-center justify-center transition-all duration-300 ease-out transform-gpu"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateY(${-activeWordIndex * 28}px) rotateX(10deg) rotateY(-4deg)`,
        }}
      >
        {words.map((word, idx) => {
          const diff = idx - activeWordIndex;
          const isActive = diff === 0;
          const isPast = diff < 0;

          // 3D placement: active word is front and center; past recede into depth
          const tz = isActive ? 120 : isPast ? Math.max(-450, diff * 90) : -Math.abs(diff) * 75;
          const rx = isPast ? Math.max(-35, diff * 6) : Math.min(25, diff * 5);
          const ry = isPast ? Math.max(-20, diff * 3) : Math.min(15, diff * 2);
          const opacity = isActive ? 1.0 : isPast ? Math.max(0.2, 0.5 + diff * 0.1) : Math.max(0.12, 0.35 - diff * 0.08);
          const scale = isActive ? 1.25 : isPast ? Math.max(0.65, 1 + diff * 0.08) : Math.max(0.7, 1 - diff * 0.06);

          const emoji =
            showIcons && word.text ? getEmojiForLyricWord(word.text) : null;

          return (
            <div
              key={`ship-word-${idx}-${word.text}`}
              className="py-2.5 px-6 my-1 transition-all duration-300 ease-out text-center flex items-center justify-center gap-3 transform-gpu"
              style={{
                transform: `translateZ(${tz}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
                opacity,
                color: isActive ? 'var(--highlight, #ef4444)' : isPast ? 'var(--secondary, #888888)' : 'var(--lyric, #ffffff)',
                textShadow: isActive
                  ? '0 0 25px var(--highlight, rgba(239, 68, 68, 0.6))'
                  : 'none',
              }}
            >
              <span
                className={`tracking-tight font-black transition-all duration-200 ${
                  isActive ? 'text-4xl sm:text-6xl' : 'text-2xl sm:text-3xl font-semibold'
                }`}
              >
                {word.text}
              </span>
              {emoji && isActive && (
                <span className="text-3xl sm:text-5xl animate-pop-in filter drop-shadow">
                  {emoji}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
