'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { DiscStyleSettings, DEFAULT_DISC_SETTINGS, LyricsFont, LyricsQuality } from '@/lib/lyrics/settings';
import { getWordChromaInfo } from '@/lib/lyrics/chroma';
import { WordVisualCue } from '../visuals/WordVisualCue';
import { VisualCueTimeline, VisualStyle } from '@/lib/lyrics/visuals/types';
import { usePlayback } from '@/context/PlaybackContext';
import {
  chunkLineIntoPhrases,
  computePhraseLifecycle,
  computeCaseMotion,
  computeDiscSpinStep,
  type DiscPhrase,
} from '@/lib/lyrics/discEngine';

interface DiscStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  effectiveTimeRef?: React.MutableRefObject<number>;
  discSettings?: DiscStyleSettings;
  quality?: LyricsQuality;
  font?: LyricsFont;
  textSize?: number;
  chromaEnabled?: boolean;
  chromaVividness?: number;
  cameraMovementEnabled?: boolean;
  wordImagesEnabled?: boolean;
  visualStyle?: VisualStyle;
  visualTimeline?: VisualCueTimeline;
  trackId?: string;
  trackTitle?: string;
  trackArtist?: string;
  artworkUrl?: string;
  isInstrumental?: boolean;
  highlightColor?: string;
  lyricColor?: string;
}

// Fonts that have true italic cuts loaded in layout.tsx; others get a -8deg italic skew
const ITALIC_CAPABLE_FONTS = new Set<LyricsFont>(['inter', 'newsreader', 'playfair']);

function parseHexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [isNaN(r) ? 255 : r, isNaN(g) ? 255 : g, isNaN(b) ? 255 : b];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [isNaN(r) ? 255 : r, isNaN(g) ? 255 : g, isNaN(b) ? 255 : b];
  }
  return [255, 255, 255];
}

function mixRgbColor(
  from: [number, number, number],
  to: [number, number, number],
  t: number
): string {
  const k = Math.max(0, Math.min(1, t));
  const r = Math.round(from[0] + (to[0] - from[0]) * k);
  const g = Math.round(from[1] + (to[1] - from[1]) * k);
  const b = Math.round(from[2] + (to[2] - from[2]) * k);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function DiscStage({
  lines,
  activeLineIndex,
  effectiveTimeRef,
  discSettings = DEFAULT_DISC_SETTINGS,
  quality = 'auto',
  font = 'inter',
  chromaEnabled = false,
  chromaVividness = 80,
  cameraMovementEnabled = true,
  wordImagesEnabled = true,
  visualStyle = 'illustrated',
  visualTimeline,
  trackId,
  trackTitle,
  trackArtist,
  artworkUrl,
  isInstrumental = false,
  highlightColor = '#ef4444',
  lyricColor = '#ffffff',
}: DiscStageProps) {
  const { isPlaying, getCurrentTime, getAudioAnalyser } = usePlayback();

  const [isNarrow, setIsNarrow] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);

  // Track cover crossfade state (400ms transition)
  const resolvedCover = artworkUrl || '/myujiku-logo.png';
  const [activeCover, setActiveCover] = useState<string>(resolvedCover);
  const [prevCover, setPrevCover] = useState<string | null>(null);

  useEffect(() => {
    if (resolvedCover !== activeCover) {
      setPrevCover(activeCover);
      setActiveCover(resolvedCover);
      const timer = setTimeout(() => setPrevCover(null), 420);
      return () => clearTimeout(timer);
    }
  }, [resolvedCover, activeCover]);

  // Responsive breakpoint (< 700px stacks disc above lyrics) & reduced motion & tab visibility
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkWidth = () => setIsNarrow(window.innerWidth < 700);
    checkWidth();
    window.addEventListener('resize', checkWidth);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onMq);

    const onVis = () => setIsTabHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('resize', checkWidth);
      mq.removeEventListener('change', onMq);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Pre-chunk all lines into 1-4 word phrases
  const phrases: DiscPhrase[] = useMemo(() => {
    if (!lines || lines.length === 0) return [];
    const gapSec = Math.max(0, (discSettings.tuning?.gapMs ?? 100) / 1000);
    const out: DiscPhrase[] = [];
    for (let i = 0; i < lines.length; i++) {
      const nextLineStart = i < lines.length - 1 ? lines[i + 1].start : undefined;
      const linePhrases = chunkLineIntoPhrases(lines[i], i, {
        maxWordsPerPhrase: discSettings.wordsPerPhrase,
        gapThresholdSec: 0.25,
        gapSec,
        nextLineStartSec: nextLineStart,
      });
      out.push(...linePhrases);
    }
    return out;
  }, [lines, discSettings.wordsPerPhrase, discSettings.tuning?.gapMs]);

  const [activePhraseIdx, setActivePhraseIdx] = useState<number>(-1);
  const activePhraseIdxRef = useRef<number>(-1);

  // Direct DOM refs for 60fps animation without React re-renders
  const phraseWrapRef = useRef<HTMLDivElement | null>(null);
  const wordSpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const caseOuterRef = useRef<HTMLDivElement | null>(null);
  const discRotorRef = useRef<HTMLDivElement | null>(null);

  // Refs for latest settings inside rAF loop
  const latestRef = useRef({
    phrases,
    discSettings,
    quality,
    prefersReducedMotion,
    cameraMovementEnabled,
    isPlaying,
    chromaEnabled,
    lyricColor,
    highlightColor,
    font,
  });
  latestRef.current = {
    phrases,
    discSettings,
    quality,
    prefersReducedMotion,
    cameraMovementEnabled,
    isPlaying,
    chromaEnabled,
    lyricColor,
    highlightColor,
    font,
  };

  // Continuous animation state refs
  const discAngleRef = useRef<number>(0);
  const spinSpeedMultRef = useRef<number>(isPlaying ? 1 : 0);
  const motionTimeRef = useRef<number>(0);

  // Main 60fps rAF loop (pauses when tab is hidden)
  useEffect(() => {
    if (isTabHidden) return;

    let rafId = 0;
    let lastTs = performance.now();
    const freqBuf = new Uint8Array(64);
    const midGrayRgb: [number, number, number] = [138, 138, 138]; // #8a8a8a

    const tick = (now: number) => {
      const dtSec = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      const cfg = latestRef.current;
      const ds = cfg.discSettings;
      const tuning = ds.tuning;
      const reduced = cfg.prefersReducedMotion;
      const isLowQuality = cfg.quality === 'low';

      // Sample analyser bass energy if needed
      let beatEnergy = 0;
      if ((ds.beatPulse || ds.syncTiltToBeat) && cfg.isPlaying && !reduced) {
        const analyser = getAudioAnalyser?.();
        if (analyser) {
          analyser.getByteFrequencyData(freqBuf);
          let sum = 0;
          for (let i = 1; i <= 6; i++) sum += freqBuf[i];
          beatEnergy = sum / (6 * 255);
        }
      }

      // 1. Smoothly ramp spin speed multiplier (~600ms deceleration/acceleration)
      const targetMult = cfg.isPlaying && !reduced ? 1 : 0;
      const rampStep = dtSec / 0.6;
      if (spinSpeedMultRef.current < targetMult) {
        spinSpeedMultRef.current = Math.min(1, spinSpeedMultRef.current + rampStep);
      } else if (spinSpeedMultRef.current > targetMult) {
        spinSpeedMultRef.current = Math.max(0, spinSpeedMultRef.current - rampStep);
      }

      // Advance motion clock
      if (!reduced) {
        motionTimeRef.current += dtSec;
      }

      // 2. Update Disc clockwise spin
      if (discRotorRef.current && !reduced) {
        const stepDeg = computeDiscSpinStep(
          dtSec,
          motionTimeRef.current,
          spinSpeedMultRef.current,
          {
            spinPeriodSec: ds.spinPeriodSec,
            beatPulse: ds.beatPulse,
            spinModPct: tuning.spinModPct,
            spinModPeriodSec: tuning.spinModPeriodSec,
          },
          beatEnergy
        );
        discAngleRef.current = (discAngleRef.current + stepDeg) % 360;
        discRotorRef.current.style.transform = `rotate(${discAngleRef.current.toFixed(2)}deg)`;
      } else if (discRotorRef.current && reduced) {
        discRotorRef.current.style.transform = 'rotate(0deg)';
      }

      // 3. Update Case continuous float/tilt motion
      if (caseOuterRef.current) {
        if (reduced || !cfg.cameraMovementEnabled) {
          caseOuterRef.current.style.transform = 'translate3d(0%, 0%, 0) scale(1) rotateZ(0deg)';
        } else {
          const m = computeCaseMotion(
            motionTimeRef.current,
            {
              floatAmount: ds.floatAmount,
              tiltAmount: ds.tiltAmount,
              tiltPeriodSec: ds.tiltPeriodSec,
              syncTiltToBeat: ds.syncTiltToBeat,
              tiltDeg: tuning.tiltDeg,
              driftXPct: tuning.driftXPct,
              driftYPct: tuning.driftYPct,
              driftXPeriodSec: tuning.driftXPeriodSec,
              driftYPeriodSec: tuning.driftYPeriodSec,
              scalePulsePct: tuning.scalePulsePct,
              scalePulsePeriodSec: tuning.scalePulsePeriodSec,
            },
            beatEnergy
          );
          caseOuterRef.current.style.transform = `perspective(900px) translate3d(${m.translateXPercent.toFixed(
            3
          )}%, ${m.translateYPercent.toFixed(3)}%, 0) scale(${m.scale.toFixed(
            4
          )}) rotateX(${m.rotateXDeg.toFixed(2)}deg) rotateY(${m.rotateYDeg.toFixed(
            2
          )}deg) rotateZ(${m.rotateZDeg.toFixed(2)}deg)`;
        }
      }

      // 4. Update active phrase & lifecycle
      const t = effectiveTimeRef ? effectiveTimeRef.current : getCurrentTime();
      const phList = cfg.phrases;
      let foundIdx = -1;
      for (let i = 0; i < phList.length; i++) {
        if (t >= phList[i].start && t < phList[i].end) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx !== activePhraseIdxRef.current) {
        activePhraseIdxRef.current = foundIdx;
        setActivePhraseIdx(foundIdx);
      }

      const wrapEl = phraseWrapRef.current;
      if (wrapEl) {
        if (foundIdx >= 0 && foundIdx < phList.length) {
          const ph = phList[foundIdx];
          const dur = Math.max(0.05, ph.end - ph.start);
          const elapsed = t - ph.start;
          const lc = computePhraseLifecycle(elapsed, dur, {
            buildupStrength: ds.buildupStrength,
            blurMaxPx: isLowQuality ? 0 : tuning.blurMaxPx,
            longPhraseThresholdSec: tuning.longPhraseThresholdSec,
            longPhraseHoldAtSec: tuning.longPhraseHoldAtSec,
            reducedMotion: reduced,
          });

          if (!lc.visible) {
            wrapEl.style.opacity = '0';
          } else {
            const needsSkew = !ITALIC_CAPABLE_FONTS.has(cfg.font);
            wrapEl.style.opacity = lc.opacity.toFixed(3);
            wrapEl.style.filter = !isLowQuality && lc.blurPx > 0.05 ? `blur(${lc.blurPx.toFixed(2)}px)` : 'none';
            wrapEl.style.transform = `scale(${lc.scale.toFixed(4)})${needsSkew ? ' skewX(-8deg)' : ''}`;
            wrapEl.style.fontWeight = String(lc.fontWeight);

            if (!cfg.chromaEnabled) {
              const targetRgb = parseHexToRgb(cfg.lyricColor || '#ffffff');
              wrapEl.style.color = mixRgbColor(midGrayRgb, targetRgb, lc.colorMix);
            } else {
              wrapEl.style.color = '';
            }

            // Word-by-word reveal mode
            if (ds.revealMode === 'word') {
              for (let wi = 0; wi < ph.words.length; wi++) {
                const span = wordSpanRefs.current[wi];
                if (span) {
                  const isSung = t >= ph.words[wi].start;
                  span.style.opacity = isSung ? '1' : '0';
                }
              }
            } else {
              for (let wi = 0; wi < ph.words.length; wi++) {
                const span = wordSpanRefs.current[wi];
                if (span) span.style.opacity = '1';
              }
            }
          }
        } else {
          // Blank gap / instrumental / no active phrase
          wrapEl.style.opacity = '0';
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isTabHidden, effectiveTimeRef, getCurrentTime, getAudioAnalyser]);

  const activePhrase =
    activePhraseIdx >= 0 && activePhraseIdx < phrases.length ? phrases[activePhraseIdx] : null;

  // Determine word-image cue for the current phrase (if any)
  const phraseCue = useMemo(() => {
    if (!activePhrase || !wordImagesEnabled || visualStyle === 'off' || !visualTimeline) return null;
    for (const w of activePhrase.words) {
      const cue = visualTimeline.getCue(activePhrase.lineIndex, w.wordIndexInLine);
      if (cue) return cue;
    }
    return null;
  }, [activePhrase, wordImagesEnabled, visualStyle, visualTimeline]);

  const activeLineText =
    activeLineIndex >= 0 && activeLineIndex < lines.length ? lines[activeLineIndex].text : '';

  const showIdleMetadata =
    !activePhrase && (!lines || lines.length === 0 || isInstrumental || activeLineIndex < 0);

  // Layout coordinates based on spec & layout setting
  const layout = isNarrow ? 'center' : discSettings.layout;

  const textPositionClass =
    layout === 'center'
      ? 'w-full max-w-[90%] text-center flex flex-col items-center justify-center order-2 mt-3'
      : layout === 'left'
      ? 'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-[67%] w-[38%] text-center flex flex-col items-center justify-center'
      : 'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-[33%] w-[38%] text-center flex flex-col items-center justify-center';

  const discPositionClass =
    layout === 'center'
      ? 'relative flex items-center justify-center order-1 w-[min(56vw,220px)] h-[min(56vw,220px)] shrink-0'
      : layout === 'left'
      ? 'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-[26%] w-[min(34%,60vh)] aspect-square flex items-center justify-center'
      : 'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-[74%] w-[min(34%,60vh)] aspect-square flex items-center justify-center';

  const isLowQuality = quality === 'low';
  const isSilver = discSettings.discFinish === 'silver';
  const showJewelCase = discSettings.showCase && discSettings.caseStyle === 'jewel';
  const isVinyl = discSettings.caseStyle === 'vinyl';

  return (
    <div
      className={`w-full h-full relative ${
        layout === 'center' ? 'flex flex-col items-center justify-center p-4 gap-3' : 'overflow-visible'
      }`}
    >
      {/* Visually hidden live region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {activeLineText}
      </div>

      {/* RIGHT / LEFT / TOP: CD Case + Spinning Disc */}
      <div className={discPositionClass}>
        <div
          ref={caseOuterRef}
          className="relative w-full h-full will-change-transform flex items-center justify-center"
        >
          {/* Soft glow/shadow on the stage behind the case */}
          <div
            className="absolute inset-[6%] rounded-2xl pointer-events-none"
            style={{
              background: isSilver
                ? `radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 72%)`
                : `radial-gradient(circle, ${highlightColor}26 0%, transparent 72%)`,
              filter: isLowQuality ? 'none' : 'blur(18px)',
            }}
          />

          {/* Jewel Case Container (when Case style = Jewel case and Show case is ON) */}
          {showJewelCase && (
            <div className="relative w-full h-full rounded-[14px] p-[6%] flex items-center justify-center">
              {/* SVG Jewel Case Shell with Left-Edge Notch, Double-Edge Refraction, & Corner Highlights */}
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
                aria-hidden="true"
              >
                <defs>
                  {/* Left-edge semi-circular thumb notch cutout */}
                  <mask id="cd-case-notch-mask">
                    <rect x="0" y="0" width="200" height="200" rx="12" fill="white" />
                    <path d="M 0 76 A 16 24 0 0 1 0 124 Z" fill="black" />
                  </mask>
                  <linearGradient id="cd-case-refract" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
                    <stop offset="35%" stopColor="rgba(255,255,255,0.06)" />
                    <stop offset="65%" stopColor="rgba(255,255,255,0.04)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.22)" />
                  </linearGradient>
                </defs>

                {/* Translucent inner surface reflection */}
                <rect
                  x="2"
                  y="2"
                  width="196"
                  height="196"
                  rx="11"
                  fill="url(#cd-case-refract)"
                  fillOpacity="0.22"
                  mask="url(#cd-case-notch-mask)"
                />

                {/* Double-edge inner refraction border */}
                <rect
                  x="6"
                  y="6"
                  width="188"
                  height="188"
                  rx="8"
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1"
                  mask="url(#cd-case-notch-mask)"
                />

                {/* Bright ~2px outer white edge with notch */}
                <path
                  d="M 14 2 L 186 2 Q 198 2 198 14 L 198 186 Q 198 198 186 198 L 14 198 Q 2 198 2 186 L 2 124 A 14 24 0 0 0 2 76 L 2 14 Q 2 2 14 2 Z"
                  fill="none"
                  stroke="rgba(255,255,255,0.88)"
                  strokeWidth="2"
                />

                {/* Subtle left spine hinge bar */}
                <line
                  x1="15"
                  y1="8"
                  x2="15"
                  y2="192"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1"
                />

                {/* Corner highlights */}
                <path d="M 6 20 L 6 12 Q 6 6 12 6 L 22 6" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" />
                <path d="M 178 6 L 188 6 Q 194 6 194 12 L 194 22" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 194 178 L 194 188 Q 194 194 188 194 L 178 194" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>

              {/* Slow sweeping glossy plastic sheen */}
              {!isLowQuality && !prefersReducedMotion && (
                <div
                  className="absolute inset-[2px] rounded-[11px] overflow-hidden pointer-events-none z-30"
                  aria-hidden="true"
                >
                  <div
                    className="w-[180%] h-[180%] -translate-x-1/2 -translate-y-1/2 animate-disc-sheen"
                    style={{
                      background:
                        'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.14) 48%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.10) 52%, transparent 65%)',
                      animationPlayState: isTabHidden ? 'paused' : 'running',
                    }}
                  />
                </div>
              )}

              {/* Spinning Disc inside the Jewel Case */}
              {renderDiscBody()}
            </div>
          )}

          {/* Round Disc Only or Vinyl Record (no jewel case) */}
          {!showJewelCase && (
            <div className="relative w-[92%] h-[92%] flex items-center justify-center">
              {renderDiscBody()}
            </div>
          )}
        </div>
      </div>

      {/* LEFT / RIGHT / BOTTOM: Lyric Phrases */}
      <div className={textPositionClass} style={{ overflow: 'visible' }}>
        {activePhrase ? (
          <div
            ref={phraseWrapRef}
            className="flex items-center justify-center gap-2.5 will-change-transform"
            style={{
              fontStyle: ITALIC_CAPABLE_FONTS.has(font) ? 'italic' : 'normal',
              fontVariationSettings: '"wght" 700',
              overflow: 'visible',
              textShadow: chromaEnabled
                ? '0 0 12px rgba(255,255,255,0.45), 0 0 28px rgba(255,255,255,0.2)'
                : `0 0 10px rgba(255,255,255,0.55), 0 0 24px ${highlightColor}55, 0 2px 10px rgba(0,0,0,0.9)`,
            }}
          >
            <span className="text-[1.9em] sm:text-[2.4em] md:text-[2.7em] leading-[1.15] tracking-tight break-words">
              {activePhrase.words.map((w, wi) => {
                const chromaInfo = chromaEnabled
                  ? getWordChromaInfo(
                      trackId,
                      activePhrase.lineIndex,
                      w.wordIndexInLine,
                      chromaVividness
                    )
                  : null;
                return (
                  <span
                    key={`${activePhrase.id}-${wi}`}
                    ref={(el) => {
                      wordSpanRefs.current[wi] = el;
                    }}
                    style={
                      chromaInfo
                        ? {
                            color: chromaInfo.hex,
                            textShadow: chromaInfo.glowShadow,
                          }
                        : undefined
                    }
                    className="inline-block mr-[0.26em] last:mr-0"
                  >
                    {w.text}
                  </span>
                );
              })}
            </span>

            {phraseCue && (
              <span className="inline-flex shrink-0">
                <WordVisualCue cue={phraseCue} visualStyle={visualStyle} />
              </span>
            )}
          </div>
        ) : showIdleMetadata ? (
          <div className="space-y-1.5 opacity-70 animate-fade-in">
            <p className="text-xl sm:text-2xl font-bold italic text-white tracking-tight">
              {trackTitle || 'MyuJiku'}
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">
              {trackArtist || (isInstrumental ? 'Instrumental' : 'Spinning CD')}
            </p>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes disc-sheen-sweep {
          0% {
            transform: translate(-55%, -55%);
          }
          50% {
            transform: translate(15%, 15%);
          }
          100% {
            transform: translate(-55%, -55%);
          }
        }
        .animate-disc-sheen {
          animation: disc-sheen-sweep 8.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  function renderDiscBody() {
    return (
      <div
        ref={discRotorRef}
        className="relative w-full h-full rounded-full will-change-transform shadow-[0_0_24px_rgba(0,0,0,0.85)]"
      >
        {/* Crossfading Album Cover Label (CSS background-image, no canvas / no CORS) */}
        {prevCover && (
          <div
            className="absolute inset-[1.5%] rounded-full bg-cover bg-center"
            style={{
              backgroundImage: `url("${prevCover}")`,
              filter: isSilver
                ? 'grayscale(100%) contrast(1.22) brightness(0.95)'
                : isVinyl
                ? 'brightness(0.85) contrast(1.08)'
                : 'none',
            }}
          />
        )}
        <div
          className="absolute inset-[1.5%] rounded-full bg-cover bg-center transition-opacity duration-400"
          style={{
            backgroundImage: `url("${activeCover}")`,
            filter: isSilver
              ? 'grayscale(100%) contrast(1.22) brightness(0.95)'
              : isVinyl
              ? 'brightness(0.85) contrast(1.08)'
              : 'none',
          }}
        />

        {/* Vinyl outer grooves ring when caseStyle === 'vinyl' */}
        {isVinyl && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, transparent 38%, rgba(12,12,14,0.92) 40%, rgba(22,22,26,0.96) 56%, rgba(10,10,12,0.96) 72%, rgba(28,28,32,0.98) 88%, rgba(10,10,12,1) 100%)',
            }}
          />
        )}

        {/* Mirror-like conic metallic CD sheen */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen"
          style={{
            background: isSilver
              ? 'conic-gradient(from 25deg, rgba(255,255,255,0.28) 0deg, transparent 55deg, rgba(255,255,255,0.18) 125deg, transparent 190deg, rgba(255,255,255,0.3) 265deg, transparent 330deg, rgba(255,255,255,0.28) 360deg)'
              : 'conic-gradient(from 25deg, rgba(255,255,255,0.16) 0deg, transparent 60deg, rgba(255,255,255,0.10) 140deg, transparent 220deg, rgba(255,255,255,0.18) 290deg, transparent 360deg)',
          }}
        />

        {/* Original SVG Concentric Grooves, Palette Accent Marks & Spindle Hub */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          {/* Outer rim bevel */}
          <circle cx="100" cy="100" r="98" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />

          {/* Concentric grooves */}
          <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="0.6" />
          <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />

          {/* Small palette highlight accent marks on disc */}
          <path
            d="M 100 10 A 90 90 0 0 1 124 13.3"
            fill="none"
            stroke={highlightColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M 100 190 A 90 90 0 0 1 76 186.7"
            fill="none"
            stroke={highlightColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx="100" cy="36" r="1.8" fill={highlightColor} opacity="0.85" />
          <circle cx="100" cy="164" r="1.8" fill={highlightColor} opacity="0.85" />

          {/* Translucent inner clamping ring */}
          <circle
            cx="100"
            cy="100"
            r="26"
            fill="rgba(20,20,24,0.45)"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.2"
          />
          <circle
            cx="100"
            cy="100"
            r="21"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="0.8"
          />

          {/* Original decorative hub cutouts / locking knobs */}
          <circle cx="100" cy="79" r="2.1" fill="rgba(255,255,255,0.65)" />
          <circle cx="118.2" cy="110.5" r="2.1" fill="rgba(255,255,255,0.65)" />
          <circle cx="81.8" cy="110.5" r="2.1" fill="rgba(255,255,255,0.65)" />

          {/* Spindle hole ring */}
          <circle
            cx="100"
            cy="100"
            r="11"
            fill="rgba(0,0,0,0.88)"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="1.5"
          />
          <circle cx="100" cy="100" r="8.5" fill="#000000" />
        </svg>
      </div>
    );
  }
}

