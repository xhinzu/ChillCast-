'use client';

import React, { useMemo } from 'react';
import { useBeatEnergy } from '@/hooks/useBeatEnergy';
import {
  GlowStyle,
  GlowColorSource,
  GlowMode,
  GlowBlendMode,
} from '@/lib/lyrics/settings';

interface EdgeGlowProps {
  enabled: boolean;
  style?: GlowStyle;
  colorSource?: GlowColorSource;
  customColor?: string;
  customGradient?: string;
  highlightColor?: string;
  secondaryColor?: string;
  intensity?: number; // 0 to 100
  thickness?: number; // in px
  glowSize?: number; // in px
  speed?: number; // 0.2 to 3.0
  mode?: GlowMode;
  blendMode?: GlowBlendMode;
}

export default function EdgeGlow({
  enabled,
  style = 'ring',
  colorSource = 'palette',
  customColor = '#ef4444',
  customGradient = 'linear-gradient(45deg, #ef4444, #f59e0b)',
  highlightColor = '#ef4444',
  secondaryColor = '#f59e0b',
  intensity = 65,
  thickness = 4,
  glowSize = 28,
  speed = 1.0,
  mode = 'music_sync',
  blendMode = 'normal',
}: EdgeGlowProps) {
  const isMusicSync = mode === 'music_sync';
  const beatEnergy = useBeatEnergy(enabled, isMusicSync);

  // Derive active glow color or gradient
  const primaryGlowColor = useMemo(() => {
    switch (colorSource) {
      case 'custom':
        return customColor;
      case 'gradient':
        return customGradient;
      case 'palette_gradient':
        return `linear-gradient(135deg, ${highlightColor}, ${secondaryColor})`;
      case 'palette':
      default:
        return highlightColor;
    }
  }, [colorSource, customColor, customGradient, highlightColor, secondaryColor]);

  if (!enabled) return null;

  // Modulation based on mode: music sync vs breathing vs static
  const baseIntensity = intensity / 100;
  const currentEnergy =
    mode === 'music_sync'
      ? Math.max(0.2, Math.min(1.0, beatEnergy))
      : mode === 'breathing'
      ? beatEnergy
      : 0.65;

  const dynamicOpacity = Math.max(0.15, Math.min(1.0, baseIntensity * (0.6 + currentEnergy * 0.5)));
  const dynamicSize = glowSize * (0.8 + currentEnergy * 0.35);
  const dynamicThickness = thickness * (0.85 + currentEnergy * 0.25);

  const containerStyle: React.CSSProperties = {
    mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'],
    opacity: dynamicOpacity,
    transition: 'opacity 120ms ease-out',
  };

  const isGradient = colorSource === 'gradient' || colorSource === 'palette_gradient';

  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden z-20 transform-gpu"
      style={containerStyle}
    >
      {/* 1. Ring (Standard Perimeter Glow) */}
      {style === 'ring' && (
        <div
          className="w-full h-full rounded-[inherit] transition-all duration-150"
          style={{
            boxShadow: `
              inset 0 0 ${dynamicSize}px ${dynamicThickness}px ${isGradient ? highlightColor : primaryGlowColor}88,
              inset 0 0 ${dynamicSize * 1.8}px ${dynamicThickness * 1.5}px ${secondaryColor}55,
              0 0 ${dynamicSize * 0.6}px ${isGradient ? highlightColor : primaryGlowColor}44
            `,
          }}
        >
          <div
            className="w-full h-full rounded-[inherit] border"
            style={{
              borderWidth: `${Math.max(1, dynamicThickness * 0.5)}px`,
              borderColor: `${isGradient ? highlightColor : primaryGlowColor}aa`,
            }}
          />
        </div>
      )}

      {/* 2. Corners Glow */}
      {style === 'corners' && (
        <div className="w-full h-full relative">
          <div
            className="absolute top-0 left-0 w-36 h-36 rounded-full filter blur-2xl transform-gpu -translate-x-1/3 -translate-y-1/3"
            style={{ background: primaryGlowColor }}
          />
          <div
            className="absolute top-0 right-0 w-36 h-36 rounded-full filter blur-2xl transform-gpu translate-x-1/3 -translate-y-1/3"
            style={{ background: isGradient ? secondaryColor : primaryGlowColor }}
          />
          <div
            className="absolute bottom-0 left-0 w-36 h-36 rounded-full filter blur-2xl transform-gpu -translate-x-1/3 translate-y-1/3"
            style={{ background: isGradient ? secondaryColor : primaryGlowColor }}
          />
          <div
            className="absolute bottom-0 right-0 w-36 h-36 rounded-full filter blur-2xl transform-gpu translate-x-1/3 translate-y-1/3"
            style={{ background: primaryGlowColor }}
          />
        </div>
      )}

      {/* 3. Top & Bottom Bars */}
      {style === 'top_bottom' && (
        <div className="w-full h-full flex flex-col justify-between">
          <div
            className="w-full h-3 rounded-full filter blur-md"
            style={{
              background: primaryGlowColor,
              boxShadow: `0 0 ${dynamicSize}px ${dynamicThickness}px ${isGradient ? highlightColor : primaryGlowColor}`,
            }}
          />
          <div
            className="w-full h-3 rounded-full filter blur-md"
            style={{
              background: isGradient ? secondaryColor : primaryGlowColor,
              boxShadow: `0 0 ${dynamicSize}px ${dynamicThickness}px ${isGradient ? secondaryColor : primaryGlowColor}`,
            }}
          />
        </div>
      )}

      {/* 4. Side Bars */}
      {style === 'sides' && (
        <div className="w-full h-full flex justify-between">
          <div
            className="w-3 h-full filter blur-md"
            style={{
              background: primaryGlowColor,
              boxShadow: `0 0 ${dynamicSize}px ${dynamicThickness}px ${isGradient ? highlightColor : primaryGlowColor}`,
            }}
          />
          <div
            className="w-3 h-full filter blur-md"
            style={{
              background: isGradient ? secondaryColor : primaryGlowColor,
              boxShadow: `0 0 ${dynamicSize}px ${dynamicThickness}px ${isGradient ? secondaryColor : primaryGlowColor}`,
            }}
          />
        </div>
      )}

      {/* 5. Vignette */}
      {style === 'vignette' && (
        <div
          className="w-full h-full rounded-[inherit]"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, ${isGradient ? highlightColor : primaryGlowColor}66 100%)`,
          }}
        />
      )}

      {/* 6. Spotlight (Soft center bloom) */}
      {style === 'spotlight' && (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="w-72 h-72 sm:w-96 sm:h-96 rounded-full filter blur-3xl transform-gpu"
            style={{
              background: `radial-gradient(circle, ${isGradient ? highlightColor : primaryGlowColor}88 0%, transparent 70%)`,
              transform: `scale(${0.9 + currentEnergy * 0.3})`,
            }}
          />
        </div>
      )}

      {/* 7. Aurora */}
      {style === 'aurora' && (
        <div
          className="w-full h-full rounded-[inherit] filter blur-xl opacity-80"
          style={{
            background: `linear-gradient(${((Date.now() / 50) * speed) % 360}deg, ${highlightColor}66, ${secondaryColor}66, #3b82f666)`,
          }}
        />
      )}

      {/* 8. Neon Tube Border */}
      {style === 'neon_tube' && (
        <div
          className="w-full h-full rounded-[inherit] border"
          style={{
            borderWidth: `${Math.max(2, dynamicThickness * 0.6)}px`,
            borderColor: isGradient ? highlightColor : primaryGlowColor,
            boxShadow: `
              0 0 8px ${isGradient ? highlightColor : primaryGlowColor},
              0 0 ${dynamicSize}px ${isGradient ? highlightColor : primaryGlowColor}88,
              inset 0 0 ${dynamicSize * 0.5}px ${isGradient ? highlightColor : primaryGlowColor}66
            `,
          }}
        />
      )}

      {/* 9. Rotating Conic Gradient Border */}
      {style === 'rotating_conic' && (
        <div className="w-full h-full p-1 rounded-[inherit] overflow-hidden relative flex items-center justify-center">
          <div
            className="absolute -inset-[50%] transform-gpu origin-center"
            style={{
              background: `conic-gradient(from 0deg, ${highlightColor}, ${secondaryColor}, #3b82f6, ${highlightColor})`,
              animation: `spin ${(6 / speed).toFixed(1)}s linear infinite`,
            }}
          />
          <div className="w-full h-full bg-black/90 rounded-[inherit] relative z-10" />
        </div>
      )}

      {/* 10. Ripple Pulses */}
      {style === 'ripple' && (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <div
            className="rounded-full border border-dashed transition-all duration-300"
            style={{
              width: `${(dynamicSize * 5 * (0.6 + currentEnergy * 0.5)).toFixed(0)}px`,
              height: `${(dynamicSize * 5 * (0.6 + currentEnergy * 0.5)).toFixed(0)}px`,
              borderColor: isGradient ? highlightColor : primaryGlowColor,
              boxShadow: `0 0 ${dynamicSize}px ${isGradient ? highlightColor : primaryGlowColor}`,
            }}
          />
        </div>
      )}

      {/* 11. Breathing */}
      {style === 'breathing' && (
        <div
          className="w-full h-full rounded-[inherit] transition-all duration-500"
          style={{
            boxShadow: `inset 0 0 ${dynamicSize * 1.5}px ${dynamicThickness}px ${isGradient ? highlightColor : primaryGlowColor}aa`,
            filter: `blur(${dynamicSize * 0.2}px)`,
          }}
        />
      )}
    </div>
  );
}
