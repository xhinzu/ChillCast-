'use client';

import React from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { FisheyeCurvatureAxis } from '@/lib/lyrics/settings';

interface FisheyeStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  strength?: number; // 0 to 100
  axis?: FisheyeCurvatureAxis;
  scale?: number; // scale multiplier e.g. 1.0 = 100%
}

export default function FisheyeStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  strength = 60,
  axis = 'both',
  scale = 1.0,
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
  const sFactor = Math.max(0.1, Math.min(1.0, strength / 100));

  // Radii inversely proportional to lens strength (stronger lens = tighter curve radius)
  const verticalRadius = (320 / sFactor) * scale;
  const horizontalRadius = (380 / sFactor) * scale;
  const stepDegV = 16 * sFactor;
  const stepDegH = 14 * sFactor;

  const enableVertical = axis === 'both' || axis === 'vertical';
  const enableHorizontal = axis === 'both' || axis === 'horizontal';

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none overflow-hidden relative"
      style={{
        perspective: `${1000 * scale}px`,
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* 3D Lens/Sphere Container */}
      <div
        className="relative w-full max-w-3xl h-[480px] flex items-center justify-center transform-gpu"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {words.map((word, idx) => {
          const diff = idx - activeWordIndex;

          // Vertical angle & coordinates
          const degV = enableVertical ? Math.max(-85, Math.min(85, diff * stepDegV)) : 0;
          const radV = (degV * Math.PI) / 180;
          const translateY = enableVertical ? Math.sin(radV) * verticalRadius : diff * (36 * scale);
          const translateZV = enableVertical ? (Math.cos(radV) - 1) * verticalRadius : 0;
          const rotateX = enableVertical ? -degV : 0;

          // Horizontal curvature & angle per word
          const degH = enableHorizontal ? Math.max(-80, Math.min(80, diff * stepDegH)) : 0;
          const radH = (degH * Math.PI) / 180;
          const translateX = enableHorizontal ? Math.sin(radH) * horizontalRadius * 0.5 : 0;
          const translateZH = enableHorizontal ? (Math.cos(radH) - 1) * horizontalRadius : 0;
          const rotateY = enableHorizontal ? degH * 0.8 : 0;

          // Combined barrel/sphere depth
          const totalTranslateZ = translateZV + translateZH;

          const cosV = Math.max(0, Math.cos(radV));
          const cosH = Math.max(0, Math.cos(radH));
          const cosine = Math.min(cosV, cosH);

          const wordScale = (0.55 + 0.65 * Math.pow(cosine, 1.8)) * scale;
          const opacity = Math.max(0.15, Math.pow(cosine, 2.0));

          const isActive = diff === 0;
          const emoji = showIcons && word.text ? getEmojiForLyricWord(word.text) : null;

          return (
            <div
              key={`fisheye-${idx}-${word.text}`}
              className="absolute flex items-center justify-center gap-3 transition-all duration-300 ease-out transform-gpu text-center px-4"
              style={{
                transform: `translateX(${translateX.toFixed(1)}px) translateY(${translateY.toFixed(1)}px) translateZ(${totalTranslateZ.toFixed(1)}px) rotateX(${rotateX.toFixed(1)}deg) rotateY(${rotateY.toFixed(1)}deg) scale(${wordScale.toFixed(3)})`,
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
                style={{
                  fontSize: isActive ? `${3.5 * scale}rem` : `${2.0 * scale}rem`,
                }}
              >
                {word.text}
              </span>

              {/* Icon pop next to active word without layout displacement */}
              {emoji && isActive && (
                <span
                  className="animate-pop-in select-none inline-block ml-1"
                  style={{ fontSize: `${2.6 * scale}rem` }}
                  aria-hidden="true"
                >
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
