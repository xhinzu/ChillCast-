'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ParsedLyricLine } from '@/lib/lrc-parser';
import {
  DEFAULT_WINDOWS98_SETTINGS,
  LyricsFont,
  Windows98StyleSettings,
} from '@/lib/lyrics/settings';
import { usePlayback } from '@/context/PlaybackContext';

export const WINDOWS98_STICKERS = [
  '/lyrics/windows98/sticker-1.png',
  '/lyrics/windows98/sticker-2.jpg',
  '/lyrics/windows98/sticker-3.jpg',
  '/lyrics/windows98/sticker-4.jpg',
  '/lyrics/windows98/sticker-5.jpg',
  '/lyrics/windows98/sticker-6.jpg',
  '/lyrics/windows98/sticker-7.jpg',
  '/lyrics/windows98/sticker-8.jpg',
  '/lyrics/windows98/sticker-9.jpg',
];

const TITLEBAR_THEMES: Record<
  Windows98StyleSettings['titlebarTheme'],
  { bg: string; text: string }
> = {
  xp_blue: {
    bg: 'linear-gradient(180deg, #0997ff 0%, #0053ee 14%, #0050ee 84%, #003dd9 100%)',
    text: '#ffffff',
  },
  classic_navy: {
    bg: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
    text: '#ffffff',
  },
  teal: {
    bg: 'linear-gradient(90deg, #005f6b 0%, #008c9e 100%)',
    text: '#ffffff',
  },
  silver: {
    bg: 'linear-gradient(180deg, #e5e7eb 0%, #b8bcc4 100%)',
    text: '#111827',
  },
};

interface Windows98StageProps {
  lines: ParsedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  effectiveTimeRef: React.MutableRefObject<number>;
  win98Settings?: Windows98StyleSettings;
  font?: LyricsFont;
  textSize?: number;
  trackId?: string;
  trackTitle?: string;
  trackArtist?: string;
  artworkUrl?: string;
  isInstrumental?: boolean;
}

export default function Windows98Stage({
  lines,
  activeLineIndex,
  activeWordIndex,
  effectiveTimeRef,
  win98Settings = DEFAULT_WINDOWS98_SETTINGS,
  textSize = 100,
  trackId,
  trackTitle = 'MyuJiku',
  trackArtist = 'Unknown Artist',
  artworkUrl,
  isInstrumental = false,
}: Windows98StageProps) {
  const { isPlaying, togglePlay, nextTrack, previousTrack, currentTime, duration, volume, setVolume } =
    usePlayback();

  const [revealedWordCount, setRevealedWordCount] = useState<number>(999);
  const currentLine = activeLineIndex >= 0 ? lines[activeLineIndex] : undefined;
  const nextLine = activeLineIndex >= 0 ? lines[activeLineIndex + 1] : undefined;

  // Word-by-word progressive reveal driven by effectiveTimeRef or activeWordIndex
  useEffect(() => {
    if (win98Settings.revealMode === 'line' || !currentLine) {
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
          if (t >= w.time) count++;
        }
        setRevealedWordCount(Math.max(1, count));
      } else if (activeWordIndex >= 0) {
        setRevealedWordCount(Math.max(1, activeWordIndex + 1));
      } else {
        const lineStart = currentLine.time;
        const lineEnd = nextLine ? nextLine.time : lineStart + 3.2;
        const span = Math.max(0.6, Math.min(4.5, lineEnd - lineStart));
        const progress = Math.max(0, Math.min(1, (effectiveTimeRef.current - lineStart) / (span * 0.85)));
        setRevealedWordCount(Math.max(1, Math.ceil(progress * words.length)));
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [win98Settings.revealMode, currentLine, nextLine, activeWordIndex, effectiveTimeRef]);

  // Deterministic sticker selection
  const songHash = (trackId || trackTitle || 'song')
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const stickerIndex =
    win98Settings.stickerMode === 'pinned'
      ? Math.max(0, Math.min(WINDOWS98_STICKERS.length - 1, win98Settings.pinnedStickerIndex))
      : win98Settings.stickerMode === 'per_song'
      ? songHash % WINDOWS98_STICKERS.length
      : (Math.max(0, activeLineIndex) + songHash) % WINDOWS98_STICKERS.length;

  const stickerSrc = WINDOWS98_STICKERS[stickerIndex];
  const tb = TITLEBAR_THEMES[win98Settings.titlebarTheme] || TITLEBAR_THEMES.xp_blue;

  const words = currentLine ? currentLine.text.trim().split(/\s+/).filter(Boolean) : [];
  const visibleText =
    win98Settings.revealMode === 'line'
      ? currentLine?.text || ''
      : words.slice(0, revealedWordCount).join(' ');

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="w-full h-full min-h-[420px] flex items-center justify-center p-2 sm:p-5 bg-black select-none">
      <div
        className="flex flex-col shadow-[0_24px_60px_rgba(0,0,0,0.85)] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] bg-[#d4d0c8] overflow-hidden"
        style={{
          width: `${Math.max(55, Math.min(100, win98Settings.windowWidthPct))}%`,
          maxWidth: '760px',
          fontFamily: 'Tahoma, Arial, sans-serif',
        }}
      >
        {/* Classic Title Bar */}
        <div
          className="h-7 px-2 flex items-center justify-between shrink-0"
          style={{ background: tb.bg, color: tb.text }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-4 h-4 rounded-sm bg-black/25 border border-white/40 flex items-center justify-center text-[9px] font-bold">
              W
            </span>
            <span className="text-xs font-bold tracking-tight truncate">
              Windows Media Player
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {['_', '[]', 'X'].map((sym) => (
              <span
                key={sym}
                className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-black bg-[#ece9d8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] rounded-[2px]"
              >
                {sym}
              </span>
            ))}
          </div>
        </div>

        {/* Classic Menu Bar */}
        <div className="h-6 px-2.5 bg-[#ece9d8] border-b border-[#aca899] flex items-center gap-4 text-[11px] text-[#111111]">
          <span>File</span>
          <span>View</span>
          <span>Play</span>
          <span>Tools</span>
          <span>Help</span>
        </div>

        {/* White Beveled Client Stage */}
        <div className="relative bg-white min-h-[290px] sm:min-h-[340px] m-1 p-4 sm:p-6 border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] flex flex-col justify-between overflow-hidden">
          {/* Top-Left Branding + Dark Now Playing Card */}
          <div className="flex flex-col items-start gap-2.5 z-10 max-w-[320px]">
            {win98Settings.showMyujikuLogo && (
              <div className="w-11 h-11 rounded-xl bg-black p-1.5 shadow-md flex items-center justify-center">
                <Image
                  src="/myujiku-logo.png"
                  alt="MyuJiku"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {win98Settings.showNowPlayingCard && (
              <div className="w-full bg-[#121212] text-white rounded-xl px-2.5 py-2 flex items-center gap-2.5 shadow-lg border border-black/30">
                <div className="w-10 h-10 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                  {artworkUrl ? (
                    <Image
                      src={artworkUrl}
                      alt={trackTitle}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{trackTitle}</p>
                  <p className="text-[10px] text-zinc-400 truncate">Song · {trackArtist}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-zinc-400 text-xs font-bold">:</span>
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[9px] font-bold">
                    ✓
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Center-Left Progressive Lyric Display */}
          <div className="my-auto py-4 pr-24 sm:pr-36 z-10">
            <p
              className="text-[#111111] font-normal leading-snug tracking-tight"
              style={{
                fontSize: `${Math.round(24 * (textSize / 100))}px`,
                fontFamily: 'Arial, Helvetica, sans-serif',
              }}
            >
              {isInstrumental
                ? 'Instrumental'
                : visibleText || (lines.length === 0 ? 'Waiting for lyrics...' : '')}
            </p>
          </div>

          {/* Bottom-Right Changing Sticker */}
          {win98Settings.showSticker && (
            <div
              className="absolute bottom-2 right-3 pointer-events-none select-none transition-opacity duration-150"
              style={{
                width: `${win98Settings.stickerSizePx}px`,
                height: `${win98Settings.stickerSizePx}px`,
              }}
            >
              <img
                src={stickerSrc}
                alt="Lyric sticker"
                className="w-full h-full object-contain mix-blend-multiply"
              />
            </div>
          )}
        </div>

        {/* Ready Status Bar */}
        <div className="h-5 px-2.5 bg-[#ece9d8] border-t border-[#aca899] flex items-center text-[11px] text-[#333333]">
          Ready
        </div>

        {/* Classic WMP Transport Bar */}
        {win98Settings.showTransportBar && (
          <div
            className="h-11 px-3 flex items-center justify-between gap-3 border-t border-[#808080]"
            style={{
              background: 'linear-gradient(180deg, #98b1dc 0%, #5c7fc2 45%, #37579a 100%)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={togglePlay}
                className="w-7 h-7 rounded-full bg-[#e8eef9] border border-[#243b6b] text-[#12264f] flex items-center justify-center text-[10px] font-bold shadow cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '||' : '▶'}
              </button>
              <button
                type="button"
                onClick={previousTrack}
                className="w-6 h-6 rounded-full bg-[#dce5f5] border border-[#243b6b] text-[#12264f] flex items-center justify-center text-[9px] font-bold cursor-pointer"
                title="Previous"
              >
                ◀◀
              </button>
              <button
                type="button"
                onClick={nextTrack}
                className="w-6 h-6 rounded-full bg-[#dce5f5] border border-[#243b6b] text-[#12264f] flex items-center justify-center text-[9px] font-bold cursor-pointer"
                title="Next"
              >
                ▶▶
              </button>
            </div>

            <div className="flex-1 h-2 bg-[#1e2d52] rounded-full overflow-hidden border border-white/30">
              <div
                className="h-full bg-[#4ade80]"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Media Player Volume"
              className="w-16 accent-[#e8eef9] cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}

