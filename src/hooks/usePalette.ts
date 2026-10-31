import { useEffect, useState } from 'react';
import { LyricsSettings } from '@/lib/lyrics/settings';

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

  // If Auto Sync is ON, return extracted palette; otherwise return manual user colors from settings
  const currentPalette: PaletteColors = settings.autoSyncColor
    ? extractedPalette
    : {
        lyric: settings.lyricColor,
        highlight: settings.highlightColor,
        secondary: settings.secondaryColor,
      };

  return currentPalette;
}
