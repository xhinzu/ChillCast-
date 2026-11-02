'use client';

import React, { useMemo, useRef } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { generateConstellationLayout } from '@/lib/lyrics/layoutNodes';
import { useCamera } from '@/hooks/useCamera';
import { getWordChromaInfo } from '@/lib/lyrics/chroma';
import { SvgWordVisualCue } from '../visuals/WordVisualCue';
import { VisualCueTimeline, VisualStyle } from '@/lib/lyrics/visuals/types';

interface ConstellationStageProps {
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

// 4-pointed SVG star polygon
function StarIcon({
  size = 16,
  active = false,
  color,
}: {
  size?: number;
  active?: boolean;
  color?: string;
}) {
  const half = size / 2;
  const starFill = color || (active ? 'var(--highlight, #ef4444)' : 'currentColor');
  const starStroke = color ? (active ? color : 'none') : (active ? 'var(--highlight, #ef4444)' : 'none');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`overflow-visible transition-all duration-300 ${active ? 'scale-125' : ''}`}
    >
      <polygon
        points={`${half},0 ${half * 1.25},${half * 0.75} ${size},${half} ${half * 1.25},${half * 1.25} ${half},${size} ${half * 0.75},${half * 1.25} 0,${half} ${half * 0.75},${half * 0.75}`}
        fill={starFill}
        stroke={starStroke}
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
  wordImagesEnabled = true,
  visualStyle = 'illustrated',
  visualTimeline,
  cameraMovementEnabled = true,
  chromaEnabled = false,
  chromaVividness = 80,
  trackId,
}: ConstellationStageProps) {
  const worldRef = useRef<HTMLDivElement | null>(null);

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

  const activeNode = layout.nodes.find((n) => n.index === activeWordIndex);

  // Very slight camera focus on active star: low follow strength (a few percent of viewport),
  // almost no zoom change (max about 1.03), long settle time (1.2s), so whole constellation stays in view.
  const target = activeNode
    ? {
        x: (activeNode.x - 500) * 0.12,
        y: (activeNode.y - 300) * 0.12,
      }
    : null;

  useCamera({
    worldRef,
    target,
    enabled: cameraMovementEnabled,
    coordinateMode: 'relative',
    followStrength: 1.0,
    settleTime: 1.2,
    zoomLevel: 1.0,
    zoomPulseAmount: 0.025,
    idleDriftAmount: 3.5,
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
      key={`constellation-line-${activeLineIndex}`}
      className="w-full h-full flex items-center justify-center select-none relative overflow-hidden transition-opacity duration-300"
    >
      {/* World Container (Controlled by useCamera via Ref) */}
      <div
        ref={worldRef}
        className="w-full h-full flex items-center justify-center transform-gpu"
        style={{
          transformOrigin: 'center center',
        }}
      >
        {/* SVG Canvas for Stars, Words, and Connecting Lines */}
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
                    key={`const-grad-${edge.fromIndex}-${edge.toIndex}`}
                    id={`const-edge-${edge.fromIndex}-${edge.toIndex}`}
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

              const edgeStroke = chromaEnabled
                ? `url(#const-edge-${edge.fromIndex}-${edge.toIndex})`
                : isCompleted || isCurrent
                ? 'var(--highlight, #ef4444)'
                : '#555555';

              return (
                <path
                  key={`edge-${idx}-${edge.fromIndex}-${edge.toIndex}`}
                  d={edge.pathD}
                  stroke={edgeStroke}
                  strokeWidth={isCurrent ? 2.5 : 1.2}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeOpacity={isCompleted ? 0.75 : isCurrent ? 0.95 : 0.25}
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

              const nodeChroma = chromaEnabled
                ? getWordChromaInfo(trackId, activeLineIndex, node.index, chromaVividness)
                : null;

              return (
                <g
                  key={`node-${node.index}-${node.word.text}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-all duration-300"
                  opacity={isActive ? 1 : isPast ? 0.45 : 0.25}
                >
                  {/* 4-pointed SVG Star at Node Position */}
                  <g transform="translate(-10, -10)">
                    <StarIcon size={20} active={isActive} color={nodeChroma?.hex} />
                  </g>

                  {/* Word Label */}
                  <text
                    x={16}
                    y={5}
                    fontSize={isActive ? 24 : 17}
                    fontWeight={isActive ? '800' : '500'}
                    fill={nodeChroma ? nodeChroma.hex : isActive ? 'var(--highlight, #ef4444)' : 'var(--lyric, #ffffff)'}
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

                  {/* Word Visual Cue in SVG */}
                  {isActive && (
                    <SvgWordVisualCue
                      cue={visualTimeline?.getCue(activeLineIndex, node.index)}
                      visualStyle={visualStyle}
                      enabled={wordImagesEnabled ?? showIcons}
                      x={node.width + 30}
                      y={-1}
                      size={24}
                      chromaColor={nodeChroma?.hex}
                    />
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
