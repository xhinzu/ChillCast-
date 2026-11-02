'use client';

import React, { useMemo, useRef } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { generateBranchesLayout } from '@/lib/lyrics/layoutNodes';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { getWordChromaInfo } from '@/lib/lyrics/chroma';
import { useCamera } from '@/hooks/useCamera';

interface BranchesStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  cameraMovementEnabled?: boolean;
  chromaEnabled?: boolean;
  chromaVividness?: number;
  trackId?: string;
}

export default function BranchesStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  cameraMovementEnabled = true,
  chromaEnabled = false,
  chromaVividness = 80,
  trackId,
}: BranchesStageProps) {
  const worldRef = useRef<HTMLDivElement | null>(null);

  const activeLine =
    activeLineIndex >= 0 && activeLineIndex < lines.length
      ? lines[activeLineIndex]
      : null;

  // Stable branch tree layout per line seeded by line index
  const layout = useMemo(() => {
    if (!activeLine || !activeLine.words || activeLine.words.length === 0) {
      return { nodes: [], edges: [] };
    }
    return generateBranchesLayout(activeLine.words, activeLineIndex, 1000, 600);
  }, [activeLine, activeLineIndex]);

  // Active node (fallback to node 0 if activeWordIndex is out of range)
  const activeNode = useMemo(() => {
    if (layout.nodes.length === 0) return null;
    return layout.nodes.find((n) => n.index === activeWordIndex) || layout.nodes[0] || null;
  }, [layout.nodes, activeWordIndex]);

  // Active word timing duration to dynamically shorten spring settle on fast lyrics
  const activeWord =
    activeLine && activeLine.words && activeWordIndex >= 0 && activeWordIndex < activeLine.words.length
      ? activeLine.words[activeWordIndex]
      : null;

  const wordDuration =
    activeWord?.end && activeWord?.start && activeWord.end > activeWord.start
      ? Math.max(0.15, activeWord.end - activeWord.start)
      : 0.5;

  // Compute camera target centered on active word with look-ahead along branch growth direction.
  // Look-ahead of ~12% (within 10-15%) of viewport along branch growth direction.
  // Active word is guaranteed to always remain inside the central 60% of the screen.
  const target = useMemo(() => {
    if (!activeNode || layout.nodes.length === 0) return null;

    const currentIndex = activeNode.index;
    const totalNodes = layout.nodes.length;

    let dirX = 1;
    let dirY = 0;

    if (currentIndex < totalNodes - 1) {
      // Branch is actively growing toward the next node
      const nextNode = layout.nodes[currentIndex + 1];
      dirX = nextNode.x - activeNode.x;
      dirY = nextNode.y - activeNode.y;
    } else if (currentIndex > 0) {
      // Final node in line: continuation direction from previous node
      const prevNode = layout.nodes[currentIndex - 1];
      dirX = activeNode.x - prevNode.x;
      dirY = activeNode.y - prevNode.y;
    }

    const dist = Math.hypot(dirX, dirY);
    const unitX = dist > 0 ? dirX / dist : 1;
    const unitY = dist > 0 ? dirY / dist : 0;

    // Look-ahead ~12% of stage viewBox (1000x600).
    // Tapers to 0 on final word of the line so it rests centered.
    const lookAheadFactor = currentIndex === totalNodes - 1 ? 0 : 0.12;
    const lookAheadX = unitX * 1000 * lookAheadFactor;
    const lookAheadY = unitY * 600 * lookAheadFactor;

    // Focus point: active word plus look-ahead along growth vector
    const focusX = activeNode.x + lookAheadX;
    const focusY = activeNode.y + lookAheadY;

    // Relative to stage center (500, 300) in 1000x600 viewBox
    return {
      x: focusX - 500,
      y: focusY - 300,
    };
  }, [activeNode, layout.nodes]);

  // Shared camera hook: ~1.3x moderate zoom, 0.6s settle critically-damped spring,
  // synchronized with line growth, subtle idle drift, zero React re-render per frame.
  useCamera({
    worldRef,
    target,
    enabled: cameraMovementEnabled,
    scalePanWithZoom: true,
    zoomLevel: 1.3,
    zoomPulseAmount: 0.02,
    settleTime: 0.6,
    wordDuration,
    idleDriftAmount: 3.0,
    resetKey: trackId,
    neutralX: 0,
    neutralY: 0,
    neutralZoom: 1.0,
  });

  if (!activeLine || layout.nodes.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-500 text-sm select-none">
        Waiting for vocals...
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none relative overflow-hidden transition-opacity duration-300"
    >
      {/* World Container (Controlled exclusively by useCamera via Ref) */}
      <div
        ref={worldRef}
        className="w-full h-full flex items-center justify-center transform-gpu"
        style={{
          transformOrigin: 'center center',
        }}
      >
        <svg
          key={`branches-svg-${activeLineIndex}`}
          viewBox="0 0 1000 600"
          className="w-full h-full max-w-5xl max-h-[75vh] object-contain overflow-visible"
        >
          {/* Edge Color Blending Gradients for Chroma */}
          {chromaEnabled && (
            <defs>
              {layout.edges.map((edge) => {
                const fromColor = getWordChromaInfo(trackId, activeLineIndex, edge.fromIndex, chromaVividness).hex;
                const toColor = getWordChromaInfo(trackId, activeLineIndex, edge.toIndex, chromaVividness).hex;
                return (
                  <linearGradient
                    key={`branch-grad-${edge.fromIndex}-${edge.toIndex}`}
                    id={`branch-edge-${edge.fromIndex}-${edge.toIndex}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={fromColor} />
                    <stop offset="100%" stopColor={toColor} />
                  </linearGradient>
                );
              })}
            </defs>
          )}

          {/* Curved Git-Graph Branch Connectors */}
          <g className="edges">
            {layout.edges.map((edge, idx) => {
              const isCompleted = activeWordIndex >= edge.toIndex;
              const isCurrent = activeWordIndex === edge.fromIndex;
              const edgeAge = activeWordIndex - edge.toIndex;

              const strokeDasharray = edge.length;
              const strokeDashoffset = isCompleted
                ? 0
                : isCurrent
                ? edge.length * 0.4
                : edge.length;

              const edgeStroke = chromaEnabled
                ? `url(#branch-edge-${edge.fromIndex}-${edge.toIndex})`
                : isCompleted || isCurrent
                ? 'var(--highlight, #ef4444)'
                : '#444444';

              // Recent trail stays bright; older branches fade with age
              const strokeOpacity = isCurrent
                ? 0.95
                : isCompleted
                ? edgeAge > 8
                  ? 0.35
                  : 0.85
                : 0.25;

              return (
                <path
                  key={`branch-edge-${idx}-${edge.fromIndex}-${edge.toIndex}`}
                  d={edge.pathD}
                  stroke={edgeStroke}
                  strokeWidth={isCurrent ? 3 : 2}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeOpacity={strokeOpacity}
                  fill="none"
                  className="transition-all duration-300"
                />
              );
            })}
          </g>

          {/* Nodes (Git Commit Circles + Word Labels) */}
          <g className="nodes">
            {layout.nodes.map((node) => {
              const isPast = node.index < activeWordIndex;
              const isActive = node.index === activeWordIndex;
              const age = activeWordIndex - node.index;
              const emoji =
                showIcons && node.word.text ? getEmojiForLyricWord(node.word.text) : null;

              const nodeChroma = chromaEnabled
                ? getWordChromaInfo(trackId, activeLineIndex, node.index, chromaVividness)
                : null;

              // Recent trail stays in clear view; older branches fade with age
              const nodeOpacity = isActive
                ? 1
                : isPast
                ? age > 8
                  ? 0.3
                  : 0.5
                : 0.25;

              return (
                <g
                  key={`branch-node-${node.index}-${node.word.text}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-all duration-300"
                  opacity={nodeOpacity}
                >
                  {/* Active Glowing Pulse Ring (uses node's Chroma color) */}
                  {isActive && (
                    <circle
                      r={18}
                      fill="none"
                      stroke={nodeChroma ? nodeChroma.hex : 'var(--highlight, #ef4444)'}
                      strokeWidth={2}
                      className="animate-ping opacity-60"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={isActive ? 9 : 6}
                    fill={
                      nodeChroma
                        ? nodeChroma.hex
                        : isActive
                        ? 'var(--highlight, #ef4444)'
                        : isPast
                        ? '#888888'
                        : '#444444'
                    }
                    stroke={nodeChroma ? nodeChroma.hex : isActive ? 'var(--highlight, #ef4444)' : 'none'}
                    strokeWidth={isActive ? 2 : 0}
                    className="transition-all duration-200"
                  />

                  {/* Word Label */}
                  <text
                    x={0}
                    y={node.y > 300 ? 28 : -16}
                    textAnchor="middle"
                    fontSize={isActive ? 22 : 16}
                    fontWeight={isActive ? '800' : '600'}
                    fill={
                      nodeChroma
                        ? nodeChroma.hex
                        : isActive
                        ? 'var(--highlight, #ef4444)'
                        : 'var(--lyric, #ffffff)'
                    }
                    style={
                      isActive && nodeChroma
                        ? { filter: `drop-shadow(0 0 6px ${nodeChroma.hex}) drop-shadow(0 0 16px ${nodeChroma.hex}88)` }
                        : undefined
                    }
                    className={`select-none tracking-tight transition-all duration-200 ${
                      isActive && !nodeChroma ? 'active-glyph-glow' : ''
                    }`}
                  >
                    {node.word.text}
                  </text>

                  {/* Pop-in Emoji (not recolored) */}
                  {emoji && isActive && (
                    <text
                      x={0}
                      y={node.y > 300 ? 54 : -40}
                      textAnchor="middle"
                      fontSize={22}
                      className="select-none"
                    >
                      {emoji}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
