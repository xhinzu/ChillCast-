'use client';

import React, { useMemo } from 'react';
import { SyncedLyricLine, LyricWord } from '@/lib/lyrics/providers/types';
import { generateContinuousConstellationLayout } from '@/lib/lyrics/layoutNodes';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { useCamera } from '@/hooks/useCamera';
import { CameraMovementSetting } from '@/lib/lyrics/settings';

interface ConstellationStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  scale?: number;
  cameraMovement?: CameraMovementSetting;
  cameraZoom?: number;
  isPaused?: boolean;
  reducedMotion?: boolean;
  trackId?: string;
}

// 4-pointed SVG star polygon
function StarIcon({ size = 16, active = false }: { size?: number; active?: boolean }) {
  const half = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`overflow-visible transition-all duration-300 ${active ? 'scale-125' : ''}`}
    >
      <polygon
        points={`${half},0 ${half * 1.25},${half * 0.75} ${size},${half} ${half * 1.25},${half * 1.25} ${half},${size} ${half * 0.75},${half * 1.25} 0,${half} ${half * 0.75},${half * 0.75}`}
        fill={active ? 'var(--highlight, #ef4444)' : 'currentColor'}
        stroke={active ? 'var(--highlight, #ef4444)' : 'none'}
        strokeWidth={active ? 1.5 : 0}
      />
    </svg>
  );
}

export default function ConstellationStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  scale = 1.0,
  cameraMovement = 'subtle',
  cameraZoom = 1.0,
  isPaused = false,
  reducedMotion = false,
  trackId = 'default',
}: ConstellationStageProps) {
  // Flatten all words across all lines into a continuous stream
  const { allWords, activeGlobalIndex } = useMemo(() => {
    const list: { word: LyricWord; lineIndex: number; wordIndex: number }[] = [];
    let currentGlobal = 0;
    let foundIndex = 0;

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      if (!line.words) continue;
      for (let w = 0; w < line.words.length; w++) {
        list.push({ word: line.words[w], lineIndex: l, wordIndex: w });
        if (l === activeLineIndex && w === activeWordIndex) {
          foundIndex = currentGlobal;
        }
        currentGlobal++;
      }
    }

    return { allWords: list, activeGlobalIndex: foundIndex };
  }, [lines, activeLineIndex, activeWordIndex]);

  // Continuous seeded layout across entire song
  const layout = useMemo(() => {
    if (allWords.length === 0) return { nodes: [], edges: [] };
    return generateContinuousConstellationLayout(allWords, trackId || 'constellation-seed', scale);
  }, [allWords, trackId, scale]);

  const activeNode = layout.nodes[activeGlobalIndex] || { x: 500, y: 300 };

  // Shared spring-damped camera tracking the active star
  const camera = useCamera(
    { x: activeNode.x, y: activeNode.y, zoom: 1.0 },
    {
      movement: cameraMovement,
      userZoom: cameraZoom,
      viewportWidth: 1000,
      viewportHeight: 600,
      isPaused,
      reducedMotion,
    }
  );

  if (allWords.length === 0 || layout.nodes.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-zinc-500 text-sm select-none">
        Waiting for vocals...
      </div>
    );
  }

  // Active trail window: retain previous 14 nodes, active node, and next 5 nodes
  const minVisible = Math.max(0, activeGlobalIndex - 14);
  const maxVisible = Math.min(layout.nodes.length - 1, activeGlobalIndex + 6);

  const visibleNodes = layout.nodes.slice(minVisible, maxVisible + 1);
  const visibleEdges = layout.edges.filter(
    (e) => e.fromIndex >= minVisible && e.toIndex <= maxVisible
  );

  return (
    <div className="w-full h-full flex items-center justify-center select-none relative overflow-hidden">
      {/* Virtual Camera Stage Layer */}
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
          {/* Progressive Connecting Lines */}
          <g className="edges">
            {visibleEdges.map((edge, idx) => {
              const isPast = activeGlobalIndex > edge.toIndex;
              const isCurrent = activeGlobalIndex === edge.toIndex || activeGlobalIndex === edge.fromIndex;
              const age = activeGlobalIndex - edge.fromIndex;

              const opacity = isCurrent
                ? 0.85
                : isPast
                ? Math.max(0.02, 0.65 - age * 0.05)
                : 0.15;

              return (
                <path
                  key={`edge-${idx}-${edge.fromIndex}-${edge.toIndex}`}
                  d={edge.pathD}
                  stroke={isCurrent ? 'var(--highlight, #ef4444)' : '#666666'}
                  strokeWidth={(isCurrent ? 2.2 : 1.2) * scale}
                  strokeOpacity={opacity}
                  className="transition-all duration-300"
                  fill="none"
                />
              );
            })}
          </g>

          {/* Nodes (Stars + Words) */}
          <g className="nodes">
            {visibleNodes.map((node) => {
              const isPast = node.index < activeGlobalIndex;
              const isActive = node.index === activeGlobalIndex;
              const age = activeGlobalIndex - node.index;

              // Opacity fades smoothly by age without popping
              const opacity = isActive
                ? 1.0
                : isPast
                ? Math.max(0.04, 0.7 - age * 0.055)
                : 0.35;

              const emoji =
                showIcons && node.word.text ? getEmojiForLyricWord(node.word.text) : null;

              return (
                <g
                  key={`node-${node.index}-${node.word.text}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-opacity duration-300"
                  opacity={opacity}
                >
                  {/* Star Icon */}
                  <g transform={`translate(${-10 * scale}, ${-10 * scale})`}>
                    <StarIcon size={20 * scale} active={isActive} />
                  </g>

                  {/* Word Label */}
                  <text
                    x={16 * scale}
                    y={5 * scale}
                    fontSize={(isActive ? 24 : 17) * scale}
                    fontWeight={isActive ? '800' : '500'}
                    fill={isActive ? 'var(--highlight, #ef4444)' : 'var(--lyric, #ffffff)'}
                    className={`select-none tracking-tight transition-all duration-200 ${
                      isActive ? 'active-glyph-glow' : ''
                    }`}
                  >
                    {node.word.text}
                  </text>

                  {/* Small Icon Pop */}
                  {emoji && isActive && (
                    <text
                      x={node.width + 12 * scale}
                      y={6 * scale}
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
