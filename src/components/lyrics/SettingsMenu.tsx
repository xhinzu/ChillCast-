'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LyricsSettings,
  LyricsStyle,
  LyricsFont,
  EdgeGlowMode,
  saveLyricsSettings,
  DEFAULT_LYRICS_SETTINGS,
} from '@/lib/lyrics/settings';
import { loadLyricTransform, saveLyricTransform } from '@/lib/lyrics/transform';

interface SettingsMenuProps {
  settings: LyricsSettings;
  trackId?: string;
  onUpdate: (newSettings: LyricsSettings) => void;
}

const STYLE_LABELS: { id: LyricsStyle; label: string; badge?: string }[] = [
  { id: 'classic', label: 'Classic', badge: 'Lines' },
  { id: 'visual', label: 'Visual', badge: 'Word' },
  { id: 'constellation', label: 'Constellation', badge: 'Graph' },
  { id: 'ship', label: 'Ship', badge: '3D Wall' },
  { id: 'fisheye', label: 'Fisheye', badge: '3D Cylinder' },
  { id: 'fisheye_visual', label: 'Fisheye Visual', badge: '3D + Icons' },
  { id: 'codestyle', label: 'Codestyle', badge: 'Editor' },
  { id: 'codestyle_visual', label: 'Codestyle Visual', badge: 'Editor + Icons' },
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

export default function SettingsMenu({ settings, trackId, onUpdate }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Position calculation with viewport clamping and upward flip if needed
  const updateCoords = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(384, window.innerWidth - 24);
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    if (spaceBelow < 280 && spaceAbove > spaceBelow) {
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

  // Close on outside click and Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
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

    // Reset offset to 0 in unified transform preserving speed
    const currentTrans = loadLyricTransform(trackId);
    saveLyricTransform(trackId, { speed: currentTrans.speed, offset: 0 });
  };

  const handleResetColors = () => {
    updateSettings({
      lyricColor: DEFAULT_LYRICS_SETTINGS.lyricColor,
      highlightColor: DEFAULT_LYRICS_SETTINGS.highlightColor,
      secondaryColor: DEFAULT_LYRICS_SETTINGS.secondaryColor,
    });
  };

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button - Compact icon-only that expands on hover / focus */}
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

        {/* Expandable text and chevron */}
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

      {/* Dropdown Menu Portaled to Document Body or Fullscreen Element */}
      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-80 sm:w-96 rounded-2xl bg-[#121212]/95 backdrop-blur-xl border border-[#262626] shadow-2xl p-4 text-white divide-y divide-[#222222] scrollbar-thin scrollbar-thumb-zinc-700 overflow-y-auto animate-fade-in"
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : undefined,
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            left: `${coords.left}px`,
            maxHeight: `${coords.maxHeight}px`,
            zIndex: 99999,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          {/* 1. STYLES */}
          <div className="pb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
              <span>Lyrics Style</span>
              <span className="text-[10px] text-zinc-500 font-normal">Switch mid-song</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLE_LABELS.map((item) => {
                const isSelected = settings.style === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateSettings({ style: item.id })}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-[#1a1a1a] hover:bg-[#242424] text-zinc-300 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
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

          {/* 2. TOGGLES */}
          <div className="py-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Display & Behavior
            </div>

            {/* Keep Awake */}
            <label className="flex items-center justify-between text-xs cursor-pointer select-none">
              <span className="text-zinc-300">Keep Screen Awake (Wake Lock)</span>
              <input
                type="checkbox"
                checked={settings.keepAwake}
                onChange={(e) => updateSettings({ keepAwake: e.target.checked })}
                className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
              />
            </label>

            {/* Show Outside Lyrics Page */}
            <label className="flex items-center justify-between text-xs cursor-pointer select-none">
              <div>
                <span className="text-zinc-300 block">Show Outside Lyrics Page</span>
                <span className="text-[10px] text-zinc-500">Floating dock above player on other tabs</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showOutsideLyricsPage}
                onChange={(e) => updateSettings({ showOutsideLyricsPage: e.target.checked })}
                className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
              />
            </label>

            {/* Icons */}
            <label className="flex items-center justify-between text-xs cursor-pointer select-none">
              <div>
                <span className="text-zinc-300 block">Visual Emojis & Icons</span>
                <span className="text-[10px] text-zinc-500">Keyword-triggered icons in supported styles</span>
              </div>
              <input
                type="checkbox"
                checked={settings.iconsEnabled}
                onChange={(e) => updateSettings({ iconsEnabled: e.target.checked })}
                className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
              />
            </label>
          </div>

          {/* 3. TYPOGRAPHY */}
          <div className="py-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Typography
            </div>

            {/* Font Picker */}
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

            {/* Text Size Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300">Text Size: {settings.textSize}%</span>
                <button
                  type="button"
                  onClick={() => updateSettings({ textSize: 100 })}
                  className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <input
                type="range"
                min="70"
                max="150"
                step="5"
                value={settings.textSize}
                onChange={(e) => updateSettings({ textSize: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>
          </div>

          {/* 4. COLOR SYSTEM ("Auto Sync") */}
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Colors
              </span>
              <button
                type="button"
                onClick={handleResetColors}
                className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Reset Colors
              </button>
            </div>

            <label className="flex items-center justify-between text-xs cursor-pointer select-none">
              <div>
                <span className="text-zinc-300 block">Auto Sync Palette</span>
                <span className="text-[10px] text-zinc-500">Extract vibrant colors from song artwork</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSyncColor}
                onChange={(e) => updateSettings({ autoSyncColor: e.target.checked })}
                className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
              />
            </label>

            {/* Custom Pickers (greyed out when Auto Sync is on) */}
            <div
              className={`grid grid-cols-3 gap-2 pt-1 transition-opacity ${
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

          {/* 5. EDGE GLOW (Lumn inspired) */}
          <div className="py-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Edge Glow (Lumn)
            </div>

            <label className="flex items-center justify-between text-xs cursor-pointer select-none">
              <span className="text-zinc-300">Enable Edge Glow</span>
              <input
                type="checkbox"
                checked={settings.edgeGlowEnabled}
                onChange={(e) => updateSettings({ edgeGlowEnabled: e.target.checked })}
                className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
              />
            </label>

            {settings.edgeGlowEnabled && (
              <div className="space-y-2.5 pt-1">
                {/* Mode */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Mode</span>
                  <div className="flex items-center gap-1 bg-[#1a1a1a] p-0.5 rounded-lg border border-[#262626]">
                    <button
                      type="button"
                      onClick={() => updateSettings({ edgeGlowMode: 'music_sync' })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        settings.edgeGlowMode === 'music_sync'
                          ? 'bg-red-500 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Music Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ edgeGlowMode: 'static' })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        settings.edgeGlowMode === 'static'
                          ? 'bg-red-500 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Static
                    </button>
                  </div>
                </div>

                {/* Thickness */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400">Thickness: {settings.edgeGlowThickness}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="14"
                    value={settings.edgeGlowThickness}
                    onChange={(e) => updateSettings({ edgeGlowThickness: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                {/* Glow Size */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400">Glow Size: {settings.edgeGlowSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={settings.edgeGlowSize}
                    onChange={(e) => updateSettings({ edgeGlowSize: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-[#252525] rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. TIMING OFFSET */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Lyric Timing Offset
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCoarseStep(!isCoarseStep)}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1e1e1e] hover:bg-[#282828] text-zinc-300 border border-zinc-700 cursor-pointer"
                  title="Toggle step between fine (0.1s) and coarse (1s)"
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
              <span className="text-zinc-200 font-semibold font-mono">
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
        </div>,
        (typeof document !== 'undefined' ? (document.fullscreenElement as HTMLElement) || document.body : null)!
      )}
    </div>
  );
}
