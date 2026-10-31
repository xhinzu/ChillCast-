'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayback } from '@/context/PlaybackContext';

interface SyncEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawLyricsText: string;
  songTitle: string;
  songArtist: string;
  duration?: number;
  onSave: (result: { lrcText: string; shareWithEveryone: boolean }) => void;
}

export function formatTimestamp(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const cs = Math.floor((secs % 1) * 100);
  return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}]`;
}

export function formatTimeDisplay(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SyncEditorModal({
  isOpen,
  onClose,
  rawLyricsText,
  songTitle,
  songArtist,
  duration,
  onSave,
}: SyncEditorModalProps) {
  const { isPlaying, togglePlay, seek, getCurrentTime, currentTime } = usePlayback();

  // Split plain text into non-empty lines
  const lines = React.useMemo(() => {
    return rawLyricsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }, [rawLyricsText]);

  const [markedTimes, setMarkedTimes] = useState<(number | null)[]>(() =>
    new Array(lines.length).fill(null)
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [shareWithEveryone, setShareWithEveryone] = useState<boolean>(false); // Default OFF
  const [liveClock, setLiveClock] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Reset state when opening with new text
  useEffect(() => {
    if (isOpen) {
      setMarkedTimes(new Array(lines.length).fill(null));
      setCurrentIndex(0);
      setShareWithEveryone(false);
      // Auto-start playback if paused
      if (!isPlaying) {
        togglePlay();
      }
    }
  }, [isOpen, lines.length]);

  // High-frequency clock update for live timeline display
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    const update = () => {
      const now = getCurrentTime?.() ?? currentTime ?? 0;
      setLiveClock(now);
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, getCurrentTime, currentTime]);

  // Smooth scroll active line to center
  const scrollToLine = useCallback((index: number) => {
    const el = lineItemRefs.current.get(index);
    const container = containerRef.current;
    if (el && container) {
      const cRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetTop = elRect.top - cRect.top + container.scrollTop - cRect.height / 2 + elRect.height / 2;
      container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToLine(currentIndex);
    }
  }, [currentIndex, isOpen, scrollToLine]);

  // Action: Mark current line with live playback time
  const handleMarkLine = useCallback(() => {
    if (currentIndex >= lines.length) return;
    const now = getCurrentTime?.() ?? currentTime ?? 0;
    const rounded = Number(now.toFixed(2));

    setMarkedTimes((prev) => {
      const next = [...prev];
      next[currentIndex] = rounded;
      return next;
    });

    const nextIdx = Math.min(lines.length, currentIndex + 1);
    setCurrentIndex(nextIdx);
  }, [currentIndex, lines.length, getCurrentTime, currentTime]);

  // Action: Rewind 1 line and seek back 3 seconds
  const handleRewind = useCallback(() => {
    if (currentIndex <= 0) return;
    const prevIdx = currentIndex - 1;

    setMarkedTimes((prev) => {
      const next = [...prev];
      next[prevIdx] = null;
      return next;
    });

    setCurrentIndex(prevIdx);
    const now = getCurrentTime?.() ?? currentTime ?? 0;
    seek(Math.max(0, now - 3));
  }, [currentIndex, getCurrentTime, currentTime, seek]);

  // Keyboard shortcut listener (Space = Mark, Backspace/Z = Rewind)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleMarkLine();
      } else if (e.code === 'Backspace' || (e.ctrlKey && e.code === 'KeyZ')) {
        e.preventDefault();
        handleRewind();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleMarkLine, handleRewind]);

  // Finalize and Save
  const handleSave = () => {
    const lrcLines: string[] = [];
    lines.forEach((lineText, idx) => {
      const t = markedTimes[idx];
      if (t !== null && t !== undefined) {
        lrcLines.push(`${formatTimestamp(t)} ${lineText}`);
      } else {
        lrcLines.push(lineText);
      }
    });

    const assembledLrc = lrcLines.join('\n');
    onSave({ lrcText: assembledLrc, shareWithEveryone });
    onClose();
  };

  if (!isOpen) return null;

  const totalMarked = markedTimes.filter((t) => t !== null).length;
  const progressPct = lines.length > 0 ? (totalMarked / lines.length) * 100 : 0;
  const isFinished = currentIndex >= lines.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-3xl w-full max-w-3xl h-[90vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden relative text-white">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#161616]/80 backdrop-blur-md">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                🎙️ Sync Recorder
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {songTitle}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {songArtist} &bull; {totalMarked} of {lines.length} lines synced ({Math.round(progressPct)}%)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#252525] transition-colors cursor-pointer text-sm"
            title="Cancel and close"
          >
            ✕
          </button>
        </div>

        {/* Progress & Waveform Bar */}
        <div className="w-full bg-[#181818] px-6 py-2 border-b border-[#222222] flex items-center justify-between text-xs gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-400 font-bold min-w-[45px]">
              {formatTimeDisplay(liveClock)}
            </span>
            {duration && (
              <span className="text-zinc-500 text-[11px] font-mono">
                / {formatTimeDisplay(duration)}
              </span>
            )}
          </div>

          {/* Timeline progress line with dropped marks */}
          <div className="flex-1 h-2 bg-[#252525] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-150"
              style={{
                width: duration ? `${Math.min(100, (liveClock / duration) * 100)}%` : `${progressPct}%`,
              }}
            />
          </div>

          <button
            type="button"
            onClick={togglePlay}
            className="px-2.5 py-1 rounded-lg bg-[#222222] hover:bg-[#2c2c2c] border border-[#333333] text-[11px] font-semibold text-zinc-300 hover:text-white cursor-pointer transition-colors shrink-0"
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Resume'}
          </button>
        </div>

        {/* Scrollable Lyric Lines List */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-6 sm:px-12 py-16 flex flex-col gap-4 no-scrollbar"
        >
          {lines.map((lineText, idx) => {
            const isCurrent = idx === currentIndex;
            const isMarked = markedTimes[idx] !== null;
            const timeVal = markedTimes[idx];

            return (
              <div
                key={idx}
                ref={(el) => {
                  if (el) lineItemRefs.current.set(idx, el);
                  else lineItemRefs.current.delete(idx);
                }}
                className={`py-3 px-4 rounded-2xl transition-all duration-200 border flex items-center justify-between gap-4 ${
                  isCurrent
                    ? 'bg-amber-500/15 border-amber-400 shadow-lg scale-102 ring-2 ring-amber-400/40'
                    : isMarked
                    ? 'bg-[#181818]/60 border-emerald-500/30 opacity-80'
                    : 'bg-[#141414] border-transparent opacity-40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-zinc-500 w-6 shrink-0 text-right">
                    {idx + 1}
                  </span>
                  <p
                    className={`text-base sm:text-lg font-bold leading-relaxed truncate ${
                      isCurrent
                        ? 'text-white'
                        : isMarked
                        ? 'text-zinc-200'
                        : 'text-zinc-500'
                    }`}
                  >
                    {lineText}
                  </p>
                </div>

                {/* Timestamp pill */}
                <div className="shrink-0">
                  {isMarked && timeVal !== null ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                      {formatTimestamp(timeVal)}
                    </span>
                  ) : isCurrent ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-black text-xs font-bold animate-pulse">
                      Waiting for Mark...
                    </span>
                  ) : (
                    <span className="text-zinc-600 text-xs font-mono">--:--.--</span>
                  )}
                </div>
              </div>
            );
          })}

          {isFinished && (
            <div className="p-6 text-center bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col items-center gap-2 animate-fade-in mt-4">
              <span className="text-2xl">🎉</span>
              <h3 className="text-base font-bold text-white">All lines recorded!</h3>
              <p className="text-xs text-zinc-300">
                Click &ldquo;Save &amp; Done&rdquo; below to apply your synchronized lyrics.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Control Dock */}
        <div className="border-t border-[#222222] bg-[#161616]/95 backdrop-blur-md px-6 py-4 flex flex-col gap-3">
          {/* Main Action Buttons */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Big Mark Line Button */}
              <button
                type="button"
                onClick={handleMarkLine}
                disabled={isFinished}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-30 text-black font-extrabold text-sm sm:text-base flex items-center gap-2 cursor-pointer transition-all shadow-xl active:scale-95"
              >
                <span>⏱️</span>
                <span>Mark Line (Space)</span>
              </button>

              {/* Rewind / Back button */}
              <button
                type="button"
                onClick={handleRewind}
                disabled={currentIndex <= 0}
                className="px-3.5 py-3 rounded-2xl bg-[#222222] hover:bg-[#2a2a2a] disabled:opacity-30 border border-[#333333] text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Rewind 1 line and seek audio back 3 seconds (Backspace)"
              >
                <span>↩️</span>
                <span>Back (-3s)</span>
              </button>
            </div>

            {/* Save & Done */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#2c2c2c] text-xs text-zinc-300 hover:text-white cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={totalMarked === 0}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-extrabold cursor-pointer transition-all shadow-md"
              >
                Save &amp; Done ({totalMarked}/{lines.length})
              </button>
            </div>
          </div>

          {/* Opt-in Community Sharing Toggle (DEFAULT OFF) */}
          <div className="pt-2 border-t border-[#262626] flex items-center justify-between gap-4 flex-wrap">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={shareWithEveryone}
                onChange={(e) => setShareWithEveryone(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
              />
              <span className="font-semibold">Share with everyone on Chillify</span>
              <span className="text-[10px] text-zinc-500 bg-[#202020] px-2 py-0.5 rounded-full border border-[#303030]">
                Opt-in (default OFF)
              </span>
            </label>
            <span className="text-[11px] text-zinc-500">
              {shareWithEveryone
                ? '🌐 Uploads to Chillify community database for all users'
                : '🔒 Saved locally to this browser only'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
