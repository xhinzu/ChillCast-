'use client';

import React, { useMemo } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { generateConstellationLayout } from '@/lib/lyrics/layoutNodes';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';

interface ConstellationStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
}

// 4-pointed SVG star polygon
function StarIcon({ size = 16, active = false }: { size?: number; active?: boolean }) {
  const half = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`transition-all duration-300 ${active ? 'scale-125 filter drop-shadow-[0_0_8px_var(--highlight,#ef4444)]' : ''}`}
    >
      <polygon
        points={`${half},0 ${half * 1.25},${half * 0.75} ${size},${half} ${half * 1.25},${half * 1.25} ${half},${size} ${half * 0.75},${half * 1.25} 0,${half} ${half * 0.75},${half * 0.75}`}
        fill={active ? 'var(--highlight, #ef4444)' : 'currentColor'}
      />
    </svg>
  );
}

export default function ConstellationStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
}: ConstellationStageProps) {
  const activeLine =
    activeLineIndex >= 0 && activeLineIndex < lines.length
      ? lines[activeLineIndex]
      : null;

  // Stable layout per line seeded by activeLineIndex
  const layout = useMemo(() => {
    if (!activeLine || !activeLine.words || activeLine.words.length === 0) {
      return { nodes: [], edges: [] };
    }
    return generateConstellationLayout(
      activeLine.words,
      activeLineIndex,
      1000,
      600
    );
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
      key={`constellation-line-${activeLineIndex}`}
      className="w-full h-full flex items-center justify-center select-none relative overflow-hidden transition-opacity duration-300"
    >
      {/* SVG Canvas for Stars, Words, and Connecting Lines */}
      <svg
        viewBox="0 0 1000 600"
        className="w-full h-full max-w-5xl max-h-[75vh] object-contain overflow-visible"
      >
        {/* Progressive Connecting Lines */}
        <g className="edges">
          {layout.edges.map((edge, idx) => {
            const isCompleted = activeWordIndex > edge.fromIndex;
            const isCurrent = activeWordIndex === edge.fromIndex;

            // Stroke dash progression
            const strokeDasharray = edge.length;
            const strokeDashoffset = isCompleted
              ? 0
              : isCurrent
              ? edge.length * 0.4
              : edge.length;

            return (
              <path
                key={`edge-${idx}-${edge.fromIndex}-${edge.toIndex}`}
                d={edge.pathD}
                stroke={isCompleted || isCurrent ? 'var(--highlight, #ef4444)' : '#555555'}
                strokeWidth={isCurrent ? 2 : 1}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeOpacity={isCompleted ? 0.65 : isCurrent ? 0.8 : 0.15}
                className="transition-all duration-300"
                fill="none"
              />
            );
          })}
        </g>

        {/* Nodes (Stars + Words) */}
        <g className="nodes">
          {layout.nodes.map((node) => {
            const isPast = node.index < activeWordIndex;
            const isActive = node.index === activeWordIndex;
            const isUpcoming = node.index > activeWordIndex;

            const emoji =
              showIcons && node.word.text ? getEmojiForLyricWord(node.word.text) : null;

            return (
              <g
                key={`node-${node.index}-${node.word.text}`}
                transform={`translate(${node.x}, ${node.y})`}
                className="transition-all duration-300"
                opacity={isActive ? 1 : isPast ? 0.4 : 0.15}
              >
                {/* 4-pointed SVG Star at Node Position */}
                <g transform="translate(-10, -10)">
                  <StarIcon size={20} active={isActive} />
                </g>

                {/* Word Label */}
                <text
                  x={16}
                  y={5}
                  fontSize={isActive ? 24 : 17}
                  fontWeight={isActive ? '800' : '500'}
                  fill={isActive ? 'var(--highlight, #ef4444)' : 'var(--lyric, #ffffff)'}
                  className="select-none tracking-tight transition-all duration-200"
                  filter={isActive ? 'drop-shadow(0 0 12px var(--highlight, #ef4444))' : undefined}
                >
                  {node.word.text}
                </text>

                {/* Optional Emoji */}
                {emoji && isActive && (
                  <text x={node.width + 10} y={6} fontSize={22} className="select-none">
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
