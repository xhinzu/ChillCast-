'use client';

import React from 'react';
import { useBeatEnergy } from '@/hooks/useBeatEnergy';
import { EdgeGlowMode } from '@/lib/lyrics/settings';

interface EdgeGlowProps {
  enabled: boolean;
  mode: EdgeGlowMode;
  thickness: number; // in px
  glowSize: number;  // in px
  highlightColor?: string;
  secondaryColor?: string;
}

export default function EdgeGlow({
  enabled,
  mode,
  thickness = 4,
  glowSize = 28,
  highlightColor = '#ef4444',
  secondaryColor = '#f59e0b',
}: EdgeGlowProps) {
  const isMusicSync = mode === 'music_sync';
  const beatEnergy = useBeatEnergy(enabled, isMusicSync);

  if (!enabled) return null;

  // Modulate intensity based on beat energy (0.3 to 1.0)
  const currentIntensity = isMusicSync ? Math.max(0.25, Math.min(1.0, beatEnergy)) : 0.65;
  const dynamicSize = glowSize * (0.8 + currentIntensity * 0.45);
  const dynamicThickness = thickness * (0.85 + currentIntensity * 0.3);

  // 60% primary highlight, 40% secondary blend
  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden transition-all duration-150 z-20"
      style={{
        boxShadow: `
          inset 0 0 ${dynamicSize}px ${dynamicThickness}px ${highlightColor}88,
          inset 0 0 ${dynamicSize * 1.8}px ${dynamicThickness * 1.5}px ${secondaryColor}55,
          0 0 ${dynamicSize * 0.6}px ${highlightColor}44
        `,
        opacity: Math.max(0.3, currentIntensity),
      }}
    >
      {/* Subtle perimeter border gradient */}
      <div
        className="w-full h-full rounded-[inherit] border transition-opacity duration-300"
        style={{
          borderWidth: `${Math.max(1, dynamicThickness * 0.5)}px`,
          borderColor: `${highlightColor}aa`,
          opacity: currentIntensity * 0.8,
        }}
      />
    </div>
  );
}
