'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useBeatEnergy } from '@/hooks/useBeatEnergy';
import { useSettings } from '@/lib/settings/useSettings';
import type { EdgeGlowMode } from '@/lib/lyrics/settings';
import type { EdgeGlowStyle } from '@/lib/settings/settings-store';

interface EdgeGlowProps {
  enabled?: boolean;
  mode?: EdgeGlowMode;
  thickness?: number; // in px
  glowSize?: number;  // in px
  highlightColor?: string;
  secondaryColor?: string;
  chromaEnabled?: boolean;
  chromaSpeed?: number;
  chromaVividness?: number;
}

export default function EdgeGlow({
  enabled: propEnabled,
  mode: propMode,
  thickness: propThickness,
  glowSize: propGlowSize,
  highlightColor: propHighlight = '#ef4444',
  secondaryColor: propSecondary = '#f59e0b',
  chromaEnabled: propChroma = false,
  chromaSpeed = 50,
  chromaVividness = 80,
}: EdgeGlowProps) {
  const { settings } = useSettings();
  const glow = settings.glow;

  const isEnabled = propEnabled ?? glow.lyricsEdgeGlowEnabled;
  const activeStyle: EdgeGlowStyle = glow.lyricsEdgeGlowStyle || 'vignette';
  const activeMode = glow.lyricsEdgeGlowMode || propMode || 'music_sync';
  const isMusicSync = activeMode === 'music_sync';

  const beatEnergy = useBeatEnergy(isEnabled, isMusicSync);

  // Background tab throttle protection
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Determine base colors
  let primaryColor = propHighlight;
  let secondaryColor = propSecondary;

  if (glow.lyricsEdgeGlowColorSource === 'custom' && glow.lyricsEdgeGlowCustomColor) {
    primaryColor = glow.lyricsEdgeGlowCustomColor;
    secondaryColor = glow.lyricsEdgeGlowCustomColor;
  } else if (glow.lyricsEdgeGlowColorSource === 'gradient' && glow.lyricsEdgeGlowGradient?.stops?.length >= 2) {
    primaryColor = glow.lyricsEdgeGlowGradient.stops[0];
    secondaryColor = glow.lyricsEdgeGlowGradient.stops[1];
  }

  // Modulate intensity based on mode (static vs breathing vs music_sync)
  const baseIntensity = glow.lyricsEdgeGlowIntensity || 0.65;
  const currentIntensity = useMemo(() => {
    if (activeMode === 'music_sync') {
      return Math.max(0.2, Math.min(1.0, beatEnergy * baseIntensity * 1.3));
    }
    if (activeMode === 'breathing') {
      return baseIntensity * 0.85;
    }
    return baseIntensity;
  }, [activeMode, beatEnergy, baseIntensity]);

  const dynamicSize = (glow.lyricsEdgeGlowSize || propGlowSize || 28) * (0.8 + currentIntensity * 0.4);
  const dynamicThickness = (glow.lyricsEdgeGlowThickness || propThickness || 4) * (0.85 + currentIntensity * 0.3);
  const blendMode = glow.lyricsEdgeGlowBlendMode || 'normal';

  if (!isEnabled) return null;

  // OKLCH full-spectrum conic gradient for Chroma mode
  const speedNorm = Math.max(10, Math.min(100, chromaSpeed));
  const rotDuration = (3.2 + Math.pow((100 - speedNorm) / 90, 1.6) * 14.8).toFixed(2);
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
    <div
      className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden z-20 transition-opacity duration-300"
      style={{
        mixBlendMode: blendMode,
        opacity: currentIntensity,
      }}
    >
      {/* Chroma Spectrum Running RGB Layer */}
      {propChroma && (
        <div className="absolute inset-0 rounded-[inherit] overflow-hidden">
          <div
            className="chroma-rotating-band"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '300vmax',
              height: '300vmax',
              transform: 'translate(-50%, -50%)',
              background: conicBg,
              animationDuration: `${rotDuration}s`,
              animationPlayState: isTabHidden ? 'paused' : 'running',
              filter: `blur(${dynamicSize}px)`,
            }}
          />
        </div>
      )}

      {/* 11 Distinct Edge Glow Styles */}
      {!propChroma && (
        <>
          {/* 1. Ring Border Style */}
          {activeStyle === 'ring' && (
            <div
              className="absolute inset-0 rounded-[inherit] transition-all duration-150"
              style={{
                boxShadow: `
                  inset 0 0 ${dynamicSize}px ${dynamicThickness}px ${primaryColor}99,
                  0 0 ${dynamicSize * 0.7}px ${secondaryColor}66
                `,
              }}
            />
          )}

          {/* 2. Corners Style */}
          {activeStyle === 'corners' && (
            <div
              className="absolute inset-0 rounded-[inherit]"
              style={{
                background: `
                  radial-gradient(circle at top left, ${primaryColor}88 0%, transparent ${dynamicSize * 2}px),
                  radial-gradient(circle at top right, ${secondaryColor}88 0%, transparent ${dynamicSize * 2}px),
                  radial-gradient(circle at bottom left, ${secondaryColor}88 0%, transparent ${dynamicSize * 2}px),
                  radial-gradient(circle at bottom right, ${primaryColor}88 0%, transparent ${dynamicSize * 2}px)
                `,
              }}
            />
          )}

          {/* 3. Top & Bottom Bars */}
          {activeStyle === 'top_bottom' && (
            <div
              className="absolute inset-0 rounded-[inherit]"
              style={{
                background: `
                  linear-gradient(180deg, ${primaryColor}77 0%, transparent ${dynamicSize * 1.5}px, transparent calc(100% - ${dynamicSize * 1.5}px), ${secondaryColor}77 100%)
                `,
              }}
            />
          )}

          {/* 4. Side Bars */}
          {activeStyle === 'side_bars' && (
            <div
              className="absolute inset-0 rounded-[inherit]"
              style={{
                background: `
                  linear-gradient(90deg, ${primaryColor}77 0%, transparent ${dynamicSize * 1.5}px, transparent calc(100% - ${dynamicSize * 1.5}px), ${secondaryColor}77 100%)
                `,
              }}
            />
          )}

          {/* 5. Vignette (Default Ambient Perimeter) */}
          {activeStyle === 'vignette' && (
            <div
              className="absolute inset-0 rounded-[inherit]"
              style={{
                background: `radial-gradient(circle, transparent 40%, ${primaryColor}55 90%, ${secondaryColor}77 100%)`,
                boxShadow: `inset 0 0 ${dynamicSize * 1.5}px ${dynamicThickness}px ${primaryColor}66`,
              }}
            />
          )}

          {/* 6. Spotlight Bloom */}
          {activeStyle === 'spotlight' && (
            <div
              className="absolute inset-0 rounded-[inherit]"
              style={{
                background: `radial-gradient(circle at center, ${primaryColor}55 0%, ${secondaryColor}22 50%, transparent 75%)`,
                filter: `blur(${dynamicSize * 0.5}px)`,
              }}
            />
          )}

          {/* 7. Aurora Waves */}
          {activeStyle === 'aurora' && (
            <div
              className="absolute inset-0 rounded-[inherit] overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}66 0%, transparent 45%, ${secondaryColor}66 70%, transparent 100%)`,
                filter: `blur(${dynamicSize * 0.8}px)`,
                transform: 'scale(1.05)',
              }}
            />
          )}

          {/* 8. Neon Tube Border */}
          {activeStyle === 'neon_tube' && (
            <div
              className="absolute inset-0 rounded-[inherit] border transition-all duration-150"
              style={{
                borderColor: `${primaryColor}`,
                borderWidth: `${Math.max(1.5, dynamicThickness * 0.6)}px`,
                boxShadow: `
                  0 0 6px ${primaryColor},
                  inset 0 0 8px ${primaryColor},
                  0 0 20px ${secondaryColor}88
                `,
              }}
            />
          )}

          {/* 9. Rotating Conic Gradient */}
          {activeStyle === 'rotating_conic' && (
            <div className="absolute inset-0 rounded-[inherit] overflow-hidden">
              <div
                className="chroma-rotating-band"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '260vmax',
                  height: '260vmax',
                  transform: 'translate(-50%, -50%)',
                  background: `conic-gradient(from 0deg, ${primaryColor}88, transparent 40%, ${secondaryColor}88 60%, transparent 90%, ${primaryColor}88)`,
                  animationDuration: '10s',
                  animationPlayState: isTabHidden ? 'paused' : 'running',
                  filter: `blur(${dynamicSize}px)`,
                }}
              />
            </div>
          )}

          {/* 10. Ripple Pulses */}
          {activeStyle === 'ripple' && (
            <div
              className="absolute inset-0 rounded-[inherit] animate-pulse"
              style={{
                background: `radial-gradient(circle, transparent 20%, ${primaryColor}44 45%, transparent 60%, ${secondaryColor}55 85%, transparent 100%)`,
                filter: `blur(${dynamicSize * 0.4}px)`,
                animationDuration: '2.5s',
              }}
            />
          )}

          {/* 11. Breathing Halo */}
          {activeStyle === 'breathing' && (
            <div
              className="absolute inset-0 rounded-[inherit] animate-pulse"
              style={{
                boxShadow: `
                  inset 0 0 ${dynamicSize * 2}px ${dynamicThickness * 2}px ${primaryColor}77,
                  0 0 ${dynamicSize}px ${secondaryColor}55
                `,
                animationDuration: '3.6s',
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
