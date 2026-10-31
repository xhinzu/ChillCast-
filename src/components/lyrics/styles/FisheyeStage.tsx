'use client';

import React from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';

interface FisheyeStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
}

export default function FisheyeStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
}: FisheyeStageProps) {
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

  const words = activeLine.words;
  const cylinderRadius = 320; // px
  const stepDeg = 18; // degrees per word step

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none overflow-hidden relative"
      style={{
        perspective: '900px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* Curved Cylinder Container */}
      <div
        className="relative w-full max-w-2xl h-[420px] flex items-center justify-center transform-gpu"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {words.map((word, idx) => {
          const diff = idx - activeWordIndex;
          const deg = Math.max(-85, Math.min(85, diff * stepDeg));
          const rad = (deg * Math.PI) / 180;

          const translateY = Math.sin(rad) * cylinderRadius;
          const translateZ = (Math.cos(rad) - 1) * cylinderRadius;
          const rotateX = -deg;

          const cosine = Math.max(0, Math.cos(rad));
          const scale = 0.55 + 0.65 * Math.pow(cosine, 1.8);
          const opacity = Math.max(0.12, Math.pow(cosine, 2.2));

          const isActive = diff === 0;
          const emoji = showIcons && word.text ? getEmojiForLyricWord(word.text) : null;

          return (
            <div
              key={`fisheye-${idx}-${word.text}`}
              className="absolute flex items-center justify-center gap-3 transition-all duration-300 ease-out transform-gpu text-center px-4"
              style={{
                transform: `translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`,
                opacity,
                zIndex: Math.round(cosine * 100),
              }}
            >
              <span
                className={`font-black tracking-tight transition-all duration-200 select-none py-2 px-4 ${
                  isActive
                    ? 'text-4xl sm:text-6xl text-[var(--highlight,#ef4444)] active-glyph-glow'
                    : 'text-2xl sm:text-3xl text-[var(--lyric,#ffffff)]'
                }`}
              >
                {word.text}
              </span>
              {emoji && isActive && (
                <span className="text-3xl sm:text-5xl animate-pop-in select-none">
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
