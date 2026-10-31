'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { lrclibProvider } from '@/lib/lyrics/providers/lrclib';
import { LyricsResult } from '@/lib/lyrics/providers/types';
import { loadLyricsSettings, LyricsSettings } from '@/lib/lyrics/settings';
import { useLyricsSync } from '@/hooks/useLyricsSync';

interface FloatingLyricsProps {
  activeView: string;
  onNavigateToLyrics: () => void;
}

export default function FloatingLyrics({ activeView, onNavigateToLyrics }: FloatingLyricsProps) {
  const { currentTrack } = usePlayback();
  const [settings, setSettings] = useState<LyricsSettings>(loadLyricsSettings());
  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null);

  // Sync settings
  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<LyricsSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };
    window.addEventListener('chillify_lyrics_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('chillify_lyrics_settings_updated', handleSettingsUpdated);
  }, []);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!currentTrack || !currentTrack.title) {
      setLyricsResult(null);
      return;
    }

    let isCancelled = false;
    lrclibProvider
      .getLyrics({
        id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        duration: currentTrack.duration,
      })
      .then((res) => {
        if (!isCancelled) setLyricsResult(res);
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);

  const currentOffset = useMemo(() => {
    if (!currentTrack) return 0;
    return settings.offsets[currentTrack.id] || 0;
  }, [currentTrack, settings.offsets]);

  const { lineIndex, wordIndex } = useLyricsSync({
    lines: lyricsResult?.lines || [],
    offsetSeconds: currentOffset,
  });

  // Hidden on the lyrics page itself or if disabled
  if (activeView === 'lyrics' || !settings.showOutsideLyricsPage) {
    return null;
  }

  // Hidden if no track or no synced lines
  if (!currentTrack || !lyricsResult?.lines || lyricsResult.lines.length === 0) {
    return null;
  }

  const currentLine =
    lineIndex >= 0 && lineIndex < lyricsResult.lines.length
      ? lyricsResult.lines[lineIndex]
      : null;

  if (!currentLine) return null;

  return (
    <div
      onClick={onNavigateToLyrics}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onNavigateToLyrics();
      }}
      className="fixed bottom-[96px] left-1/2 -translate-x-1/2 z-40 max-w-[90vw] sm:max-w-lg px-4 py-2 rounded-full bg-black/85 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-3 cursor-pointer hover:border-white/30 hover:scale-105 transition-all duration-200 group"
      title="Click to view full lyrics stage"
    >
      <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-xs shrink-0">
        🎙️
      </div>

      <div className="flex-1 min-w-0 text-center truncate">
        {currentLine.words.map((w, idx) => {
          const isActive = idx === wordIndex;
          return (
            <span
              key={`dock-word-${idx}`}
              className={`text-xs sm:text-sm px-0.5 transition-colors duration-150 ${
                isActive
                  ? 'text-red-400 font-extrabold underline decoration-red-500 underline-offset-4'
                  : 'text-zinc-300 font-medium'
              }`}
            >
              {w.text}{' '}
            </span>
          );
        })}
      </div>

      <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-medium shrink-0 hidden sm:inline">
        Expand ↗
      </span>
    </div>
  );
}
