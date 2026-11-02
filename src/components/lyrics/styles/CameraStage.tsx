'use client';

import React, { useMemo, useRef } from 'react';
import { SyncedLyricLine, LyricWord } from '@/lib/lyrics/providers/types';
import { useCamera } from '@/hooks/useCamera';
import { getWordChromaInfo } from '@/lib/lyrics/chroma';
import { WordVisualCue } from '../visuals/WordVisualCue';
import { VisualCueTimeline, VisualStyle } from '@/lib/lyrics/visuals/types';

interface CameraStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  wordImagesEnabled?: boolean;
  visualStyle?: VisualStyle;
  visualTimeline?: VisualCueTimeline;
  cameraMovementEnabled?: boolean;
  chromaEnabled?: boolean;
  chromaVividness?: number;
  trackId?: string;
}

interface CameraWordNode {
  index: number;
  text: string;
  duration?: number;
  x: number; // offset in px from stage center
  y: number; // offset in px from stage center
  rotation: number; // slight organic tilt in degrees
}

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

/**
 * Generate organic random stage coordinates for the words of a line.
 * Guaranteed to be spaced out (min 110px apart), distributed around the stage,
 * and comfortably within visible viewport bounds ([-360, +360] x [-200, +200]).
 */
function generateRandomStageLayout(
  words: LyricWord[],
  seedVal: number | string
): CameraWordNode[] {
  const seed = typeof seedVal === 'number' ? seedVal : hashString(String(seedVal));
  const rng = createPrng(seed);
  const n = words.length;
  const nodes: CameraWordNode[] = [];

  const maxRadiusX = 360;
  const maxRadiusY = 200;

  for (let i = 0; i < n; i++) {
    const word = words[i];
    const duration =
      word.end && word.start && word.end > word.start
        ? Math.max(0.15, word.end - word.start)
        : 0.45;

    // Organic subtle tilt between -8 and +8 degrees
    const rotation = Math.round((rng() - 0.5) * 16);

    let bestX = 0;
    let bestY = 0;
    let maxMinDist = -1;

    // Distribute base angles in sectors so words cover the stage nicely
    const baseAngle = (i / Math.max(1, n)) * Math.PI * 2 + (rng() - 0.5) * 0.6;

    for (let attempt = 0; attempt < 18; attempt++) {
      const angle = baseAngle + (rng() - 0.5) * 1.3;
      const radiusFraction = 0.32 + rng() * 0.68;
      const candX = Math.round(Math.cos(angle) * maxRadiusX * radiusFraction);
      const candY = Math.round(Math.sin(angle) * maxRadiusY * radiusFraction);

      let minDist = Infinity;
      for (let j = 0; j < nodes.length; j++) {
        const d = Math.hypot(candX - nodes[j].x, candY - nodes[j].y);
        if (d < minDist) minDist = d;
      }

      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestX = candX;
        bestY = candY;
      }

      if (minDist >= 110) {
        bestX = candX;
        bestY = candY;
        break;
      }
    }

    nodes.push({
      index: i,
      text: word.text,
      duration,
      x: bestX,
      y: bestY,
      rotation,
    });
  }

  return nodes;
}

export default function CameraStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  wordImagesEnabled = true,
  visualStyle = 'illustrated',
  visualTimeline,
  cameraMovementEnabled = true,
  chromaEnabled = false,
  chromaVividness = 80,
  trackId,
}: CameraStageProps) {
  const worldRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active line with safe fallback to line 0 during intros so the stage is never blank
  const safeLineIndex = Math.max(
    0,
    activeLineIndex >= 0 && activeLineIndex < lines.length ? activeLineIndex : 0
  );
  const activeLine = lines[safeLineIndex] ?? null;

  // Extract or synthesize words for line (handles both word-synced & line-synced lyrics)
  const words = useMemo<LyricWord[]>(() => {
    if (!activeLine) return [];
    if (activeLine.words && activeLine.words.length > 0) {
      return activeLine.words;
    }
    // Fallback: synthesize words from line.text if line.words is empty
    if (activeLine.text && activeLine.text.trim()) {
      const parts = activeLine.text.trim().split(/\s+/).filter(Boolean);
      const lineDur = Math.max(0.5, (activeLine.end || 0) - (activeLine.start || 0));
      const wordDur = lineDur / Math.max(1, parts.length);
      return parts.map((part, idx) => ({
        text: part,
        start: (activeLine.start || 0) + idx * wordDur,
        end: (activeLine.start || 0) + (idx + 1) * wordDur,
      }));
    }
    return [];
  }, [activeLine]);

  // Safe active word index inside the active line
  const safeWordIndex = useMemo(() => {
    if (words.length === 0) return 0;
    if (activeWordIndex >= 0 && activeWordIndex < words.length) {
      return activeWordIndex;
    }
    return 0;
  }, [activeWordIndex, words]);

  // Generate deterministic random positions for each word in this line
  const wordNodes = useMemo(() => {
    if (words.length === 0) return [];
    const seedStr = `${trackId ?? 'chillcast'}-${safeLineIndex}-${activeLine?.text ?? ''}`;
    return generateRandomStageLayout(words, seedStr);
  }, [words, safeLineIndex, trackId, activeLine?.text]);

  const activeNode = wordNodes[safeWordIndex] ?? wordNodes[0] ?? null;

  // Target coordinates relative to world center (0, 0)
  const target = activeNode
    ? {
        x: activeNode.x,
        y: activeNode.y,
      }
    : null;

  // Camera hook: smooth critically-damped gliding that focuses directly on the active word
  useCamera({
    worldRef,
    containerRef,
    target,
    enabled: cameraMovementEnabled,
    scalePanWithZoom: true,
    zoomLevel: 1.65,
    zoomPulseAmount: 0.1,
    settleTime: 0.5,
    idleDriftAmount: 3.5,
    wordDuration: activeNode?.duration,
    neutralX: 0,
    neutralY: 0,
    neutralZoom: 1.0,
  });

  if (words.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-500 text-sm select-none">
        Waiting for vocals...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[380px] flex items-center justify-center select-none relative overflow-hidden"
    >
      {/* World Canvas (Controlled exclusively by useCamera via Ref) */}
      <div
        ref={worldRef}
        className="w-full h-full flex items-center justify-center pointer-events-none"
        style={{
          transformOrigin: 'center center',
        }}
      >
        {/* Centered coordinate bounding box: 1000px x 600px */}
        <div className="relative w-[1000px] h-[600px] flex items-center justify-center">
          {wordNodes.map((node) => {
            const isActive = node.index === safeWordIndex;
            const isPast = node.index < safeWordIndex;
            const chroma = chromaEnabled
              ? getWordChromaInfo(trackId, safeLineIndex, node.index, chromaVividness)
              : null;

            return (
              <div
                key={`cam-word-${safeLineIndex}-${node.index}-${node.text}`}
                className="absolute flex items-center justify-center gap-3 select-none whitespace-nowrap"
                style={{
                  left: `calc(50% + ${node.x}px)`,
                  top: `calc(50% + ${node.y}px)`,
                  transform: `translate(-50%, -50%) rotate(${node.rotation}deg) scale(${
                    isActive ? 1.35 : isPast ? 0.85 : 0.95
                  })`,
                  opacity: isActive ? 1.0 : isPast ? 0.35 : 0.45,
                  color: chroma
                    ? chroma.hex
                    : isActive
                    ? 'var(--highlight, #ef4444)'
                    : isPast
                    ? 'var(--secondary, #888888)'
                    : 'var(--lyric, #ffffff)',
                  zIndex: isActive ? 30 : isPast ? 10 : 20,
                  transition:
                    'transform 0.28s cubic-bezier(0.2, 0, 0, 1), opacity 0.3s ease-out, color 0.2s ease',
                  animation: 'popIn 350ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                }}
              >
                <span
                  style={
                    isActive && chroma
                      ? { textShadow: chroma.glowShadow }
                      : undefined
                  }
                  className={`tracking-tight select-none ${
                    isActive
                      ? chroma
                        ? 'text-4xl sm:text-6xl font-black'
                        : 'text-4xl sm:text-6xl font-black active-glyph-glow'
                      : 'text-2xl sm:text-3xl font-semibold'
                  }`}
                >
                  {node.text}
                </span>
                {isActive && (
                  <WordVisualCue
                    cue={visualTimeline?.getCue(safeLineIndex, node.index)}
                    visualStyle={visualStyle}
                    enabled={wordImagesEnabled ?? showIcons}
                    size={48}
                    chromaColor={chroma?.hex}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
