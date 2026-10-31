'use client';

import { useEffect, useState, useRef } from 'react';
import { LyricsSettings } from '@/lib/lyrics/settings';
import { deriveHarmoniousPalette, hexToOklch, oklchToHex } from '@/lib/lyrics/paletteEngine';

interface PaletteColors {
  lyric: string;
  highlight: string;
  secondary: string;
}

const DEFAULT_PALETTE: PaletteColors = {
  lyric: '#ffffff',
  highlight: '#ef4444',
  secondary: '#888888',
};

export function usePalette(
  trackId: string | undefined,
  artworkUrl: string | undefined,
  settings: LyricsSettings
) {
  const [extractedPalette, setExtractedPalette] = useState<PaletteColors>(DEFAULT_PALETTE);
  const [breathingShift, setBreathingShift] = useState(0);
  const animRef = useRef<number | null>(null);

  // 1. Fetch artwork palette from server API
  useEffect(() => {
    if (!settings.autoSyncColor) return;
    if (!trackId && !artworkUrl) return;

    let isCancelled = false;

    const fetchPalette = async () => {
      try {
        const params = new URLSearchParams();
        if (trackId) params.set('id', trackId);
        if (artworkUrl) params.set('url', artworkUrl);

        const res = await fetch(`/api/palette?${params.toString()}`);
        if (!res.ok || isCancelled) return;
        const data = (await res.json()) as PaletteColors;
        if (!isCancelled && data.highlight && data.lyric) {
          setExtractedPalette(data);
        }
      } catch {
        // keep current
      }
    };

    fetchPalette();

    return () => {
      isCancelled = true;
    };
  }, [trackId, artworkUrl, settings.autoSyncColor]);

  // 2. Breathing color gentle slow drift animation
  useEffect(() => {
    if (!settings.breathingColors) {
      setBreathingShift(0);
      return;
    }

    let startTime = performance.now();
    const periodMs = (settings.breathingPeriod || 10) * 1000;

    const loop = (now: number) => {
      const elapsed = (now - startTime) % periodMs;
      // Gentle sine drift between -15deg and +15deg
      const phase = (elapsed / periodMs) * Math.PI * 2;
      setBreathingShift(Math.sin(phase) * 15);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [settings.breathingColors, settings.breathingPeriod]);

  // 3. Compute palette with Chroma & Harmony mode in OKLCH
  const baseHighlight = settings.autoSyncColor ? extractedPalette.highlight : settings.highlightColor;
  const derived = deriveHarmoniousPalette(
    baseHighlight,
    settings.harmonyMode || 'match',
    settings.chroma ?? 100
  );

  let finalHighlight = derived.highlight;
  let finalSecondary = derived.secondary;

  if (settings.breathingColors && breathingShift !== 0) {
    const oklchH = hexToOklch(finalHighlight);
    oklchH.h = (oklchH.h + breathingShift + 360) % 360;
    finalHighlight = oklchToHex(oklchH);

    const oklchS = hexToOklch(finalSecondary);
    oklchS.h = (oklchS.h + breathingShift + 360) % 360;
    finalSecondary = oklchToHex(oklchS);
  }

  // If Auto Sync is disabled, respect manual overrides
  return {
    lyric: settings.autoSyncColor ? derived.lyric : settings.lyricColor,
    highlight: finalHighlight,
    secondary: finalSecondary,
  };
}
