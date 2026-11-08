'use client';

import React, { useState } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import type { ThemeMode } from '@/lib/settings/settings-store';

export const ACCENT_PRESETS = [
  { id: 'emerald', name: 'Emerald', hex: '#10b981' },
  { id: 'spotify', name: 'Spotify Green', hex: '#1ed760' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
  { id: 'blue', name: 'Ocean Blue', hex: '#3b82f6' },
  { id: 'violet', name: 'Violet', hex: '#8b5cf6' },
  { id: 'magenta', name: 'Magenta', hex: '#d946ef' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e' },
  { id: 'amber', name: 'Amber Gold', hex: '#f59e0b' },
  { id: 'orange', name: 'Sunset Orange', hex: '#f97316' },
  { id: 'lime', name: 'Electric Lime', hex: '#84cc16' },
];

interface AppearanceSectionProps {
  onOpenLyricsSettings?: () => void;
}

export default function AppearanceSection({ onOpenLyricsSettings }: AppearanceSectionProps) {
  const { settings, updateSettings, resetSection } = useSettings();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currentTheme = settings.appearance.theme;
  const currentAccent = settings.appearance.customAccent ||
    ACCENT_PRESETS.find((p) => p.id === settings.appearance.accentPreset)?.hex || '#10b981';

  // Basic WCAG Contrast Ratio Calculator
  const getLuminance = (hex: string) => {
    const c = hex.replace('#', '');
    const rgb = [
      parseInt(c.substring(0, 2), 16) / 255,
      parseInt(c.substring(2, 4), 16) / 255,
      parseInt(c.substring(4, 6), 16) / 255,
    ].map((val) => (val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };

  const getContrastRatio = (hex1: string, hex2: string) => {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const bgHex = settings.appearance.backgroundTint || (currentTheme === 'light' ? '#f5f5f7' : '#0d0d0f');
  const textHex = settings.appearance.textColor || (currentTheme === 'light' ? '#111111' : '#ffffff');
  const contrastRatio = getContrastRatio(textHex, bgHex);
  const isAccessible = contrastRatio >= 4.5;

  const handleOpenLyricsSettings = () => {
    if (onOpenLyricsSettings) {
      onOpenLyricsSettings();
    } else {
      window.dispatchEvent(new CustomEvent('myujiku_open_lyrics_settings'));
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            Appearance &amp; Theming
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Themes, accent color, UI tint, and contrast settings
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetSection('appearance')}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Reset appearance to defaults"
        >
          Reset Appearance
        </button>
      </div>

      {/* 1. Theme Mode Switcher */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
        <label className="text-xs font-semibold text-white block">Theme Mode</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'dark', label: 'Dark', icon: '🌙', desc: 'Deep zinc & obsidian' },
            { id: 'light', label: 'Light', icon: '☀️', desc: 'Clean bright surfaces' },
            { id: 'amoled', label: 'AMOLED', icon: '🖤', desc: 'Pure #000000 black' },
            { id: 'system', label: 'System', icon: '💻', desc: 'Matches your OS' },
          ].map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => updateSettings('appearance', { theme: theme.id as ThemeMode })}
                style={
                  isSelected
                    ? {
                        borderColor: 'var(--accent)',
                        backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                        boxShadow: '0 0 12px color-mix(in srgb, var(--accent) 25%, transparent)',
                      }
                    : undefined
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'text-white'
                    : 'border-[#2a2a34] bg-[#121215] text-zinc-300 hover:bg-[#1a1a20]'
                }`}
              >
                <div className="text-base mb-1">{theme.icon}</div>
                <div className="font-semibold text-xs text-white">{theme.label}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{theme.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Accent Color Palette */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white">Accent Color</label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">Follow Cover Art:</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.appearance.followCoverArtAccent}
              onClick={() =>
                updateSettings('appearance', {
                  followCoverArtAccent: !settings.appearance.followCoverArtAccent,
                })
              }
              style={{
                backgroundColor: settings.appearance.followCoverArtAccent
                  ? 'var(--accent)'
                  : '#2e2e36',
              }}
              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.appearance.followCoverArtAccent ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-1">
          {ACCENT_PRESETS.map((preset) => {
            const isSelected =
              !settings.appearance.customAccent && settings.appearance.accentPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  updateSettings('appearance', {
                    accentPreset: preset.id,
                    customAccent: null,
                  })
                }
                title={preset.name}
                className={`w-full aspect-square rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  isSelected ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: preset.hex }}
              >
                {isSelected && <span className="text-white text-xs font-bold drop-shadow">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Custom hex color picker */}
        <div className="pt-2 flex items-center gap-3">
          <input
            type="color"
            value={currentAccent}
            onChange={(e) =>
              updateSettings('appearance', {
                customAccent: e.target.value,
              })
            }
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
            title="Choose custom accent hex"
          />
          <span className="text-[11px] text-zinc-300 font-mono uppercase">{currentAccent}</span>
          {settings.appearance.customAccent && (
            <button
              type="button"
              onClick={() => updateSettings('appearance', { customAccent: null })}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
            >
              Clear custom hex
            </button>
          )}
        </div>
      </div>

      {/* 3. Advanced Color Customization & Contrast Verification */}
      <div className="border border-[#282830] bg-[#141417] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#1a1a20] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200">Advanced Tint &amp; WCAG Contrast</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isAccessible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              Contrast: {contrastRatio.toFixed(2)}:1 {isAccessible ? '(WCAG AA Pass)' : '(Low Contrast)'}
            </span>
          </div>
          <span className="text-zinc-400 text-xs">{showAdvanced ? '▲' : '▼'}</span>
        </button>

        {showAdvanced && (
          <div className="p-4 pt-1 space-y-4 border-t border-[#222228] animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Background Tint</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.appearance.backgroundTint || (currentTheme === 'light' ? '#ffffff' : '#0a0a0c')}
                    onChange={(e) => updateSettings('appearance', { backgroundTint: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-zinc-300">
                    {settings.appearance.backgroundTint || 'Default'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Surface Tint</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.appearance.surfaceTint || (currentTheme === 'light' ? '#f0f0f3' : '#16161a')}
                    onChange={(e) => updateSettings('appearance', { surfaceTint: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-zinc-300">
                    {settings.appearance.surfaceTint || 'Default'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.appearance.textColor || (currentTheme === 'light' ? '#111111' : '#ffffff')}
                    onChange={(e) => updateSettings('appearance', { textColor: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-zinc-300">
                    {settings.appearance.textColor || 'Default'}
                  </span>
                </div>
              </div>
            </div>

            {!isAccessible && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center justify-between">
                <span>Contrast is below WCAG AA 4.5:1 recommended minimum.</span>
                <button
                  type="button"
                  onClick={() =>
                    updateSettings('appearance', {
                      textColor: currentTheme === 'light' ? '#000000' : '#ffffff',
                      backgroundTint: null,
                    })
                  }
                  className="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-500 cursor-pointer"
                >
                  Auto-Correct
                </button>
              </div>
            )}

            {/* Theme Export / Import */}
            <div className="pt-3 border-t border-[#222228] flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">Theme Preset File</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(settings.appearance, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `myujiku-theme-${settings.appearance.theme}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2.5 py-1 rounded bg-[#25252c] hover:bg-[#32323e] border border-[#353540] text-zinc-200 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Export Theme
                </button>
                <label className="px-2.5 py-1 rounded bg-[#25252c] hover:bg-[#32323e] border border-[#353540] text-zinc-200 text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center">
                  Import Theme
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const parsed = JSON.parse(event.target?.result as string);
                          if (parsed && typeof parsed === 'object') {
                            updateSettings('appearance', parsed);
                          }
                        } catch {
                          alert('Invalid theme JSON file');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Toggles for Stage & Logo Inspection */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-white block">Lyrics stage follows theme</label>
            <p className="text-[11px] text-zinc-400">
              When disabled, the lyrics stage maintains its immersive black background for maximum contrast.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.appearance.lyricsStageFollowsTheme}
            onClick={() =>
              updateSettings('appearance', {
                lyricsStageFollowsTheme: !settings.appearance.lyricsStageFollowsTheme,
              })
            }
            style={{
              backgroundColor: settings.appearance.lyricsStageFollowsTheme
                ? 'var(--accent)'
                : '#2e2e36',
            }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.appearance.lyricsStageFollowsTheme ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        <div className="pt-3 border-t border-[#22222a] flex items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-white block">Hold logo to inspect</label>
            <p className="text-[11px] text-zinc-400">
              Press and hold the top logo for ~450ms to enlarge and zoom with pan controls.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.appearance.holdLogoToInspect}
            onClick={() =>
              updateSettings('appearance', {
                holdLogoToInspect: !settings.appearance.holdLogoToInspect,
              })
            }
            style={{
              backgroundColor: settings.appearance.holdLogoToInspect
                ? 'var(--accent)'
                : '#2e2e36',
            }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.appearance.holdLogoToInspect ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        <div className="pt-3 border-t border-[#22222a] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-300 block">Lyrics Typography &amp; Styles</span>
            <span className="text-[10px] text-zinc-500">Font families, font sizes, colors, and 3D effects</span>
          </div>
          <button
            type="button"
            onClick={handleOpenLyricsSettings}
            className="px-3 py-1.5 rounded-lg bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Open Lyrics Settings ➔
          </button>
        </div>
      </div>
    </div>
  );
}
