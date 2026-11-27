'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LyricsSettings,
  LyricsStyle,
  LyricsFont,
  LyricsQuality,
  DiscStyleSettings,
  DiscTuningSettings,
  Windows98StyleSettings,
  EdgeGlowMode,
  EdgeGlowColorSource,
  EdgeGlowStyleOption,
  saveLyricsSettings,
  DEFAULT_LYRICS_SETTINGS,
  DEFAULT_DISC_SETTINGS,
  DEFAULT_DISC_TUNING,
  DEFAULT_WINDOWS98_SETTINGS,
  DEFAULT_INTENSE_EFFECTS,
} from '@/lib/lyrics/settings';
import { WINDOWS98_STICKERS } from './styles/Windows98Stage';
import { loadLyricTransform, saveLyricTransform } from '@/lib/lyrics/transform';
import { Z_INDEX } from '@/constants/zIndex';

interface SettingsMenuProps {
  settings: LyricsSettings;
  trackId?: string;
  onUpdate: (newSettings: LyricsSettings) => void;
}

type MenuPage =
  | 'main'
  | 'style'
  | 'disc'
  | 'windows98'
  | 'font'
  | 'edge-glow'
  | 'colors'
  | 'visuals'
  | 'sync'
  | 'behavior';

const STYLE_LABELS: { id: LyricsStyle; label: string; badge?: string }[] = [
  { id: 'classic', label: 'Classic', badge: 'Lines' },
  { id: 'visual', label: 'Visual', badge: 'Word' },
  { id: 'constellation', label: 'Constellation', badge: 'Graph' },
  { id: 'ship', label: 'Ship', badge: '3D Wall' },
  { id: 'camera', label: 'Camera', badge: 'Dynamic' },
  { id: 'disc', label: 'Disc', badge: 'Spinning CD' },
  { id: 'windows98', label: 'Windows 98', badge: 'Media Player' },
  { id: 'fisheye', label: 'Fisheye', badge: '3D Cylinder' },
  { id: 'codestyle', label: 'Codestyle', badge: 'Editor' },
  { id: 'branches', label: 'Branches', badge: 'Tree' },
  { id: 'web', label: 'Web', badge: 'Radial' },
];

const FONT_OPTIONS: { id: LyricsFont; name: string; styleName: string; fontVar: string }[] = [
  { id: 'inter', name: 'Inter', styleName: 'SF Pro style', fontVar: 'var(--font-inter, sans-serif)' },
  { id: 'nunito', name: 'Nunito', styleName: 'Rounded', fontVar: 'var(--font-nunito, sans-serif)' },
  { id: 'newsreader', name: 'Newsreader', styleName: 'Serif / Editorial', fontVar: 'var(--font-newsreader, serif)' },
  { id: 'arimo', name: 'Arimo', styleName: 'Helvetica style', fontVar: 'var(--font-arimo, sans-serif)' },
  { id: 'nunito_sans', name: 'Nunito Sans', styleName: 'Avenir style', fontVar: 'var(--font-nunito-sans, sans-serif)' },
  { id: 'jost', name: 'Jost', styleName: 'Futura style', fontVar: 'var(--font-jost, sans-serif)' },
  { id: 'playfair', name: 'Playfair Display', styleName: 'Didot style', fontVar: 'var(--font-playfair, serif)' },
];

const EDGE_GLOW_PRESETS = [
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'White', color: '#ffffff' },
];

export default function SettingsMenu({ settings, trackId, onUpdate }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePage, setActivePage] = useState<MenuPage>('main');
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Reset to main view whenever popover is closed
  useEffect(() => {
    if (!isOpen) {
      setActivePage('main');
    }
  }, [isOpen]);

  // Position calculation with viewport clamping and upward flip if needed
  const updateCoords = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(384, window.innerWidth - 24);
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    if (spaceBelow < 320 && spaceAbove > spaceBelow) {
      // Flip upward
      setCoords({
        bottom: window.innerHeight - rect.top + 8,
        left,
        maxHeight: Math.min(spaceAbove - 12, window.innerHeight - 24),
      });
    } else {
      // Position downward
      setCoords({
        top: rect.bottom + 8,
        left,
        maxHeight: Math.min(spaceBelow - 12, window.innerHeight - 24),
      });
    }
  }, []);

  // Update position on open, resize, or scroll
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen, updateCoords]);

  // Coordinate with other popovers
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(
        new CustomEvent('chillcast_popover_open', { detail: { id: 'lyrics-settings-menu' } })
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOtherPopover = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail && customEvent.detail.id !== 'lyrics-settings-menu') {
        setIsOpen(false);
      }
    };
    window.addEventListener('chillcast_popover_open', handleOtherPopover);
    return () => window.removeEventListener('chillcast_popover_open', handleOtherPopover);
  }, [isOpen]);

  // Close on outside click and Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePage !== 'main') {
          setActivePage('main');
        } else {
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activePage]);

  const updateSettings = (updates: Partial<LyricsSettings>) => {
    const next = { ...settings, ...updates };
    onUpdate(next);
    saveLyricsSettings(next);
  };

  const [isCoarseStep, setIsCoarseStep] = useState<boolean>(false);
  const currentOffset = trackId ? settings.offsets[trackId] ?? 0 : 0;

  const handleOffsetChange = (val: number) => {
    if (!trackId) return;
    const rounded = Math.round(val * 10) / 10;
    const nextOffsets = { ...settings.offsets, [trackId]: rounded };
    try {
      localStorage.setItem(`chillify_lyric_offset:${trackId}`, String(rounded));
    } catch {}
    updateSettings({ offsets: nextOffsets });

    // Update unified transform preserving speed
    const currentTrans = loadLyricTransform(trackId);
    saveLyricTransform(trackId, { speed: currentTrans.speed, offset: rounded });

    // Anonymously share offset back
    fetch('/api/lyrics/offset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: trackId, offsetSeconds: rounded }),
    }).catch(() => {});
  };

  const handleOffsetReset = () => {
    if (!trackId) return;
    const nextOffsets = { ...settings.offsets };
    delete nextOffsets[trackId];
    try {
      localStorage.removeItem(`chillify_lyric_offset:${trackId}`);
    } catch {}
    updateSettings({ offsets: nextOffsets });

    const currentTrans = loadLyricTransform(trackId);
    saveLyricTransform(trackId, { speed: currentTrans.speed, offset: 0 });
  };

  const handleResetColors = () => {
    updateSettings({
      chromaEnabled: DEFAULT_LYRICS_SETTINGS.chromaEnabled,
      chromaSpeed: DEFAULT_LYRICS_SETTINGS.chromaSpeed,
      chromaVividness: DEFAULT_LYRICS_SETTINGS.chromaVividness,
      lyricColor: DEFAULT_LYRICS_SETTINGS.lyricColor,
      highlightColor: DEFAULT_LYRICS_SETTINGS.highlightColor,
      secondaryColor: DEFAULT_LYRICS_SETTINGS.secondaryColor,
    });
  };

  const handleResetEdgeGlow = () => {
    updateSettings({
      edgeGlowEnabled: DEFAULT_LYRICS_SETTINGS.edgeGlowEnabled,
      edgeGlowMode: DEFAULT_LYRICS_SETTINGS.edgeGlowMode,
      edgeGlowThickness: DEFAULT_LYRICS_SETTINGS.edgeGlowThickness,
      edgeGlowSize: DEFAULT_LYRICS_SETTINGS.edgeGlowSize,
      edgeGlowColorSource: DEFAULT_LYRICS_SETTINGS.edgeGlowColorSource,
      edgeGlowCustomColor: DEFAULT_LYRICS_SETTINGS.edgeGlowCustomColor,
      edgeGlowStyle: DEFAULT_LYRICS_SETTINGS.edgeGlowStyle,
      edgeGlowIntensity: DEFAULT_LYRICS_SETTINGS.edgeGlowIntensity,
    });
  };

  const currentStyleLabel = STYLE_LABELS.find((s) => s.id === settings.style)?.label || 'Classic';
  const currentFontName = FONT_OPTIONS.find((f) => f.id === settings.font)?.name || 'Inter';

  // Submenu Header helper
  const renderSubmenuHeader = (title: string, onReset?: () => void, resetLabel: string = 'Reset') => (
    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#242428]">
      <button
        type="button"
        onClick={() => setActivePage('main')}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer group"
      >
        <svg
          className="w-3.5 h-3.5 fill-none stroke-current transition-transform group-hover:-translate-x-0.5"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>

      <span className="text-xs font-bold text-white uppercase tracking-wider">{title}</span>

      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
        >
          {resetLabel}
        </button>
      ) : (
        <div className="w-10" />
      )}
    </div>
  );

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Lyrics and Visualizer Settings"
        className={`group h-9 px-2.5 rounded-xl border text-xs font-semibold flex items-center transition-all duration-180 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 shrink-0 ${
          isOpen
            ? 'bg-[#2a2a2a] border-white/30 text-white shadow-lg'
            : 'bg-[#161616] hover:bg-[#222222] border-[#2c2c2c] text-zinc-300 hover:text-white'
        }`}
      >
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>

        <span
          className={`grid transition-[grid-template-columns] duration-180 ease-out motion-reduce:transition-none ${
            isOpen ? 'grid-cols-[1fr]' : 'grid-cols-[0fr] group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr]'
          }`}
        >
          <span
            className={`overflow-hidden whitespace-nowrap transition-opacity duration-180 ease-out flex items-center gap-1.5 ${
              isOpen
                ? 'opacity-100 pl-1.5'
                : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pl-0 group-hover:pl-1.5 group-focus-visible:pl-1.5'
            }`}
          >
            <span>Settings</span>
            <svg
              className={`w-3 h-3 fill-current transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </span>
        </span>
      </button>

      {/* Portaled Menu */}
      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-80 sm:w-96 rounded-2xl bg-[#121214]/95 backdrop-blur-xl border border-[#26262a] shadow-2xl p-4 text-white scrollbar-thin scrollbar-thumb-zinc-700 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : undefined,
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            left: `${coords.left}px`,
            maxHeight: `${coords.maxHeight}px`,
            zIndex: Z_INDEX.popovers,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          {/* ============================================================== */}
          {/* PAGE: MAIN HUB MENU                                            */}
          {/* ============================================================== */}
          {activePage === 'main' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222226]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Lyrics Settings
                </span>
                <span className="text-[10px] text-zinc-500">Choose category</span>
              </div>

              {/* 1. Lyrics Style */}
              <button
                type="button"
                onClick={() => setActivePage('style')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-[#26262e] hover:border-[#383844] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.28 19.59 10.6 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-red-400 transition-colors">
                      Lyrics Style
                    </p>
                    <p className="text-[11px] text-zinc-400">{currentStyleLabel} mode</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Disc Style Settings (visible only when Disc style is active) */}
              {settings.style === 'disc' && (
                <button
                  type="button"
                  onClick={() => setActivePage('disc')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-white/15 hover:border-white/30 transition-all cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-white flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Disc (Spinning CD)
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {settings.disc?.discFinish === 'cover' ? 'Cover colors' : 'Silver'} • {settings.disc?.wordsPerPhrase || 3} words/phrase
                      </p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* Windows 98 Style Settings (visible only when Windows 98 style is active) */}
              {settings.style === 'windows98' && (
                <button
                  type="button"
                  onClick={() => setActivePage('windows98')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-white/15 hover:border-white/30 transition-all cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0053ee]/25 border border-[#0053ee]/50 text-[#60a5fa] flex items-center justify-center shrink-0 text-[10px] font-bold">
                      98
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Windows 98 (Media Player)
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {settings.windows98?.stickerMode === 'pinned' ? 'Pinned sticker' : settings.windows98?.stickerMode === 'per_song' ? 'Per song' : 'Changes per line'} • {settings.windows98?.revealMode === 'line' ? 'Full line' : 'Word by word'}
                      </p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* 2. Edge Glow */}
              <button
                type="button"
                onClick={() => setActivePage('edge-glow')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-[#26262e] hover:border-[#383844] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors">
                      Edge Glow Visualizer
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {settings.edgeGlowEnabled
                        ? `${settings.edgeGlowColorSource === 'custom' ? 'Custom Color' : settings.edgeGlowColorSource === 'accent' ? 'Theme Accent' : 'Artwork Dynamic'} • ${settings.edgeGlowMode === 'music_sync' ? 'Beat Sync' : 'Static'}`
                        : 'Disabled'}
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 3. Typography & Font */}
              <button
                type="button"
                onClick={() => setActivePage('font')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-[#26262e] hover:border-[#383844] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                    Aa
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                      Font &amp; Typography
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {currentFontName} • Scale: {settings.textSize}%
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 4. Colors & Chroma RGB */}
              <button
                type="button"
                onClick={() => setActivePage('colors')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-[#26262e] hover:border-[#383844] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.28 19.59 10.6 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4-4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-purple-400 transition-colors">
                      Colors &amp; Chroma RGB
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {settings.chromaEnabled
                        ? 'Chroma Spectrum RGB Active'
                        : settings.autoSyncColor
                        ? 'Auto-Sync Artwork Palette'
                        : 'Custom Color Palette'}
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 5. Visuals & Word Effects */}
              <button
                type="button"
                onClick={() => setActivePage('visuals')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-[#26262e] hover:border-[#383844] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      Visuals &amp; Word Effects
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {settings.wordImagesEnabled ? 'Illustrations On' : 'Illustrations Off'} • {settings.wordEffectsEnabled ? 'Effects On' : 'Off'}
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 6. Audio & Lyric Sync */}
              <button
                type="button"
                onClick={() => setActivePage('sync')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-[#26262e] hover:border-[#383844] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-rose-400 transition-colors">
                      Audio &amp; Lyric Sync
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Timing offset: {currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`}
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 7. Display & Behavior */}
              <button
                type="button"
                onClick={() => setActivePage('behavior')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-[#26262e] hover:border-[#383844] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-300 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-zinc-200 transition-colors">
                      Display &amp; Behavior
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Wake lock, camera &amp; clean casing
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGE: 1. LYRICS STYLE                                          */}
          {/* ============================================================== */}
          {activePage === 'style' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {renderSubmenuHeader('Lyrics Style')}
              <div className="grid grid-cols-2 gap-1.5">
                {STYLE_LABELS.map((item) => {
                  const isSelected = settings.style === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateSettings({ style: item.id })}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 font-bold'
                          : 'bg-[#18181c] hover:bg-[#222228] text-zinc-300 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <p className="truncate">{item.label}</p>
                        <p className="text-[10px] text-zinc-500 font-normal">{item.badge}</p>
                      </div>
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGE: 2. EDGE GLOW CUSTOMIZATION                               */}
          {/* ============================================================== */}
          {activePage === 'edge-glow' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {renderSubmenuHeader('Edge Glow Visualizer', handleResetEdgeGlow)}

              {/* Master Toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-[#26262e] text-xs cursor-pointer select-none">
                <div>
                  <span className="text-white font-semibold block">Enable Edge Glow</span>
                  <span className="text-[10px] text-zinc-400">Ambient screen glow reactive to audio</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.edgeGlowEnabled}
                  onChange={(e) => updateSettings({ edgeGlowEnabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
                />
              </label>

              {settings.edgeGlowEnabled && (
                <div className="space-y-4 pt-1">
                  {/* Color Source Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Color Source
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                      {(
                        [
                          { id: 'artwork', label: 'Artwork' },
                          { id: 'custom', label: 'Custom' },
                          { id: 'accent', label: 'Accent' },
                        ] as const
                      ).map((src) => {
                        const isSelected = (settings.edgeGlowColorSource || 'artwork') === src.id;
                        return (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() => updateSettings({ edgeGlowColorSource: src.id })}
                            className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-cyan-500 text-black shadow-md'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {src.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preset Colors & Custom Picker when Custom is chosen */}
                  {settings.edgeGlowColorSource === 'custom' && (
                    <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262e] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-300">Color Presets</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={settings.edgeGlowCustomColor || '#06b6d4'}
                            onChange={(e) => updateSettings({ edgeGlowCustomColor: e.target.value })}
                            className="w-5 h-5 rounded-md border-0 bg-transparent cursor-pointer"
                            title="Open native color picker"
                          />
                          <span className="text-[10px] font-mono text-zinc-400 uppercase">
                            {settings.edgeGlowCustomColor || '#06b6d4'}
                          </span>
                        </div>
                      </div>

                      {/* Swatches */}
                      <div className="flex items-center justify-between gap-1.5">
                        {EDGE_GLOW_PRESETS.map((p) => {
                          const isCurrent =
                            (settings.edgeGlowCustomColor || '#06b6d4').toLowerCase() === p.color.toLowerCase();
                          return (
                            <button
                              key={p.color}
                              type="button"
                              onClick={() => updateSettings({ edgeGlowCustomColor: p.color })}
                              title={p.name}
                              className={`w-7 h-7 rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                isCurrent ? 'scale-115 ring-2 ring-white ring-offset-2 ring-offset-[#18181c]' : 'hover:scale-105'
                              }`}
                              style={{ backgroundColor: p.color }}
                            >
                              {isCurrent && (
                                <span className={`text-[10px] font-bold ${p.color === '#ffffff' ? 'text-black' : 'text-white'}`}>
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reactivity Mode */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Reactivity Mode
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                      {(
                        [
                          { id: 'music_sync', label: 'Music Sync' },
                          { id: 'breathing', label: 'Breathing' },
                          { id: 'static', label: 'Static' },
                        ] as const
                      ).map((m) => {
                        const isSelected = (settings.edgeGlowMode || 'music_sync') === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => updateSettings({ edgeGlowMode: m.id as EdgeGlowMode })}
                            className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-cyan-500 text-black shadow-md'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Glow Style */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Glow Style
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'vignette', label: 'Vignette' },
                          { id: 'ring', label: 'Ring' },
                          { id: 'corners', label: 'Corners' },
                          { id: 'top_bottom', label: 'Horizon' },
                          { id: 'side_bars', label: 'Pillars' },
                        ] as const
                      ).map((st) => {
                        const isSelected = (settings.edgeGlowStyle || 'vignette') === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => updateSettings({ edgeGlowStyle: st.id as EdgeGlowStyleOption })}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-white/20 text-white border border-white/30'
                                : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#26262e]'
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Intensity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Glow Intensity</span>
                      <span className="text-zinc-200 font-mono font-semibold">
                        {Math.round((settings.edgeGlowIntensity ?? 0.7) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={Math.round((settings.edgeGlowIntensity ?? 0.7) * 100)}
                      onChange={(e) => updateSettings({ edgeGlowIntensity: parseInt(e.target.value, 10) / 100 })}
                      className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  {/* Glow Size (Blur) Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Glow Blur Radius</span>
                      <span className="text-zinc-200 font-mono font-semibold">
                        {settings.edgeGlowSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="2"
                      value={settings.edgeGlowSize}
                      onChange={(e) => updateSettings({ edgeGlowSize: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  {/* Edge Thickness */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Border Thickness</span>
                      <span className="text-zinc-200 font-mono font-semibold">
                        {settings.edgeGlowThickness}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="14"
                      step="1"
                      value={settings.edgeGlowThickness}
                      onChange={(e) => updateSettings({ edgeGlowThickness: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGE: 3. FONT & TYPOGRAPHY                                     */}
          {/* ============================================================== */}
          {activePage === 'font' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {renderSubmenuHeader('Font & Typography')}

              {/* Font Options */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Typeface
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {FONT_OPTIONS.map((f) => {
                    const isSelected = settings.font === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updateSettings({ font: f.id })}
                        style={{ fontFamily: f.fontVar }}
                        className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                            : 'bg-[#18181c] hover:bg-[#222228] text-zinc-300 border border-transparent'
                        }`}
                      >
                        <span className="text-sm">{f.name}</span>
                        <span className="text-[10px] text-zinc-500 font-sans">{f.styleName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Size Slider */}
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262e] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Text Scale: {settings.textSize}%</span>
                  <button
                    type="button"
                    onClick={() => updateSettings({ textSize: 100 })}
                    className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Reset (100%)
                  </button>
                </div>
                <input
                  type="range"
                  min="70"
                  max="150"
                  step="5"
                  value={settings.textSize}
                  onChange={(e) => updateSettings({ textSize: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGE: 4. COLORS & CHROMA RGB                                   */}
          {/* ============================================================== */}
          {activePage === 'colors' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {renderSubmenuHeader('Colors & Chroma', handleResetColors, 'Reset Colors')}

              {/* Chroma RGB Mode Card */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-blue-500/10 border border-white/10 space-y-3">
                <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-semibold block">Chroma RGB Mode</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-cyan-400 text-black">
                        RGB
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      Full-spectrum running RGB effect across lyrics
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.chromaEnabled}
                    onChange={(e) => updateSettings({ chromaEnabled: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-purple-500 focus:ring-0 cursor-pointer accent-purple-500"
                  />
                </label>

                {settings.chromaEnabled && (
                  <div className="pt-2 border-t border-white/10 space-y-2.5 animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-zinc-300">Speed</span>
                        <span className="text-[10px] text-zinc-400">
                          {settings.chromaSpeed <= 30
                            ? 'Slow'
                            : settings.chromaSpeed <= 70
                            ? 'Medium'
                            : 'Fast'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={settings.chromaSpeed}
                        onChange={(e) => updateSettings({ chromaSpeed: parseInt(e.target.value, 10) })}
                        className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-zinc-300">Vividness</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{settings.chromaVividness}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={settings.chromaVividness}
                        onChange={(e) => updateSettings({ chromaVividness: parseInt(e.target.value, 10) })}
                        className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Auto Sync Palette Toggle */}
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262e] space-y-3">
                <label className={`flex items-center justify-between text-xs cursor-pointer select-none transition-opacity ${settings.chromaEnabled ? 'opacity-50' : 'opacity-100'}`}>
                  <div>
                    <span className="text-white font-semibold block">Auto Sync Palette</span>
                    <span className="text-[10px] text-zinc-400">Extract vibrant highlight colors from album cover</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoSyncColor}
                    disabled={settings.chromaEnabled}
                    onChange={(e) => updateSettings({ autoSyncColor: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-purple-500 focus:ring-0 cursor-pointer accent-purple-500 disabled:opacity-50"
                  />
                </label>

                {/* Custom Palette Pickers */}
                <div
                  className={`grid grid-cols-3 gap-2 pt-2 border-t border-[#26262e] transition-opacity ${
                    settings.chromaEnabled || settings.autoSyncColor ? 'opacity-40 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[#121214] border border-[#2a2a30]">
                    <span className="text-[10px] text-zinc-400 font-medium">Text</span>
                    <input
                      type="color"
                      value={settings.lyricColor}
                      onChange={(e) => updateSettings({ lyricColor: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[#121214] border border-[#2a2a30]">
                    <span className="text-[10px] text-zinc-400 font-medium">Highlight</span>
                    <input
                      type="color"
                      value={settings.highlightColor}
                      onChange={(e) => updateSettings({ highlightColor: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[#121214] border border-[#2a2a30]">
                    <span className="text-[10px] text-zinc-400 font-medium">Secondary</span>
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => updateSettings({ secondaryColor: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGE: 5. VISUALS & WORD EFFECTS                                */}
          {/* ============================================================== */}
          {activePage === 'visuals' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {renderSubmenuHeader('Visuals & Effects', () => {
                updateSettings({
                  wordImagesEnabled: true,
                  iconsEnabled: true,
                  visualStyle: 'illustrated',
                  imageFrequency: 'normal',
                  wordEffectsEnabled: true,
                  effectFrequency: 'normal',
                  effectStrength: 'normal',
                  screenShakeEnabled: true,
                  intenseEffectsEnabled: DEFAULT_INTENSE_EFFECTS,
                  naturalColors: true,
                });
              })}

              {/* Word Images Toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-[#26262e] text-xs cursor-pointer select-none">
                <div>
                  <span className="text-white font-semibold block">Word Visual Cues</span>
                  <span className="text-[10px] text-zinc-400">Show illustrated concept icons for lyrics</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.wordImagesEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    updateSettings({ wordImagesEnabled: val, iconsEnabled: val });
                  }}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                />
              </label>

              {/* Visual Style Picker */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-400 block font-medium uppercase tracking-wider">
                  Visual Style
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {(['illustrated', 'line', 'emoji', 'off'] as const).map((styleOpt) => {
                    const isSelected = settings.visualStyle === styleOpt;
                    const labels: Record<string, string> = {
                      illustrated: 'Illustrated',
                      line: 'Line icons',
                      emoji: 'Emoji',
                      off: 'Off',
                    };
                    return (
                      <button
                        key={styleOpt}
                        type="button"
                        onClick={() => updateSettings({ visualStyle: styleOpt })}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#26262e]'
                        }`}
                      >
                        {labels[styleOpt]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Word Effects Toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-[#26262e] text-xs cursor-pointer select-none">
                <div>
                  <span className="text-white font-semibold block">Word Animation Effects</span>
                  <span className="text-[10px] text-zinc-400">Dynamic particle animations on themed words</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.wordEffectsEnabled}
                  onChange={(e) => updateSettings({ wordEffectsEnabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                />
              </label>

              {/* Detailed Effects Options */}
              {settings.wordEffectsEnabled && (
                <div className="space-y-2.5 p-3 rounded-xl bg-[#18181c] border border-[#26262e]">
                  {/* Screen Shake */}
                  <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                    <span className="text-zinc-300">Screen Shake on Impact</span>
                    <input
                      type="checkbox"
                      checked={settings.screenShakeEnabled}
                      onChange={(e) => updateSettings({ screenShakeEnabled: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                    />
                  </label>

                  {/* Natural Colors */}
                  <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                    <span className="text-zinc-300">Natural Organic Colors</span>
                    <input
                      type="checkbox"
                      checked={settings.naturalColors}
                      onChange={(e) => updateSettings({ naturalColors: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                    />
                  </label>

                  {/* Intense Effects */}
                  <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                    <span className="text-zinc-300">Intense Dark Effects</span>
                    <input
                      type="checkbox"
                      checked={settings.intenseEffectsEnabled}
                      onChange={(e) => updateSettings({ intenseEffectsEnabled: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGE: 6. AUDIO & LYRIC SYNC ADJUSTER                           */}
          {/* ============================================================== */}
          {activePage === 'sync' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {renderSubmenuHeader('Audio & Lyric Sync', handleOffsetReset, 'Reset (0.0s)')}

              <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#26262e] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-white font-semibold">Active Timing Offset</p>
                    <p className="text-[10px] text-zinc-400">Synchronize lyrics with song playback</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCoarseStep(!isCoarseStep)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#222228] hover:bg-[#2c2c34] text-zinc-300 border border-zinc-700 cursor-pointer"
                  >
                    {isCoarseStep ? 'Step: 1.0s' : 'Step: 0.1s'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-2xl font-bold font-mono text-rose-400">
                    {currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`}
                  </span>
                  <span className="text-[10px] text-zinc-500">Range: ±120s</span>
                </div>

                <input
                  type="range"
                  min="-120.0"
                  max="120.0"
                  step={isCoarseStep ? '1.0' : '0.1'}
                  value={currentOffset}
                  onChange={(e) => handleOffsetChange(parseFloat(e.target.value))}
                  disabled={!trackId}
                  className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-rose-500 disabled:opacity-40"
                />

                {!trackId && (
                  <p className="text-[10px] text-amber-400/80">
                    Play a song to adjust and save track timing offset.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGE: 7. DISPLAY & BEHAVIOR                                    */}
          {/* ============================================================== */}
          {activePage === 'behavior' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {renderSubmenuHeader('Display & Behavior')}

              {/* Keep Screen Awake */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-[#26262e] text-xs cursor-pointer select-none">
                <div>
                  <span className="text-white font-semibold block">Keep Screen Awake (Wake Lock)</span>
                  <span className="text-[10px] text-zinc-400">Prevent display from sleeping while reading lyrics</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.keepAwake}
                  onChange={(e) => updateSettings({ keepAwake: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-zinc-200 focus:ring-0 cursor-pointer accent-zinc-300"
                />
              </label>

              {/* Show Outside Lyrics Page */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-[#26262e] text-xs cursor-pointer select-none">
                <div>
                  <span className="text-white font-semibold block">Show Outside Lyrics Page</span>
                  <span className="text-[10px] text-zinc-400">Floating lyrics dock above player on other views</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showOutsideLyricsPage}
                  onChange={(e) => updateSettings({ showOutsideLyricsPage: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-zinc-200 focus:ring-0 cursor-pointer accent-zinc-300"
                />
              </label>

              {/* Camera Movement */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-[#26262e] text-xs cursor-pointer select-none">
                <div>
                  <span className="text-white font-semibold block">Camera Movement</span>
                  <span className="text-[10px] text-zinc-400">Pan, zoom &amp; focus in 3D visual styles</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.cameraMovementEnabled ?? true}
                  onChange={(e) => updateSettings({ cameraMovementEnabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-zinc-200 focus:ring-0 cursor-pointer accent-zinc-300"
                />
              </label>

              {/* Fix ALL CAPS */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-[#26262e] text-xs cursor-pointer select-none">
                <div>
                  <span className="text-white font-semibold block">Fix ALL CAPS Lyrics</span>
                  <span className="text-[10px] text-zinc-400">Automatic sentence-casing for loud uppercase songs</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!settings.fixAllCaps}
                  onChange={(e) => updateSettings({ fixAllCaps: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-zinc-200 focus:ring-0 cursor-pointer accent-zinc-300"
                />
              </label>

              {/* Render Quality */}
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262e] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-semibold">Visual Quality</span>
                  <span className="text-[10px] text-zinc-400">Low disables blur &amp; sheen</span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-[#121214] p-1 rounded-lg border border-[#26262e]">
                  {(['auto', 'low', 'high'] as LyricsQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => updateSettings({ quality: q })}
                      className={`py-1 rounded text-[11px] font-semibold capitalize cursor-pointer transition-colors ${
                        (settings.quality || 'auto') === q
                          ? 'bg-white text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGE: 8. DISC (SPINNING CD) SETTINGS & TUNING                  */}
          {/* ============================================================== */}
          {activePage === 'disc' && (() => {
            const disc = settings.disc || DEFAULT_DISC_SETTINGS;
            const tuning = disc.tuning || DEFAULT_DISC_TUNING;
            const updateDisc = (partial: Partial<DiscStyleSettings>) =>
              updateSettings({ disc: { ...disc, ...partial } });
            const updateTuning = (partial: Partial<DiscTuningSettings>) =>
              updateDisc({ tuning: { ...tuning, ...partial } });

            return (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {renderSubmenuHeader('Disc Settings', () =>
                  updateSettings({
                    disc: { ...DEFAULT_DISC_SETTINGS, tuning: { ...DEFAULT_DISC_TUNING } },
                  })
                )}

                {/* Reveal Mode */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Reveal</span>
                  <div className="grid grid-cols-2 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                    {([
                      { id: 'phrase', label: 'Whole phrase' },
                      { id: 'word', label: 'Word by word' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateDisc({ revealMode: opt.id })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          disc.revealMode === opt.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Words per phrase */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Words per phrase
                  </span>
                  <div className="grid grid-cols-4 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                    {([1, 2, 3, 4] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateDisc({ wordsPerPhrase: n })}
                        className={`py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          disc.wordsPerPhrase === n ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Build-up strength */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300">Build-up strength</span>
                    <span className="font-mono text-zinc-400">{disc.buildupStrength.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={disc.buildupStrength}
                    onChange={(e) => updateDisc({ buildupStrength: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                {/* Layout */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Layout</span>
                  <div className="grid grid-cols-3 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                    {([
                      { id: 'right', label: 'Disc right' },
                      { id: 'left', label: 'Disc left' },
                      { id: 'center', label: 'Centered' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateDisc({ layout: opt.id })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          disc.layout === opt.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Case style */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Case style</span>
                  <div className="grid grid-cols-3 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                    {([
                      { id: 'jewel', label: 'Jewel case' },
                      { id: 'disc_only', label: 'Round disc' },
                      { id: 'vinyl', label: 'Vinyl' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateDisc({ caseStyle: opt.id })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          disc.caseStyle === opt.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Disc finish */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Disc finish</span>
                  <div className="grid grid-cols-2 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                    {([
                      { id: 'silver', label: 'Silver' },
                      { id: 'cover', label: 'Cover colors' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateDisc({ discFinish: opt.id })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          disc.discFinish === opt.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motion sliders */}
                <div className="space-y-2.5 p-3 rounded-xl bg-[#18181c] border border-[#26262e]">
                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-zinc-300">Spin period</span>
                      <span className="font-mono text-zinc-400">{disc.spinPeriodSec}s</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="30"
                      step="1"
                      value={disc.spinPeriodSec}
                      onChange={(e) => updateDisc({ spinPeriodSec: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-zinc-300">Float amount</span>
                      <span className="font-mono text-zinc-400">{disc.floatAmount.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={disc.floatAmount}
                      onChange={(e) => updateDisc({ floatAmount: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-zinc-300">Tilt amount</span>
                      <span className="font-mono text-zinc-400">{disc.tiltAmount.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={disc.tiltAmount}
                      onChange={(e) => updateDisc({ tiltAmount: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-zinc-300">Tilt period</span>
                      <span className="font-mono text-zinc-400">{disc.tiltPeriodSec.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="6"
                      step="0.2"
                      value={disc.tiltPeriodSec}
                      onChange={(e) => updateDisc({ tiltPeriodSec: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2 p-3 rounded-xl bg-[#18181c] border border-[#26262e] text-xs">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <span className="text-zinc-300">Sync tilt to beat</span>
                    <input
                      type="checkbox"
                      checked={disc.syncTiltToBeat}
                      onChange={(e) => updateDisc({ syncTiltToBeat: e.target.checked })}
                      className="w-4 h-4 accent-white cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <span className="text-zinc-300">Beat pulse</span>
                    <input
                      type="checkbox"
                      checked={disc.beatPulse}
                      onChange={(e) => updateDisc({ beatPulse: e.target.checked })}
                      className="w-4 h-4 accent-white cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <span className="text-zinc-300">Show case</span>
                    <input
                      type="checkbox"
                      checked={disc.showCase}
                      onChange={(e) => updateDisc({ showCase: e.target.checked })}
                      className="w-4 h-4 accent-white cursor-pointer"
                    />
                  </label>
                </div>

                {/* Developer-only Tuning Panel */}
                {settings.devOverlayEnabled && (
                  <div className="space-y-2 p-3 rounded-xl bg-[#15130f] border border-amber-500/30 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-amber-400">
                        Developer Tuning
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDisc({ tuning: { ...DEFAULT_DISC_TUNING } })}
                        className="text-[10px] text-amber-300 underline cursor-pointer"
                      >
                        Reset Tuning
                      </button>
                    </div>
                    {[
                      { key: 'blurMaxPx', label: 'Max blur (px)', min: 0, max: 8, step: 0.5 },
                      { key: 'gapMs', label: 'Phrase gap (ms)', min: 0, max: 300, step: 10 },
                      { key: 'longPhraseThresholdSec', label: 'Long phrase (s)', min: 0.6, max: 3, step: 0.1 },
                      { key: 'longPhraseHoldAtSec', label: 'Hold full at (s)', min: 0.3, max: 2, step: 0.1 },
                      { key: 'tiltDeg', label: 'Tilt base (deg)', min: 0, max: 15, step: 0.5 },
                      { key: 'driftXPct', label: 'Drift X (%)', min: 0, max: 15, step: 0.5 },
                      { key: 'driftYPct', label: 'Drift Y (%)', min: 0, max: 15, step: 0.5 },
                      { key: 'driftXPeriodSec', label: 'Drift X period (s)', min: 1.5, max: 10, step: 0.1 },
                      { key: 'driftYPeriodSec', label: 'Drift Y period (s)', min: 1.5, max: 10, step: 0.1 },
                      { key: 'scalePulsePct', label: 'Scale pulse', min: 0, max: 0.15, step: 0.01 },
                      { key: 'scalePulsePeriodSec', label: 'Scale period (s)', min: 1.5, max: 8, step: 0.1 },
                      { key: 'spinModPct', label: 'Spin mod (%)', min: 0, max: 0.6, step: 0.05 },
                      { key: 'spinModPeriodSec', label: 'Spin mod period (s)', min: 0.5, max: 5, step: 0.1 },
                    ].map((item) => {
                      const val = tuning[item.key as keyof DiscTuningSettings];
                      return (
                        <div key={item.key}>
                          <div className="flex justify-between">
                            <span className="text-zinc-300">{item.label}</span>
                            <span className="font-mono text-amber-300">{val}</span>
                          </div>
                          <input
                            type="range"
                            min={item.min}
                            max={item.max}
                            step={item.step}
                            value={val}
                            onChange={(e) =>
                              updateTuning({ [item.key]: parseFloat(e.target.value) })
                            }
                            className="w-full h-1 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-amber-400"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ============================================================== */}
          {/* PAGE: 9. WINDOWS 98 (MEDIA PLAYER) CUSTOMIZATION               */}
          {/* ============================================================== */}
          {activePage === 'windows98' && (() => {
            const w98 = settings.windows98 || DEFAULT_WINDOWS98_SETTINGS;
            const updateWin98 = (partial: Partial<Windows98StyleSettings>) =>
              updateSettings({ windows98: { ...w98, ...partial } });

            return (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {renderSubmenuHeader('Windows 98 Settings', () =>
                  updateSettings({ windows98: { ...DEFAULT_WINDOWS98_SETTINGS } })
                )}

                {/* Titlebar Theme */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Window Titlebar</span>
                  <div className="grid grid-cols-2 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                    {([
                      { id: 'xp_blue', label: 'XP Blue' },
                      { id: 'classic_navy', label: '98 Navy' },
                      { id: 'teal', label: '98 Teal' },
                      { id: 'silver', label: 'Silver' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateWin98({ titlebarTheme: opt.id })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          w98.titlebarTheme === opt.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop Wallpaper */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Desktop Wallpaper</span>
                  <div className="grid grid-cols-3 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                    {([
                      { id: 'bliss', label: 'Bliss' },
                      { id: 'teal_98', label: '98 Teal' },
                      { id: 'midnight', label: 'Midnight' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateWin98({ desktopWallpaper: opt.id })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          (w98.desktopWallpaper || 'bliss') === opt.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lyric Reveal Mode */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Lyric Reveal</span>
                  <div className="grid grid-cols-2 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                    {([
                      { id: 'word', label: 'Word by word' },
                      { id: 'line', label: 'Full line' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateWin98({ revealMode: opt.id })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          w98.revealMode === opt.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Corner Sticker Mode */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Corner Sticker</span>
                  <div className="grid grid-cols-3 gap-1 bg-[#18181c] p-1 rounded-xl border border-[#26262e]">
                    {([
                      { id: 'per_line', label: 'Per line' },
                      { id: 'per_song', label: 'Per song' },
                      { id: 'pinned', label: 'Pinned' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateWin98({ stickerMode: opt.id })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          w98.stickerMode === opt.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sticker Picker when Pinned */}
                {w98.stickerMode === 'pinned' && (
                  <div className="grid grid-cols-3 gap-1.5 bg-[#18181c] p-2 rounded-xl border border-[#26262e]">
                    {WINDOWS98_STICKERS.map((src, idx) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => updateWin98({ pinnedStickerIndex: idx })}
                        className={`p-1 rounded-lg bg-white border-2 cursor-pointer flex items-center justify-center h-14 ${
                          w98.pinnedStickerIndex === idx ? 'border-emerald-400' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img src={src} alt={`Sticker ${idx + 1}`} className="max-h-full max-w-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Sticker Size & Window Width */}
                <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262e] space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-300">Sticker Size</span>
                      <span className="font-mono text-zinc-200">{w98.stickerSizePx}px</span>
                    </div>
                    <input
                      type="range"
                      min={90}
                      max={220}
                      step={4}
                      value={w98.stickerSizePx}
                      onChange={(e) => updateWin98({ stickerSizePx: parseInt(e.target.value, 10) })}
                      className="w-full h-1 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-300">Window Width</span>
                      <span className="font-mono text-zinc-200">{w98.windowWidthPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={100}
                      step={2}
                      value={w98.windowWidthPct}
                      onChange={(e) => updateWin98({ windowWidthPct: parseInt(e.target.value, 10) })}
                      className="w-full h-1 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-300">Player White Transparency</span>
                      <span className="font-mono text-zinc-200">{w98.clientOpacityPct ?? 88}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      step={2}
                      value={w98.clientOpacityPct ?? 88}
                      onChange={(e) => updateWin98({ clientOpacityPct: parseInt(e.target.value, 10) })}
                      className="w-full h-1 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-300">CRT Scanlines Intensity</span>
                      <span className="font-mono text-zinc-200">{w98.crtIntensity ?? 45}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={w98.crtIntensity ?? 45}
                      onChange={(e) => updateWin98({ crtIntensity: parseInt(e.target.value, 10) })}
                      className="w-full h-1 bg-[#252528] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                </div>

                {/* Visibility Toggles */}
                <div className="space-y-1.5">
                  {([
                    { key: 'crtEnabled', label: 'CRT Monitor Effect' },
                    { key: 'showDesktopIcons', label: 'Show Desktop Icons' },
                    { key: 'showTaskbar', label: 'Show Start Menu & Taskbar' },
                    { key: 'showSticker', label: 'Show Corner Sticker' },
                    { key: 'showMyujikuLogo', label: 'Show MyuJiku Logo' },
                    { key: 'showNowPlayingCard', label: 'Show Now Playing Card' },
                    { key: 'showTransportBar', label: 'Show Transport Controls' },
                  ] as const).map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] border border-[#26262e] text-xs cursor-pointer select-none"
                    >
                      <span className="text-white font-semibold">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(w98[item.key])}
                        onChange={(e) => updateWin98({ [item.key]: e.target.checked })}
                        className="w-4 h-4 rounded bg-[#202020] border-zinc-600 cursor-pointer accent-white"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>,
        (typeof document !== 'undefined' ? (document.fullscreenElement as HTMLElement) || document.body : null)!
      )}
    </div>
  );
}
