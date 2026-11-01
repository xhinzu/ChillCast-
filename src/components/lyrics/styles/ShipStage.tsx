'use client';

import React, { useRef } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { useCamera } from '@/hooks/useCamera';

interface ShipStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  cameraMovementEnabled?: boolean;
}

export default function ShipStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  cameraMovementEnabled = true,
}: ShipStageProps) {
  const worldRef = useRef<HTMLDivElement | null>(null);

  const activeLine =
    activeLineIndex >= 0 && activeLineIndex < lines.length
      ? lines[activeLineIndex]
      : null;

  const words = activeLine?.words || [];

  // Safe active word index (fallback to 0 if not yet active or line-synced)
  const safeWordIndex =
    activeWordIndex >= 0 && activeWordIndex < words.length
      ? activeWordIndex
      : 0;

  const activeWord = words[safeWordIndex];
  const wordDuration =
    activeWord?.end && activeWord?.start
      ? Math.max(0.15, activeWord.end - activeWord.start)
      : 0.5;

  // The active word's vertical offset to center it horizontally and vertically on the stage
  const rowHeight = 64; // px per word row
  const centerIndex = (words.length - 1) / 2;
  const targetY = - (safeWordIndex - centerIndex) * rowHeight;

  // Camera motion: gentle zoom pulse (1.00 -> 1.08 then easing), subtle pan centering, tiny idle drift
  useCamera({
    worldRef,
    target: { x: 0, y: -targetY },
    enabled: cameraMovementEnabled,
    transformSuffix: 'rotateX(10deg) rotateY(-4deg)',
    zoomLevel: 1.0,
    zoomPulseAmount: 0.08,
    settleTime: 0.6,
    idleDriftAmount: 3,
    wordDuration,
    neutralY: targetY, // Keep active word centered even when camera motion is OFF
    neutralZoom: 1.0,
  });

  if (!activeLine || words.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-500 text-sm select-none">
        Waiting for vocals...
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none overflow-hidden relative"
      style={{
        perspective: '1200px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* 3D Drifting Wall Container (Controlled by useCamera via Ref) */}
      <div
        ref={worldRef}
        className="relative flex flex-col items-center justify-center transition-all duration-300 ease-out transform-gpu"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translate3d(0px, ${targetY}px, 0px) scale(1) rotateX(10deg) rotateY(-4deg)`,
        }}
      >
        {words.map((word, idx) => {
          const diff = idx - safeWordIndex;
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
              className="py-3 px-8 my-1 transition-all duration-300 ease-out text-center flex items-center justify-center gap-3 transform-gpu"
              style={{
                transform: `translateZ(${tz}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
                opacity,
                color: isActive ? 'var(--highlight, #ef4444)' : isPast ? 'var(--secondary, #888888)' : 'var(--lyric, #ffffff)',
              }}
            >
              <span
                className={`tracking-tight font-black transition-all duration-200 select-none ${
                  isActive ? 'text-4xl sm:text-6xl active-glyph-glow' : 'text-2xl sm:text-3xl font-semibold'
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
