'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { lrclibProvider, ManualLyricsOverride } from '@/lib/lyrics/providers/lrclib';
import { LyricsResult, SyncedLyricLine, LyricWord } from '@/lib/lyrics/providers/types';
import { normalizeTrackCandidates, formatCleanDisplayTrack, normalizeString } from '@/lib/lyrics/normalize';
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
import SyncEditorModal from './SyncEditorModal';

import LyricSpeedSlider from './LyricSpeedSlider';
import {
  loadLyricTransform,
  saveLyricTransform,
  LyricTransform,
  estimatePlainLyricsTimings,
} from '@/lib/lyrics/transform';

// Lyric Styles
import ClassicStage from './styles/ClassicStage';
import VisualStage from './styles/VisualStage';
import ConstellationStage from './styles/ConstellationStage';
import ShipStage from './styles/ShipStage';
import FisheyeStage from './styles/FisheyeStage';
import CodestyleStage from './styles/CodestyleStage';
import BranchesStage from './styles/BranchesStage';
import WebStage from './styles/WebStage';

import { parseEnhancedLrc, ParseEnhancedLrcResult } from '@/lib/lyrics/parseEnhancedLrc';
import { isMostlyUppercase, fixSentenceCase, fixLineSentenceCase } from '@/lib/lyrics/textCase';

const MANUAL_OVERRIDE_PREFIX = 'chillify_manual_lyrics_override:';
const COMMUNITY_LYRICS_PREFIX = 'chillify_community_lyrics:';
const USER_LYRICS_PREFIX = 'chillify_user_lyrics:';

interface HeaderActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  ariaLabel?: string;
  badge?: React.ReactNode;
  active?: boolean;
  variant?: 'default' | 'amber' | 'rose';
  title?: string;
}

function HeaderActionButton({
  onClick,
  icon,
  label,
  ariaLabel,
  badge,
  active = false,
  variant = 'default',
  title,
}: HeaderActionButtonProps) {
  let colorClasses = 'bg-[#161616] hover:bg-[#242424] border-[#282828] text-zinc-400 hover:text-white';
  if (variant === 'amber' || active) {
    colorClasses = 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300';
  } else if (variant === 'rose') {
    colorClasses = 'bg-rose-950/40 hover:bg-rose-900/50 border-rose-800/50 text-rose-300';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      aria-label={ariaLabel || label}
      className={`group h-9 px-2.5 rounded-xl border text-xs flex items-center justify-center shrink-0 cursor-pointer transition-all duration-180 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 motion-reduce:transition-none ${colorClasses}`}
    >
      <span className="shrink-0 flex items-center justify-center text-sm leading-none" aria-hidden="true">
        {icon}
      </span>
      <span className="grid grid-cols-[0fr] group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] transition-[grid-template-columns] duration-180 ease-out motion-reduce:transition-none">
        <span className="overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-180 ease-out motion-reduce:transition-none pl-0 group-hover:pl-1.5 group-focus-visible:pl-1.5 flex items-center gap-1 font-medium">
          <span>{label}</span>
          {badge}
        </span>
      </span>
    </button>
  );
}

function formatLrcTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}]`;
}

function formatDurationClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LyricsPage() {
  const { currentTrack, duration, getCurrentTime, currentTime } = usePlayback();

  // Playing video's duration (not placeholder/search duration)
  const playingDuration =
    duration && duration > 0
      ? duration
      : currentTrack?.duration && currentTrack.duration > 0
      ? currentTrack.duration
      : undefined;

  const [settings, setSettings] = useState<LyricsSettings>(loadLyricsSettings());
  const [transform, setTransform] = useState<LyricTransform>({ speed: 1.0, offset: 0.0 });
  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Manual fix state
  const [showFixModal, setShowFixModal] = useState<boolean>(false);
  const [editArtist, setEditArtist] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [hasManualOverride, setHasManualOverride] = useState<boolean>(false);

  // Offset Assistant state
  const [showOffsetAssistant, setShowOffsetAssistant] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [isTapToSyncMode, setIsTapToSyncMode] = useState<boolean>(false);
  const [isCoarseStep, setIsCoarseStep] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; undoOffset?: number; undoTransform?: LyricTransform } | null>(null);

  // Community lyrics ("Add lyrics") state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showSyncEditor, setShowSyncEditor] = useState<boolean>(false);
  const [customLyricText, setCustomLyricText] = useState<string>('');
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  // Enhanced "Add lyrics" Modal State (Part 2)
  const [parsedLrcData, setParsedLrcData] = useState<ParseEnhancedLrcResult | null>(null);
  const [modalFixAllCaps, setModalFixAllCaps] = useState<boolean>(false);
  const [modalShareWithEveryone, setModalShareWithEveryone] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [hoveredWordTiming, setHoveredWordTiming] = useState<string | null>(null);

  // Debounced live format detection and parse for custom lyric input (Part 2)
  useEffect(() => {
    if (!customLyricText.trim()) {
      setParsedLrcData(null);
      setFileUploadError(null);
      return;
    }
    const timer = setTimeout(() => {
      const parsed = parseEnhancedLrc(customLyricText, { songDuration: playingDuration });
      setParsedLrcData(parsed);
      setFileUploadError(parsed.error || null);
      if (isMostlyUppercase(customLyricText)) {
        setModalFixAllCaps(true);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [customLyricText, playingDuration]);

  const totalParsedWords = useMemo(() => {
    if (!parsedLrcData?.lines) return 0;
    return parsedLrcData.lines.reduce((sum, l) => sum + (l.words?.length || 0), 0);
  }, [parsedLrcData]);

  const detectedDurationSec = useMemo(() => {
    if (parsedLrcData?.meta?.lengthSeconds) return parsedLrcData.meta.lengthSeconds;
    if (parsedLrcData?.lines && parsedLrcData.lines.length > 0) {
      return parsedLrcData.lines[parsedLrcData.lines.length - 1].end;
    }
    return 0;
  }, [parsedLrcData]);

  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastFetchedDurationRef = useRef<number | undefined>(undefined);

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

      // 1. Check user-stored custom / enhanced lyrics first (Part 3 user priority)
      if (!options?.bypassCache) {
        try {
          const userStored = localStorage.getItem(`${USER_LYRICS_PREFIX}${currentTrack.id}`);
          if (userStored) {
            const parsedData = JSON.parse(userStored);
            if (parsedData && parsedData.result) {
              setLyricsResult(parsedData.result);
              setIsLoading(false);
              const hasLyrics =
                !parsedData.result.instrumental &&
                ((parsedData.result.lines && parsedData.result.lines.length > 0) || !!parsedData.result.plainLyrics);
              window.dispatchEvent(
                new CustomEvent('chillify_lyrics_status', {
                  detail: { trackId: currentTrack.id, hasLyrics },
                })
              );
              return;
            }
          }
        } catch {}
      }

      setIsLoading(true);
      try {
        const res = await lrclibProvider.getLyrics(
          {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            duration: playingDuration,
          },
          options
        );
        setLyricsResult(res);
        const hasLyrics = !res.instrumental && ((res.lines && res.lines.length > 0) || !!res.plainLyrics);
        window.dispatchEvent(
          new CustomEvent('chillify_lyrics_status', {
            detail: { trackId: currentTrack.id, hasLyrics },
          })
        );
      } catch {
        setLyricsResult({
          source: 'lrclib',
          synced: 'none',
          lines: [],
          error: 'Network error connecting to lyrics provider.',
        });
        window.dispatchEvent(
          new CustomEvent('chillify_lyrics_status', {
            detail: { trackId: currentTrack.id, hasLyrics: false },
          })
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentTrack, playingDuration]
  );

  useEffect(() => {
    lastFetchedDurationRef.current = playingDuration;
    fetchLyricsForCurrentTrack();
  }, [fetchLyricsForCurrentTrack]);

  // Re-fetch when playing video duration becomes known after initial mount
  useEffect(() => {
    if (
      currentTrack?.id &&
      playingDuration &&
      playingDuration > 0 &&
      (!lastFetchedDurationRef.current || Math.abs(playingDuration - lastFetchedDurationRef.current) > 3)
    ) {
      lastFetchedDurationRef.current = playingDuration;
      fetchLyricsForCurrentTrack({ bypassCache: true });
    }
  }, [currentTrack?.id, playingDuration, fetchLyricsForCurrentTrack]);

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

  // Helper to read .lrc / .txt files in UTF-8 and strip any BOM
  const readLrcFile = useCallback((file: File) => {
    setFileUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      let content = event.target?.result as string;
      if (content) {
        if (content.charCodeAt(0) === 0xfeff) {
          content = content.slice(1);
        }
        setCustomLyricText(content);
      }
    };
    reader.onerror = () => {
      setFileUploadError('Failed to read file. Please paste text directly.');
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readLrcFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleModalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleModalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readLrcFile(file);
    }
  };

  // User / Enhanced Lyrics Save Handler (Part 3)
  const handleSaveUserLyrics = () => {
    if (!currentTrack || !customLyricText.trim()) return;

    const parsed = parsedLrcData || parseEnhancedLrc(customLyricText, { songDuration: playingDuration });
    if (!parsed || parsed.error) {
      setFileUploadError(parsed?.error || 'Failed to parse lyrics. Please check format.');
      return;
    }

    const lengthDiff =
      parsed.meta?.lengthSeconds && playingDuration
        ? parsed.meta.lengthSeconds - playingDuration
        : undefined;
    const isDurationMismatch = lengthDiff !== undefined && Math.abs(lengthDiff) > 3;

    const userResult: LyricsResult = {
      source: 'user',
      synced: parsed.synced,
      lines: parsed.lines,
      plainLyrics: customLyricText.trim(),
      rawText: customLyricText,
      fixAllCaps: modalFixAllCaps,
      instrumental: false,
      trackName: parsed.meta.title || currentTrack.title,
      artistName: parsed.meta.artist || currentTrack.artist,
      matchedTitle: parsed.meta.title || currentTrack.title,
      matchedArtist: parsed.meta.artist || currentTrack.artist,
      durationMismatch: isDurationMismatch,
      diffSeconds: lengthDiff ? Math.round(lengthDiff) : undefined,
    };

    const storagePayload = {
      rawText: customLyricText,
      result: userResult,
      fixAllCaps: modalFixAllCaps,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(`${USER_LYRICS_PREFIX}${currentTrack.id}`, JSON.stringify(storagePayload));
    } catch {}

    // Only post to community server if explicitly opted in
    if (modalShareWithEveryone) {
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
    }

    setLyricsResult(userResult);
    setShowAddModal(false);
    setToast({
      message: modalShareWithEveryone
        ? 'Lyrics saved locally & shared with community!'
        : 'Lyrics saved and active for this track!',
    });
  };

  const handleEditUserLyrics = () => {
    if (!currentTrack) return;
    try {
      const stored = localStorage.getItem(`${USER_LYRICS_PREFIX}${currentTrack.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCustomLyricText(parsed.rawText || lyricsResult?.rawText || lyricsResult?.plainLyrics || '');
        setModalFixAllCaps(!!parsed.fixAllCaps);
      } else {
        setCustomLyricText(lyricsResult?.rawText || lyricsResult?.plainLyrics || '');
      }
    } catch {
      setCustomLyricText(lyricsResult?.rawText || lyricsResult?.plainLyrics || '');
    }
    setShowAddModal(true);
  };

  const handleReplaceUserLyrics = () => {
    setCustomLyricText('');
    setParsedLrcData(null);
    setFileUploadError(null);
    setShowAddModal(true);
  };

  const handleRemoveUserLyrics = () => {
    if (!currentTrack) return;
    try {
      localStorage.removeItem(`${USER_LYRICS_PREFIX}${currentTrack.id}`);
    } catch {}
    fetchLyricsForCurrentTrack({ bypassCache: true });
    setToast({ message: 'Custom lyrics removed. Reverted to automatic provider.' });
  };

  const handleApplySpeedFix = () => {
    if (!parsedLrcData?.meta?.lengthSeconds || !playingDuration || playingDuration <= 0 || !currentTrack) return;
    const prevTransform = { ...transform };
    const rawSpeed = parsedLrcData.meta.lengthSeconds / playingDuration;
    const newSpeed = Number(Math.max(0.5, Math.min(2.0, rawSpeed)).toFixed(3));
    const nextTransform: LyricTransform = {
      speed: newSpeed,
      offset: transform.offset,
    };
    setTransform(nextTransform);
    saveLyricTransform(currentTrack.id, nextTransform);
    setToast({
      message: `Adjusted lyric speed to ${newSpeed}x for duration match`,
      undoTransform: prevTransform,
    });
  };

  // Remove Community Lyrics and revert to provider
  const handleRemoveCommunityLyrics = () => {
    if (!currentTrack) return;
    try {
      localStorage.removeItem(`${COMMUNITY_LYRICS_PREFIX}${currentTrack.id}`);
    } catch {}
    fetchLyricsForCurrentTrack({ bypassCache: true });
  };

  // Handle Save from Sync Editor (Part F)
  const handleSaveSyncEditor = ({ lrcText, shareWithEveryone }: { lrcText: string; shareWithEveryone: boolean }) => {
    if (!currentTrack) return;
    const parsedLines = parseLrc(lrcText);
    const hasSync = parsedLines.length > 0;
    const derived = hasSync ? deriveWordTimingsFromLrc(parsedLines, currentTrack.duration) : [];

    const communityResult: LyricsResult = {
      source: 'community',
      synced: hasSync ? 'line' : 'none',
      lines: derived,
      plainLyrics: lrcText,
      instrumental: false,
      trackName: currentTrack.title,
      artistName: currentTrack.artist,
      matchedTitle: currentTrack.title,
      matchedArtist: currentTrack.artist,
      durationMismatch: false,
    };

    try {
      localStorage.setItem(`${COMMUNITY_LYRICS_PREFIX}${currentTrack.id}`, JSON.stringify(communityResult));
    } catch {}

    if (shareWithEveryone) {
      fetch('/api/lyrics/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: currentTrack.id,
          artist: currentTrack.artist,
          title: currentTrack.title,
          duration: currentTrack.duration,
          text: lrcText,
        }),
      }).catch(() => {});
    }

    setLyricsResult(communityResult);
    setShowSyncEditor(false);
    setToast({
      message: shareWithEveryone
        ? 'Lyrics synced and shared with community!'
        : 'Lyrics synced and saved locally!',
    });
  };

  // Report vandalized or low-quality community lyrics (Part F: 3 reports revert track)
  const handleReportCommunityLyrics = async () => {
    if (!currentTrack) return;
    try {
      const res = await fetch('/api/lyrics/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: currentTrack.id }),
      });
      const data = await res.json();
      if (data.reverted) {
        handleRemoveCommunityLyrics();
        setToast({ message: 'Community lyrics received 3 reports and were reverted.' });
      } else {
        setToast({ message: data.message || 'Report submitted' });
      }
    } catch {
      setToast({ message: 'Failed to submit report' });
    }
  };

  // Load lyric transform and synchronize across changes
  useEffect(() => {
    if (!currentTrack) {
      setTransform({ speed: 1.0, offset: 0.0 });
      return;
    }
    const loaded = loadLyricTransform(currentTrack.id);
    if (loaded.offset === 0 && settings.offsets[currentTrack.id] !== undefined) {
      loaded.offset = settings.offsets[currentTrack.id];
    }
    setTransform(loaded);
  }, [currentTrack?.id]);

  useEffect(() => {
    const handleTransformUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackId: string; transform: LyricTransform }>;
      if (customEvent.detail && currentTrack && customEvent.detail.trackId === currentTrack.id) {
        setTransform(customEvent.detail.transform);
      }
    };
    window.addEventListener('chillify_lyric_transform_updated', handleTransformUpdated);
    return () => window.removeEventListener('chillify_lyric_transform_updated', handleTransformUpdated);
  }, [currentTrack?.id]);

  // Current track offset from unified transform
  const currentOffset = transform.offset;

  // Auto-sync offset from localStorage on track change and reset assistant state
  useEffect(() => {
    setIsBannerDismissed(false);
    setIsTapToSyncMode(false);
    setToast(null);

    if (!currentTrack) return;
    if (settings.offsets[currentTrack.id] === undefined) {
      try {
        const stored = localStorage.getItem(`chillify_lyric_offset:${currentTrack.id}`);
        if (stored !== null) {
          const parsed = parseFloat(stored);
          if (!isNaN(parsed)) {
            setSettings((prev) => ({
              ...prev,
              offsets: { ...prev.offsets, [currentTrack.id]: parsed },
            }));
          }
        }
      } catch {}
    }
  }, [currentTrack?.id]);

  // Auto-apply community shared offset if user has not set their own manual offset
  useEffect(() => {
    if (!currentTrack || !lyricsResult) return;
    if (lyricsResult.sharedOffset !== undefined && lyricsResult.sharedOffset !== null) {
      try {
        const localSaved = localStorage.getItem(`chillify_lyric_offset:${currentTrack.id}`);
        if (localSaved === null && (!settings.offsets[currentTrack.id] || settings.offsets[currentTrack.id] === 0)) {
          const commOffset = lyricsResult.sharedOffset;
          setSettings((prev) => ({
            ...prev,
            offsets: {
              ...prev.offsets,
              [currentTrack.id]: commOffset,
            },
          }));
          const nextTransform: LyricTransform = {
            speed: transform.speed,
            offset: commOffset,
          };
          setTransform(nextTransform);
          saveLyricTransform(currentTrack.id, nextTransform);
        }
      } catch {}
    }
  }, [currentTrack?.id, lyricsResult?.sharedOffset]);

  // Apply offset preserving speed and update settings, localStorage, and listeners
  const applyOffset = useCallback(
    (newOffset: number, description?: string) => {
      if (!currentTrack) return;
      const clamped = Math.max(-120, Math.min(120, Number(newOffset.toFixed(1))));
      const prev = transform.offset;

      const nextTransform: LyricTransform = {
        speed: transform.speed,
        offset: clamped,
      };
      setTransform(nextTransform);
      saveLyricTransform(currentTrack.id, nextTransform);

      const newSettings: LyricsSettings = {
        ...settings,
        offsets: {
          ...settings.offsets,
          [currentTrack.id]: clamped,
        },
      };
      setSettings(newSettings);
      saveLyricsSettings(newSettings);

      fetch('/api/lyrics/offset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: currentTrack.id,
          offsetSeconds: clamped,
        }),
      }).catch(() => {});

      setToast({
        message: description
          ? `${description} (${clamped > 0 ? '+' : ''}${clamped}s)`
          : `Offset set to ${clamped > 0 ? '+' : ''}${clamped}s`,
        undoOffset: prev,
      });
    },
    [currentTrack, transform.speed, transform.offset, settings]
  );

  // Undo previous offset or speed action
  const handleUndo = useCallback(() => {
    if (!currentTrack) return;
    if (toast?.undoTransform) {
      setTransform(toast.undoTransform);
      saveLyricTransform(currentTrack.id, toast.undoTransform);
      setToast(null);
      return;
    }
    if (toast?.undoOffset !== undefined) {
      const prev = toast.undoOffset;
      applyOffset(prev, 'Reverted offset');
      setToast(null);
    }
  }, [toast, currentTrack, applyOffset]);

  // Toast auto-dismiss timeout (6 seconds)
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Tap-to-sync click handler using unified transform:
  // lyricTime(now) = speed * now + offset => to match line.start: offset = line.start - speed * now
  const handleLineTapToSync = useCallback(
    (line: SyncedLyricLine) => {
      if (!currentTrack) return;
      const now = getCurrentTime?.() ?? currentTime ?? 0;
      const spd = transform.speed || 1.0;
      const offset = Number((line.start - spd * now).toFixed(1));
      const lineSnippet = line.words.map((w: LyricWord) => w.text).join(' ').slice(0, 22);
      applyOffset(offset, `Synced to "${lineSnippet}..."`);
      setIsTapToSyncMode(false);
    },
    [currentTrack, getCurrentTime, currentTime, transform.speed, applyOffset]
  );

  // Unsynced Plain Lyrics: generate estimated timestamps based on duration and character weights
  const estimatedLines = useMemo(() => {
    if (
      lyricsResult &&
      lyricsResult.synced === 'none' &&
      lyricsResult.plainLyrics &&
      (!lyricsResult.lines || lyricsResult.lines.length === 0)
    ) {
      return estimatePlainLyricsTimings(lyricsResult.plainLyrics, currentTrack?.duration);
    }
    return null;
  }, [lyricsResult, currentTrack?.duration]);

  // Active display lines (real synced lines or estimated lines)
  const displayLines: SyncedLyricLine[] = useMemo(() => {
    let lines: SyncedLyricLine[] = [];
    if (lyricsResult?.lines && lyricsResult.lines.length > 0) {
      lines = lyricsResult.lines;
    } else if (estimatedLines && estimatedLines.length > 0) {
      lines = estimatedLines;
    }

    const shouldFixAllCaps = settings.fixAllCaps || (lyricsResult?.source === 'user' && lyricsResult.fixAllCaps);
    if (shouldFixAllCaps && lines.length > 0) {
      return lines.map((line) => fixLineSentenceCase(line));
    }
    return lines;
  }, [lyricsResult, estimatedLines, settings.fixAllCaps]);

  const isEstimated = useMemo(() => {
    return (
      !isLoading &&
      !lyricsResult?.instrumental &&
      lyricsResult?.synced === 'none' &&
      !!lyricsResult?.plainLyrics &&
      displayLines.length > 0
    );
  }, [isLoading, lyricsResult, displayLines]);

  // Sync Engine Hook (runs on requestAnimationFrame, updates CSS vars on stage)
  const { lineIndex, wordIndex } = useLyricsSync({
    lines: displayLines,
    offsetSeconds: transform.offset,
    speed: transform.speed,
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
    if (lyricsResult.source === 'user') return 'Source: Your file';
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

  // Clean metadata display info (no duplicated featured artists, clean title & artist)
  const cleanDisplayInfo = useMemo(() => {
    if (!currentTrack || !currentTrack.title) return null;
    return formatCleanDisplayTrack(currentTrack.title, currentTrack.artist);
  }, [currentTrack]);

  // Only show "Matched: ..." when matched title/artist differs from the cleaned display
  const showMatchedDiff = useMemo(() => {
    if (!lyricsResult?.matchedTitle || !cleanDisplayInfo) return false;
    const normMatched = `${normalizeString(lyricsResult.matchedArtist || '')}::${normalizeString(lyricsResult.matchedTitle)}`;
    const normClean = `${normalizeString(cleanDisplayInfo.cleanArtist)}::${normalizeString(cleanDisplayInfo.cleanTitle)}`;
    return normMatched !== normClean;
  }, [lyricsResult, cleanDisplayInfo]);

  // Render the selected style component
  const renderStyleStage = () => {
    if (displayLines.length === 0) return null;

    // In Tap-to-sync mode, always display ClassicStage so all lines are visible and clickable
    if (isTapToSyncMode) {
      return (
        <ClassicStage
          lines={displayLines}
          activeLineIndex={lineIndex}
          activeWordIndex={wordIndex}
          onLineClick={handleLineTapToSync}
          isTapToSyncActive={true}
          isEstimated={isEstimated}
        />
      );
    }

    const commonProps = {
      lines: displayLines,
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
            lines={displayLines}
            activeLineIndex={lineIndex}
            activeWordIndex={wordIndex}
            onLineClick={handleLineTapToSync}
            isTapToSyncActive={false}
            isEstimated={isEstimated}
          />
        );
    }
  };

  return (
    <div
      ref={stageWrapperRef}
      onMouseMove={handleMouseMove}
      className={`w-full flex flex-col bg-black text-white relative select-none overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 p-4 sm:p-8 h-screen w-screen'
          : 'rounded-2xl border border-[#222222] flex-1 min-h-[60vh] sm:min-h-[70vh] h-[calc(100vh-230px)] max-h-[960px]'
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
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
          <div className="w-8 h-8 rounded-full bg-[#181818] border border-[#2a2a2a] flex items-center justify-center text-sm shrink-0">
            🎙️
          </div>
          <div className="min-w-0 flex-1">
            {cleanDisplayInfo ? (
              <h2 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2 flex-wrap">
                <span
                  title={`Original YouTube Title: ${cleanDisplayInfo.rawTitle}`}
                  className="truncate cursor-default hover:text-zinc-200 transition-colors"
                >
                  {cleanDisplayInfo.cleanTitle}
                </span>
                {lyricsResult?.source === 'user' ? (
                  lyricsResult.durationMismatch ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 animate-pulse">
                      {lyricsResult.synced === 'word' ? 'Word-synced' : 'Line-synced'} (may be off by ~{Math.abs(lyricsResult.diffSeconds || 0)}s)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      {lyricsResult.synced === 'word' ? 'Word-synced' : 'Line-synced'}
                    </span>
                  )
                ) : lyricsResult?.source === 'plain + captions timing' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                    Aligned
                  </span>
                ) : isEstimated ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    Estimated
                  </span>
                ) : lyricsResult?.synced === 'line' || lyricsResult?.synced === 'word' ? (
                  lyricsResult.sharedOffset !== undefined && transform.offset === lyricsResult.sharedOffset ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      Synced (community offset: {lyricsResult.sharedOffset > 0 ? `+${lyricsResult.sharedOffset}` : lyricsResult.sharedOffset}s)
                    </span>
                  ) : lyricsResult.durationMismatch ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 animate-pulse">
                      Synced (may be off by ~{Math.abs(lyricsResult.diffSeconds || 0)}s)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      Synced
                    </span>
                  )
                ) : null}
                {provenanceLabel && (
                  <span className="text-[10px] text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800 shrink-0 hidden sm:inline-block">
                    {provenanceLabel}
                  </span>
                )}
              </h2>
            ) : (
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                No song playing
              </h2>
            )}
            <p className="text-xs text-[#888888] truncate flex items-center gap-2">
              <span className="truncate">{cleanDisplayInfo?.cleanArtist || currentTrack?.artist || 'Play a track to view live synced lyrics'}</span>
              {showMatchedDiff && lyricsResult?.matchedTitle && lyricsResult?.matchedArtist && (
                <span className="text-zinc-500 hidden md:inline truncate">
                  (Matched: &ldquo;{lyricsResult.matchedArtist} - {lyricsResult.matchedTitle}&rdquo;)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions, Settings Menu & Fullscreen */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* User lyrics actions: Edit, Replace, Remove */}
          {lyricsResult?.source === 'user' ? (
            <>
              <HeaderActionButton
                onClick={handleEditUserLyrics}
                icon="✏️"
                label="Edit"
                ariaLabel="Edit your lyrics"
                title="Edit stored lyrics text and timing"
              />
              <HeaderActionButton
                onClick={handleReplaceUserLyrics}
                icon="🔄"
                label="Replace"
                ariaLabel="Replace your lyrics file"
                title="Replace your lyrics with a new file or text"
              />
              <HeaderActionButton
                onClick={handleRemoveUserLyrics}
                icon="🗑️"
                label="Remove"
                ariaLabel="Remove your lyrics file"
                variant="rose"
                title="Remove your lyrics and revert to automatic provider"
              />
            </>
          ) : lyricsResult?.source === 'community' ? (
            <>
              <HeaderActionButton
                onClick={handleReportCommunityLyrics}
                icon="🚩"
                label="Report"
                ariaLabel="Report incorrect or vandalized community lyrics"
                variant="rose"
                title="Report incorrect or vandalized community lyrics (3 reports reverts track)"
              />
              <HeaderActionButton
                onClick={handleRemoveCommunityLyrics}
                icon="🗑️"
                label="Revert custom"
                ariaLabel="Revert to automatic provider lyrics"
                variant="amber"
                title="Revert to automatic provider lyrics"
              />
            </>
          ) : (
            <>
              {/* Sync song button for estimated plain lyrics */}
              {isEstimated && (
                <HeaderActionButton
                  onClick={() => setShowSyncEditor(true)}
                  icon="⏱️"
                  label="Sync song"
                  ariaLabel="Open sync recorder to time lyrics"
                  variant="amber"
                  title="Open sync recorder to time lyrics"
                />
              )}

              {/* Add / Upload lyrics button */}
              {currentTrack && (
                <HeaderActionButton
                  onClick={() => {
                    setCustomLyricText('');
                    setParsedLrcData(null);
                    setFileUploadError(null);
                    setShowAddModal(true);
                  }}
                  icon="➕"
                  label="Add lyrics"
                  ariaLabel="Add or paste your own .lrc or plain lyrics"
                  title="Add or paste your own .lrc or plain lyrics"
                />
              )}
            </>
          )}

          {/* Wrong timing? button */}
          {currentTrack && displayLines.length > 0 && (
            <HeaderActionButton
              onClick={() => {
                setShowOffsetAssistant((prev) => !prev);
                setIsBannerDismissed(false);
              }}
              icon="⏱️"
              label="Wrong timing?"
              ariaLabel="Adjust sync timing offset"
              active={showOffsetAssistant || (lyricsResult?.durationMismatch && !isBannerDismissed)}
              variant={showOffsetAssistant || (lyricsResult?.durationMismatch && !isBannerDismissed) ? 'amber' : 'default'}
              badge={
                transform.offset !== 0 ? (
                  <span className="text-[10px] font-mono px-1 rounded bg-black/60 text-amber-300">
                    {transform.offset > 0 ? `+${transform.offset}` : transform.offset}s
                  </span>
                ) : null
              }
              title="Adjust sync timing offset"
            />
          )}

          {/* Wrong lyrics? button */}
          {currentTrack && (displayLines.length > 0 || lyricsResult?.plainLyrics) && (
            <HeaderActionButton
              onClick={() => setShowFixModal(true)}
              icon="✏️"
              label="Wrong lyrics?"
              ariaLabel="Search with custom artist and title"
              title="Search with custom artist and title"
            />
          )}

          <SettingsMenu
            settings={settings}
            trackId={currentTrack?.id}
            onUpdate={(newSettings) => setSettings(newSettings)}
          />

          <button
            type="button"
            onClick={toggleFullscreen}
            className="h-9 w-9 rounded-xl bg-[#161616] hover:bg-[#262626] border border-[#282828] text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
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

      {/* Offset Assistant Banner (shown when durationMismatch or user clicked 'Wrong timing?') */}
      {currentTrack && displayLines.length > 0 && ((lyricsResult?.durationMismatch && !isBannerDismissed) || showOffsetAssistant) && (
        <div className="bg-[#15120c]/95 border-b border-amber-500/25 px-4 sm:px-6 py-3 text-xs text-zinc-200 z-30 backdrop-blur-md flex flex-col gap-2.5 shadow-lg animate-fade-in">
          {/* Top row: Diff explanation + Quick shift buttons + Tap to sync */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-amber-400 shrink-0">
                <span>⏱️</span>
                <span>Offset Assistant</span>
              </span>

              {lyricsResult?.durationMismatch && (
                <span className="text-zinc-400 text-[11px] hidden md:inline">
                  (Duration differs by ~{Math.abs(lyricsResult.diffSeconds || 0)}s)
                </span>
              )}

              {/* One-click shift buttons when diffSeconds is known */}
              {lyricsResult?.diffSeconds !== undefined && Math.abs(lyricsResult.diffSeconds) > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyOffset(-Math.abs(lyricsResult.diffSeconds || 0), `Shifted by -${Math.abs(lyricsResult.diffSeconds || 0)}s`)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold cursor-pointer transition-colors text-[11px]"
                    title="Delay lyrics so they match a video with an intro"
                  >
                    Shift lyrics by -{Math.abs(lyricsResult.diffSeconds)}s
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOffset(Math.abs(lyricsResult.diffSeconds || 0), `Shifted by +${Math.abs(lyricsResult.diffSeconds || 0)}s`)}
                    className="px-2 py-1 rounded-lg bg-[#222222] hover:bg-[#2c2c2c] border border-[#333333] text-zinc-300 font-medium cursor-pointer transition-colors text-[11px]"
                    title="Advance lyrics earlier"
                  >
                    Try other direction (+{Math.abs(lyricsResult.diffSeconds)}s)
                  </button>
                </div>
              )}

              {/* Tap to sync button */}
              <button
                type="button"
                onClick={() => setIsTapToSyncMode((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer transition-all text-[11px] flex items-center gap-1.5 ${
                  isTapToSyncMode
                    ? 'bg-amber-400 text-black border-amber-300 animate-pulse shadow-md'
                    : 'bg-[#222222] hover:bg-[#2c2c2c] border-[#383838] text-zinc-200'
                }`}
                title="Click any lyric line when you hear it start to align sync"
              >
                <span>🎯</span>
                <span>{isTapToSyncMode ? 'Tap any line below...' : 'Tap to sync'}</span>
              </button>
            </div>

            {/* Right actions: Fix search & Dismiss */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setShowFixModal(true)}
                className="text-zinc-400 hover:text-white text-[11px] underline cursor-pointer"
              >
                Fix search
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBannerDismissed(true);
                  setShowOffsetAssistant(false);
                  setIsTapToSyncMode(false);
                }}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer text-xs"
                title="Dismiss offset assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Bottom row: Manual slider (-120s to +120s), Step toggle (0.1s / 1s), Readout & Reset */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#2a2416]/60">
            <span className="text-[11px] text-zinc-400 font-medium shrink-0">
              Manual offset:
            </span>

            <div className="flex-1 min-w-[140px] max-w-xs flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-mono">-120s</span>
              <input
                type="range"
                min={-120}
                max={120}
                step={isCoarseStep ? 1 : 0.1}
                value={transform.offset}
                onChange={(e) => applyOffset(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#252525] rounded-lg"
              />
              <span className="text-[10px] text-zinc-500 font-mono">+120s</span>
            </div>

            {/* Step Toggle: Fine (0.1s) vs Coarse (1s) */}
            <div className="flex items-center rounded-lg bg-[#1c1c1c] border border-[#2e2e2e] p-0.5 text-[10px] shrink-0">
              <button
                type="button"
                onClick={() => setIsCoarseStep(false)}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  !isCoarseStep ? 'bg-[#333333] text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                0.1s Fine
              </button>
              <button
                type="button"
                onClick={() => setIsCoarseStep(true)}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  isCoarseStep ? 'bg-[#333333] text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                1s Coarse
              </button>
            </div>

            {/* Number Display & Reset */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-xs font-bold text-amber-300 min-w-[50px] text-right">
                {transform.offset > 0 ? `+${transform.offset.toFixed(1)}` : transform.offset.toFixed(1)}s
              </span>

              {transform.offset !== 0 && (
                <button
                  type="button"
                  onClick={() => applyOffset(0, 'Reset offset')}
                  className="px-2 py-0.5 rounded-lg bg-[#222222] hover:bg-[#2c2c2c] border border-[#333333] text-[11px] text-zinc-300 hover:text-white cursor-pointer transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Tap-to-sync Active Hint */}
          {isTapToSyncMode && (
            <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center justify-between animate-fade-in">
              <span>
                🎧 Listen to the song. As soon as the artist sings a line, click that line below to instantly lock in timing!
              </span>
              <button
                type="button"
                onClick={() => setIsTapToSyncMode(false)}
                className="underline hover:text-white ml-2 shrink-0 cursor-pointer text-[10px]"
              >
                Cancel tap-to-sync
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Lyrics Stage Area */}
      <div className="flex-1 w-full min-h-[380px] overflow-hidden relative flex flex-col items-center justify-center">
        {/* Empty State: No song playing */}
        {!currentTrack && (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
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
          <div className="p-8 text-center flex flex-col items-center justify-center gap-3 max-w-md">
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

        {/* Synced or Estimated Lyrics Stage (Renders the selected style) */}
        {currentTrack &&
          !isLoading &&
          !lyricsResult?.instrumental &&
          displayLines.length > 0 &&
          renderStyleStage()}

        {/* Not Found State with Inline Manual Fix & Add Lyrics */}
        {currentTrack &&
          !isLoading &&
          !lyricsResult?.instrumental &&
          displayLines.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-4 max-w-md w-full">
              <div className="w-12 h-12 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center text-xl">
                ✨
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No lyrics available</h3>
                <p className="text-xs text-[#888888] mt-1 leading-relaxed">
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

      {/* Slim Lyric Speed Slider in Fullscreen View */}
      {isFullscreen && currentTrack && !lyricsResult?.instrumental && displayLines.length > 0 && (
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-64 max-w-[85vw] px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 z-40 transition-opacity duration-300 ${
            isFullscreen && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <LyricSpeedSlider trackId={currentTrack.id} />
        </div>
      )}

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

            {lyricsResult?.source === 'user' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-col gap-2">
                <span className="text-emerald-300 font-semibold">
                  You are currently using custom lyrics for this track.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFixModal(false);
                      handleEditUserLyrics();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
                  >
                    Edit file
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFixModal(false);
                      handleReplaceUserLyrics();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFixModal(false);
                      handleRemoveUserLyrics();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

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
        <div
          onDragOver={handleModalDragOver}
          onDragLeave={handleModalDragLeave}
          onDrop={handleModalDrop}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <div
            className={`bg-[#121212] border rounded-2xl p-6 max-w-xl w-full shadow-2xl relative flex flex-col max-h-[90vh] transition-all duration-200 ${
              isDraggingOver ? 'border-emerald-500/80 bg-[#142018] scale-[1.01]' : 'border-[#2a2a2a]'
            }`}
          >
            {isDraggingOver && (
              <div className="absolute inset-0 rounded-2xl bg-emerald-950/85 border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center gap-2 z-30 pointer-events-none">
                <span className="text-3xl animate-bounce">📂</span>
                <span className="text-sm font-bold text-emerald-200">Drop your .lrc or .txt file here</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white text-sm cursor-pointer p-1 transition-colors"
              aria-label="Close dialog"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <span>Add Lyrics</span>
              {currentTrack?.title && (
                <span className="text-zinc-400 font-normal truncate text-xs">
                  for &ldquo;{currentTrack.title}&rdquo;
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              Paste or drop Enhanced LRC (<code>&lt;mm:ss.xx&gt;</code> word tags), standard LRC, or plain text.
            </p>

            {/* File picker & Drag-and-drop indicator */}
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
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
                  className="px-3 py-1.5 rounded-xl bg-[#202020] hover:bg-[#2c2c2c] border border-[#333333] text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>📂</span>
                  <span>Choose or drop file</span>
                </button>
                <span className="text-[11px] text-zinc-500 hidden sm:inline">
                  Drag & drop .lrc / .txt supported
                </span>
              </div>

              {/* Status Chip */}
              {parsedLrcData && !parsedLrcData.error && (
                <div className="flex items-center gap-2">
                  {parsedLrcData.synced === 'word' ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Word-synced (Enhanced LRC)
                    </span>
                  ) : parsedLrcData.synced === 'line' ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      Line-synced (LRC)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                      📝 Plain text (unsynced)
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-400">
                    {parsedLrcData.lines.length} lines • {totalParsedWords} words
                    {detectedDurationSec > 0 && ` • ~${formatDurationClock(detectedDurationSec)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Error banner if file reading or parsing failed */}
            {(fileUploadError || parsedLrcData?.error) && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{fileUploadError || parsedLrcData?.error}</span>
              </div>
            )}

            {/* Duration mismatch note with speed fix */}
            {parsedLrcData?.meta?.lengthSeconds &&
              playingDuration &&
              Math.abs(parsedLrcData.meta.lengthSeconds - playingDuration) > 3 && (
                <div className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span>
                      Lyrics timing is for a version that is ~
                      {Math.abs(Math.round(parsedLrcData.meta.lengthSeconds - playingDuration))}s{' '}
                      {parsedLrcData.meta.lengthSeconds > playingDuration ? 'longer' : 'shorter'} than the playing track.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplySpeedFix}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shrink-0 transition-colors cursor-pointer"
                  >
                    Apply offset/speed fix
                  </button>
                </div>
              )}

            {/* Textarea input */}
            <textarea
              value={customLyricText}
              onChange={(e) => setCustomLyricText(e.target.value)}
              placeholder="Paste .lrc or plain text here...&#10;[00:04.20]word <00:04.80>word <00:05.40>word&#10;[00:08.50]Second line of song"
              rows={7}
              className="w-full p-3 rounded-xl bg-[#181818] border border-[#282828] text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500 resize-none transition-colors"
            />

            {/* Compact Preview (first 3 parsed lines with word timing on hover) */}
            {parsedLrcData && parsedLrcData.lines.length > 0 && (
              <div className="mt-3 p-2.5 rounded-xl bg-[#151515] border border-[#252525] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span className="font-semibold uppercase tracking-wider text-zinc-300">
                    Preview (first {Math.min(3, parsedLrcData.lines.length)} lines)
                  </span>
                  <span className="text-zinc-500">Hover a word to view timing</span>
                </div>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {parsedLrcData.lines.slice(0, 3).map((line, lIdx) => (
                    <div key={line.id || lIdx} className="flex items-baseline gap-2 flex-wrap text-zinc-300 leading-snug">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono shrink-0 select-none">
                        {formatLrcTimestamp(line.start)}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {line.words && line.words.length > 0 ? (
                          line.words.map((w, wIdx) => (
                            <span
                              key={wIdx}
                              onMouseEnter={() =>
                                setHoveredWordTiming(
                                  `"${w.text}": ${w.start.toFixed(2)}s – ${w.end.toFixed(2)}s (${(
                                    w.end - w.start
                                  ).toFixed(2)}s)`
                                )
                              }
                              onMouseLeave={() => setHoveredWordTiming(null)}
                              className="px-1 py-0.2 rounded hover:bg-emerald-500/25 hover:text-emerald-300 border border-transparent hover:border-emerald-500/40 transition-colors cursor-help"
                              title={`${w.text}: ${w.start.toFixed(2)}s – ${w.end.toFixed(2)}s`}
                            >
                              {modalFixAllCaps ? fixSentenceCase(w.text) : w.text}
                            </span>
                          ))
                        ) : (
                          <span>{modalFixAllCaps ? fixSentenceCase(line.text) : line.text}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {hoveredWordTiming && (
                  <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded-md mt-0.5 animate-fade-in">
                    ⏱️ {hoveredWordTiming}
                  </div>
                )}
              </div>
            )}

            {/* Checkboxes: Fix ALL CAPS and Share */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#222222]">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modalFixAllCaps}
                  onChange={(e) => setModalFixAllCaps(e.target.checked)}
                  className="rounded bg-[#1a1a1a] border-zinc-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Fix ALL CAPS (display only)</span>
              </label>

              <label className="flex items-center gap-2 text-[11px] text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modalShareWithEveryone}
                  onChange={(e) => setModalShareWithEveryone(e.target.checked)}
                  className="rounded bg-[#1a1a1a] border-zinc-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Share with everyone (optional)</span>
              </label>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#262626] text-xs font-semibold text-zinc-300 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUserLyrics}
                disabled={!customLyricText.trim() || !parsedLrcData || !!parsedLrcData.error}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed text-black text-xs font-bold cursor-pointer transition-all shadow-md"
              >
                Save and Use Lyrics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Editor Modal (Part F) */}
      {showSyncEditor && currentTrack && lyricsResult?.plainLyrics && (
        <SyncEditorModal
          isOpen={showSyncEditor}
          onClose={() => setShowSyncEditor(false)}
          rawLyricsText={lyricsResult.plainLyrics}
          songTitle={cleanDisplayInfo?.cleanTitle || currentTrack.title}
          songArtist={cleanDisplayInfo?.cleanArtist || currentTrack.artist}
          duration={currentTrack.duration}
          onSave={handleSaveSyncEditor}
        />
      )}

      {/* Floating Undo Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#181818]/95 border border-[#333333] shadow-2xl px-4 py-2.5 rounded-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in text-xs text-white">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="text-amber-400">⏱️</span>
            {toast.message}
          </span>
          {toast.undoOffset !== undefined && (
            <button
              type="button"
              onClick={handleUndo}
              className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl cursor-pointer text-xs transition-colors shadow"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-zinc-500 hover:text-white ml-1 p-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
