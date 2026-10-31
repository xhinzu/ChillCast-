'use client';

import React, { useMemo } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { generateBranchesLayout } from '@/lib/lyrics/layoutNodes';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { useCamera } from '@/hooks/useCamera';
import { CameraMovementSetting } from '@/lib/lyrics/settings';

interface BranchesStageProps {
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

export default function BranchesStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  scale = 1.0,
  cameraMovement = 'subtle',
  cameraZoom = 1.0,
  isPaused = false,
  reducedMotion = false,
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

  const activeNode = layout.nodes[activeWordIndex] || { x: 500, y: 300 };

  // Camera smoothly tracks the active node / branch tip
  const camera = useCamera(
    {
      x: activeNode.x,
      y: activeNode.y,
      zoom: 1.06,
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

  if (!activeLine || layout.nodes.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-500 text-sm select-none">
        Waiting for vocals...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center select-none relative overflow-hidden">
      {/* World Stage under Camera */}
      <div
        className="w-[1000px] h-[600px] relative transition-transform duration-75 ease-out transform-gpu shrink-0"
        style={{
          transform: camera.transform,
          transformOrigin: '500px 300px',
        }}
      >
        <svg
          viewBox="0 0 1000 600"
          className="w-full h-full overflow-visible"
        >
          {/* Curved Git-Graph Branch Connectors */}
          <g className="edges">
            {layout.edges.map((edge, idx) => {
              const isCompleted = activeWordIndex >= edge.toIndex;
              const isCurrent = activeWordIndex === edge.fromIndex || activeWordIndex === edge.toIndex;

              const strokeDasharray = edge.length;
              const strokeDashoffset = isCompleted
                ? 0
                : isCurrent
                ? edge.length * 0.3
                : edge.length;

              return (
                <path
                  key={`branch-edge-${idx}-${edge.fromIndex}-${edge.toIndex}`}
                  d={edge.pathD}
                  stroke={isCurrent ? 'var(--highlight, #ef4444)' : isCompleted ? 'var(--secondary, #888888)' : '#444444'}
                  strokeWidth={(isCurrent ? 3.2 : 2.0) * scale}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeOpacity={isCurrent ? 1.0 : isCompleted ? 0.75 : 0.2}
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

              return (
                <g
                  key={`branch-node-${node.index}-${node.word.text}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-all duration-300"
                  opacity={isActive ? 1 : isPast ? 0.5 : 0.22}
                >
                  {/* Active Glowing Pulse Ring */}
                  {isActive && (
                    <circle
                      r={19 * scale}
                      fill="none"
                      stroke="var(--highlight, #ef4444)"
                      strokeWidth={2 * scale}
                      className="animate-ping opacity-60"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={(isActive ? 9.5 : 6) * scale}
                    fill={isActive ? 'var(--highlight, #ef4444)' : isPast ? '#888888' : '#444444'}
                    stroke={isActive ? 'var(--highlight, #ef4444)' : 'none'}
                    strokeWidth={(isActive ? 2 : 0) * scale}
                    className="transition-all duration-200"
                  />

                  {/* Word Label */}
                  <text
                    x={0}
                    y={(node.y > 300 ? 28 : -16) * scale}
                    textAnchor="middle"
                    fontSize={(isActive ? 23 : 16) * scale}
                    fontWeight={isActive ? '800' : '600'}
                    fill={isActive ? 'var(--highlight, #ef4444)' : 'var(--lyric, #ffffff)'}
                    className={`select-none tracking-tight transition-all duration-200 ${
                      isActive ? 'active-glyph-glow' : ''
                    }`}
                  >
                    {node.word.text}
                  </text>

                  {/* Pop-in Emoji Icon */}
                  {emoji && isActive && (
                    <text
                      x={0}
                      y={(node.y > 300 ? 56 : -42) * scale}
                      textAnchor="middle"
                      fontSize={22 * scale}
                      className="select-none animate-pop-in"
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
