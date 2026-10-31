'use client';

import React, { useMemo } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { generateWebLayout } from '@/lib/lyrics/layoutNodes';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { useCamera } from '@/hooks/useCamera';
import { CameraMovementSetting } from '@/lib/lyrics/settings';

interface WebStageProps {
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

export default function WebStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  scale = 1.0,
  cameraMovement = 'subtle',
  cameraZoom = 1.0,
  isPaused = false,
  reducedMotion = false,
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

  const activeNode = layout.nodes[activeWordIndex] || { x: 500, y: 300 };

  // Camera focuses on active node and immediate neighbors
  const camera = useCamera(
    {
      x: activeNode.x,
      y: activeNode.y,
      zoom: 1.08,
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

  const centerX = 500;
  const centerY = 300;

  return (
    <div className="w-full h-full flex items-center justify-center select-none relative overflow-hidden">
      {/* World Canvas under Camera */}
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
          {/* Central Hub Glow */}
          <circle
            cx={centerX}
            cy={centerY}
            r={7 * scale}
            fill="var(--highlight, #ef4444)"
            className="opacity-75 animate-pulse"
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
                  strokeWidth={(isConnectedToActive ? 3.0 : 1.2) * scale}
                  strokeOpacity={isConnectedToActive ? 1.0 : isCompleted ? 0.45 : 0.15}
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
              const distanceToActive = Math.abs(node.index - activeWordIndex);
              const isNeighbor = distanceToActive === 1;

              // Immediate neighbors remain highlighted, distant nodes dim
              const opacity = isActive
                ? 1.0
                : isNeighbor
                ? 0.75
                : isPast
                ? Math.max(0.15, 0.45 - distanceToActive * 0.05)
                : 0.25;

              const emoji =
                showIcons && node.word.text ? getEmojiForLyricWord(node.word.text) : null;

              return (
                <g
                  key={`web-node-${node.index}-${node.word.text}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-all duration-300"
                  opacity={opacity}
                >
                  {/* Node Point */}
                  <circle
                    r={(isActive ? 9 : 4.5) * scale}
                    fill={isActive ? 'var(--highlight, #ef4444)' : 'currentColor'}
                    stroke={isActive ? 'var(--highlight, #ef4444)' : 'none'}
                    strokeWidth={(isActive ? 2.5 : 0) * scale}
                    className="transition-all duration-200"
                  />

                  {/* Word Label */}
                  <text
                    x={(node.x >= centerX ? 16 : -16) * scale}
                    y={5 * scale}
                    textAnchor={node.x >= centerX ? 'start' : 'end'}
                    fontSize={(isActive ? 23 : 15) * scale}
                    fontWeight={isActive ? '800' : '600'}
                    fill={isActive ? 'var(--highlight, #ef4444)' : 'var(--lyric, #ffffff)'}
                    className={`select-none tracking-tight transition-all duration-200 ${
                      isActive ? 'active-glyph-glow' : ''
                    }`}
                  >
                    {node.word.text}
                  </text>

                  {/* Emoji Icon Pop */}
                  {emoji && isActive && (
                    <text
                      x={(node.x >= centerX ? node.width + 14 : -node.width - 28) * scale}
                      y={6 * scale}
                      fontSize={21 * scale}
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
