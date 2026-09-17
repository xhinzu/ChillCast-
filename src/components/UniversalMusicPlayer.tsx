'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { AdapterType } from '@/types/playback';

const ADAPTER_OPTIONS: { type: AdapterType; label: string; icon: string; badge?: string }[] = [
  { type: 'local', label: 'Local Audio', icon: '📁' },
  { type: 'youtube', label: 'YouTube Playlist', icon: '▶️', badge: 'Stage 4' },
  { type: 'spotify', label: 'Spotify', icon: '🎧', badge: 'Stage 5' },
];

export default function UniversalMusicPlayer() {
  const {
    activeAdapterType,
    currentTrack,
    isPlaying,
    playbackState,
    currentTime,
    duration,
    volume,
    isMuted,
    errorMessage,
    switchAdapter,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    loadCustomLocalFile,
  } = usePlayback();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Global spacebar listener for play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target === document.body || e.target === document.documentElement)) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadCustomLocalFile(file);
    }
  };

  return (
    <div className="w-full backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/40 flex flex-col gap-6">
      {/* Top Bar: Adapter Swapper Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/30 border border-white/[0.06] self-start">
          {ADAPTER_OPTIONS.map((opt) => {
            const isActive = activeAdapterType === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => switchAdapter(opt.type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  isActive
                    ? 'bg-indigo-500/25 border border-indigo-500/40 text-white shadow-md shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
                {opt.badge && !isActive && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-400">
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Source State Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="capitalize">{activeAdapterType} Adapter</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="capitalize font-mono text-[11px] text-slate-300">
            {playbackState}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Main Track Details & Interactive Controls */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Album Artwork / Spinning Vinyl Record */}
        <div className="relative group w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
          {/* Subtle Dynamic Ambient Aura */}
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500/30 via-purple-500/20 to-teal-500/20 blur-xl transition-opacity duration-700 ${
              isPlaying ? 'opacity-100' : 'opacity-30'
            }`}
          />

          {/* Vinyl Disk Record */}
          <div
            className={`relative w-full h-full rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-white/10 p-3 shadow-2xl flex items-center justify-center overflow-hidden ${
              isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
            }`}
          >
            {/* Concentric Grooves */}
            <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-indigo-950/60">
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Center Play Button Overlay */}
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            <span className="text-xl pl-0.5">{isPlaying ? '⏸' : '▶'}</span>
          </button>
        </div>

        {/* Player Controls & Track Metadata */}
        <div className="flex-1 w-full flex flex-col justify-between gap-4">
          {/* Header Track Info */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentTrack?.source || activeAdapterType}
                </span>
                {currentTrack?.album && (
                  <>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400 line-clamp-1">{currentTrack.album}</span>
                  </>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mt-1 line-clamp-1">
                {currentTrack?.title || 'No Track Selected'}
              </h3>
              <p className="text-xs text-slate-400">{currentTrack?.artist || 'PlaybackAdapter Ready'}</p>
            </div>

            {/* Local Custom Upload (Visible on Local Audio mode) */}
            {activeAdapterType === 'local' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Upload local audio track"
                >
                  <span>📁</span> Choose Audio
                </button>
              </div>
            )}
          </div>

          {/* Timeline Scrub Slider */}
          <div className="space-y-1.5">
            <div className="relative flex items-center group">
              <input
                type="range"
                min="0"
                max={duration > 0 ? duration : 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400 group-hover:h-2 transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => seek(Math.max(0, currentTime - 5))}
                className="p-2 rounded-xl text-sm text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Rewind 5s"
              >
                ⏪
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-xs flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25 cursor-pointer"
              >
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
                <span>{isPlaying ? '⏸' : '▶'}</span>
              </button>
              <button
                type="button"
                onClick={() => seek(Math.min(duration, currentTime + 5))}
                className="p-2 rounded-xl text-sm text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Forward 5s"
              >
                ⏩
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
