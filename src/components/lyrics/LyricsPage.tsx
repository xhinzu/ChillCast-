'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { lrclibProvider, ManualLyricsOverride } from '@/lib/lyrics/providers/lrclib';
import { LyricsResult } from '@/lib/lyrics/providers/types';
import { normalizeTrackCandidates } from '@/lib/lyrics/normalize';
import { parseLrc } from '@/lib/lyrics/parseLrc';
import { deriveWordTimingsFromLrc } from '@/lib/lyrics/wordTiming';
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

const MANUAL_OVERRIDE_PREFIX = 'chillify_manual_lyrics_override:';
const COMMUNITY_LYRICS_PREFIX = 'chillify_community_lyrics:';

export default function LyricsPage() {
  const { currentTrack } = usePlayback();

  const [settings, setSettings] = useState<LyricsSettings>(loadLyricsSettings());
  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Manual fix state
  const [showFixModal, setShowFixModal] = useState<boolean>(false);
  const [editArtist, setEditArtist] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [hasManualOverride, setHasManualOverride] = useState<boolean>(false);

  // Community lyrics ("Add lyrics") state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [customLyricText, setCustomLyricText] = useState<string>('');
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Initialize edit fields from stored override or normalized candidate
  useEffect(() => {
    if (!currentTrack) {
      setEditArtist('');
      setEditTitle('');
      setHasManualOverride(false);
      return;
    }

    try {
      const stored = localStorage.getItem(`${MANUAL_OVERRIDE_PREFIX}${currentTrack.id}`);
      if (stored) {
        const parsed: ManualLyricsOverride = JSON.parse(stored);
        setEditArtist(parsed.artist || '');
        setEditTitle(parsed.title || '');
        setHasManualOverride(true);
        return;
      }
    } catch {
      // ignore parsing errors
    }

    const candidates = normalizeTrackCandidates(currentTrack.title, currentTrack.artist);
    const best = candidates[0] || { artist: currentTrack.artist || '', title: currentTrack.title || '' };
    setEditArtist(best.artist);
    setEditTitle(best.title);
    setHasManualOverride(false);
  }, [currentTrack]);

  // Fetch lyrics when track changes or manual override applied
  const fetchLyricsForCurrentTrack = useCallback(
    async (options?: { bypassCache?: boolean; manualOverride?: ManualLyricsOverride | null }) => {
      if (!currentTrack || !currentTrack.title) {
        setLyricsResult(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await lrclibProvider.getLyrics(
          {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            duration: currentTrack.duration,
          },
          options
        );
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
    },
    [currentTrack]
  );

  useEffect(() => {
    fetchLyricsForCurrentTrack();
  }, [fetchLyricsForCurrentTrack]);

  // Handle manual search
  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentTrack || !editTitle.trim()) return;

    const override: ManualLyricsOverride = {
      artist: editArtist.trim(),
      title: editTitle.trim(),
    };

    try {
      localStorage.setItem(`${MANUAL_OVERRIDE_PREFIX}${currentTrack.id}`, JSON.stringify(override));
      setHasManualOverride(true);
    } catch {
      // ignore storage error
    }

    setShowFixModal(false);
    fetchLyricsForCurrentTrack({ bypassCache: true, manualOverride: override });
  };

  // Handle reset to automatic
  const handleResetOverride = () => {
    if (!currentTrack) return;

    try {
      localStorage.removeItem(`${MANUAL_OVERRIDE_PREFIX}${currentTrack.id}`);
      setHasManualOverride(false);
    } catch {
      // ignore
    }

    const candidates = normalizeTrackCandidates(currentTrack.title, currentTrack.artist);
    const best = candidates[0] || { artist: currentTrack.artist || '', title: currentTrack.title || '' };
    setEditArtist(best.artist);
    setEditTitle(best.title);
    setShowFixModal(false);

    fetchLyricsForCurrentTrack({ bypassCache: true, manualOverride: null });
  };

  // Save Community / Custom Uploaded Lyrics
  const handleSaveCommunityLyrics = () => {
    if (!currentTrack || !customLyricText.trim()) return;

    const parsedLines = parseLrc(customLyricText);
    const hasSync = parsedLines.length > 0;
    const derived = hasSync ? deriveWordTimingsFromLrc(parsedLines, currentTrack.duration) : [];

    const communityResult: LyricsResult = {
      source: 'community',
      synced: hasSync ? 'line' : 'none',
      lines: derived,
      plainLyrics: customLyricText.trim(),
      instrumental: false,
      trackName: currentTrack.title,
      artistName: currentTrack.artist,
      matchedTitle: currentTrack.title,
      matchedArtist: currentTrack.artist,
      durationMismatch: false,
    };

    try {
      localStorage.setItem(`${COMMUNITY_LYRICS_PREFIX}${currentTrack.id}`, JSON.stringify(communityResult));
    } catch {
      // ignore
    }

    // Also persist to Upstash Redis server backend asynchronously
    fetch('/api/lyrics/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId: currentTrack.id,
        artist: currentTrack.artist,
        title: currentTrack.title,
        duration: currentTrack.duration,
        text: customLyricText.trim(),
      }),
    }).catch(() => {});

    setLyricsResult(communityResult);
    setShowAddModal(false);
    setCustomLyricText('');
  };

  // Remove Community Lyrics and revert to provider
  const handleRemoveCommunityLyrics = () => {
    if (!currentTrack) return;
    try {
      localStorage.removeItem(`${COMMUNITY_LYRICS_PREFIX}${currentTrack.id}`);
    } catch {
      // ignore
    }
    fetchLyricsForCurrentTrack({ bypassCache: true });
  };

  // Handle file input for .lrc or .txt
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCustomLyricText(content);
      }
    };
    reader.onerror = () => {
      setFileUploadError('Failed to read file. Please paste text directly.');
    };
    reader.readAsText(file);
  };

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

  // Provenance string
  const provenanceLabel = useMemo(() => {
    if (!lyricsResult || lyricsResult.source === 'none') return null;
    let name = 'LRCLIB';
    if (lyricsResult.source === 'lyrics.ovh') name = 'lyrics.ovh';
    else if (lyricsResult.source.includes('netease')) name = 'NetEase';
    else if (lyricsResult.source.includes('youtube')) name = 'YouTube Captions';
    else if (lyricsResult.source === 'community') name = 'Community (Local)';

    const typeStr =
      lyricsResult.synced === 'line'
        ? 'synced'
        : lyricsResult.synced === 'word'
        ? 'word-synced'
        : 'plain';
    return `Source: ${name} (${typeStr})`;
  }, [lyricsResult]);

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
            <h2 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2 flex-wrap">
              <span className="truncate">{currentTrack?.title || 'No song playing'}</span>
              {lyricsResult?.synced === 'line' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  Synced
                </span>
              )}
              {lyricsResult?.synced === 'none' && lyricsResult.plainLyrics && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  Unsynced
                </span>
              )}
              {provenanceLabel && (
                <span className="text-[10px] text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800 shrink-0 hidden sm:inline-block">
                  {provenanceLabel}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#888888] truncate flex items-center gap-2">
              <span>{currentTrack?.artist || 'Play a track to view live synced lyrics'}</span>
              {lyricsResult?.matchedTitle && lyricsResult.matchedArtist && (
                <span className="text-zinc-500 hidden md:inline truncate">
                  (Matched: &ldquo;{lyricsResult.matchedArtist} - {lyricsResult.matchedTitle}&rdquo;)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions, Settings Menu & Fullscreen */}
        <div className="flex items-center gap-2 shrink-0">
          {/* If using community lyrics, allow removal */}
          {lyricsResult?.source === 'community' && (
            <button
              type="button"
              onClick={handleRemoveCommunityLyrics}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 text-amber-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Revert to automatic provider lyrics"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Revert custom</span>
            </button>
          )}

          {/* Add / Upload lyrics button */}
          {currentTrack && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#161616] hover:bg-[#242424] border border-[#282828] text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              title="Add or paste your own .lrc or plain lyrics"
            >
              <span>➕</span>
              <span className="hidden sm:inline">Add lyrics</span>
            </button>
          )}

          {/* Wrong lyrics? button */}
          {currentTrack && lyricsResult && (lyricsResult.lines.length > 0 || lyricsResult.plainLyrics) && (
            <button
              type="button"
              onClick={() => setShowFixModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#161616] hover:bg-[#242424] border border-[#282828] text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              title="Search with custom artist and title"
            >
              <span>✏️</span>
              <span className="hidden sm:inline">Wrong lyrics?</span>
            </button>
          )}

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

      {/* Duration Mismatch Warning Banner */}
      {lyricsResult?.durationMismatch && (
        <div className="bg-amber-950/60 border-b border-amber-800/40 px-6 py-2 text-xs text-amber-300 flex items-center justify-between z-20 backdrop-blur-md">
          <span className="flex items-center gap-2">
            <span>⚠️</span>
            <span>Duration differs from recording. You can fine-tune sync with the Timing Offset slider in Settings.</span>
          </span>
          <button
            type="button"
            onClick={() => setShowFixModal(true)}
            className="underline hover:text-white text-xs font-semibold cursor-pointer shrink-0 ml-4"
          >
            Fix search
          </button>
        </div>
      )}

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
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowFixModal(true)}
                className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Search manually
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Upload lyrics
              </button>
            </div>
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

        {/* Not Found State with Inline Manual Fix & Add Lyrics */}
        {currentTrack &&
          !isLoading &&
          !lyricsResult?.instrumental &&
          (!lyricsResult?.lines || lyricsResult.lines.length === 0) &&
          !lyricsResult?.plainLyrics && (
            <div className="p-8 text-center flex flex-col items-center gap-4 max-w-md w-full">
              <div className="w-12 h-12 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center text-xl">
                ✨
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No lyrics available</h3>
                <p className="text-xs text-[#888888] mt-1">
                  Lyrics haven&apos;t been automatically matched for &ldquo;{currentTrack.title}&rdquo;.
                </p>
              </div>

              {/* Inline User Correction Form */}
              <form onSubmit={handleManualSearch} className="w-full flex flex-col gap-2.5 mt-2 text-left">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Artist Name
                  </label>
                  <input
                    type="text"
                    value={editArtist}
                    onChange={(e) => setEditArtist(e.target.value)}
                    placeholder="e.g. The Weeknd"
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#2a2a2a] text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Song Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Starboy"
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#2a2a2a] text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    Search again
                  </button>
                  {hasManualOverride && (
                    <button
                      type="button"
                      onClick={handleResetOverride}
                      className="px-3 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#282828] border border-[#333333] text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="px-3 py-2 rounded-xl bg-[#1e1e1e] hover:bg-[#2c2c2c] border border-[#333333] text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    ➕ Add lyrics
                  </button>
                </div>
              </form>
            </div>
          )}
      </div>

      {/* Manual Fix Modal */}
      {showFixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-[#282828] rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowFixModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white text-sm cursor-pointer p-1"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-white mb-1">Correct Lyric Search</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Edit the artist and song title to improve search accuracy. Changes will be saved for this track.
            </p>

            <form onSubmit={handleManualSearch} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Artist
                </label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  placeholder="Artist"
                  className="w-full px-3 py-2 rounded-xl bg-[#1c1c1c] border border-[#303030] text-sm text-white focus:outline-none focus:border-zinc-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Song Title"
                  className="w-full px-3 py-2 rounded-xl bg-[#1c1c1c] border border-[#303030] text-sm text-white focus:outline-none focus:border-zinc-400 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer"
                >
                  Search again
                </button>
                {hasManualOverride && (
                  <button
                    type="button"
                    onClick={handleResetOverride}
                    className="px-3 py-2 rounded-xl bg-[#202020] hover:bg-[#2c2c2c] border border-[#383838] text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    Reset to auto
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Upload Lyrics Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[85vh]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white text-sm cursor-pointer p-1"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-white mb-1">
              Add Lyrics for &ldquo;{currentTrack?.title}&rdquo;
            </h3>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              Paste synchronized LRC text (e.g. <code>[00:12.30] lyrics</code>) or plain text. You can also upload a <code>.lrc</code> file.
            </p>

            <div className="flex items-center gap-2 mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".lrc,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-[#202020] hover:bg-[#2c2c2c] border border-[#333333] text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer transition-colors"
              >
                📂 Choose .lrc / .txt file
              </button>
              {fileUploadError && (
                <span className="text-xs text-rose-400">{fileUploadError}</span>
              )}
            </div>

            <textarea
              value={customLyricText}
              onChange={(e) => setCustomLyricText(e.target.value)}
              placeholder="Paste .lrc or plain text here...&#10;[00:04.20] First line of song&#10;[00:08.50] Second line of song"
              rows={10}
              className="w-full flex-1 p-3 rounded-xl bg-[#181818] border border-[#282828] text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500 resize-none transition-colors"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-[11px] text-zinc-500">
                {customLyricText.includes('[') && customLyricText.includes(']')
                  ? '⚡ Synced LRC format detected'
                  : '📝 Plain unsynced text detected'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#262626] text-xs text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCommunityLyrics}
                  disabled={!customLyricText.trim()}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-bold cursor-pointer transition-all shadow-md"
                >
                  Save and Use Lyrics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
