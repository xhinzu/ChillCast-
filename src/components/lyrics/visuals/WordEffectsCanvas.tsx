'use client';

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EffectManager } from '@/lib/lyrics/visuals/effects/EffectManager';
import { EffectTriggerParams, EffectFrequency, EffectStrength } from '@/lib/lyrics/visuals/effects/types';
import { getEffectIdForWord } from '@/lib/lyrics/visuals/effects/catalog';
import { VisualCueTimeline } from '@/lib/lyrics/visuals/types';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';

export interface WordEffectsCanvasHandle {
  triggerEffect: (effectId: string, params: EffectTriggerParams) => boolean;
  clearAll: () => void;
  getManager: () => EffectManager;
}

interface WordEffectsCanvasProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  visualTimeline?: VisualCueTimeline | null;
  stageContainerRef: React.RefObject<HTMLDivElement | null>;
  wordEffectsEnabled?: boolean;
  effectFrequency?: EffectFrequency;
  effectStrength?: EffectStrength;
  screenShakeEnabled?: boolean;
  intenseEffectsEnabled?: boolean;
  naturalColors?: boolean;
  chromaEnabled?: boolean;
  chromaColor?: string;
}

export const WordEffectsCanvas = forwardRef<WordEffectsCanvasHandle, WordEffectsCanvasProps>(
  function WordEffectsCanvas(
    {
      lines,
      activeLineIndex,
      activeWordIndex,
      visualTimeline,
      stageContainerRef,
      wordEffectsEnabled = true,
      effectFrequency = 'normal',
      effectStrength = 'normal',
      screenShakeEnabled = true,
      intenseEffectsEnabled = false,
      naturalColors = true,
      chromaEnabled = false,
      chromaColor,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const managerRef = useRef<EffectManager | null>(null);
    const lastWordKeyRef = useRef<string>('');

    // Handle screen shake
    const handleShake = useCallback(
      (shakeOffset: { x: number; y: number } | null) => {
        if (!stageContainerRef.current) return;
        if (shakeOffset && screenShakeEnabled) {
          stageContainerRef.current.style.transform = `translate3d(${shakeOffset.x.toFixed(1)}px, ${shakeOffset.y.toFixed(1)}px, 0)`;
        } else {
          stageContainerRef.current.style.transform = '';
        }
      },
      [stageContainerRef, screenShakeEnabled]
    );

    // Initialize EffectManager
    useEffect(() => {
      const mgr = new EffectManager({
        wordEffectsEnabled,
        effectFrequency,
        effectStrength,
        screenShakeEnabled,
        intenseEffectsEnabled,
        naturalColors,
        onShake: handleShake,
      });
      managerRef.current = mgr;

      if (canvasRef.current) {
        mgr.setCanvas(canvasRef.current);
      }

      return () => {
        mgr.destroy();
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync options when props change
    useEffect(() => {
      if (managerRef.current) {
        managerRef.current.updateOptions({
          wordEffectsEnabled,
          effectFrequency,
          effectStrength,
          screenShakeEnabled,
          intenseEffectsEnabled,
          naturalColors,
          onShake: handleShake,
        });
      }
    }, [
      wordEffectsEnabled,
      effectFrequency,
      effectStrength,
      screenShakeEnabled,
      intenseEffectsEnabled,
      naturalColors,
      handleShake,
    ]);

    // Handle Canvas Resizing with devicePixelRatio support
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
          ctx.scale(dpr, dpr);
        }
      };

      resizeCanvas();

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
        ro = new ResizeObserver(() => {
          resizeCanvas();
        });
        ro.observe(canvas.parentElement);
      }

      window.addEventListener('resize', resizeCanvas);
      return () => {
        if (ro) ro.disconnect();
        window.removeEventListener('resize', resizeCanvas);
      };
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      triggerEffect: (effectId: string, params: EffectTriggerParams) => {
        return managerRef.current?.triggerEffect(effectId, params) ?? false;
      },
      clearAll: () => {
        managerRef.current?.clearAll();
      },
      getManager: () => managerRef.current!,
    }));

    // Trigger effect when word becomes active
    useEffect(() => {
      if (!wordEffectsEnabled || activeLineIndex < 0 || activeWordIndex < 0) {
        return;
      }

      const line = lines[activeLineIndex];
      if (!line || !line.words || activeWordIndex >= line.words.length) {
        return;
      }

      const word = line.words[activeWordIndex];
      const wordKey = `${activeLineIndex}:${activeWordIndex}:${word.text}`;
      if (wordKey === lastWordKeyRef.current) {
        return;
      }
      lastWordKeyRef.current = wordKey;

      // 1. Determine effectId from visual timeline (Step A) or word match
      const cue = visualTimeline?.getCue(activeLineIndex, activeWordIndex);
      const effectId = cue?.effectId || getEffectIdForWord(word.text);
      if (!effectId) {
        return;
      }

      // 2. Measure screen coordinates of the active word
      const stageEl = stageContainerRef.current;
      const canvasEl = canvasRef.current;
      if (!stageEl || !canvasEl) return;

      const stageRect = canvasEl.getBoundingClientRect();
      let targetEl: HTMLElement | SVGElement | null = null;

      // Find active word element via selector
      const activeSelectors = [
        '.active-glyph-glow',
        '.active-glyph-glow-sm',
        '[data-active-word="true"]',
        '[data-active-word-cue="true"]',
      ];
      for (const sel of activeSelectors) {
        const found = stageEl.querySelector(sel);
        if (found) {
          targetEl = found as HTMLElement;
          break;
        }
      }

      let wordRect = {
        x: stageRect.width / 2 - 40,
        y: stageRect.height / 2 - 15,
        width: 80,
        height: 30,
      };

      if (targetEl) {
        const elRect = targetEl.getBoundingClientRect();
        if (elRect.width > 0 && elRect.height > 0) {
          wordRect = {
            x: elRect.left - stageRect.left,
            y: elRect.top - stageRect.top,
            width: elRect.width,
            height: elRect.height,
          };
        }
      }

      // 3. Compute palette
      const computed = typeof window !== 'undefined' ? window.getComputedStyle(stageEl) : null;
      const highlight = computed?.getPropertyValue('--highlight').trim() || '#ef4444';
      const secondary = computed?.getPropertyValue('--secondary').trim() || '#888888';

      const palette = {
        primary: chromaColor || highlight,
        secondary,
        glow: chromaColor || highlight,
        isChroma: chromaEnabled,
      };

      // 4. Trigger via manager
      managerRef.current?.triggerEffect(effectId, {
        wordRect,
        targetElement: targetEl,
        palette,
        naturalColors,
        intensity: cue?.intensity === 'intense' ? 'intense' : 'normal',
        strength: effectStrength,
        seed: activeLineIndex * 100 + activeWordIndex,
        wordText: word.text,
        lineIndex: activeLineIndex,
      });
    }, [
      activeLineIndex,
      activeWordIndex,
      lines,
      visualTimeline,
      wordEffectsEnabled,
      effectStrength,
      naturalColors,
      chromaEnabled,
      chromaColor,
      stageContainerRef,
    ]);

    return (
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 w-full h-full pointer-events-none z-20 select-none"
      />
    );
  }
);
