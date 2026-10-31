'use client';

import React from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { useCamera } from '@/hooks/useCamera';
import { CameraMovementSetting } from '@/lib/lyrics/settings';

interface ShipStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  scale?: number;
  cameraMovement?: CameraMovementSetting;
  cameraZoom?: number;
  isPaused?: boolean;
  reducedMotion?: boolean;
}

export default function ShipStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  scale = 1.0,
  cameraMovement = 'subtle',
  cameraZoom = 1.0,
  isPaused = false,
  reducedMotion = false,
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

  const words = activeLine.words;

  // Active word 3D target coordinates
  const activeTargetX = 500 + (activeWordIndex % 2 === 0 ? -20 : 20) * scale;
  const activeTargetY = 300 + activeWordIndex * 24 * scale;

  // Smooth camera tracking and dollying
  const camera = useCamera(
    {
      x: activeTargetX,
      y: activeTargetY,
      zoom: 1.0,
      rotX: cameraMovement === 'cinematic' ? 12 : 6,
      rotY: cameraMovement === 'cinematic' ? -8 : -3,
    },
    {
      movement: cameraMovement,
      userZoom: cameraZoom,
      viewportWidth: 1000,
      viewportHeight: 600,
      isPaused,
      reducedMotion,
    }
  );

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none overflow-hidden relative"
      style={{
        perspective: `${1100 * scale}px`,
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* 3D Wall World Container under Camera */}
      <div
        className="w-[1000px] h-[600px] relative flex items-center justify-center transition-transform duration-75 ease-out transform-gpu shrink-0"
        style={{
          transformStyle: 'preserve-3d',
          transform: camera.transform,
          transformOrigin: '500px 300px',
        }}
      >
        {words.map((word, idx) => {
          const diff = idx - activeWordIndex;
          const isActive = diff === 0;
          const isPast = diff < 0;

          // 3D positioning along X, Y, and Z axes
          // Curved sweeping trajectory in horizontal (X) and vertical (Y)
          const posX = 500 + diff * (75 * scale) + Math.sin(diff * 0.4) * (40 * scale);
          const posY = 300 + diff * (38 * scale);

          // Active word nearest camera; past & future recede into depth
          const posZ = isActive ? 140 * scale : isPast ? Math.max(-600 * scale, diff * 120 * scale) : -Math.abs(diff) * 100 * scale;

          // 3D Rotations per word giving wall perspective
          const rotX = isPast ? Math.max(-30, diff * 5) : Math.min(25, diff * 4);
          const rotY = isPast ? Math.max(-25, diff * 4) : Math.min(20, diff * 3);
          const rotZ = Math.sin(diff * 0.5) * 4;

          const opacity = isActive
            ? 1.0
            : isPast
            ? Math.max(0.18, 0.65 + diff * 0.08)
            : Math.max(0.15, 0.45 - diff * 0.07);

          const wordScale = (isActive ? 1.25 : isPast ? Math.max(0.65, 1 + diff * 0.07) : Math.max(0.7, 1 - diff * 0.06)) * scale;

          const emoji =
            showIcons && word.text ? getEmojiForLyricWord(word.text) : null;

          return (
            <div
              key={`ship-word-${idx}-${word.text}`}
              className="absolute py-2 px-6 transition-all duration-300 ease-out text-center flex items-center justify-center gap-2 transform-gpu"
              style={{
                left: `${posX.toFixed(1)}px`,
                top: `${posY.toFixed(1)}px`,
                transform: `translate(-50%, -50%) translateZ(${posZ.toFixed(1)}px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${wordScale.toFixed(3)})`,
                opacity,
                color: isActive
                  ? 'var(--highlight, #ef4444)'
                  : isPast
                  ? 'var(--secondary, #888888)'
                  : 'var(--lyric, #ffffff)',
                zIndex: isActive ? 100 : Math.max(1, 50 - Math.abs(diff)),
              }}
            >
              <span
                className={`tracking-tight font-black transition-all duration-200 select-none ${
                  isActive ? 'text-4xl sm:text-6xl active-glyph-glow' : 'text-2xl sm:text-3xl font-semibold'
                }`}
                style={{
                  fontSize: isActive ? `${3.2 * scale}rem` : `${1.9 * scale}rem`,
                }}
              >
                {word.text}
              </span>

              {/* Icon pop next to active word */}
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
