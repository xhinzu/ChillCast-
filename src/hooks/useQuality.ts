'use client';

import { useState, useEffect, useRef } from 'react';
import { QualitySetting } from '@/lib/lyrics/settings';

export interface QualityState {
  quality: QualitySetting;
  effectiveQuality: 'high' | 'low';
  isTabHidden: boolean;
  isReducedMotion: boolean;
  fps: number;
}

export function useQuality(qualitySetting: QualitySetting = 'auto'): QualityState {
  const [effectiveQuality, setEffectiveQuality] = useState<'high' | 'low'>(
    qualitySetting === 'low' ? 'low' : 'high'
  );
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [fps, setFps] = useState(60);

  const fpsRef = useRef(60);
  const lowFpsStartRef = useRef<number | null>(null);

  // 1. Reduced motion detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 2. Tab visibility detection
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 3. Live FPS measurement and auto quality adjustment
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      frameCount++;
      const elapsed = now - lastTime;

      if (elapsed >= 500) {
        const currentFps = Math.round((frameCount * 1000) / elapsed);
        fpsRef.current = currentFps;
        setFps(currentFps);
        frameCount = 0;
        lastTime = now;

        if (qualitySetting === 'auto') {
          if (currentFps < 45) {
            if (lowFpsStartRef.current === null) {
              lowFpsStartRef.current = now;
            } else if (now - lowFpsStartRef.current >= 2000) {
              setEffectiveQuality('low');
            }
          } else if (currentFps >= 52) {
            lowFpsStartRef.current = null;
            setEffectiveQuality('high');
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [qualitySetting]);

  // If explicit quality is set
  useEffect(() => {
    if (qualitySetting === 'low') {
      setEffectiveQuality('low');
    } else if (qualitySetting === 'high') {
      setEffectiveQuality('high');
    }
  }, [qualitySetting]);

  return {
    quality: qualitySetting,
    effectiveQuality,
    isTabHidden,
    isReducedMotion,
    fps,
  };
}
