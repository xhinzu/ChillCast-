'use client';

import React, { useMemo, useRef } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { generateWebLayout } from '@/lib/lyrics/layoutNodes';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';
import { useCamera } from '@/hooks/useCamera';
import { getWordChromaInfo } from '@/lib/lyrics/chroma';

interface WebStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  cameraMovementEnabled?: boolean;
  chromaEnabled?: boolean;
  chromaVividness?: number;
  trackId?: string;
}

export default function WebStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  cameraMovementEnabled = true,
  chromaEnabled = false,
  chromaVividness = 80,
  trackId,
}: WebStageProps) {
  const worldRef = useRef<HTMLDivElement | null>(null);

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

  const activeNode = layout.nodes.find((n) => n.index === activeWordIndex);

  // Camera focuses on active node: pans so active word is near center and zooms in moderately (~1.35x),
  // smooth spring with ~0.6s settle
  const target = activeNode
    ? {
        x: (activeNode.x - 500) * 0.75,
        y: (activeNode.y - 300) * 0.75,
      }
    : null;

  useCamera({
    worldRef,
    target,
    enabled: cameraMovementEnabled,
    coordinateMode: 'relative',
    followStrength: 1.0,
    settleTime: 0.6,
    zoomLevel: 1.35,
    zoomPulseAmount: 0.05,
    idleDriftAmount: 4,
  });

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
      {/* World Container (Controlled by useCamera via Ref) */}
      <div
        ref={worldRef}
        className="w-full h-full flex items-center justify-center transform-gpu"
        style={{
          transformOrigin: 'center center',
        }}
      >
        <svg
          viewBox="0 0 1000 600"
          className="w-full h-full max-w-5xl max-h-[75vh] object-contain overflow-visible"
        >
          {/* Chroma Edge Gradients */}
          {chromaEnabled && (
            <defs>
              {layout.edges.map((edge) => {
                const fromColor = edge.fromIndex >= 0
                  ? getWordChromaInfo(trackId, activeLineIndex, edge.fromIndex, chromaVividness).hex
                  : getWordChromaInfo(trackId, activeLineIndex, Math.max(0, activeWordIndex), chromaVividness).hex;
                const toColor = getWordChromaInfo(trackId, activeLineIndex, edge.toIndex, chromaVividness).hex;
                return (
                  <linearGradient
                    key={`web-grad-${edge.fromIndex}-${edge.toIndex}`}
                    id={`web-edge-${edge.fromIndex}-${edge.toIndex}`}
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

          {/* Central Hub Glow */}
          <circle
            cx={centerX}
            cy={centerY}
            r={6}
            fill={
              chromaEnabled
                ? getWordChromaInfo(trackId, activeLineIndex, Math.max(0, activeWordIndex), chromaVividness).hex
                : 'var(--highlight, #ef4444)'
            }
            className="opacity-80 animate-pulse"
          />

          {/* Web Network Connecting Lines */}
          <g className="edges">
            {layout.edges.map((edge, idx) => {
              const isConnectedToActive =
                edge.fromIndex === activeWordIndex || edge.toIndex === activeWordIndex;
              const isCompleted =
                activeWordIndex >= edge.toIndex && edge.fromIndex !== -1;

              const edgeStroke = chromaEnabled
                ? `url(#web-edge-${edge.fromIndex}-${edge.toIndex})`
                : isConnectedToActive
                ? 'var(--highlight, #ef4444)'
                : isCompleted
                ? 'var(--secondary, #888888)'
                : '#333333';

              return (
                <path
                  key={`web-edge-${idx}-${edge.fromIndex}-${edge.toIndex}`}
                  d={edge.pathD}
                  stroke={edgeStroke}
                  strokeWidth={isConnectedToActive ? 3 : 1}
                  strokeOpacity={isConnectedToActive ? 1.0 : isCompleted ? 0.45 : 0.18}
                  style={
                    isConnectedToActive && !chromaEnabled
                      ? { filter: 'drop-shadow(0 0 6px var(--highlight, #ef4444))' }
                      : undefined
                  }
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

              const nodeChroma = chromaEnabled
                ? getWordChromaInfo(trackId, activeLineIndex, node.index, chromaVividness)
                : null;

              return (
                <g
                  key={`web-node-${node.index}-${node.word.text}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-all duration-300"
                  opacity={isActive ? 1 : isPast ? 0.45 : 0.22}
                >
                  {/* Node Point */}
                  <circle
                    r={isActive ? 8 : 4}
                    fill={nodeChroma ? nodeChroma.hex : isActive ? 'var(--highlight, #ef4444)' : 'currentColor'}
                    stroke={nodeChroma ? nodeChroma.hex : isActive ? 'var(--highlight, #ef4444)' : 'none'}
                    strokeWidth={isActive ? 2 : 0}
                    className="transition-all duration-200"
                  />

                  {/* Word Label */}
                  <text
                    x={node.x >= centerX ? 14 : -14}
                    y={5}
                    textAnchor={node.x >= centerX ? 'start' : 'end'}
                    fontSize={isActive ? 22 : 15}
                    fontWeight={isActive ? '800' : '600'}
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

                  {/* Emoji Icon (not recolored) */}
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
    </div>
  );
}
