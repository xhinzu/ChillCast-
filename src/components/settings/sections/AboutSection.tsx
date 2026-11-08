'use client';

import React from 'react';
import { isTauri } from '@/lib/desktop';

interface AboutSectionProps {
  onOpenLyricsSettings?: () => void;
}

export default function AboutSection({ onOpenLyricsSettings }: AboutSectionProps) {
  const isDesktop = isTauri();

  const handleOpenLyricsSettings = () => {
    if (onOpenLyricsSettings) {
      onOpenLyricsSettings();
    } else {
      window.dispatchEvent(new CustomEvent('myujiku_open_lyrics_settings'));
    }
  };

  return (
    <div className="space-y-5 text-xs text-zinc-300">
      <div>
        <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          About MyuJiku
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Ambient Lo-Fi &amp; synchronized lyrics platform
        </p>
      </div>

      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            M
          </div>
          <div>
            <h4 className="text-base font-bold text-white">MyuJiku</h4>
            <p className="text-xs text-zinc-400">
              Version 1.0.0 {isDesktop ? '• Windows Desktop (Tauri 2)' : '• Web App (Vercel)'}
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          MyuJiku is a distraction-free music and study player engineered for ambient soundscapes,
          binaural spatial audio, word-level synchronized lyrics, and real-time Listen Together rooms.
        </p>

        <div className="pt-2 border-t border-[#25252c] grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Platform</span>
            <span className="text-zinc-200 font-medium">{isDesktop ? 'Windows Desktop x64' : 'Modern Web Browser'}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Audio Engine</span>
            <span className="text-zinc-200 font-medium">Web Audio API 8D DSP</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Lyrics Sync</span>
            <span className="text-zinc-200 font-medium">Dynamic Micro-clock (.LRC / syllables)</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Integrations</span>
            <span className="text-zinc-200 font-medium">Discord RPC, Webhook, Spotify PKCE</span>
          </div>
        </div>

        <div className="pt-3 border-t border-[#25252c] flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenLyricsSettings}
            className="px-3.5 py-1.5 rounded-lg bg-[#222228] hover:bg-[#2c2c34] border border-[#33333e] text-xs font-semibold text-white transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <span>✨</span>
            <span>Open Lyrics Appearance Popover</span>
          </button>
          <a
            href="/credits"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-[#222228] hover:bg-[#2c2c34] border border-[#33333e] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Credits &amp; Open Source
          </a>
        </div>
      </div>
    </div>
  );
}
