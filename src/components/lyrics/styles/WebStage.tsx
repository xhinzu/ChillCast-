'use client';

import React, { useMemo } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { generateWebLayout } from '@/lib/lyrics/layoutNodes';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';

interface WebStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
}

export default function WebStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
}: WebStageProps) {
  const activeLine =
    activeLineIndex >= 0 && activeLineIndex < lines.length
      ? lines[activeLineIndex]
      : null;

  // Stable spider-web layout per line seeded by line index
  const layout = useMemo(() => {
    if (!activeLine || !activeLine.words || activeLine.words.length === 0) {
      return { nodes: [], edges: [] };
    }
    return generateWebLayout(activeLine.words, activeLineIndex, 1000, 600);
  }, [activeLine, activeLineIndex]);

  if (!activeLine || layout.nodes.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-500 text-sm select-none">
        Waiting for vocals...
      </div>
    );
  }

  const centerX = 500;
  const centerY = 300;

  return (
    <div
      key={`web-line-${activeLineIndex}`}
      className="w-full h-full flex items-center justify-center select-none relative overflow-hidden transition-opacity duration-300"
    >
      <svg
        viewBox="0 0 1000 600"
        className="w-full h-full max-w-5xl max-h-[75vh] object-contain overflow-visible"
      >
        {/* Central Hub Glow */}
        <circle
          cx={centerX}
          cy={centerY}
          r={6}
          fill="var(--highlight, #ef4444)"
          className="opacity-70 animate-pulse"
        />

        {/* Web Network Connecting Lines */}
        <g className="edges">
          {layout.edges.map((edge, idx) => {
            const isConnectedToActive =
              edge.fromIndex === activeWordIndex || edge.toIndex === activeWordIndex;
            const isCompleted =
              activeWordIndex >= edge.toIndex && edge.fromIndex !== -1;

            return (
              <path
                key={`web-edge-${idx}-${edge.fromIndex}-${edge.toIndex}`}
                d={edge.pathD}
                stroke={
                  isConnectedToActive
                    ? 'var(--highlight, #ef4444)'
                    : isCompleted
                    ? 'var(--secondary, #888888)'
                    : '#333333'
                }
                strokeWidth={isConnectedToActive ? 2.5 : 1}
                strokeOpacity={isConnectedToActive ? 0.9 : isCompleted ? 0.4 : 0.15}
                className="transition-all duration-300"
                fill="none"
              />
            );
          })}
        </g>

        {/* Web Nodes (Words in Radial Orbit) */}
        <g className="nodes">
          {layout.nodes.map((node) => {
            const isPast = node.index < activeWordIndex;
            const isActive = node.index === activeWordIndex;
            const emoji =
              showIcons && node.word.text ? getEmojiForLyricWord(node.word.text) : null;

            return (
              <g
                key={`web-node-${node.index}-${node.word.text}`}
                transform={`translate(${node.x}, ${node.y})`}
                className="transition-all duration-300"
                opacity={isActive ? 1 : isPast ? 0.4 : 0.2}
              >
                {/* Node Point */}
                <circle
                  r={isActive ? 8 : 4}
                  fill={isActive ? 'var(--highlight, #ef4444)' : 'currentColor'}
                  className="transition-all duration-200"
                  filter={isActive ? 'drop-shadow(0 0 8px var(--highlight, #ef4444))' : undefined}
                />

                {/* Word Label */}
                <text
                  x={node.x >= centerX ? 14 : -14}
                  y={5}
                  textAnchor={node.x >= centerX ? 'start' : 'end'}
                  fontSize={isActive ? 22 : 15}
                  fontWeight={isActive ? '800' : '600'}
                  fill={isActive ? 'var(--highlight, #ef4444)' : 'var(--lyric, #ffffff)'}
                  className="select-none tracking-tight transition-all duration-200"
                  filter={isActive ? 'drop-shadow(0 0 10px var(--highlight, #ef4444))' : undefined}
                >
                  {node.word.text}
                </text>

                {/* Emoji Icon */}
                {emoji && isActive && (
                  <text
                    x={node.x >= centerX ? node.width + 12 : -node.width - 24}
                    y={6}
                    fontSize={20}
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
