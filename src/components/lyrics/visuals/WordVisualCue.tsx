'use client';

import React, { useMemo } from 'react';
import { VisualCue, VisualStyle } from '@/lib/lyrics/visuals/types';
import { getAssetById } from '@/lib/lyrics/visuals/manifest';

interface WordVisualCueProps {
  cue: VisualCue | null | undefined;
  visualStyle?: VisualStyle;
  enabled?: boolean;
  size?: number; // base size in px (e.g. 28, 36, 48)
  chromaColor?: string;
  className?: string;
}

/**
 * HTML stage visual cue renderer (for Visual, Fisheye, Codestyle, Camera, Ship, Classic).
 */
export function WordVisualCue({
  cue,
  visualStyle = 'illustrated',
  enabled = true,
  size = 36,
  chromaColor,
  className = '',
}: WordVisualCueProps) {
  if (!enabled || !cue || visualStyle === 'off') {
    return null;
  }

  const asset = getAssetById(cue.imageId);
  if (!asset) {
    return null;
  }

  // Emoji mode fallback
  if (visualStyle === 'emoji') {
    return (
      <span
        aria-hidden="true"
        className={`inline-block select-none animate-pop-in transition-transform ${className}`}
        style={{
          fontSize: `${Math.round(size * 0.9)}px`,
          lineHeight: 1,
        }}
      >
        {asset.fallbackEmoji}
      </span>
    );
  }

  // Line icon mode (styled by currentColor / chromaColor)
  if (visualStyle === 'line') {
    const rawLineSvg = asset.lineSvg;
    return (
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center select-none animate-pop-in shrink-0 ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          color: chromaColor || 'var(--highlight, #ef4444)',
        }}
        dangerouslySetInnerHTML={{ __html: rawLineSvg }}
      />
    );
  }

  // Illustrated mode (full color / multi-layer gradient SVG)
  const rawIllustratedSvg = asset.illustratedSvg;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center select-none animate-pop-in shrink-0 drop-shadow-md ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      dangerouslySetInnerHTML={{ __html: rawIllustratedSvg }}
    />
  );
}

interface SvgWordVisualCueProps {
  cue: VisualCue | null | undefined;
  visualStyle?: VisualStyle;
  enabled?: boolean;
  x: number;
  y: number;
  size?: number;
  chromaColor?: string;
}

/**
 * Native SVG stage visual cue renderer (for Constellation, Branches, Web).
 */
export function SvgWordVisualCue({
  cue,
  visualStyle = 'illustrated',
  enabled = true,
  x,
  y,
  size = 28,
  chromaColor,
}: SvgWordVisualCueProps) {
  if (!enabled || !cue || visualStyle === 'off') {
    return null;
  }

  const asset = getAssetById(cue.imageId);
  if (!asset) return null;

  // Emoji fallback in SVG text
  if (visualStyle === 'emoji') {
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.round(size * 0.85)}
        className="select-none animate-pop-in"
        aria-hidden="true"
      >
        {asset.fallbackEmoji}
      </text>
    );
  }

  const half = size / 2;
  const svgData = visualStyle === 'line' ? asset.lineSvg : asset.illustratedSvg;

  // Convert SVG string to data URI for universal clean embedding inside SVG <image>
  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(
    visualStyle === 'line' && chromaColor
      ? svgData.replace(/currentColor/g, chromaColor)
      : svgData
  )}`;

  return (
    <g transform={`translate(${x - half}, ${y - half})`} className="animate-pop-in" aria-hidden="true">
      <image
        href={dataUri}
        width={size}
        height={size}
        className="select-none pointer-events-none"
      />
    </g>
  );
}

/**
 * Preload the upcoming visual assets so they are already cached and GPU-ready
 */
export function preloadUpcomingCues(cues: (VisualCue | null | undefined)[]): void {
  if (typeof window === 'undefined') return;
  for (const cue of cues) {
    if (!cue) continue;
    const asset = getAssetById(cue.imageId);
    if (!asset) continue;
    try {
      const img = new window.Image();
      img.src = `data:image/svg+xml;utf8,${encodeURIComponent(asset.illustratedSvg)}`;
    } catch {
      // Ignore in non-browser environments
    }
  }
}
