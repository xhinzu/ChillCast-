'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useBeatEnergy } from '@/hooks/useBeatEnergy';
import { EdgeGlowMode } from '@/lib/lyrics/settings';

interface EdgeGlowProps {
  enabled: boolean;
  mode: EdgeGlowMode;
  thickness: number; // in px
  glowSize: number;  // in px
  highlightColor?: string;
  secondaryColor?: string;
  chromaEnabled?: boolean;
  chromaSpeed?: number;
  chromaVividness?: number;
}

export default function EdgeGlow({
  enabled,
  mode,
  thickness = 4,
  glowSize = 28,
  highlightColor = '#ef4444',
  secondaryColor = '#f59e0b',
  chromaEnabled = false,
  chromaSpeed = 50,
  chromaVividness = 80,
}: EdgeGlowProps) {
  const isMusicSync = mode === 'music_sync';
  const beatEnergy = useBeatEnergy(enabled, isMusicSync);

  // Tab hidden detection to pause CSS animation
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Check for low quality / constrained device to drop the blur copy
  const isLowQuality = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      typeof navigator !== 'undefined' &&
      navigator.hardwareConcurrency !== undefined &&
      navigator.hardwareConcurrency <= 4
    );
  }, []);

  if (!enabled) return null;

  // Modulate intensity based on beat energy (0.3 to 1.0)
  const currentIntensity = isMusicSync ? Math.max(0.25, Math.min(1.0, beatEnergy)) : 0.65;
  const dynamicSize = glowSize * (0.8 + currentIntensity * 0.45);
  const dynamicThickness = thickness * (0.85 + currentIntensity * 0.3);

  // Chroma rotation duration: 3.2s at 100 (fast), ~8.5s at 50 (medium), ~18s at 10 (slow)
  const speedNorm = Math.max(10, Math.min(100, chromaSpeed));
  const rotDuration = (3.2 + Math.pow((100 - speedNorm) / 90, 1.6) * 14.8).toFixed(2);

  // OKLCH full-spectrum conic gradient matching per-word lightness and vividness
  const vNorm = (Math.max(20, Math.min(100, chromaVividness)) - 20) / 80;
  const cVal = (0.15 + vNorm * 0.10).toFixed(3);
  const conicBg = `conic-gradient(
    from 0deg,
    oklch(0.78 ${cVal} 0deg),
    oklch(0.78 ${cVal} 45deg),
    oklch(0.78 ${cVal} 90deg),
    oklch(0.78 ${cVal} 135deg),
    oklch(0.78 ${cVal} 180deg),
    oklch(0.78 ${cVal} 225deg),
    oklch(0.78 ${cVal} 270deg),
    oklch(0.78 ${cVal} 315deg),
    oklch(0.78 ${cVal} 360deg)
  )`;

  return (
    <div className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden z-20">
      {/* 1. Classic Edge Glow Layer (smoothly crossfades out when Chroma is active) */}
      <div
        className="absolute inset-0 rounded-[inherit] transition-opacity duration-300 pointer-events-none"
        style={{
          opacity: chromaEnabled ? 0 : Math.max(0.3, currentIntensity),
          boxShadow: `
            inset 0 0 ${dynamicSize}px ${dynamicThickness}px ${highlightColor}88,
            inset 0 0 ${dynamicSize * 1.8}px ${dynamicThickness * 1.5}px ${secondaryColor}55,
            0 0 ${dynamicSize * 0.6}px ${highlightColor}44
          `,
        }}
      >
        <div
          className="w-full h-full rounded-[inherit] border transition-opacity duration-300"
          style={{
            borderWidth: `${Math.max(1, dynamicThickness * 0.5)}px`,
            borderColor: `${highlightColor}aa`,
            opacity: currentIntensity * 0.8,
          }}
        />
      </div>

      {/* 2. Chroma Running RGB Layer (smoothly crossfades in when Chroma is active) */}
      <div
        className="absolute inset-0 rounded-[inherit] transition-opacity duration-300 pointer-events-none"
        style={{
          opacity: chromaEnabled ? Math.max(0.35, currentIntensity) : 0,
        }}
      >
        {/* Crisp Perimeter Border Band (clipped precisely by CSS mask) */}
        <div
          className="absolute inset-0 rounded-[inherit] overflow-hidden"
          style={{
            padding: `${Math.max(1.5, dynamicThickness)}px`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
          }}
        >
          <div
            className="chroma-rotating-band"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '320vmax',
              height: '320vmax',
              transform: 'translate(-50%, -50%)',
              background: conicBg,
              animationDuration: `${rotDuration}s`,
              animationPlayState: isTabHidden ? 'paused' : 'running',
            }}
          />
        </div>

        {/* Blurred Bloom Copy (dropped on low quality devices for performance) */}
        {!isLowQuality && (
          <div
            className="absolute inset-0 rounded-[inherit] overflow-hidden"
            style={{
              padding: `${Math.max(2, dynamicThickness * 1.5)}px`,
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              filter: `blur(${Math.max(4, dynamicSize * 0.75)}px)`,
              opacity: Math.min(1.0, 0.7 + currentIntensity * 0.3),
            }}
          >
            <div
              className="chroma-rotating-band"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '320vmax',
                height: '320vmax',
                transform: 'translate(-50%, -50%)',
                background: conicBg,
                animationDuration: `${rotDuration}s`,
                animationPlayState: isTabHidden ? 'paused' : 'running',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
