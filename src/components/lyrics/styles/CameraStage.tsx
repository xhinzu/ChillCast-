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
  rotation: number;
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
  const [viewportSize, setViewportSize] = useState({ w: 1000, h: 600 });

  // Measure container viewport accurately using ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setViewportSize({
        w: el.clientWidth || 1000,
        h: el.clientHeight || 600,
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute static framing zoom to fit full world canvas when camera motion is OFF
  const fitZoom = useMemo(() => {
    const scaleX = viewportSize.w / WORLD_WIDTH;
    const scaleY = viewportSize.h / WORLD_HEIGHT;
    return Math.min(scaleX, scaleY) * 0.92;
  }, [viewportSize]);

  // Flatten words across all lines with timing and indices (robust to line-synced lyrics)
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
      let words = line.words;

      // Fallback for line-synced lyrics where words array is empty or not provided
      if (!words || words.length === 0) {
        if (line.text && line.text.trim().length > 0) {
          const parts = line.text.trim().split(/\s+/).filter(Boolean);
          const lineDuration =
            line.end && line.start && line.end > line.start
              ? line.end - line.start
              : 3.0;
          const wordDur = lineDuration / Math.max(1, parts.length);
          words = parts.map((part, pIdx) => ({
            text: part,
            start: line.start + pIdx * wordDur,
            end: line.start + (pIdx + 1) * wordDur,
          }));
        }
      }

      if (!words || words.length === 0) continue;

      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        const duration =
          word.end && word.start && word.end > word.start
            ? Math.max(0.15, word.end - word.start)
            : 0.45;
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

    // 1. Exact match by lineIndex and wordIndex
    if (activeWordIndex >= 0) {
      const match = flatWords.find(
        (item) => item.lineIndex === activeLineIndex && item.wordIndex === activeWordIndex
      );
      if (match) return match.globalIndex;
    }

    // 2. Fallback to first word of active line (e.g. line-synced lyrics)
    if (activeLineIndex >= 0) {
      const lineMatch = flatWords.find((item) => item.lineIndex === activeLineIndex);
      if (lineMatch) return lineMatch.globalIndex;
    }

    return 0;
  }, [flatWords, activeLineIndex, activeWordIndex]);

  // Generate deterministic seeded positions across the world canvas
  // Spawns words at natural, organic random places across the stage with smooth reading flow
  const wordNodes = useMemo<CameraWordNode[]>(() => {
    if (flatWords.length === 0) return [];

    const seedStr = trackId || (lines[0]?.text ?? 'chillcast') + flatWords.length;
    const rng = createPrng(hashString(seedStr));

    const nodes: CameraWordNode[] = [];
    const minX = MARGIN;
    const maxX = WORLD_WIDTH - MARGIN;
    const minY = MARGIN;
    const maxY = WORLD_HEIGHT - MARGIN;

    let curX = WORLD_WIDTH / 2 + (rng() - 0.5) * 320;
    let curY = WORLD_HEIGHT / 2 + (rng() - 0.5) * 220;
    let curAngle = rng() * Math.PI * 2;

    for (let i = 0; i < flatWords.length; i++) {
      const word = flatWords[i];
      const isNewLine = i > 0 && word.lineIndex !== flatWords[i - 1].lineIndex;

      // Subtle random tilt between -6 and +6 degrees
      const rotation = Math.round((rng() - 0.5) * 12);

      let bestX = curX;
      let bestY = curY;

      // Try candidate angles to place word at an uncluttered random place
      for (let attempt = 0; attempt < 24; attempt++) {
        // Distance from previous word:
        // Within same line: 150px - 260px (smooth, readable gliding distance)
        // Between lines: 280px - 440px (fresh leap to a new cluster)
        const dist = isNewLine ? 280 + rng() * 160 : 150 + rng() * 110;

        // Angle: organic progression with slight angle persistence or fresh direction
        const angle = isNewLine ? rng() * Math.PI * 2 : curAngle + (rng() - 0.5) * 1.8;

        let candX = curX + Math.cos(angle) * dist;
        let candY = curY + Math.sin(angle) * dist;

        // Bounce back if nearing canvas edges
        if (candX < minX || candX > maxX) {
          candX = Math.max(minX, Math.min(maxX, curX - Math.cos(angle) * dist));
        }
        if (candY < minY || candY > maxY) {
          candY = Math.max(minY, Math.min(maxY, curY - Math.sin(angle) * dist));
        }

        // Check distance to recent words to prevent overlapping
        let minRecentDist = Infinity;
        const checkStart = Math.max(0, i - 12);
        for (let j = checkStart; j < i; j++) {
          const d = Math.hypot(candX - nodes[j].x, candY - nodes[j].y);
          if (d < minRecentDist) minRecentDist = d;
        }

        if (minRecentDist >= 120 || attempt === 23) {
          bestX = candX;
          bestY = candY;
          curAngle = angle;
          break;
        }
      }

      curX = bestX;
      curY = bestY;

      nodes.push({
        ...word,
        x: Math.round(bestX),
        y: Math.round(bestY),
        rotation,
      });
    }

    return nodes;
  }, [flatWords, trackId, lines]);

  const activeNode = wordNodes[activeGlobalIndex];

  // Target relative to world center (WORLD_WIDTH / 2, WORLD_HEIGHT / 2)
  const target = activeNode
    ? {
        x: activeNode.x - WORLD_WIDTH / 2,
        y: activeNode.y - WORLD_HEIGHT / 2,
      }
    : null;

  // Shared camera hook integration: glides and focuses camera directly on active highlighted word
  useCamera({
    worldRef,
    containerRef,
    target,
    enabled: cameraMovementEnabled,
    scalePanWithZoom: true,
    zoomLevel: 1.75,
    zoomPulseAmount: 0.1,
    settleTime: 0.55,
    idleDriftAmount: 3.5,
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
      {/* World Canvas Centered on Screen (Controlled exclusively by useCamera via Ref) */}
      <div
        ref={worldRef}
        className="absolute left-1/2 top-1/2 transform-gpu pointer-events-none"
        style={{
          width: `${WORLD_WIDTH}px`,
          height: `${WORLD_HEIGHT}px`,
          marginLeft: `-${WORLD_WIDTH / 2}px`,
          marginTop: `-${WORLD_HEIGHT / 2}px`,
          transformOrigin: 'center center',
          // Notice: NO inline transform here! useCamera sets el.style.transform directly via rAF
        }}
      >
        {wordNodes.map((node) => {
          const diff = node.globalIndex - activeGlobalIndex;
          const isActive = diff === 0;
          const isPast = diff < 0;

          // When camera motion is ON, render a generous window of words (-25 to +45)
          // so words are visibly spawned at random places all around the camera.
          // When camera motion is OFF, render all words across the full canvas.
          if (cameraMovementEnabled) {
            if (diff < -25 || diff > 45) return null;
          }

          const emoji = showIcons && isActive ? getEmojiForLyricWord(node.text) : null;

          // Distinct visual hierarchy:
          // Active: 1.0 (glowing and prominent)
          // Upcoming: softly visible at random places across the scene (0.22 - 0.45)
          // Past: dim fading memory trail (0.15 - 0.60)
          const opacity = isActive
            ? 1.0
            : isPast
            ? Math.max(0.15, 0.6 + diff * 0.02)
            : diff <= 6
            ? 0.45
            : diff <= 18
            ? 0.35
            : 0.22;

          const scale = isActive
            ? 1.35
            : isPast
            ? Math.max(0.75, 0.95 + diff * 0.01)
            : diff <= 6
            ? 0.95
            : 0.85;

          const color = isActive
            ? 'var(--highlight, #ef4444)'
            : isPast
            ? 'var(--secondary, #888888)'
            : 'var(--lyric, #ffffff)';

          return (
            <div
              key={`cam-word-${node.globalIndex}-${node.text}`}
              className="absolute flex items-center justify-center gap-3 select-none whitespace-nowrap"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: `translate(-50%, -50%) rotate(${node.rotation}deg) scale(${scale})`,
                opacity,
                color,
                zIndex: isActive ? 30 : isPast ? 10 : 20,
                transition:
                  'transform 0.28s cubic-bezier(0.2, 0, 0, 1), opacity 0.3s ease-out, color 0.2s ease',
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
