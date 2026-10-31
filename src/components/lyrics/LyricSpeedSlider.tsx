'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import {
  loadLyricTransform,
  saveLyricTransform,
  calculateContinuityOffset,
  LyricTransform,
} from '@/lib/lyrics/transform';

interface LyricSpeedSliderProps {
  trackId?: string;
  className?: string;
  highlightColor?: string;
}

export default function LyricSpeedSlider({
  trackId,
  className = '',
  highlightColor,
}: LyricSpeedSliderProps) {
  const { getCurrentTime, currentTime } = usePlayback();
  const [transform, setTransform] = useState<LyricTransform>({ speed: 1.0, offset: 0.0 });
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<LyricTransform>(transform);
  transformRef.current = transform;

  // Load per-track transform from localStorage
  useEffect(() => {
    if (!trackId) {
      setTransform({ speed: 1.0, offset: 0.0 });
      return;
    }
    const initial = loadLyricTransform(trackId);
    setTransform(initial);

    // Listen to changes from other components (Settings, Tap to sync, or fullscreen slider)
    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackId: string; transform: LyricTransform }>;
      if (customEvent.detail && customEvent.detail.trackId === trackId) {
        setTransform(customEvent.detail.transform);
      }
    };

    window.addEventListener('chillify_lyric_transform_updated', handleUpdated);
    return () => window.removeEventListener('chillify_lyric_transform_updated', handleUpdated);
  }, [trackId]);

  // Logarithmic position: p in [-1, 1], speed = 2^p
  // pct in [0, 100] = (p + 1) * 50
  const speed = transform.speed;
  const p = Math.max(-1, Math.min(1, Math.log2(speed)));
  const pct = Math.max(0, Math.min(100, (p + 1) * 50));

  // Compute and apply new speed with continuity rule
  const applySpeed = useCallback(
    (newSpeed: number) => {
      if (!trackId) return;
      const t0 = getCurrentTime?.() ?? currentTime ?? 0;
      const roundedSpeed = Math.max(0.5, Math.min(2.0, Number(newSpeed.toFixed(2))));
      const newOffset = calculateContinuityOffset(t0, transformRef.current, roundedSpeed);

      const next: LyricTransform = {
        speed: roundedSpeed,
        offset: newOffset,
      };

      setTransform(next);
      saveLyricTransform(trackId, next);
    },
    [trackId, getCurrentTime, currentTime]
  );

  // Position from clientX with magnetic snap to center (1.0x)
  const handlePointerAtX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      let ratio = Math.max(0, Math.min(1, relativeX / rect.width));

      // Magnetic snap to center: if within 4% of center (ratio between 0.46 and 0.54), snap to 0.5 (1.0x)
      if (Math.abs(ratio - 0.5) < 0.04) {
        ratio = 0.5;
      }

      const pVal = ratio * 2 - 1; // [-1, 1]
      const computedSpeed = Math.pow(2, pVal);
      applySpeed(computedSpeed);
    },
    [applySpeed]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handlePointerAtX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      handlePointerAtX(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  // Double-click / double-tap resets speed to 1.0x
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    applySpeed(1.0);
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      applySpeed(Math.min(2.0, speed + 0.05));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      applySpeed(Math.max(0.5, speed - 0.05));
    } else if (e.key === 'Home' || e.key === 'Enter') {
      e.preventDefault();
      applySpeed(1.0);
    }
  };

  const activeColor = highlightColor || 'var(--highlight, #ef4444)';

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Lyrics speed"
      aria-valuemin={0.5}
      aria-valuemax={2.0}
      aria-valuenow={speed}
      aria-valuetext={`${speed.toFixed(2)}x`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      className={`group relative w-full h-5 flex items-center cursor-pointer select-none transition-opacity duration-200 focus-visible:outline-none ${
        isDragging ? 'opacity-85' : 'opacity-35 hover:opacity-85'
      } ${className}`}
      title=""
    >
      {/* Background Track (2.5px high) */}
      <div className="w-full h-[2.5px] bg-[#333333] rounded-full relative overflow-visible pointer-events-none">
        {/* Subtle center tick mark dot at 1.0x (50%) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-zinc-400 opacity-60 z-10" />

        {/* Highlighted Fill Track */}
        <div
          className="h-full rounded-full transition-all duration-75"
          style={{
            width: `${pct}%`,
            backgroundColor: activeColor,
          }}
        />

        {/* Slim Thumb (8-10px), visible on hover/drag */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md transition-transform duration-150 ${
            isDragging
              ? 'scale-125 opacity-100 ring-2 ring-white/50'
              : 'opacity-0 group-hover:opacity-100 scale-100 group-hover:scale-110'
          }`}
          style={{
            left: `${pct}%`,
          }}
        />
      </div>
    </div>
  );
}
