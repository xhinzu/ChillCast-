'use client';

import React from 'react';
import { TextEffect } from '@/lib/lyrics/settings';

export function TextEffectsFilters() {
  return (
    <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
      <defs>
        {/* Distressed texture filter */}
        <filter id="myujiku-distressed-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Glitch jitter displacement filter */}
        <filter id="myujiku-glitch-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="turbulence" baseFrequency="0.02 0.8" numOctaves="1" result="glitchNoise" />
          <feDisplacementMap in="SourceGraphic" in2="glitchNoise" scale="9" xChannelSelector="R" yChannelSelector="B" />
        </filter>

        {/* Chromatic aberration filter */}
        <filter id="myujiku-chromatic-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feOffset in="SourceGraphic" dx="-2" dy="0" result="redOffset" />
          <feColorMatrix
            in="redOffset"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="redChannel"
          />
          <feOffset in="SourceGraphic" dx="2" dy="0" result="blueOffset" />
          <feColorMatrix
            in="blueOffset"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="cyanChannel"
          />
          <feBlend in="redChannel" in2="cyanChannel" mode="screen" result="blend" />
          <feBlend in="SourceGraphic" in2="blend" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}

export function getTextEffectStyle(
  effect: TextEffect,
  highlightColor = 'var(--highlight, #ef4444)',
  scale = 1.0,
  isLowQuality = false
): React.CSSProperties {
  // Low quality fallback to plain clean glow
  if (isLowQuality && effect !== 'glow') {
    return {
      textShadow: `0 0 ${8 * scale}px ${highlightColor}`,
    };
  }

  const strokeWidth = (2.2 * scale).toFixed(1);

  switch (effect) {
    case 'neon':
      return {
        WebkitTextStroke: `${strokeWidth}px ${highlightColor}`,
        color: 'transparent',
        textShadow: `0 0 ${12 * scale}px ${highlightColor}, 0 0 ${24 * scale}px ${highlightColor}88`,
      };

    case 'distressed':
      return {
        filter: 'url(#myujiku-distressed-filter)',
        textShadow: `0 0 ${6 * scale}px ${highlightColor}`,
      };

    case 'neon_distressed':
      return {
        WebkitTextStroke: `${strokeWidth}px ${highlightColor}`,
        color: 'transparent',
        filter: 'url(#myujiku-distressed-filter)',
        textShadow: `0 0 ${14 * scale}px ${highlightColor}`,
      };

    case 'chromatic':
      return {
        filter: 'url(#myujiku-chromatic-filter)',
        textShadow: `-2px 0 #00ffff, 2px 0 #ff0055`,
      };

    case 'glitch':
      return {
        filter: 'url(#myujiku-glitch-filter)',
        textShadow: `-3px 0 #00ffff, 3px 0 #ff0055, 0 0 10px ${highlightColor}`,
      };

    case 'glow':
    default:
      return {
        textShadow: `0 0 ${10 * scale}px ${highlightColor}, 0 0 ${20 * scale}px ${highlightColor}66`,
      };
  }
}
