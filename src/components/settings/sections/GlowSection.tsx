'use client';

import React from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import type { EdgeGlowStyle } from '@/lib/settings/settings-store';

const EDGE_GLOW_STYLES: { id: EdgeGlowStyle; name: string; preview: string }[] = [
  { id: 'vignette', name: 'Vignette', preview: 'radial-gradient(circle, transparent 50%, currentColor 100%)' },
  { id: 'ring', name: 'Ring Border', preview: 'inset 0 0 16px currentColor' },
  { id: 'corners', name: 'Corners', preview: 'radial-gradient(circle at top left, currentColor 0%, transparent 40%)' },
  { id: 'top_bottom', name: 'Top & Bottom', preview: 'linear-gradient(180deg, currentColor 0%, transparent 25%, transparent 75%, currentColor 100%)' },
  { id: 'side_bars', name: 'Side Bars', preview: 'linear-gradient(90deg, currentColor 0%, transparent 25%, transparent 75%, currentColor 100%)' },
  { id: 'spotlight', name: 'Spotlight Bloom', preview: 'radial-gradient(circle at center, currentColor 0%, transparent 70%)' },
  { id: 'aurora', name: 'Aurora Waves', preview: 'linear-gradient(135deg, currentColor 0%, transparent 50%, currentColor 100%)' },
  { id: 'neon_tube', name: 'Neon Tube', preview: 'inset 0 0 8px currentColor, 0 0 16px currentColor' },
  { id: 'rotating_conic', name: 'Conic Rotation', preview: 'conic-gradient(from 0deg, currentColor, transparent, currentColor)' },
  { id: 'ripple', name: 'Ripple Pulses', preview: 'radial-gradient(circle, transparent 30%, currentColor 60%, transparent 90%)' },
  { id: 'breathing', name: 'Breathing Halo', preview: 'radial-gradient(circle at center, transparent 40%, currentColor 95%)' },
];

export default function GlowSection() {
  const { settings, updateSettings, resetSection } = useSettings();
  const glow = settings.glow;

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            Glow &amp; Lighting
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            UI element highlights and synchronized lyrics stage edge glow
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetSection('glow')}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Reset glow settings to default"
        >
          Reset Glow
        </button>
      </div>

      {/* ─────────────────── PART 3B: UI GLOW ─────────────────── */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-white">Interface Glow</h4>
            <p className="text-[11px] text-zinc-400">
              Adds subtle atmospheric glow to active nav items, primary buttons, input focus, and progress bars.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={glow.uiGlowEnabled}
            onClick={() => updateSettings('glow', { uiGlowEnabled: !glow.uiGlowEnabled })}
            style={{
              backgroundColor: glow.uiGlowEnabled ? 'var(--accent)' : '#2e2e36',
            }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                glow.uiGlowEnabled ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        {glow.uiGlowEnabled && (
          <div className="pt-3 border-t border-[#22222a] space-y-3 animate-in fade-in duration-150">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-zinc-400">UI Glow Intensity</span>
                <span className="text-[11px] font-mono text-zinc-300">{Math.round(glow.uiGlowIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={glow.uiGlowIntensity}
                onChange={(e) => updateSettings('glow', { uiGlowIntensity: parseFloat(e.target.value) })}
                style={{ accentColor: 'var(--accent)' }}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400">Glow Tint:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSettings('glow', { uiGlowColor: 'accent' })}
                  style={
                    glow.uiGlowColor === 'accent'
                      ? {
                          backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--accent) 45%, transparent)',
                          color: 'var(--accent)',
                        }
                      : undefined
                  }
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                    glow.uiGlowColor === 'accent'
                      ? ''
                      : 'border-transparent bg-[#202026] text-zinc-400 hover:text-white'
                  }`}
                >
                  Follow Accent Token
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings('glow', { uiGlowColor: 'custom' })}
                  style={
                    glow.uiGlowColor === 'custom'
                      ? {
                          backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--accent) 45%, transparent)',
                          color: 'var(--accent)',
                        }
                      : undefined
                  }
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                    glow.uiGlowColor === 'custom'
                      ? ''
                      : 'border-transparent bg-[#202026] text-zinc-400 hover:text-white'
                  }`}
                >
                  Custom
                </button>
                {glow.uiGlowColor === 'custom' && (
                  <input
                    type="color"
                    value={glow.uiGlowCustomColor}
                    onChange={(e) => updateSettings('glow', { uiGlowCustomColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────── PART 3A: LYRICS EDGE GLOW ─────────────────── */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-white">Lyrics Stage Edge Glow</h4>
            <p className="text-[11px] text-zinc-400">
              Immersive ambient glow framing the lyrics stage with music-frequency reactivity.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={glow.lyricsEdgeGlowEnabled}
            onClick={() => updateSettings('glow', { lyricsEdgeGlowEnabled: !glow.lyricsEdgeGlowEnabled })}
            style={{
              backgroundColor: glow.lyricsEdgeGlowEnabled ? 'var(--accent)' : '#2e2e36',
            }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                glow.lyricsEdgeGlowEnabled ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        {glow.lyricsEdgeGlowEnabled && (
          <div className="pt-3 border-t border-[#22222a] space-y-4 animate-in fade-in duration-150">
            {/* 11 Visual Style Tiles */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-2">
                Edge Glow Styles (11 Styles)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EDGE_GLOW_STYLES.map((style) => {
                  const isSelected = glow.lyricsEdgeGlowStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => updateSettings('glow', { lyricsEdgeGlowStyle: style.id })}
                      style={
                        isSelected
                          ? {
                              borderColor: 'var(--accent)',
                              backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                              boxShadow: '0 0 10px color-mix(in srgb, var(--accent) 25%, transparent)',
                            }
                          : undefined
                      }
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'text-white'
                          : 'border-[#282832] bg-[#121216] text-zinc-400 hover:bg-[#1a1a20]'
                      }`}
                    >
                      <div
                        className="w-10 h-7 rounded border border-white/20 text-[var(--accent)] shadow-inner"
                        style={{
                          background: style.preview.includes('gradient') ? style.preview : '#09090b',
                          boxShadow: !style.preview.includes('gradient') ? style.preview : undefined,
                        }}
                      />
                      <span className="text-[10px] font-medium text-center">{style.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <span className="text-[11px] text-zinc-400 block mb-1">Color Source</span>
                <select
                  value={glow.lyricsEdgeGlowColorSource}
                  onChange={(e) =>
                    updateSettings('glow', {
                      lyricsEdgeGlowColorSource: e.target.value as 'palette' | 'custom' | 'gradient',
                    })
                  }
                  className="w-full bg-[#111114] border border-[#2a2a35] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="palette">Follow Album Palette</option>
                  <option value="custom">Custom Color</option>
                  <option value="gradient">Custom Gradient</option>
                </select>
              </div>

              <div>
                <span className="text-[11px] text-zinc-400 block mb-1">Lighting Mode</span>
                <select
                  value={glow.lyricsEdgeGlowMode}
                  onChange={(e) =>
                    updateSettings('glow', {
                      lyricsEdgeGlowMode: e.target.value as 'static' | 'breathing' | 'music_sync',
                    })
                  }
                  className="w-full bg-[#111114] border border-[#2a2a35] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="music_sync">Music Sync (Analyser audio pulse)</option>
                  <option value="breathing">Breathing Wave</option>
                  <option value="static">Static Continuous Glow</option>
                </select>
              </div>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Intensity</span>
                  <span className="font-mono text-zinc-300">{Math.round(glow.lyricsEdgeGlowIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={glow.lyricsEdgeGlowIntensity}
                  onChange={(e) => updateSettings('glow', { lyricsEdgeGlowIntensity: parseFloat(e.target.value) })}
                  style={{ accentColor: 'var(--accent)' }}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Glow Blur / Size</span>
                  <span className="font-mono text-zinc-300">{glow.lyricsEdgeGlowSize}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="2"
                  value={glow.lyricsEdgeGlowSize}
                  onChange={(e) => updateSettings('glow', { lyricsEdgeGlowSize: parseInt(e.target.value, 10) })}
                  style={{ accentColor: 'var(--accent)' }}
                  className="w-full"
                />
              </div>
            </div>

            <div className="pt-1 text-[10px] text-zinc-500">
              Note: Active Chroma mode takes priority over color sources to provide full rainbow cycling.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
