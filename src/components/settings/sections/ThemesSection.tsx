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
];

export default function ThemesSection() {
  const { settings, updateSettings } = useSettings();
  const activeSkin: AppSkinTheme = settings.appearance.uiSkin || 'classic';

  const selectTheme = (skin: AppSkinTheme) => {
    updateSettings('appearance', { uiSkin: skin });
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
              ) : (
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

