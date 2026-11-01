'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
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

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;
const MARGIN = 200;

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
  const [viewportSize, setViewportSize] = useState({ w: 1000, h: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          w: containerRef.current.clientWidth || 1000,
          h: containerRef.current.clientHeight || 600,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute static framing zoom to fit full world canvas when camera motion is OFF
  const fitZoom = useMemo(() => {
    const scaleX = viewportSize.w / WORLD_WIDTH;
    const scaleY = viewportSize.h / WORLD_HEIGHT;
    return Math.min(scaleX, scaleY) * 0.92;
  }, [viewportSize]);

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

  // Compute active global word index (handles line sync fallback when activeWordIndex === -1)
  const activeGlobalIndex = useMemo(() => {
    if (flatWords.length === 0) return 0;

    let match = flatWords.find(
      (item) => item.lineIndex === activeLineIndex && item.wordIndex === activeWordIndex
    );
    if (!match && activeLineIndex >= 0) {
      match = flatWords.find((item) => item.lineIndex === activeLineIndex);
    }
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

  // Target relative to world center (1200, 800)
  const target = activeNode
    ? {
        x: activeNode.x - WORLD_WIDTH / 2,
        y: activeNode.y - WORLD_HEIGHT / 2,
      }
    : null;

  // Shared camera hook integration
  useCamera({
    worldRef,
    containerRef,
    target,
    enabled: cameraMovementEnabled,
    scalePanWithZoom: true,
    zoomLevel: 1.8,
    zoomPulseAmount: 0.1,
    settleTime: 0.6,
    idleDriftAmount: 4,
    wordDuration: activeNode?.duration,
    neutralX: 0,
    neutralY: 0,
    neutralZoom: fitZoom,
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
    >
      {/* World Canvas Centered on Screen (Controlled by useCamera via Ref) */}
      <div
        ref={worldRef}
        className="absolute left-1/2 top-1/2 transform-gpu pointer-events-none"
        style={{
          width: `${WORLD_WIDTH}px`,
          height: `${WORLD_HEIGHT}px`,
          marginLeft: `-${WORLD_WIDTH / 2}px`,
          marginTop: `-${WORLD_HEIGHT / 2}px`,
          transformOrigin: 'center center',
          transform: `translate3d(0px, 0px, 0px) scale(${fitZoom})`,
        }}
      >
        {wordNodes.map((node) => {
          const diff = node.globalIndex - activeGlobalIndex;
          const isActive = diff === 0;
          const isPast = diff < 0 && diff >= -10;
          const isNext = diff === 1;

          // When camera movement is ON, cull distant words for performance
          // When camera movement is OFF, show all words in static framing
          if (cameraMovementEnabled) {
            if (!isActive && !isPast && !isNext) return null;
          }

          const emoji = showIcons && isActive ? getEmojiForLyricWord(node.text) : null;

          const opacity = isActive
            ? 1.0
            : isPast
            ? Math.max(0.15, 0.7 + diff * 0.055)
            : isNext
            ? 0.12
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
