'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
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
  { bg: string; text: string; taskbar: string; startBg: string }
> = {
  xp_blue: {
    bg: 'linear-gradient(180deg, #0997ff 0%, #0053ee 14%, #0050ee 84%, #003dd9 100%)',
    text: '#ffffff',
    taskbar: 'linear-gradient(180deg, #3168d5 0%, #245edb 18%, #1f53c7 85%, #1941a5 100%)',
    startBg: 'linear-gradient(180deg, #5ec450 0%, #3d9e32 30%, #2d8723 85%, #236e1a 100%)',
  },
  classic_navy: {
    bg: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
    text: '#ffffff',
    taskbar: '#c0c0c0',
    startBg: '#c0c0c0',
  },
  teal: {
    bg: 'linear-gradient(90deg, #005f6b 0%, #008c9e 100%)',
    text: '#ffffff',
    taskbar: '#c0c0c0',
    startBg: '#c0c0c0',
  },
  silver: {
    bg: 'linear-gradient(180deg, #e5e7eb 0%, #b8bcc4 100%)',
    text: '#111827',
    taskbar: 'linear-gradient(180deg, #e5e7eb 0%, #c4c8d0 100%)',
    startBg: 'linear-gradient(180deg, #65c857 0%, #37972b 100%)',
  },
};

function BlissWallpaper({ variant }: { variant: Windows98StyleSettings['desktopWallpaper'] }) {
  if (variant === 'teal_98') {
    return <div className="absolute inset-0 bg-[#008080]" />;
  }
  const isNight = variant === 'midnight';
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Sky */}
      <div
        className="absolute inset-0"
        style={{
          background: isNight
            ? 'linear-gradient(180deg, #081229 0%, #152b57 52%, #233f73 100%)'
            : 'linear-gradient(180deg, #1b65d6 0%, #3b8ef3 38%, #8bc6fc 72%, #cbe6ff 100%)',
        }}
      />
      {/* Procedural Bliss Clouds + Rolling Green Hills */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="blissHillBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isNight ? '#1b4728' : '#74c431'} />
            <stop offset="100%" stopColor={isNight ? '#0e2816' : '#3a7f14'} />
          </linearGradient>
          <linearGradient id="blissHillFront" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isNight ? '#215830' : '#80cf38'} />
            <stop offset="55%" stopColor={isNight ? '#14381e' : '#53a51e'} />
            <stop offset="100%" stopColor={isNight ? '#0a1f10' : '#2d680e'} />
          </linearGradient>
          <filter id="cloudBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        {/* Soft Clouds */}
        <g fill={isNight ? 'rgba(180,205,255,0.14)' : 'rgba(255,255,255,0.82)'} filter="url(#cloudBlur)">
          <ellipse cx="280" cy="210" rx="190" ry="44" />
          <ellipse cx="360" cy="190" rx="115" ry="38" />
          <ellipse cx="880" cy="145" rx="260" ry="50" />
          <ellipse cx="980" cy="120" rx="140" ry="44" />
          <ellipse cx="1340" cy="240" rx="220" ry="46" />
          <ellipse cx="1260" cy="215" rx="110" ry="34" />
        </g>

        {/* Distant Hill */}
        <path
          d="M 0 600 Q 450 510 920 565 T 1600 545 L 1600 900 L 0 900 Z"
          fill="url(#blissHillBack)"
        />
        {/* Foreground Bliss Hill */}
        <path
          d="M 0 560 Q 340 455 760 555 T 1600 620 L 1600 900 L 0 900 Z"
          fill="url(#blissHillFront)"
        />
      </svg>
    </div>
  );
}

interface Windows98StageProps {
  lines: SyncedLyricLine[];
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
  const [windowState, setWindowState] = useState<'normal' | 'maximized' | 'minimized'>('normal');
  const [startOpen, setStartOpen] = useState(false);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [notepadText, setNotepadText] = useState('Now listening on MyuJiku.exe\nClassic Windows Bliss desktop.');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [winOffset, setWinOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [clockStr, setClockStr] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  );
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const desktopCameraRef = useRef<HTMLDivElement | null>(null);
  const windowMotionRef = useRef<HTMLDivElement | null>(null);
  const impulseRef = useRef<number>(0);

  const motionEnabled = win98Settings.motionEnabled ?? true;
  const motionStyle = win98Settings.motionStyle || 'handheld';
  const motionIntensity = Math.max(10, Math.min(100, win98Settings.motionIntensity ?? 50));
  const motionSpeed = Math.max(25, Math.min(200, win98Settings.motionSpeed ?? 100));
  const motionTarget = win98Settings.motionTarget || 'desktop';

  // Trigger a subtle punch/shake impulse on lyric line or word transitions
  useEffect(() => {
    if (!motionEnabled) return;
    impulseRef.current = Math.min(1.5, impulseRef.current + 0.85);
  }, [activeLineIndex, motionEnabled]);

  useEffect(() => {
    if (!motionEnabled || motionStyle !== 'beat_shake') return;
    impulseRef.current = Math.min(1.3, impulseRef.current + 0.45);
  }, [activeWordIndex, motionEnabled, motionStyle]);

  useEffect(() => {
    const desktopEl = desktopCameraRef.current;
    const windowEl = windowMotionRef.current;

    if (!motionEnabled) {
      if (desktopEl) desktopEl.style.transform = '';
      if (windowEl) windowEl.style.transform = '';
      return;
    }

    let raf = 0;
    const startMs = performance.now();
    const intensity = motionIntensity / 100; // 0.1 .. 1.0
    const speed = motionSpeed / 100; // 0.25 .. 2.0

    const tick = (now: number) => {
      const t = ((now - startMs) / 1000) * speed;
      impulseRef.current *= 0.9;
      const imp = impulseRef.current;
      const playBoost = isPlaying ? 1 : 0.45;

      let x = 0;
      let y = 0;
      let rot = 0;
      let scale = motionTarget === 'desktop' ? 1 + 0.045 * intensity : 1;

      if (motionStyle === 'handheld') {
        x = (Math.sin(t * 1.35) * 6.5 + Math.sin(t * 3.1) * 2.5 + Math.cos(t * 7.3) * (0.9 + imp * 3.2)) * intensity * playBoost;
        y = (Math.cos(t * 1.1) * 5.0 + Math.sin(t * 2.7) * 2.2 + Math.sin(t * 6.4) * (0.8 + imp * 2.8)) * intensity * playBoost;
        rot = (Math.sin(t * 0.95) * 0.9 + Math.cos(t * 2.3) * 0.35 + Math.sin(t * 8.1) * imp * 0.6) * intensity * playBoost;
        scale += (Math.sin(t * 0.7) * 0.012 + imp * 0.014) * intensity;
      } else if (motionStyle === 'float') {
        x = (Math.sin(t * 0.75) * 10 + Math.sin(t * 1.45) * 3.5) * intensity * playBoost;
        y = (Math.cos(t * 0.6) * 7.5 + Math.cos(t * 1.2) * 2.5) * intensity * playBoost;
        rot = (Math.sin(t * 0.5) * 1.1) * intensity * playBoost;
        scale += (Math.sin(t * 0.85) * 0.016) * intensity;
      } else if (motionStyle === 'beat_shake') {
        const beat = isPlaying ? Math.pow(Math.max(0, Math.sin(t * 4.2)), 4) * 0.55 : 0;
        const energy = Math.min(1.6, imp + beat);
        x = (Math.sin(t * 17.5) * (2.0 + energy * 8.5) + Math.cos(t * 1.8) * 3.0) * intensity;
        y = (Math.cos(t * 14.3) * (1.8 + energy * 7.5) + Math.sin(t * 1.4) * 2.5) * intensity;
        rot = (Math.sin(t * 11.7) * (0.35 + energy * 1.35)) * intensity;
        scale += (energy * 0.028) * intensity;
      } else if (motionStyle === 'crt_wobble') {
        x = (Math.sin(t * 9.5) * 2.2 + Math.sin(t * 2.1) * 4.5 + Math.cos(t * 21.0) * imp * 3.5) * intensity * playBoost;
        y = (Math.cos(t * 3.4) * 2.8 + Math.sin(t * 13.0) * (0.7 + imp * 2.0)) * intensity * playBoost;
        rot = (Math.sin(t * 1.7) * 0.75 + Math.sin(t * 15.0) * imp * 0.5) * intensity * playBoost;
        scale += (Math.sin(t * 3.2) * 0.008 + imp * 0.012) * intensity;
      }

      const transformStr = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;

      if (motionTarget === 'window') {
        if (desktopEl) desktopEl.style.transform = '';
        if (windowEl) windowEl.style.transform = transformStr;
      } else {
        if (windowEl) windowEl.style.transform = '';
        if (desktopEl) desktopEl.style.transform = transformStr;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (desktopEl) desktopEl.style.transform = '';
      if (windowEl) windowEl.style.transform = '';
    };
  }, [motionEnabled, motionStyle, motionIntensity, motionSpeed, motionTarget, isPlaying]);

  useEffect(() => {
    const id = setInterval(() => {
      setClockStr(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      setWinOffset({
        x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current.active = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const currentLine = activeLineIndex >= 0 ? lines[activeLineIndex] : undefined;
  const nextLine = activeLineIndex >= 0 ? lines[activeLineIndex + 1] : undefined;

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
          if (t >= w.start) count++;
        }
        setRevealedWordCount(Math.max(1, count));
      } else if (activeWordIndex >= 0) {
        setRevealedWordCount(Math.max(1, activeWordIndex + 1));
      } else {
        const lineStart = currentLine.start;
        const lineEnd = nextLine ? nextLine.start : currentLine.end || lineStart + 3.2;
        const span = Math.max(0.6, Math.min(4.5, lineEnd - lineStart));
        const progress = Math.max(0, Math.min(1, (effectiveTimeRef.current - lineStart) / (span * 0.85)));
        setRevealedWordCount(Math.max(1, Math.ceil(progress * words.length)));
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [win98Settings.revealMode, currentLine, nextLine, activeWordIndex, effectiveTimeRef]);

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
  const isClassicGrayTaskbar = win98Settings.titlebarTheme === 'classic_navy' || win98Settings.titlebarTheme === 'teal';

  const words = currentLine ? currentLine.text.trim().split(/\s+/).filter(Boolean) : [];
  const visibleText =
    win98Settings.revealMode === 'line'
      ? currentLine?.text || ''
      : words.slice(0, revealedWordCount).join(' ');

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const clientAlpha = Math.max(0.2, Math.min(1, (win98Settings.clientOpacityPct ?? 88) / 100));
  const crtOpacity = Math.max(0, Math.min(1, (win98Settings.crtIntensity ?? 45) / 100));

  const desktopIcons = [
    { id: 'computer', label: 'My Computer', iconSrc: '/lyrics/windows98/icons/my-computer.png' },
    { id: 'docs', label: 'My Documents', iconSrc: '/lyrics/windows98/icons/my-docs.png' },
    { id: 'music', label: 'My Music', iconSrc: '/lyrics/windows98/icons/cd-music.png' },
    { id: 'myujiku', label: 'myujiku.exe', iconSrc: '/myujiku-logo.png', action: () => setWindowState('normal') },
    { id: 'notepad', label: 'Notepad', iconSrc: '/lyrics/windows98/icons/notepad.png', action: () => setNotepadOpen((v) => !v) },
    { id: 'internet', label: 'Internet', iconSrc: '/lyrics/windows98/icons/internet.png' },
  ];

  return (
    <div
      className="relative w-full h-full min-h-[520px] flex flex-col justify-between overflow-hidden select-none rounded-xl border border-white/10"
      style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}
      onClick={() => {
        setStartOpen(false);
        setSelectedIcon(null);
      }}
    >
      {/* Camera Motion Layer */}
      <div ref={desktopCameraRef} className="relative w-full h-full flex-1 flex flex-col justify-between will-change-transform">
      {/* Classic Bliss Desktop Background */}
      <BlissWallpaper variant={win98Settings.desktopWallpaper || 'bliss'} />

      {/* Desktop Area (Icons + Draggable Windows) */}
      <div className="relative flex-1 w-full flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Desktop Shortcut Icons (Left Column) */}
        {win98Settings.showDesktopIcons && (
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-3">
            {desktopIcons.map((ic) => (
              <button
                key={ic.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIcon(ic.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  ic.action?.();
                }}
                className={`w-16 p-1 rounded flex flex-col items-center gap-1 cursor-pointer ${
                  selectedIcon === ic.id ? 'bg-[#0b61ff]/45 ring-1 ring-white/50' : 'hover:bg-white/10'
                }`}
              >
                {ic.id === 'myujiku' ? (
                  <div className="w-8 h-8 rounded-md bg-black/85 p-1 border border-white/30 shadow">
                    <Image src="/myujiku-logo.png" alt="myujiku.exe" width={24} height={24} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <img
                    src={ic.iconSrc}
                    alt={ic.label}
                    className="w-8 h-8 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)]"
                  />
                )}
                <span className="text-[10px] leading-tight text-white text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                  {ic.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Interactive Notepad Mini Window */}
        {notepadOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-8 right-6 z-30 w-64 bg-[#ece9d8] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-2xl"
          >
            <div
              className="h-6 px-2 flex items-center justify-between text-[11px] font-bold"
              style={{ background: tb.bg, color: tb.text }}
            >
              <span>lyrics_notes.txt - Notepad</span>
              <button
                type="button"
                onClick={() => setNotepadOpen(false)}
                className="w-4 h-4 bg-[#ece9d8] text-black text-[9px] font-bold border border-black/40 cursor-pointer"
              >
                X
              </button>
            </div>
            <textarea
              value={notepadText}
              onChange={(e) => setNotepadText(e.target.value)}
              rows={5}
              className="w-full p-2 text-[11px] text-black bg-white focus:outline-none resize-none"
            />
          </div>
        )}

        {/* Main myujiku.exe Window */}
        {windowState !== 'minimized' && (
          <div ref={windowMotionRef} className="relative z-20 w-full h-full flex items-center justify-center will-change-transform pointer-events-none">
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto relative flex flex-col shadow-[0_24px_60px_rgba(0,0,0,0.65)] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] bg-[#d4d0c8] overflow-hidden transition-[width,height] duration-150"
            style={{
              width: windowState === 'maximized' ? '100%' : `${Math.max(55, Math.min(100, win98Settings.windowWidthPct))}%`,
              maxWidth: windowState === 'maximized' ? '100%' : '820px',
              transform: windowState === 'maximized' ? 'none' : `translate(${winOffset.x}px, ${winOffset.y}px)`,
            }}
          >
            {/* Draggable Title Bar */}
            <div
              onPointerDown={(e) => {
                if (windowState === 'maximized') return;
                dragRef.current = {
                  active: true,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: winOffset.x,
                  origY: winOffset.y,
                };
              }}
              className="h-7 px-2 flex items-center justify-between shrink-0 cursor-move"
              style={{ background: tb.bg, color: tb.text }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-4 h-4 rounded-sm bg-black/70 p-0.5 flex items-center justify-center shrink-0">
                  <Image src="/myujiku-logo.png" alt="myujiku.exe" width={14} height={14} className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold tracking-tight truncate">
                  myujiku.exe
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setWindowState('minimized')}
                  className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-black bg-[#ece9d8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] rounded-[2px] cursor-pointer"
                  title="Minimize"
                >
                  _
                </button>
                <button
                  type="button"
                  onClick={() => setWindowState((s) => (s === 'maximized' ? 'normal' : 'maximized'))}
                  className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-black bg-[#ece9d8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] rounded-[2px] cursor-pointer"
                  title="Maximize"
                >
                  []
                </button>
                <button
                  type="button"
                  onClick={() => setWindowState('minimized')}
                  className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-[#d9432f] border border-t-[#f7a89e] border-l-[#f7a89e] border-r-[#69180e] border-b-[#69180e] rounded-[2px] cursor-pointer"
                  title="Close"
                >
                  X
                </button>
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

            {/* Adjustable-Transparency White Client Stage */}
            <div
              className="relative min-h-[280px] sm:min-h-[340px] m-1 p-4 sm:p-6 border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] flex flex-col justify-between overflow-hidden backdrop-blur-sm"
              style={{
                backgroundColor: `rgba(255, 255, 255, ${clientAlpha})`,
              }}
            >
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
                  <div className="h-full bg-[#4ade80]" style={{ width: `${progressPct}%` }} />
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
        )}
      </div>

      {/* Start Menu Popup */}
      {startOpen && win98Settings.showTaskbar && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-8 left-0 z-40 w-60 bg-[#ece9d8] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-2xl overflow-hidden"
        >
          <div
            className="px-3 py-2 flex items-center gap-2 text-white font-bold text-xs"
            style={{ background: tb.bg }}
          >
            <div className="w-6 h-6 rounded bg-black/70 p-0.5 flex items-center justify-center">
              <Image src="/myujiku-logo.png" alt="MyuJiku" width={20} height={20} className="w-full h-full object-contain" />
            </div>
            <span>MyuJiku XP User</span>
          </div>
          <div className="p-1.5 space-y-1 text-[11px] text-black bg-white">
            <button
              type="button"
              onClick={() => {
                setWindowState('normal');
                setWinOffset({ x: 0, y: 0 });
                setStartOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#316ac5] hover:text-white font-semibold cursor-pointer"
            >
              Restore myujiku.exe
            </button>
            <button
              type="button"
              onClick={() => {
                setNotepadOpen(true);
                setStartOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#316ac5] hover:text-white cursor-pointer"
            >
              Open Notepad
            </button>
            <button
              type="button"
              onClick={() => {
                togglePlay();
                setStartOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#316ac5] hover:text-white cursor-pointer"
            >
              {isPlaying ? 'Pause Music' : 'Play Music'}
            </button>
          </div>
        </div>
      )}

      {/* Windows Taskbar */}
      {win98Settings.showTaskbar && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-30 h-8 flex items-center justify-between border-t border-white/40 shrink-0"
          style={{ background: tb.taskbar }}
        >
          <div className="flex items-center h-full gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setStartOpen((v) => !v)}
              className={`h-full px-3 flex items-center gap-1.5 font-bold italic text-xs cursor-pointer ${
                isClassicGrayTaskbar
                  ? 'text-black border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] m-0.5 h-6'
                  : 'text-white rounded-r-xl shadow-inner'
              }`}
              style={{ background: tb.startBg }}
            >
              <img src="/lyrics/windows98/icons/start-orb.png" alt="" className="w-4 h-4 object-contain" />
              <span>start</span>
            </button>

            {/* Quick Launch */}
            <div className="hidden sm:flex items-center gap-1.5 px-1.5 border-r border-white/20">
              <button
                type="button"
                onClick={() => setWindowState('normal')}
                className="w-5 h-5 rounded bg-black/50 p-0.5 flex items-center justify-center cursor-pointer"
                title="myujiku.exe"
              >
                <Image src="/myujiku-logo.png" alt="myujiku.exe" width={16} height={16} className="w-full h-full object-contain" />
              </button>
              <button
                type="button"
                onClick={() => setNotepadOpen((v) => !v)}
                className="w-5 h-5 flex items-center justify-center cursor-pointer"
                title="Notepad"
              >
                <img src="/lyrics/windows98/icons/notepad.png" alt="Notepad" className="w-4 h-4 object-contain" />
              </button>
              <button
                type="button"
                onClick={() => setWindowState('normal')}
                className="w-5 h-5 flex items-center justify-center cursor-pointer"
                title="Internet"
              >
                <img src="/lyrics/windows98/icons/internet.png" alt="Internet" className="w-4 h-4 object-contain" />
              </button>
            </div>

            {/* Taskbar Window Buttons */}
            <button
              type="button"
              onClick={() => setWindowState((s) => (s === 'minimized' ? 'normal' : 'minimized'))}
              className={`h-6 px-2.5 rounded text-[11px] font-semibold flex items-center gap-1.5 truncate max-w-[160px] cursor-pointer ${
                windowState !== 'minimized'
                  ? 'bg-black/25 text-white border border-black/30'
                  : 'bg-white/15 text-white/90 border border-white/20'
              }`}
            >
              <Image src="/myujiku-logo.png" alt="" width={14} height={14} className="w-3.5 h-3.5 object-contain shrink-0" />
              <span className="truncate">myujiku.exe</span>
            </button>

            {notepadOpen && (
              <button
                type="button"
                onClick={() => setNotepadOpen(false)}
                className="h-6 px-2 rounded bg-white/15 text-white text-[11px] truncate max-w-[120px] cursor-pointer"
              >
                Notepad
              </button>
            )}
          </div>

          {/* System Tray */}
          <div
            className={`h-full px-3 flex items-center gap-2 text-[11px] shrink-0 ${
              isClassicGrayTaskbar
                ? 'bg-[#c0c0c0] text-black border-l border-[#808080]'
                : 'bg-[#0f8aee] text-white border-l border-white/20'
            }`}
          >
            <img src="/lyrics/windows98/icons/speaker.png" alt="Volume" className="w-4 h-4 object-contain" />
            <span className="text-[10px] font-mono">{Math.round(volume * 100)}%</span>
            <span className="font-semibold">{clockStr}</span>
          </div>
        </div>
      )}
      </div>

      {/* CRT Scanline & Vignette Overlay */}
      {win98Settings.crtEnabled && (
        <div
          className="pointer-events-none absolute inset-0 z-50"
          style={{
            opacity: crtOpacity,
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 1px, transparent 1px, transparent 3px)',
            boxShadow: 'inset 0 0 70px rgba(0,0,0,0.65)',
          }}
        />
      )}
    </div>
  );
}
