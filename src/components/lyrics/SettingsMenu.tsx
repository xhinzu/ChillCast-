'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LyricsSettings,
  LyricsStyle,
  LyricsFont,
  QualitySetting,
  FisheyeCurvatureAxis,
  CameraMovementSetting,
  GlowStyle,
  GlowColorSource,
  GlowMode,
  GlowBlendMode,
  PaletteHarmonyMode,
  PalettePreset,
  BackgroundType,
  TextEffect,
  EmojiFrequency,
  saveLyricsSettings,
  DEFAULT_LYRICS_SETTINGS,
} from '@/lib/lyrics/settings';
import { loadLyricTransform, saveLyricTransform } from '@/lib/lyrics/transform';
import { saveCustomMedia, deleteCustomMedia, loadCustomMedia } from '@/lib/lyrics/mediaStorage';
import { PALETTE_PRESETS } from '@/lib/lyrics/paletteEngine';
import { Z_INDEX } from '@/constants/zIndex';

interface SettingsMenuProps {
  settings: LyricsSettings;
  trackId?: string;
  onUpdate: (newSettings: LyricsSettings) => void;
}

type SettingsTab =
  | 'style'
  | 'text'
  | 'color'
  | 'light'
  | 'background'
  | 'overlay'
  | 'camera'
  | 'emoji'
  | 'timing';

const STYLE_LABELS: { id: LyricsStyle; label: string; badge?: string }[] = [
  { id: 'classic', label: 'Classic', badge: 'Lines' },
  { id: 'visual', label: 'Visual', badge: 'Word' },
  { id: 'constellation', label: 'Constellation', badge: 'Graph' },
  { id: 'ship', label: 'Ship', badge: '3D Wall' },
  { id: 'fisheye', label: 'Fisheye', badge: '3D Lens' },
  { id: 'codestyle', label: 'Codestyle', badge: 'Editor' },
  { id: 'branches', label: 'Branches', badge: 'Tree' },
  { id: 'web', label: 'Web', badge: 'Radial' },
];

const FONT_OPTIONS: { id: LyricsFont; name: string; styleName: string; fontVar: string }[] = [
  { id: 'inter', name: 'Inter', styleName: 'SF Pro style', fontVar: 'var(--font-inter, sans-serif)' },
  { id: 'nunito', name: 'Nunito', styleName: 'Rounded', fontVar: 'var(--font-nunito, sans-serif)' },
  { id: 'newsreader', name: 'Newsreader', styleName: 'Editorial Serif', fontVar: 'var(--font-newsreader, serif)' },
  { id: 'arimo', name: 'Arimo', styleName: 'Helvetica style', fontVar: 'var(--font-arimo, sans-serif)' },
  { id: 'nunito_sans', name: 'Nunito Sans', styleName: 'Avenir style', fontVar: 'var(--font-nunito-sans, sans-serif)' },
  { id: 'jost', name: 'Jost', styleName: 'Futura style', fontVar: 'var(--font-jost, sans-serif)' },
  { id: 'playfair', name: 'Playfair Display', styleName: 'Didot style', fontVar: 'var(--font-playfair, serif)' },
];

const GLOW_STYLES: { id: GlowStyle; label: string }[] = [
  { id: 'ring', label: 'Ring' },
  { id: 'corners', label: 'Corners' },
  { id: 'top_bottom', label: 'Top & Bottom' },
  { id: 'sides', label: 'Side Bars' },
  { id: 'vignette', label: 'Vignette' },
  { id: 'spotlight', label: 'Spotlight' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'neon_tube', label: 'Neon Tube' },
  { id: 'rotating_conic', label: 'Conic Border' },
  { id: 'ripple', label: 'Ripple Pulses' },
  { id: 'breathing', label: 'Breathing' },
];

const OVERLAY_OPTIONS: { id: string; label: string }[] = [
  { id: 'raindrops', label: 'Raindrops on Glass' },
  { id: 'rain_streaks', label: 'Rain Streaks' },
  { id: 'snow', label: 'Snow' },
  { id: 'dust', label: 'Dust & Motes' },
  { id: 'embers', label: 'Embers' },
  { id: 'fireflies', label: 'Fireflies' },
  { id: 'stars', label: 'Stars & Twinkle' },
  { id: 'film_grain', label: 'Film Grain' },
  { id: 'scratches', label: 'Film Scratches' },
  { id: 'vhs', label: 'VHS Scanlines' },
  { id: 'light_leaks', label: 'Light Leaks' },
  { id: 'bokeh', label: 'Bokeh Orbs' },
];

export default function SettingsMenu({ settings, trackId, onUpdate }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('style');
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null);
  const [hasCustomMedia, setHasCustomMedia] = useState(false);
  const [customMediaError, setCustomMediaError] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);

  // Check stored media
  useEffect(() => {
    loadCustomMedia()
      .then((rec) => setHasCustomMedia(!!rec))
      .catch(() => setHasCustomMedia(false));
  }, [isOpen]);

  // Position calculation with upward flip
  const updateCoords = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(420, window.innerWidth - 24);
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    if (spaceBelow < 350 && spaceAbove > spaceBelow) {
      setCoords({
        bottom: window.innerHeight - rect.top + 8,
        left,
        maxHeight: Math.min(spaceAbove - 12, window.innerHeight - 30),
      });
    } else {
      setCoords({
        top: rect.bottom + 8,
        left,
        maxHeight: Math.min(spaceBelow - 12, window.innerHeight - 30),
      });
    }
  }, []);

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
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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
    updateSettings({ offsets: nextOffsets });

    const currentTrans = loadLyricTransform(trackId);
    saveLyricTransform(trackId, { speed: currentTrans.speed, offset: rounded });

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
    updateSettings({ offsets: nextOffsets });

    const currentTrans = loadLyricTransform(trackId);
    saveLyricTransform(trackId, { speed: currentTrans.speed, offset: 0 });
  };

  const handleResetColors = () => {
    updateSettings({
      lyricColor: DEFAULT_LYRICS_SETTINGS.lyricColor,
      highlightColor: DEFAULT_LYRICS_SETTINGS.highlightColor,
      secondaryColor: DEFAULT_LYRICS_SETTINGS.secondaryColor,
      chroma: DEFAULT_LYRICS_SETTINGS.chroma,
      harmonyMode: DEFAULT_LYRICS_SETTINGS.harmonyMode,
      breathingColors: DEFAULT_LYRICS_SETTINGS.breathingColors,
      textGradient: DEFAULT_LYRICS_SETTINGS.textGradient,
    });
  };

  const handleApplyPreset = (presetKey: Exclude<PalettePreset, 'custom'>) => {
    const preset = PALETTE_PRESETS[presetKey];
    if (preset) {
      updateSettings({
        ...preset,
        palettePreset: presetKey,
      });
    }
  };

  const handleCustomMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 26 * 1024 * 1024) {
      setCustomMediaError('File exceeds 25 MB limit.');
      return;
    }

    try {
      setCustomMediaError(null);
      await saveCustomMedia(file);
      setHasCustomMedia(true);
      const isVid = file.type.startsWith('video/');
      updateSettings({
        backgroundType: isVid ? 'custom_video' : 'custom_image',
      });
    } catch {
      setCustomMediaError('Failed to store media in IndexedDB.');
    }
  };

  const handleRemoveCustomMedia = async () => {
    try {
      await deleteCustomMedia();
      setHasCustomMedia(false);
      updateSettings({ backgroundType: 'black' });
    } catch {
      // ignore
    }
  };

  const toggleOverlay = (id: string) => {
    const active = settings.activeOverlays || [];
    const next = active.includes(id) ? active.filter((o) => o !== id) : [...active, id];
    updateSettings({ activeOverlays: next });
  };

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

      {/* Popover Portaled to Document Body / Fullscreen */}
      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          role="region"
          aria-label="MyuJiku Settings Panel"
          className="fixed w-80 sm:w-[420px] rounded-2xl bg-[#121212]/95 backdrop-blur-xl border border-[#262626] shadow-2xl p-4 text-white overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 animate-fade-in flex flex-col gap-4"
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
          {/* Header & Tabs Navigation */}
          <div className="border-b border-[#222222] pb-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                MyuJiku Settings
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white text-xs p-1 cursor-pointer"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            {/* Horizontal Scrollable Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs font-medium">
              {[
                { id: 'style', label: 'Style' },
                { id: 'text', label: 'Text' },
                { id: 'color', label: 'Color' },
                { id: 'light', label: 'Light' },
                { id: 'background', label: 'Background' },
                { id: 'overlay', label: 'Overlay' },
                { id: 'camera', label: 'Camera' },
                { id: 'emoji', label: 'Emoji' },
                { id: 'timing', label: 'Timing' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as SettingsTab)}
                  className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-red-500 text-white font-bold'
                      : 'bg-[#181818] text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: STYLE */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
                  <span>Lyrics Style (8 Active)</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {STYLE_LABELS.map((item) => {
                    const isSelected = settings.style === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateSettings({ style: item.id })}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-[#1a1a1a] hover:bg-[#242424] text-zinc-300 border border-transparent'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {isSelected && <span className="text-red-400">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quality Setting */}
              <div className="pt-2 border-t border-[#222222]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-300 font-semibold">Graphics Quality</span>
                  <span className="text-[10px] text-zinc-500">Auto throttles if FPS &lt; 45</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['auto', 'high', 'low'] as QualitySetting[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => updateSettings({ quality: q })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                        settings.quality === q
                          ? 'bg-red-500 text-white'
                          : 'bg-[#1a1a1a] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEXT & TYPOGRAPHY */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              {/* Font Picker */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Typography Font
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
                        className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/10 text-white font-bold border border-white/20'
                            : 'bg-[#181818] hover:bg-[#222222] text-zinc-300 border border-transparent'
                        }`}
                      >
                        <span>{f.name}</span>
                        <span className="text-[10px] text-zinc-500 font-sans">{f.styleName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overall Size Slider (renamed from Text Size) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-300 font-semibold">Size (Overall Scale): {settings.size}%</span>
                  <button
                    type="button"
                    onClick={() => updateSettings({ size: 100, textSize: 100 })}
                    className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={settings.size}
                  onChange={(e) => {
                    const s = parseInt(e.target.value, 10);
                    updateSettings({ size: s, textSize: s });
                  }}
                  className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              {/* Text Effect on Active Word */}
              <div className="pt-2 border-t border-[#222222]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-300 font-semibold">Text Effect (Active Word)</span>
                  <button
                    type="button"
                    onClick={() => updateSettings({ textEffect: 'glow' })}
                    className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'glow', label: 'Glow (Default)' },
                    { id: 'neon', label: 'Neon Outline' },
                    { id: 'distressed', label: 'Distressed' },
                    { id: 'neon_distressed', label: 'Neon + Distressed' },
                    { id: 'chromatic', label: 'Chromatic Split' },
                    { id: 'glitch', label: 'Glitch' },
                  ].map((eff) => (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() => updateSettings({ textEffect: eff.id as TextEffect })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left cursor-pointer transition-all ${
                        settings.textEffect === eff.id
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-[#1a1a1a] text-zinc-300 hover:bg-[#242424] border border-transparent'
                      }`}
                    >
                      {eff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fix ALL CAPS */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none pt-2 border-t border-[#222222]">
                <div>
                  <span className="text-zinc-300 block">Fix ALL CAPS</span>
                  <span className="text-[10px] text-zinc-500">Sentence casing for shouty lyrics</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!settings.fixAllCaps}
                  onChange={(e) => updateSettings({ fixAllCaps: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
                />
              </label>
            </div>
          )}

          {/* TAB 3: COLOR & PALETTE */}
          {activeTab === 'color' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Palette Presets
                </span>
                <button
                  type="button"
                  onClick={handleResetColors}
                  className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Reset
                </button>
              </div>

              {/* Named Presets */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'midnight', label: 'Midnight', bg: '#4f46e5' },
                  { id: 'crimson', label: 'Crimson', bg: '#dc2626' },
                  { id: 'aurora', label: 'Aurora', bg: '#10b981' },
                  { id: 'sunset', label: 'Sunset', bg: '#f59e0b' },
                  { id: 'ocean', label: 'Ocean', bg: '#0ea5e9' },
                  { id: 'mono', label: 'Mono', bg: '#e4e4e7' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id as Exclude<PalettePreset, 'custom'>)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-[#181818] hover:bg-[#242424] border border-[#2a2a2a] text-xs font-semibold cursor-pointer transition-all"
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.bg }} />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Auto Sync Palette */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none pt-2 border-t border-[#222222]">
                <div>
                  <span className="text-zinc-300 font-semibold block">Auto Sync Palette</span>
                  <span className="text-[10px] text-zinc-500">Extracts 5 dominant colors in OKLCH</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSyncColor}
                  onChange={(e) => updateSettings({ autoSyncColor: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
                />
              </label>

              {/* Chroma Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-300">Chroma (OKLCH Saturation): {settings.chroma}%</span>
                  <button
                    type="button"
                    onClick={() => updateSettings({ chroma: 100 })}
                    className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={settings.chroma}
                  onChange={(e) => updateSettings({ chroma: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              {/* Harmony Modes */}
              <div>
                <span className="text-xs text-zinc-400 block mb-1.5">Color Harmony Mode</span>
                <select
                  value={settings.harmonyMode}
                  onChange={(e) => updateSettings({ harmonyMode: e.target.value as PaletteHarmonyMode })}
                  className="w-full p-2 rounded-xl bg-[#1a1a1a] border border-[#2c2c2c] text-xs text-white cursor-pointer"
                >
                  <option value="match">Match artwork</option>
                  <option value="analogous">Analogous (±30°)</option>
                  <option value="complementary">Complementary (+180°)</option>
                  <option value="triadic">Triadic (±120°)</option>
                  <option value="split">Split-complementary</option>
                  <option value="monochrome">Monochrome</option>
                </select>
              </div>

              {/* Breathing Colors Toggle */}
              <div className="pt-2 border-t border-[#222222] space-y-2">
                <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                  <div>
                    <span className="text-zinc-300 font-semibold block">Breathing Colors</span>
                    <span className="text-[10px] text-zinc-500">Gentle hue/lightness drift</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.breathingColors}
                    onChange={(e) => updateSettings({ breathingColors: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
                  />
                </label>

                {settings.breathingColors && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">Drift Period: {settings.breathingPeriod}s</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="20"
                      value={settings.breathingPeriod}
                      onChange={(e) => updateSettings({ breathingPeriod: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>
                )}
              </div>

              {/* Manual Color Pickers when Auto Sync is off */}
              <div
                className={`grid grid-cols-3 gap-2 pt-2 border-t border-[#222222] transition-opacity ${
                  settings.autoSyncColor ? 'opacity-40 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#181818] border border-[#2a2a2a]">
                  <span className="text-[10px] text-zinc-400">Main Text</span>
                  <input
                    type="color"
                    value={settings.lyricColor}
                    onChange={(e) => updateSettings({ lyricColor: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#181818] border border-[#2a2a2a]">
                  <span className="text-[10px] text-zinc-400">Highlight</span>
                  <input
                    type="color"
                    value={settings.highlightColor}
                    onChange={(e) => updateSettings({ highlightColor: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#181818] border border-[#2a2a2a]">
                  <span className="text-[10px] text-zinc-400">Secondary</span>
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => updateSettings({ secondaryColor: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIGHT / EDGE GLOW */}
          {activeTab === 'light' && (
            <div className="space-y-4">
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <div>
                  <span className="text-zinc-200 font-bold block text-sm">Enable Edge Glow</span>
                  <span className="text-[10px] text-zinc-500">Perimeter bloom visualizer</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.edgeGlowEnabled}
                  onChange={(e) => updateSettings({ edgeGlowEnabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
                />
              </label>

              {settings.edgeGlowEnabled && (
                <div className="space-y-3 pt-2 border-t border-[#222222]">
                  {/* Glow Style (11 Styles) */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-zinc-400">Glow Style</span>
                      <button
                        type="button"
                        onClick={() => updateSettings({ glowStyle: 'ring' })}
                        className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {GLOW_STYLES.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => updateSettings({ glowStyle: g.id })}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left cursor-pointer transition-all ${
                            settings.glowStyle === g.id
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-[#1a1a1a] text-zinc-300 hover:bg-[#242424] border border-transparent'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Glow Color Source */}
                  <div>
                    <span className="text-xs text-zinc-400 block mb-1">Glow Color Source</span>
                    <select
                      value={settings.glowColorSource}
                      onChange={(e) => updateSettings({ glowColorSource: e.target.value as GlowColorSource })}
                      className="w-full p-2 rounded-xl bg-[#1a1a1a] border border-[#2c2c2c] text-xs text-white cursor-pointer"
                    >
                      <option value="palette">Follow Palette</option>
                      <option value="custom">Custom Color</option>
                      <option value="gradient">Custom Gradient</option>
                      <option value="palette_gradient">Palette Gradient</option>
                    </select>
                  </div>

                  {settings.glowColorSource === 'custom' && (
                    <div className="flex items-center gap-3 p-2 bg-[#181818] rounded-xl border border-[#262626]">
                      <input
                        type="color"
                        value={settings.glowCustomColor}
                        onChange={(e) => updateSettings({ glowCustomColor: e.target.value })}
                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs text-zinc-300">Custom Glow Color</span>
                    </div>
                  )}

                  {/* Mode & Sliders */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Mode</span>
                    <div className="flex items-center gap-1 bg-[#1a1a1a] p-0.5 rounded-lg border border-[#262626]">
                      {(['music_sync', 'breathing', 'static'] as GlowMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => updateSettings({ glowMode: m })}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer capitalize ${
                            settings.glowMode === m ? 'bg-red-500 text-white' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {m.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Intensity */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">Intensity: {settings.glowIntensity}%</span>
                      <button
                        type="button"
                        onClick={() => updateSettings({ glowIntensity: 65 })}
                        className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.glowIntensity}
                      onChange={(e) => updateSettings({ glowIntensity: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>

                  {/* Thickness */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">Thickness: {settings.glowThickness}px</span>
                      <button
                        type="button"
                        onClick={() => updateSettings({ glowThickness: 4 })}
                        className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="30"
                      value={settings.glowThickness}
                      onChange={(e) => updateSettings({ glowThickness: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>

                  {/* Blur Size */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">Glow Size / Blur: {settings.glowBlur}px</span>
                      <button
                        type="button"
                        onClick={() => updateSettings({ glowBlur: 28 })}
                        className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="80"
                      value={settings.glowBlur}
                      onChange={(e) => updateSettings({ glowBlur: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BACKGROUND */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Background Mode
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'black', label: 'Black (Default)' },
                    { id: 'cover', label: 'Cover Art' },
                    { id: 'blurred', label: 'Blurred Cover' },
                    { id: 'gradient', label: 'Palette Gradient' },
                    { id: 'custom_image', label: 'Custom Image' },
                    { id: 'custom_video', label: 'Custom Video Loop' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => updateSettings({ backgroundType: bg.id as BackgroundType })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left cursor-pointer transition-all ${
                        settings.backgroundType === bg.id
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-[#1a1a1a] text-zinc-300 hover:bg-[#242424] border border-transparent'
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Media Picker */}
              <div className="p-3 rounded-xl bg-[#181818] border border-[#262626] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-semibold">Custom Background Media</span>
                  {hasCustomMedia && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomMedia}
                      className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={mediaFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                  onChange={handleCustomMediaUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mediaFileInputRef.current?.click()}
                  className="w-full py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  {hasCustomMedia ? 'Replace Custom File (≤25MB)' : 'Upload Image or Video (≤25MB)'}
                </button>
                {customMediaError && (
                  <span className="text-[10px] text-rose-400 block">{customMediaError}</span>
                )}
                <span className="text-[10px] text-zinc-500 block">
                  Stored securely in local IndexedDB. Never uploaded anywhere.
                </span>
              </div>

              {/* Controls */}
              <div className="space-y-3 pt-2 border-t border-[#222222]">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400">Dim (Darken): {settings.backgroundDim}%</span>
                    <button
                      type="button"
                      onClick={() => updateSettings({ backgroundDim: 30 })}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.backgroundDim}
                    onChange={(e) => updateSettings({ backgroundDim: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400">Blur: {settings.backgroundBlur}px</span>
                    <button
                      type="button"
                      onClick={() => updateSettings({ backgroundBlur: 20 })}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={settings.backgroundBlur}
                    onChange={(e) => updateSettings({ backgroundBlur: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400">Camera Parallax: {settings.backgroundParallax}%</span>
                    <button
                      type="button"
                      onClick={() => updateSettings({ backgroundParallax: 25 })}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.backgroundParallax}
                    onChange={(e) => updateSettings({ backgroundParallax: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: OVERLAY */}
          {activeTab === 'overlay' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-zinc-200 font-bold block text-sm">Atmospheric Overlays</span>
                  <span className="text-[10px] text-zinc-500">Particle effects & textures</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSettings({ activeOverlays: [], masterOverlayEnabled: false })}
                    className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Clear All
                  </button>
                  <input
                    type="checkbox"
                    checked={settings.masterOverlayEnabled}
                    onChange={(e) => updateSettings({ masterOverlayEnabled: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
                  />
                </div>
              </div>

              {settings.masterOverlayEnabled && (
                <div className="space-y-3 pt-2 border-t border-[#222222]">
                  {/* Overlays selector */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {OVERLAY_OPTIONS.map((ov) => {
                      const isSel = (settings.activeOverlays || []).includes(ov.id);
                      return (
                        <button
                          key={ov.id}
                          type="button"
                          onClick={() => toggleOverlay(ov.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left cursor-pointer transition-all ${
                            isSel
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-[#1a1a1a] text-zinc-300 hover:bg-[#242424] border border-transparent'
                          }`}
                        >
                          {ov.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Raindrops Variant if active */}
                  {(settings.activeOverlays || []).includes('raindrops') && (
                    <div className="p-2.5 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between text-xs">
                      <span className="text-zinc-300">Raindrops Variant</span>
                      <div className="flex items-center gap-1 bg-[#121212] p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateSettings({ raindropsVariant: 'drizzle' })}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                            settings.raindropsVariant === 'drizzle' ? 'bg-red-500 text-white' : 'text-zinc-400'
                          }`}
                        >
                          Drizzle
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSettings({ raindropsVariant: 'heavy' })}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                            settings.raindropsVariant === 'heavy' ? 'bg-red-500 text-white' : 'text-zinc-400'
                          }`}
                        >
                          Heavy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Opacity */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">Overlay Opacity: {settings.overlayOpacity}%</span>
                      <button
                        type="button"
                        onClick={() => updateSettings({ overlayOpacity: 50 })}
                        className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={settings.overlayOpacity}
                      onChange={(e) => updateSettings({ overlayOpacity: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>

                  {/* Speed */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">Speed: {settings.overlaySpeed}x</span>
                      <button
                        type="button"
                        onClick={() => updateSettings({ overlaySpeed: 1.0 })}
                        className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={settings.overlaySpeed}
                      onChange={(e) => updateSettings({ overlaySpeed: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: CAMERA & FISHEYE */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Camera Movement (Constellation, Ship, Web, Branches)
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['off', 'subtle', 'cinematic'] as CameraMovementSetting[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateSettings({ cameraMovement: m })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                        settings.cameraMovement === m
                          ? 'bg-red-500 text-white'
                          : 'bg-[#1a1a1a] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Zoom Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-300">Camera Zoom: {settings.cameraZoom.toFixed(1)}x</span>
                  <button
                    type="button"
                    onClick={() => updateSettings({ cameraZoom: 1.0 })}
                    className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.cameraZoom}
                  onChange={(e) => updateSettings({ cameraZoom: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              {/* Fisheye 2D Settings */}
              <div className="pt-2 border-t border-[#222222] space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Fisheye 2D Lens Curvature
                </span>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400">Lens Strength: {settings.fisheyeStrength}%</span>
                    <button
                      type="button"
                      onClick={() => updateSettings({ fisheyeStrength: 60 })}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.fisheyeStrength}
                    onChange={(e) => updateSettings({ fisheyeStrength: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <div>
                  <span className="text-xs text-zinc-400 block mb-1">Curvature Axis</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['both', 'vertical', 'horizontal'] as FisheyeCurvatureAxis[]).map((ax) => (
                      <button
                        key={ax}
                        type="button"
                        onClick={() => updateSettings({ fisheyeAxis: ax })}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                          settings.fisheyeAxis === ax
                            ? 'bg-red-500 text-white'
                            : 'bg-[#1a1a1a] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {ax}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: EMOJI */}
          {activeTab === 'emoji' && (
            <div className="space-y-4">
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <div>
                  <span className="text-zinc-200 font-bold block text-sm">Visual Emojis & Icons</span>
                  <span className="text-[10px] text-zinc-500">Keyword icons in all 8 styles</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.iconsEnabled}
                  onChange={(e) => updateSettings({ iconsEnabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
                />
              </label>

              <div className="pt-2 border-t border-[#222222]">
                <span className="text-xs text-zinc-300 font-semibold block mb-2">Emoji Frequency</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['low', 'normal', 'high'] as EmojiFrequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => updateSettings({ emojiFrequency: f })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                        settings.emojiFrequency === f
                          ? 'bg-red-500 text-white'
                          : 'bg-[#1a1a1a] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keep Awake */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none pt-2 border-t border-[#222222]">
                <span className="text-zinc-300">Keep Screen Awake (Wake Lock)</span>
                <input
                  type="checkbox"
                  checked={settings.keepAwake}
                  onChange={(e) => updateSettings({ keepAwake: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
                />
              </label>
            </div>
          )}

          {/* TAB 9: TIMING OFFSET */}
          {activeTab === 'timing' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Lyric Timing Offset
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCoarseStep(!isCoarseStep)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1e1e1e] hover:bg-[#282828] text-zinc-300 border border-zinc-700 cursor-pointer"
                  >
                    {isCoarseStep ? 'Step: 1s' : 'Step: 0.1s'}
                  </button>
                  <button
                    type="button"
                    onClick={handleOffsetReset}
                    className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-200 font-semibold font-mono text-base">
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
                className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-40"
              />
            </div>
          )}
        </div>,
        (typeof document !== 'undefined' ? (document.fullscreenElement as HTMLElement) || document.body : null)!
      )}
    </div>
  );
}
