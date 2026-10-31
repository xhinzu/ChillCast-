'use client';

import React, { useState, useEffect } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { useQuality } from '@/hooks/useQuality';
import { Z_INDEX } from '@/constants/zIndex';

export const DEV_OVERLAY_STORAGE_KEY = 'myujiku_show_dev_overlay';

export default function DevOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const { currentTrack, currentTime, isPlaying, getPlaybackRate } = usePlayback();
  const playbackRate = typeof getPlaybackRate === 'function' ? getPlaybackRate() : 1.0;
  const { fps, effectiveQuality } = useQuality('auto');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkState = () => {
      try {
        setIsVisible(localStorage.getItem(DEV_OVERLAY_STORAGE_KEY) === 'true');
      } catch {
        setIsVisible(false);
      }
    };
    checkState();
    window.addEventListener('storage', checkState);
    window.addEventListener('myujiku_dev_overlay_updated', checkState);
    return () => {
      window.removeEventListener('storage', checkState);
      window.removeEventListener('myujiku_dev_overlay_updated', checkState);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-24 right-4 bg-black/85 backdrop-blur-md border border-emerald-500/40 rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-300 shadow-2xl flex flex-col gap-1 pointer-events-none select-none z-[9999]"
      style={{ zIndex: Z_INDEX.modals + 10 }}
    >
      <div className="flex items-center justify-between gap-3 text-emerald-400 font-bold border-b border-zinc-800 pb-1">
        <span>DEV OVERLAY</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {fps} FPS ({effectiveQuality})
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-zinc-500">Time:</span>
        <span className="font-semibold text-white">
          {currentTime.toFixed(2)}s {isPlaying ? '▶' : '⏸'} ({playbackRate}x)
        </span>
      </div>
      {currentTrack && (
        <div className="flex items-center justify-between gap-3 max-w-[200px]">
          <span className="text-zinc-500">Track:</span>
          <span className="truncate text-zinc-300" title={currentTrack.title}>
            {currentTrack.title}
          </span>
        </div>
      )}
    </div>
  );
}
