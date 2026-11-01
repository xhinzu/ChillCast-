'use client';

import React, { useMemo, useRef } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { useCamera } from '@/hooks/useCamera';

interface CameraStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  cameraMovementEnabled?: boolean;
  trackId?: string;
}

interface CameraWordNode {
  globalIndex: number;
  lineIndex: number;
  wordIndex: number;
  text: string;
  duration?: number;
  x: number;
  y: number;
}

const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 1700;
const MARGIN = 180;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function createPrng(seed: number) {
  let s = seed || 123456789;
  return function next() {
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >> 17)) >>> 0;
    s = (s ^ (s << 5)) >>> 0;
    return (s >>> 0) / 4294967296;
  };
}

export default function CameraStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  cameraMovementEnabled = true,
  trackId,
}: CameraStageProps) {
  const worldRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Flatten words across all lines with timing and indices
  const flatWords = useMemo(() => {
    const list: {
      globalIndex: number;
      lineIndex: number;
      wordIndex: number;
      text: string;
      duration?: number;
    }[] = [];

    let gIdx = 0;
    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      if (!line.words || line.words.length === 0) continue;
      for (let w = 0; w < line.words.length; w++) {
        const word = line.words[w];
        const duration =
          word.end && word.start
            ? Math.max(0.15, word.end - word.start)
            : 0.5;
        list.push({
          globalIndex: gIdx++,
          lineIndex: l,
          wordIndex: w,
          text: word.text,
          duration,
        });
      }
    }
    return list;
  }, [lines]);

  // Compute active global word index
  const activeGlobalIndex = useMemo(() => {
    if (flatWords.length === 0) return 0;
    const match = flatWords.find(
      (item) => item.lineIndex === activeLineIndex && item.wordIndex === activeWordIndex
    );
    return match ? match.globalIndex : 0;
  }, [flatWords, activeLineIndex, activeWordIndex]);

  // Generate deterministic seeded positions across the world canvas
  const wordNodes = useMemo<CameraWordNode[]>(() => {
    if (flatWords.length === 0) return [];

    const seedStr = trackId || (lines[0]?.words[0]?.text ?? 'chillcast') + lines.length;
    const rng = createPrng(hashString(seedStr));

    const nodes: CameraWordNode[] = [];
    const usableW = WORLD_WIDTH - MARGIN * 2;
    const usableH = WORLD_HEIGHT - MARGIN * 2;

    const cols = 8;
    const rows = 6;
    const cellW = usableW / cols;
    const cellH = usableH / rows;

    for (let i = 0; i < flatWords.length; i++) {
      const word = flatWords[i];
      let bestX = MARGIN + rng() * usableW;
      let bestY = MARGIN + rng() * usableH;
      let maxScore = -1;

      // Candidate rejection sampling to guarantee spread & minimum distance
      for (let attempt = 0; attempt < 18; attempt++) {
        // Pick cell from a pseudo-shuffled grid pattern
        const cellIdx = Math.floor(rng() * (cols * rows));
        const c = cellIdx % cols;
        const r = Math.floor(cellIdx / cols);

        const candX = MARGIN + c * cellW + rng() * cellW;
        const candY = MARGIN + r * cellH + rng() * cellH;

        let minDistFromRecent = Infinity;
        const recentStart = Math.max(0, i - 12);
        for (let j = recentStart; j < i; j++) {
          const d = Math.hypot(candX - nodes[j].x, candY - nodes[j].y);
          if (d < minDistFromRecent) minDistFromRecent = d;
        }

        const distFromPrev = i > 0 ? Math.hypot(candX - nodes[i - 1].x, candY - nodes[i - 1].y) : 800;

        // Preference: consecutive words are in noticeably different places (min 450px)
        // and words close in time do not overlap (min 180px)
        const score = (distFromPrev >= 450 ? 500 : distFromPrev) + Math.min(minDistFromRecent, 300);
        if (score > maxScore) {
          maxScore = score;
          bestX = candX;
          bestY = candY;
        }

        if (distFromPrev >= 450 && minDistFromRecent >= 190) {
          break;
        }
      }

      nodes.push({
        ...word,
        x: Math.round(bestX),
        y: Math.round(bestY),
      });
    }

    return nodes;
  }, [flatWords, trackId, lines]);

  const activeNode = wordNodes[activeGlobalIndex];
  const target = activeNode ? { x: activeNode.x, y: activeNode.y } : null;

  // Shared camera hook integration
  useCamera({
    worldRef,
    containerRef,
    target,
    enabled: cameraMovementEnabled,
    coordinateMode: 'world',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    zoomLevel: 1.8,
    settleTime: 0.6,
    zoomPulseAmount: 0.1,
    idleDriftAmount: 4,
    wordDuration: activeNode?.duration,
  });

  if (wordNodes.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-500 text-sm select-none">
        Waiting for vocals...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center select-none relative overflow-hidden"
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* World Canvas (Transformed by useCamera via Ref) */}
      <div
        ref={worldRef}
        className="absolute top-0 left-0 pointer-events-none transform-gpu"
        style={{
          width: `${WORLD_WIDTH}px`,
          height: `${WORLD_HEIGHT}px`,
          transformOrigin: '0 0',
        }}
      >
        {wordNodes.map((node) => {
          const diff = node.globalIndex - activeGlobalIndex;
          const isActive = diff === 0;
          const isPast = diff < 0 && diff >= -10;
          const isNext = diff === 1;

          // If camera movement is ON, cull distant words for performance
          // If camera movement is OFF, keep all placed words visible in static framing
          if (cameraMovementEnabled) {
            if (!isActive && !isPast && !isNext) return null;
          }

          const emoji = showIcons && isActive ? getEmojiForLyricWord(node.text) : null;

          // Visual styles: active word glows in highlight color; past words dim in secondary color
          const opacity = isActive
            ? 1.0
            : isPast
            ? Math.max(0.12, 0.65 + diff * 0.055)
            : isNext
            ? 0.08
            : 0.25;

          const scale = isActive
            ? 1.25
            : isPast
            ? Math.max(0.7, 0.95 + diff * 0.025)
            : isNext
            ? 0.75
            : 0.85;

          const color = isActive
            ? 'var(--highlight, #ef4444)'
            : isPast
            ? 'var(--secondary, #888888)'
            : 'var(--lyric, #ffffff)';

          return (
            <div
              key={`cam-word-${node.globalIndex}-${node.text}`}
              className="absolute flex items-center justify-center gap-3 transition-opacity duration-200 select-none whitespace-nowrap"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
                color,
                zIndex: isActive ? 20 : isPast ? 10 : 1,
              }}
            >
              <span
                className={`tracking-tight select-none ${
                  isActive
                    ? 'text-4xl sm:text-6xl font-black active-glyph-glow'
                    : 'text-2xl sm:text-3xl font-semibold'
                }`}
              >
                {node.text}
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
