'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import {
  DEFAULT_PLAYER_SETTINGS,
  LyricsFont,
  PlayerStyleSettings,
} from '@/lib/lyrics/settings';
import { usePlayback } from '@/context/PlaybackContext';

export const PLAYER_BACKGROUNDS = [
  { id: 'bg-1', src: '/lyrics/player/bg-1.jpg', label: 'Flower Garden' },
  { id: 'bg-2', src: '/lyrics/player/bg-2.jpg', label: 'Snow Leopard' },
  { id: 'bg-3', src: '/lyrics/player/bg-3.jpg', label: 'Twilight Blooms' },
  { id: 'bg-4', src: '/lyrics/player/bg-4.jpg', label: 'Frutiger Ocean' },
  { id: 'bg-5', src: '/lyrics/player/bg-5.jpg', label: 'Moonlit Lotus' },
  { id: 'bg-6', src: '/lyrics/player/bg-6.jpg', label: 'Night Skyline' },
  { id: 'bg-7', src: '/lyrics/player/bg-7.jpg', label: 'Starry Campfire' },
];

interface PlayerStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  effectiveTimeRef: React.MutableRefObject<number>;
  playerSettings?: PlayerStyleSettings;
  font?: LyricsFont;
  textSize?: number;
  trackTitle?: string;
  trackArtist?: string;
  artworkUrl?: string;
  isInstrumental?: boolean;
}

function formatPadTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function PlayerStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  effectiveTimeRef,
  playerSettings = DEFAULT_PLAYER_SETTINGS,
  textSize = 100,
  trackTitle = 'MyuJiku',
  trackArtist = 'Unknown Artist',
  artworkUrl,
  isInstrumental = false,
}: PlayerStageProps) {
  const { isPlaying, togglePlay, nextTrack, previousTrack, seek, currentTime, duration } =
    usePlayback();

  const [revealedWordCount, setRevealedWordCount] = useState<number>(999);

  const currentLine = activeLineIndex >= 0 ? lines[activeLineIndex] : undefined;
  const nextLine = activeLineIndex >= 0 ? lines[activeLineIndex + 1] : undefined;

  useEffect(() => {
    if (!currentLine) {
      setRevealedWordCount(999);
      return;
    }
    const words = currentLine.text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      setRevealedWordCount(words.length);
      return;
    }

    let raf = 0;
    const update = () => {
      if (currentLine.words && currentLine.words.length > 0) {
        const t = effectiveTimeRef.current;
        let count = 0;
        for (const w of currentLine.words) {
          if (t >= w.start) count++;
        }
        setRevealedWordCount(Math.max(1, count));
      } else if (activeWordIndex >= 0) {
        setRevealedWordCount(Math.max(1, activeWordIndex + 1));
      } else {
        const lineStart = currentLine.start;
        const lineEnd = nextLine ? nextLine.start : currentLine.end || lineStart + 3.2;
        const span = Math.max(0.6, Math.min(4.5, lineEnd - lineStart));
        const progress = Math.max(0, Math.min(1, (effectiveTimeRef.current - lineStart) / (span * 0.88)));
        setRevealedWordCount(Math.max(1, Math.ceil(progress * words.length)));
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [currentLine, nextLine, activeWordIndex, effectiveTimeRef]);

  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${((i * 37 + 11) % 96) + 2}%`,
        top: `${((i * 53 + 7) % 92) + 4}%`,
        size: 2 + (i % 3) * 1.4,
        delay: `${(i % 7) * 0.7}s`,
        dur: `${5 + (i % 5) * 1.6}s`,
        opacity: 0.25 + (i % 4) * 0.14,
      })),
    []
  );

  const bgIdx = Math.max(0, Math.min(PLAYER_BACKGROUNDS.length - 1, playerSettings.bgIndex ?? 0));
  const bgSrc =
    playerSettings.useArtworkBg && artworkUrl
      ? artworkUrl
      : PLAYER_BACKGROUNDS[bgIdx].src;

  const dimAlpha = Math.max(0, Math.min(0.85, (playerSettings.bgDimPct ?? 28) / 100));
  const blurPx = Math.max(0, Math.min(16, playerSettings.bgBlurPx ?? 0));
  const glowRatio = Math.max(0, Math.min(1, (playerSettings.glowIntensity ?? 75) / 100));
  const visibleCount = Math.max(3, Math.min(6, playerSettings.visibleLines ?? 5));

  // Sliding window of lines centered on activeLineIndex
  const windowLines = useMemo(() => {
    if (!lines || lines.length === 0) return [];
    const anchor = activeLineIndex >= 0 ? activeLineIndex : 0;
    const before = Math.floor((visibleCount - 1) / 2);
    const start = Math.max(0, Math.min(Math.max(0, lines.length - visibleCount), anchor - before));
    const end = Math.min(lines.length, start + visibleCount);
    return lines.slice(start, end).map((line, idx) => ({
      line,
      index: start + idx,
    }));
  }, [lines, activeLineIndex, visibleCount]);

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const glowShadow =
    glowRatio > 0
      ? `0 0 ${Math.round(14 * glowRatio)}px rgba(255,255,255,${(0.75 * glowRatio).toFixed(2)}), 0 2px 10px rgba(0,0,0,0.45)`
      : '0 2px 10px rgba(0,0,0,0.45)';

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col items-center justify-center overflow-hidden select-none rounded-xl border border-white/10">
      {/* Scenic Background Image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
          playerSettings.cameraMotion ? 'animate-player-kenburns' : ''
        }`}
        style={{
          backgroundImage: `url(${bgSrc})`,
          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
          transform: blurPx > 0 ? 'scale(1.06)' : undefined,
        }}
      />

      {/* Soft Vignette & Dim Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 45%, rgba(0,0,0,${(dimAlpha * 0.65).toFixed(
            2
          )}) 0%, rgba(0,0,0,${Math.min(0.92, dimAlpha + 0.22).toFixed(2)}) 100%)`,
        }}
      />

      {/* Floating Dust / Snow Particles */}
      {playerSettings.showParticles && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute rounded-full bg-white animate-player-float"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                boxShadow: '0 0 8px rgba(255,255,255,0.85)',
                animationDelay: p.delay,
                animationDuration: p.dur,
              }}
            />
          ))}
        </div>
      )}

      {/* Centered Lyrics + Minimalist Glowing Player */}
      <div className="relative z-10 w-full max-w-2xl px-6 sm:px-10 flex flex-col gap-7">
        {/* Optional Track Title & Artist */}
        {playerSettings.showTrackInfo && (
          <div className="flex items-center gap-2.5 text-white/80">
            <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide truncate">
              {trackTitle}
            </span>
            <span className="text-white/40 text-xs">•</span>
            <span className="text-xs sm:text-sm text-white/65 truncate">
              {trackArtist || (isInstrumental ? 'Instrumental' : 'Unknown Artist')}
            </span>
          </div>
        )}

        {/* Left-Aligned Sliding Lyric Lines */}
        <div
          className="flex flex-col gap-2.5 sm:gap-3 min-h-[160px] justify-center"
          style={{ fontSize: `${Math.max(75, Math.min(135, textSize))}%` }}
        >
          {windowLines.length > 0 ? (
            windowLines.map(({ line, index }) => {
              const isActive = index === activeLineIndex;
              const isPast = activeLineIndex >= 0 && index < activeLineIndex;
              const words = line.text.trim().split(/\s+/).filter(Boolean);

              return (
                <div
                  key={`${index}-${line.start}`}
                  className={`transition-all duration-300 leading-snug tracking-tight ${
                    isActive
                      ? 'text-[1.35em] sm:text-[1.6em] font-bold'
                      : isPast
                      ? 'text-[1.1em] sm:text-[1.28em] font-medium text-white/60'
                      : 'text-[1.05em] sm:text-[1.22em] font-medium text-white/45'
                  }`}
                >
                  {isActive ? (
                    <span>
                      {words.map((w, wi) => {
                        const spoken = wi < revealedWordCount;
                        return (
                          <span
                            key={`${index}-${wi}`}
                            className={`inline-block mr-[0.26em] last:mr-0 transition-all duration-150 ${
                              spoken ? 'text-white font-bold' : 'text-white/45 font-medium'
                            }`}
                            style={spoken ? { textShadow: glowShadow } : undefined}
                          >
                            {w}
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <span>{line.text}</span>
                  )}
                </div>
              );
            })
          ) : (
            <p
              className="text-xl sm:text-2xl font-semibold text-white/80"
              style={{ textShadow: glowShadow }}
            >
              {isInstrumental ? '♪ Instrumental' : 'Waiting for lyrics...'}
            </p>
          )}
        </div>

        {/* Minimalist Glowing White Progress Bar & Controls */}
        <div className="w-full flex flex-col gap-3">
          {/* Progress Line + Glowing Scrubber Dot */}
          <div className="relative w-full h-4 flex items-center group">
            <div className="w-full h-[2.5px] rounded-full bg-white/30 relative overflow-visible">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-150"
                style={{
                  width: `${progressPct}%`,
                  boxShadow: glowRatio > 0 ? '0 0 12px rgba(255,255,255,0.9)' : undefined,
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white pointer-events-none transition-[left] duration-150"
                style={{
                  left: `${progressPct}%`,
                  boxShadow: '0 0 12px rgba(255,255,255,0.95)',
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              step={0.5}
              value={Math.min(currentTime, duration > 0 ? duration : 100)}
              onChange={(e) => seek(parseFloat(e.target.value))}
              aria-label="Player Timeline"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Timestamps + Centered << || >> Controls */}
          <div className="relative flex items-center justify-between text-white">
            <span
              className="text-xs sm:text-sm font-semibold tabular-nums"
              style={{ textShadow: glowShadow }}
            >
              {formatPadTime(currentTime)}
            </span>

            <div className="flex items-center gap-6 sm:gap-8">
              <button
                type="button"
                onClick={() => void previousTrack()}
                aria-label="Previous Track"
                className="text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                style={{ filter: glowRatio > 0 ? 'drop-shadow(0 0 8px rgba(255,255,255,0.85))' : undefined }}
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => void togglePlay()}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                style={{ filter: glowRatio > 0 ? 'drop-shadow(0 0 10px rgba(255,255,255,0.95))' : undefined }}
              >
                {isPlaying ? (
                  <svg className="w-8 h-8 sm:w-9 sm:h-9" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 sm:w-9 sm:h-9" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => void nextTrack()}
                aria-label="Next Track"
                className="text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                style={{ filter: glowRatio > 0 ? 'drop-shadow(0 0 8px rgba(255,255,255,0.85))' : undefined }}
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                </svg>
              </button>
            </div>

            <span
              className="text-xs sm:text-sm font-semibold tabular-nums"
              style={{ textShadow: glowShadow }}
            >
              {formatPadTime(duration)}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes player-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(6px, -18px, 0);
          }
        }
        @keyframes player-kenburns {
          0%,
          100% {
            transform: scale(1.03) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(1.09) translate3d(-1.2%, -1%, 0);
          }
        }
        .animate-player-float {
          animation: player-float 6s ease-in-out infinite;
        }
        .animate-player-kenburns {
          animation: player-kenburns 22s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

