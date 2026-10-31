'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { lrclibProvider } from '@/lib/lyrics/providers/lrclib';
import { LyricsResult } from '@/lib/lyrics/providers/types';
import {
  loadLyricsSettings,
  saveLyricsSettings,
  LyricsSettings,
} from '@/lib/lyrics/settings';
import { useLyricsSync } from '@/hooks/useLyricsSync';
import { usePalette } from '@/hooks/usePalette';
import { useWakeLock } from '@/hooks/useWakeLock';
import EdgeGlow from './EdgeGlow';
import SettingsMenu from './SettingsMenu';

// Lyric Styles
import ClassicStage from './styles/ClassicStage';
import VisualStage from './styles/VisualStage';
import ConstellationStage from './styles/ConstellationStage';
import ShipStage from './styles/ShipStage';
import FisheyeStage from './styles/FisheyeStage';
import CodestyleStage from './styles/CodestyleStage';
import BranchesStage from './styles/BranchesStage';
import WebStage from './styles/WebStage';

export default function LyricsPage() {
  const { currentTrack } = usePlayback();

  const [settings, setSettings] = useState<LyricsSettings>(loadLyricsSettings());
  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Screen Wake Lock API
  useWakeLock(settings.keepAwake);

  // Auto-Sync Color Palette with ~600ms crossfade
  const palette = usePalette(currentTrack?.id, currentTrack?.artworkUrl, settings);

  // Sync settings across tabs / changes
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
  const fetchLyricsForCurrentTrack = useCallback(async () => {
    if (!currentTrack || !currentTrack.title) {
      setLyricsResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await lrclibProvider.getLyrics({
        id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        duration: currentTrack.duration,
      });
      setLyricsResult(res);
    } catch {
      setLyricsResult({
        source: 'lrclib',
        synced: 'none',
        lines: [],
        error: 'Network error connecting to lyrics provider.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentTrack]);

  useEffect(() => {
    fetchLyricsForCurrentTrack();
  }, [fetchLyricsForCurrentTrack]);

  // Current track offset
  const currentOffset = useMemo(() => {
    if (!currentTrack) return 0;
    return settings.offsets[currentTrack.id] || 0;
  }, [currentTrack, settings.offsets]);

  // Sync Engine Hook (runs on requestAnimationFrame, updates CSS vars on stage)
  const { lineIndex, wordIndex } = useLyricsSync({
    lines: lyricsResult?.lines || [],
    offsetSeconds: currentOffset,
    stageElementRef: stageWrapperRef,
  });

  // Fullscreen management
  const toggleFullscreen = () => {
    if (!stageWrapperRef.current) return;
    if (!document.fullscreenElement) {
      stageWrapperRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Idle controls hide in fullscreen after 3 seconds of mouse inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Font map CSS variable
  const fontCssVar = useMemo(() => {
    switch (settings.font) {
      case 'inter': return 'var(--font-inter, sans-serif)';
      case 'nunito': return 'var(--font-nunito, sans-serif)';
      case 'newsreader': return 'var(--font-newsreader, serif)';
      case 'arimo': return 'var(--font-arimo, sans-serif)';
      case 'nunito_sans': return 'var(--font-nunito-sans, sans-serif)';
      case 'jost': return 'var(--font-jost, sans-serif)';
      case 'playfair': return 'var(--font-playfair, serif)';
      default: return 'var(--font-inter, sans-serif)';
    }
  }, [settings.font]);

  // Render the selected style component
  const renderStyleStage = () => {
    if (!lyricsResult?.lines || lyricsResult.lines.length === 0) return null;

    const commonProps = {
      lines: lyricsResult.lines,
      activeLineIndex: lineIndex,
      activeWordIndex: wordIndex,
      showIcons: settings.iconsEnabled,
    };

    switch (settings.style) {
      case 'visual':
        return <VisualStage {...commonProps} />;
      case 'constellation':
        return <ConstellationStage {...commonProps} />;
      case 'ship':
        return <ShipStage {...commonProps} />;
      case 'fisheye':
        return <FisheyeStage {...commonProps} />;
      case 'fisheye_visual':
        return <FisheyeStage {...commonProps} showIcons={true} />;
      case 'codestyle':
        return <CodestyleStage {...commonProps} />;
      case 'codestyle_visual':
        return <CodestyleStage {...commonProps} showIcons={true} />;
      case 'branches':
        return <BranchesStage {...commonProps} />;
      case 'web':
        return <WebStage {...commonProps} />;
      case 'classic':
      default:
        return (
          <ClassicStage
            lines={lyricsResult.lines}
            activeLineIndex={lineIndex}
            activeWordIndex={wordIndex}
          />
        );
    }
  };

  return (
    <div
      ref={stageWrapperRef}
      onMouseMove={handleMouseMove}
      className={`w-full h-full flex flex-col bg-black text-white relative select-none overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 p-4 sm:p-8' : 'rounded-2xl border border-[#222222]'
      }`}
      style={
        {
          '--lyric': palette.lyric,
          '--highlight': palette.highlight,
          '--secondary': palette.secondary,
          fontFamily: fontCssVar,
          fontSize: `${settings.textSize}%`,
          transition: 'color 600ms ease, border-color 600ms ease',
        } as React.CSSProperties
      }
    >
      {/* Edge Glow Visualizer (Lumn-inspired light ring) */}
      <EdgeGlow
        enabled={settings.edgeGlowEnabled}
        mode={settings.edgeGlowMode}
        thickness={settings.edgeGlowThickness}
        glowSize={settings.edgeGlowSize}
        highlightColor={palette.highlight}
        secondaryColor={palette.secondary}
      />

      {/* Top Header Bar */}
      <div
        className={`flex items-center justify-between px-6 py-4 border-b border-[#1c1c1c] bg-black/75 backdrop-blur-md z-30 transition-opacity duration-300 ${
          isFullscreen && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Left: Track metadata & Sync Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#181818] border border-[#2a2a2a] flex items-center justify-center text-sm shrink-0">
            🎙️
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2">
              {currentTrack?.title || 'No song playing'}
              {lyricsResult?.synced === 'line' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Synced
                </span>
              )}
              {lyricsResult?.synced === 'none' && lyricsResult.plainLyrics && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Unsynced
                </span>
              )}
            </h2>
            <p className="text-xs text-[#888888] truncate">
              {currentTrack?.artist || 'Play a track to view live synced lyrics'}
            </p>
          </div>
        </div>

        {/* Right: Settings Menu & Fullscreen */}
        <div className="flex items-center gap-2 shrink-0">
          <SettingsMenu
            settings={settings}
            trackId={currentTrack?.id}
            onUpdate={(newSettings) => setSettings(newSettings)}
          />

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#161616] hover:bg-[#262626] border border-[#282828] text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main Lyrics Stage Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center">
        {/* Empty State: No song playing */}
        {!currentTrack && (
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#181818] border border-[#2a2a2a] flex items-center justify-center text-3xl">
              🎵
            </div>
            <h3 className="text-lg font-bold text-white">Play a song to see lyrics</h3>
            <p className="text-xs text-[#888888] max-w-sm">
              Start any track from Home, Trending, or Search to view live synced lyrics.
            </p>
          </div>
        )}

        {/* Loading Skeleton */}
        {currentTrack && isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <p className="text-xs text-[#888888]">Fetching lyrics for &ldquo;{currentTrack.title}&rdquo;...</p>
          </div>
        )}

        {/* Instrumental Track */}
        {currentTrack && !isLoading && lyricsResult?.instrumental && (
          <div className="p-8 text-center flex flex-col items-center gap-3 max-w-md">
            <div className="w-16 h-16 rounded-3xl bg-[#161616] border border-[#282828] flex items-center justify-center text-3xl animate-pulse">
              ☕
            </div>
            <h3 className="text-lg font-bold text-white">Instrumental Track</h3>
            <p className="text-xs text-[#888888] leading-relaxed">
              No lyrics detected for this track. Sit back and enjoy the pure lo-fi ambiance.
            </p>
          </div>
        )}

        {/* Synced Lyrics Stage (Renders the selected style) */}
        {currentTrack &&
          !isLoading &&
          !lyricsResult?.instrumental &&
          lyricsResult?.lines &&
          lyricsResult.lines.length > 0 &&
          renderStyleStage()}

        {/* Unsynced Plain Lyrics */}
        {currentTrack &&
          !isLoading &&
          !lyricsResult?.instrumental &&
          (!lyricsResult?.lines || lyricsResult.lines.length === 0) &&
          lyricsResult?.plainLyrics && (
            <div className="w-full h-full overflow-y-auto px-6 sm:px-16 py-12 flex flex-col items-center">
              <div className="max-w-xl w-full space-y-4 whitespace-pre-line text-sm sm:text-base text-zinc-300 leading-relaxed text-center sm:text-left">
                {lyricsResult.plainLyrics}
              </div>
            </div>
          )}

        {/* Not Found State with Retry */}
        {currentTrack &&
          !isLoading &&
          !lyricsResult?.instrumental &&
          (!lyricsResult?.lines || lyricsResult.lines.length === 0) &&
          !lyricsResult?.plainLyrics && (
            <div className="p-8 text-center flex flex-col items-center gap-3 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center text-xl">
                ✨
              </div>
              <h3 className="text-base font-bold text-white">No lyrics available</h3>
              <p className="text-xs text-[#888888]">
                Lyrics haven&apos;t been added for &ldquo;{currentTrack.title}&rdquo; yet.
              </p>
              <button
                type="button"
                onClick={fetchLyricsForCurrentTrack}
                className="mt-2 px-4 py-2 rounded-full bg-[#202020] hover:bg-[#2a2a2a] border border-[#333333] text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Retry Search
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
