'use client';

import React, { useState } from 'react';
import UniversalMusicPlayer from '@/components/UniversalMusicPlayer';
import AmbientSoundMixer from '@/components/AmbientSoundMixer';
import LiveLyrics from '@/components/LiveLyrics';
import AmbientBackground from '@/components/AmbientBackground';
import SceneSelector from '@/components/SceneSelector';
import { PlaybackProvider } from '@/context/PlaybackContext';
import { SceneId } from '@/types/scenes';

export default function ChillCastApp() {
  const [activeSceneId, setActiveSceneId] = useState<SceneId>('rain');
  const [dimmerOpacity, setDimmerOpacity] = useState<number>(0.25);
  const [isMotionPaused, setIsMotionPaused] = useState<boolean>(false);

  return (
    <PlaybackProvider>
      {/* 1. Looping Muted Background Video + Canvas Engine */}
      <AmbientBackground
        activeSceneId={activeSceneId}
        dimmerOpacity={dimmerOpacity}
        isPaused={isMotionPaused}
      />

      <main className="min-h-screen text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 relative font-sans selection:bg-indigo-500/30">
        {/* Main Application Column (Centered horizontally, anchored at top) */}
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col gap-6 sm:gap-8 py-4 sm:py-8">
          {/* Brand Header & Scene Selector Toolbar */}
          <header className="relative z-50 flex items-center justify-between backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08] border-t-white/[0.14] px-6 py-4 rounded-3xl shadow-2xl shadow-black/40">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-sky-400 to-teal-300 p-[1.5px] flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <div className="w-full h-full bg-[#07090e] rounded-2xl flex items-center justify-center text-lg">
                  ✨
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-100 via-sky-100 to-teal-100 bg-clip-text text-transparent">
                  ChillCast
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  Ambient Lo-Fi Soundscapes & Music Player
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3">
              {/* Scene Picker & Dimmer */}
              <SceneSelector
                activeSceneId={activeSceneId}
                onSelectScene={setActiveSceneId}
                dimmerOpacity={dimmerOpacity}
                onDimmerChange={setDimmerOpacity}
                isPaused={isMotionPaused}
                onTogglePause={() => setIsMotionPaused(!isMotionPaused)}
              />

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span>Stage 7 Live</span>
              </div>
            </div>
          </header>

          {/* 2. Universal Swappable Music Player */}
          <section aria-label="Universal Music Player">
            <UniversalMusicPlayer />
          </section>

          {/* 3. Live Synced Lyrics via LRCLIB */}
          <section aria-label="Live Synced Lyrics">
            <LiveLyrics />
          </section>

          {/* 4. Web Audio API Ambient Soundscape Mixer */}
          <section aria-label="Ambient Soundscape Mixer">
            <AmbientSoundMixer />
          </section>

          {/* Footer */}
          <footer className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 px-4 py-3 border-t border-white/[0.06] backdrop-blur-md rounded-2xl bg-black/15 gap-2">
            <span>ChillCast • Stage 7 (Glassmorphism Pass & Ambient Video Loops)</span>
            <span className="text-indigo-300 font-medium">Next: Stage 8 (GitHub & Vercel Auto-Deploy)</span>
          </footer>
        </div>
      </main>
    </PlaybackProvider>
  );
}
