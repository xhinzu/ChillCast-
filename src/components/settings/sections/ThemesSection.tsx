'use client';

import React from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import type { AppSkinTheme } from '@/lib/settings/settings-store';

interface ThemeCardDef {
  id: AppSkinTheme;
  name: string;
  subtitle: string;
  description: string;
}

const APP_THEMES: ThemeCardDef[] = [
  {
    id: 'classic',
    name: 'Classic MyuJiku',
    subtitle: 'Default Modern Dark / Light / AMOLED',
    description:
      'Sleek modern streaming interface with adaptive Dark, Light, and AMOLED modes, glass surfaces, and custom accent colors.',
  },
  {
    id: 'windows_xp',
    name: 'Windows XP',
    subtitle: 'Luna Blue & Windows Media Player 9/10',
    description:
      'Transforms the entire player into a classic Windows XP music player with #0054E3 Luna Blue titlebars, #ECE9D8 beveled panels, Tahoma typography, and a metallic WMP transport bar.',
  },
  {
    id: 'xbox',
    name: 'Xbox',
    subtitle: 'Retro Translucent Emerald Green',
    description:
      'Classic translucent green console aesthetic with frosted emerald glass panels, cyber-grid backdrop, glowing lime highlights, and luminous transport controls.',
  },
  {
    id: 'psp',
    name: 'PSP',
    subtitle: 'PlayStation Cobalt Blue & Translucent Glass',
    description:
      'Inspired by classic 2000s Sony PlayStation ads and PSP XMB waves: deep cobalt blue gradients, frosted translucent ice-blue glass panels, and steel-silver accents.',
  },
  {
    id: 'starboy',
    name: 'Starboy',
    subtitle: 'Crimson Red, Gold & Electric Blue',
    description:
      'Bold scarlet-red and obsidian backdrop with Starboy gold accents, electric-blue highlights, and transparent character cutouts around the stage.',
  },
  {
    id: 'marvel',
    name: 'Marvel',
    subtitle: 'Black, White & Scarlet Red',
    description:
      'High-contrast Marvel comic aesthetic in pitch black, crisp white, and bold red with Deadpool, Iron Man, and Spider-Man cutouts.',
  },
  {
    id: 'yamaha',
    name: 'Yamaha',
    subtitle: 'Cyan, Black & Crisp White',
    description:
      'Sleek Yamaha synth & superbike aesthetic in electric cyan, deep black, and crisp white with Miku, Teto, and R1 cutouts.',
  },
  {
    id: 'dc',
    name: 'DC',
    subtitle: 'Black, Crimson Red & Justice Blue',
    description:
      'Dark Gotham & Metropolis comic aesthetic in obsidian black, scarlet red, and heroic blue with Superman, Batman, and Wonder Woman cutouts.',
  },
];

const THEME_DEFAULT_ACCENTS: Record<AppSkinTheme, { accentPreset: string; customAccent: string | null }> = {
  classic: { accentPreset: 'emerald', customAccent: null },
  windows_xp: { accentPreset: 'blue', customAccent: '#0054E3' },
  xbox: { accentPreset: 'lime', customAccent: '#84CC16' },
  psp: { accentPreset: 'cyan', customAccent: '#38BDF8' },
  starboy: { accentPreset: 'rose', customAccent: '#DC2626' },
  marvel: { accentPreset: 'rose', customAccent: '#EF4444' },
  yamaha: { accentPreset: 'cyan', customAccent: '#06B6D4' },
  dc: { accentPreset: 'blue', customAccent: '#2563EB' },
};

export default function ThemesSection() {
  const { settings, updateSettings } = useSettings();
  const activeSkin: AppSkinTheme = settings.appearance.uiSkin || 'classic';

  const selectTheme = (skin: AppSkinTheme) => {
    const matched = THEME_DEFAULT_ACCENTS[skin] || THEME_DEFAULT_ACCENTS.classic;
    updateSettings('appearance', {
      uiSkin: skin,
      accentPreset: matched.accentPreset,
      customAccent: matched.customAccent,
    });
  };

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      <div>
        <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
          Full App Themes
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Switch the overall look and feel of the entire MyuJiku player.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {APP_THEMES.map((t) => {
          const isActive = activeSkin === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTheme(t.id)}
              className={`text-left rounded-2xl border p-4 transition-all cursor-pointer flex flex-col gap-3 ${
                isActive
                  ? 'bg-[var(--accent)]/12 border-[var(--accent)] ring-1 ring-[var(--accent)]/40'
                  : 'bg-[#17171a] border-[#282830] hover:border-zinc-500'
              }`}
            >
              {/* Live Mini Preview */}
              {t.id === 'classic' ? (
                <div className="w-full h-28 rounded-xl bg-[#0e0e11] border border-white/10 p-2.5 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-bold text-white">MyuJiku</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-zinc-300">Modern</span>
                  </div>
                  <div className="flex gap-2 flex-1 my-1.5">
                    <div className="w-12 rounded bg-[#18181c] border border-white/5" />
                    <div className="flex-1 rounded bg-[#18181c] border border-white/5" />
                  </div>
                  <div className="h-4 rounded bg-black/90 border border-white/10 flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-white" />
                  </div>
                </div>
              ) : t.id === 'windows_xp' ? (
                <div
                  className="w-full h-28 rounded border-2 border-[#0054E3] bg-[#ECE9D8] flex flex-col justify-between overflow-hidden"
                  style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}
                >
                  <div
                    className="h-5 px-2 flex items-center justify-between text-[10px] font-bold text-white"
                    style={{
                      background: 'linear-gradient(180deg, #0997ff 0%, #0054e3 20%, #003dd9 100%)',
                    }}
                  >
                    <span>Windows Media Player</span>
                    <span className="text-[9px]">_ [] X</span>
                  </div>
                  <div className="flex gap-1.5 flex-1 p-1.5">
                    <div className="w-12 bg-white border border-[#808080]" />
                    <div className="flex-1 bg-white border border-[#808080]" />
                  </div>
                  <div
                    className="h-5 px-2 flex items-center justify-between"
                    style={{
                      background: 'linear-gradient(180deg, #9db8e5 0%, #567ec3 55%, #37579a 100%)',
                    }}
                  >
                    <span className="px-1.5 py-0.2 rounded bg-[#3d9e32] text-white text-[9px] font-bold italic">
                      start
                    </span>
                    <span className="w-3.5 h-3.5 rounded-full bg-[#e8eef9] border border-[#243b6b]" />
                    <span className="text-[9px] text-white font-mono">XP</span>
                  </div>
                </div>
              ) : t.id === 'xbox' ? (
                <div
                  className="w-full h-28 rounded-xl border border-[#84cc16]/60 p-2.5 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_24px_rgba(132,204,22,0.28)]"
                  style={{
                    background:
                      'radial-gradient(circle at 25% 40%, rgba(132,204,22,0.35), rgba(8,28,7,0.94) 70%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#bef264]">
                      XBOX MUSIC
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#84cc16]/25 border border-[#a3e635]/50 text-[9px] text-[#ecfccb]">
                      2001
                    </span>
                  </div>
                  <div className="flex gap-2 flex-1 my-1.5">
                    <div className="w-12 rounded bg-[#143d10]/65 border border-[#84cc16]/40" />
                    <div className="flex-1 rounded bg-[#143d10]/55 border border-[#84cc16]/40" />
                  </div>
                  <div className="h-4 rounded bg-[#0c2909]/85 border border-[#84cc16]/50 flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-[#a3e635] shadow-[0_0_8px_#a3e635]" />
                  </div>
                </div>
              ) : t.id === 'psp' ? (
                <div
                  className="w-full h-28 rounded-xl border border-sky-300/45 p-2.5 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_28px_rgba(96,165,250,0.28)]"
                  style={{
                    background:
                      'linear-gradient(135deg, #003791 0%, #0a58ca 48%, #041d4e 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-white">
                      PSP · XMB
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/15 border border-white/30 text-[9px] text-sky-100">
                      △ ○ × □
                    </span>
                  </div>
                  <div className="flex gap-2 flex-1 my-1.5">
                    <div className="w-12 rounded bg-white/12 border border-white/25 backdrop-blur-sm" />
                    <div className="flex-1 rounded bg-white/10 border border-white/25 backdrop-blur-sm" />
                  </div>
                  <div className="h-4 rounded bg-[#03153a]/75 border border-sky-300/35 flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-sky-300 shadow-[0_0_8px_#7dd3fc]" />
                  </div>
                </div>
              ) : t.id === 'starboy' ? (
                <div
                  className="w-full h-28 rounded-xl border border-yellow-400/60 p-2.5 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_24px_rgba(220,38,38,0.45)]"
                  style={{
                    background:
                      'linear-gradient(135deg, #991b1b 0%, #dc2626 48%, #1f060a 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest uppercase text-yellow-400">
                      STARBOY
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-600/40 border border-sky-400/50 text-[9px] text-sky-200">
                      LTD
                    </span>
                  </div>
                  <div className="flex gap-2 flex-1 my-1.5">
                    <div className="w-12 rounded bg-black/55 border border-red-500/40" />
                    <div className="flex-1 rounded bg-black/55 border border-yellow-400/35" />
                  </div>
                  <div className="h-4 rounded bg-black/80 border border-yellow-400/45 flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
                  </div>
                </div>
              ) : t.id === 'marvel' ? (
                <div
                  className="w-full h-28 rounded-xl border-2 border-white/80 p-2.5 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_24px_rgba(239,68,68,0.35)]"
                  style={{
                    background:
                      'linear-gradient(135deg, #09090b 0%, #18181b 52%, #7f1d1d 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 bg-[#ef4444] text-[10px] font-black tracking-widest uppercase text-white">
                      MARVEL
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-black">
                      B/W/R
                    </span>
                  </div>
                  <div className="flex gap-2 flex-1 my-1.5">
                    <div className="w-12 rounded bg-black/80 border border-white/35" />
                    <div className="flex-1 rounded bg-black/80 border border-red-500/55" />
                  </div>
                  <div className="h-4 rounded bg-black border border-white/40 flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_8px_#ef4444]" />
                  </div>
                </div>
              ) : t.id === 'yamaha' ? (
                <div
                  className="w-full h-28 rounded-xl border border-cyan-400/60 p-2.5 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_24px_rgba(6,182,212,0.35)]"
                  style={{
                    background:
                      'linear-gradient(135deg, #04090d 0%, #08202c 55%, #0e7490 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest uppercase text-white">
                      YAMAHA
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-400/25 border border-cyan-300/60 text-[9px] text-cyan-200">
                      01
                    </span>
                  </div>
                  <div className="flex gap-2 flex-1 my-1.5">
                    <div className="w-12 rounded bg-black/75 border border-cyan-400/40" />
                    <div className="flex-1 rounded bg-black/75 border border-white/30" />
                  </div>
                  <div className="h-4 rounded bg-black/85 border border-cyan-400/50 flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  </div>
                </div>
              ) : (
                <div
                  className="w-full h-28 rounded-xl border border-blue-500/60 p-2.5 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_24px_rgba(37,99,235,0.35)]"
                  style={{
                    background:
                      'linear-gradient(135deg, #05070c 0%, #0f172a 50%, #7f1d1d 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-[10px] font-black tracking-widest uppercase text-white">
                      DC
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-red-600/80 text-[9px] font-bold text-white">
                      JUSTICE
                    </span>
                  </div>
                  <div className="flex gap-2 flex-1 my-1.5">
                    <div className="w-12 rounded bg-black/75 border border-blue-500/45" />
                    <div className="flex-1 rounded bg-black/75 border border-red-500/45" />
                  </div>
                  <div className="h-4 rounded bg-black/85 border border-blue-500/50 flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{t.name}</span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] text-[10px] font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-zinc-400 mt-0.5">{t.subtitle}</p>
                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

