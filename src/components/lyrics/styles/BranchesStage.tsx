'use client';

import React, { useMemo } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { generateBranchesLayout } from '@/lib/lyrics/layoutNodes';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { getWordChromaInfo } from '@/lib/lyrics/chroma';

interface BranchesStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  chromaEnabled?: boolean;
  chromaVividness?: number;
  trackId?: string;
}

export default function BranchesStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  chromaEnabled = false,
  chromaVividness = 80,
  trackId,
}: BranchesStageProps) {
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

  if (!activeLine || layout.nodes.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-500 text-sm select-none">
        Waiting for vocals...
      </div>
    );
  }

  return (
    <div
      key={`branches-line-${activeLineIndex}`}
      className="w-full h-full flex items-center justify-center select-none relative overflow-hidden transition-opacity duration-300"
    >
      <svg
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

            return (
              <path
                key={`branch-edge-${idx}-${edge.fromIndex}-${edge.toIndex}`}
                d={edge.pathD}
                stroke={edgeStroke}
                strokeWidth={isCurrent ? 3 : 2}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeOpacity={isCompleted ? 0.85 : isCurrent ? 0.95 : 0.25}
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
            const emoji =
              showIcons && node.word.text ? getEmojiForLyricWord(node.word.text) : null;

            const nodeChroma = chromaEnabled
              ? getWordChromaInfo(trackId, activeLineIndex, node.index, chromaVividness)
              : null;

            return (
              <g
                key={`branch-node-${node.index}-${node.word.text}`}
                transform={`translate(${node.x}, ${node.y})`}
                className="transition-all duration-300"
                opacity={isActive ? 1 : isPast ? 0.5 : 0.25}
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
  );
}
