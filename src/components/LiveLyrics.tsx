'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { findActiveLyricIndex, LyricLine, parseLrc } from '@/lib/lrc-parser';

interface LyricsData {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  instrumental: boolean;
  trackName?: string;
  artistName?: string;
}

export default function LiveLyrics() {
  const { currentTrack, currentTime, seek } = usePlayback();

  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());

  // Derived active line index based on current playback time (React 19 pure derived state)
  const activeLineIndex = useMemo(() => {
    if (!currentTrack?.title || lines.length === 0) return -1;
    return findActiveLyricIndex(lines, currentTime);
  }, [currentTrack?.title, lines, currentTime]);

  // Fetch lyrics whenever current track changes
  useEffect(() => {
    if (!currentTrack || !currentTrack.title) {
      return;
    }

    let isCancelled = false;
    const fetchLyrics = async () => {
      setIsLoading(true);

      const params = new URLSearchParams({
        title: currentTrack.title,
      });
      if (currentTrack.artist && currentTrack.artist !== 'YouTube Artist') {
        params.set('artist', currentTrack.artist);
      }
      if (currentTrack.duration > 0) {
        params.set('duration', currentTrack.duration.toString());
      }

      try {
        const res = await fetch(`/api/lyrics?${params.toString()}`);
        if (isCancelled) return;

        if (!res.ok) {
          setLyricsData(null);
          setLines([]);
          return;
        }

        const data = (await res.json()) as LyricsData;
        setLyricsData(data);

        if (data.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          setLines(parsed);
        } else {
          setLines([]);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching lyrics:', err);
          setLyricsData(null);
          setLines([]);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchLyrics();

    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);

  // Smoothly scroll active line to center within the lyrics container only
  useEffect(() => {
    if (!autoScroll || activeLineIndex < 0 || !isExpanded) return;
    const activeEl = lineRefs.current.get(activeLineIndex);
    const container = containerRef.current;
    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + container.scrollTop;
      const targetScroll = relativeTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [activeLineIndex, autoScroll, isExpanded]);

  const handleLineClick = (time: number) => {
    seek(time);
  };

  const displayedLines = currentTrack?.title ? lines : [];
  const displayedLyricsData = currentTrack?.title ? lyricsData : null;

  return (
    <div className="w-full backdrop-blur-md bg-[#0c101b]/80 border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/50 flex flex-col gap-4 transform-gpu contain-paint">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-lg">
            🎙️
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Live Synced Lyrics
              {displayedLines.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  LRCLIB Synced
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              Synced line-by-line karaoke • Click any line to seek
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 text-xs">
          {displayedLines.length > 0 && (
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer border ${
                autoScroll
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
              }`}
              title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
            >
              Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Lyrics' : 'Expand Lyrics'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Lyrics Content Container */}
      {isExpanded && (
        <div
          ref={containerRef}
          className="relative max-h-72 sm:max-h-80 overflow-y-auto pr-2 scroll-smooth overscroll-contain flex flex-col gap-3.5 select-none"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400 text-xs">
              <div className="w-6 h-6 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
              <span>Fetching synced lyrics from LRCLIB...</span>
            </div>
          )}

          {/* Instrumental Track State */}
          {!isLoading && displayedLyricsData?.instrumental && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl animate-pulse">
                ☕
              </div>
              <div className="font-semibold text-sm text-slate-200">Instrumental Track</div>
              <p className="text-xs text-slate-400 max-w-sm">
                No lyrics detected for this track. Sit back and enjoy the pure lo-fi ambiance.
              </p>
            </div>
          )}

          {/* Synced Lyrics Karaoke View */}
          {!isLoading && !displayedLyricsData?.instrumental && displayedLines.length > 0 && (
            <div className="flex flex-col gap-2 py-4">
              {displayedLines.map((line, idx) => {
                const isActive = idx === activeLineIndex;
                const isPast = idx < activeLineIndex;

                return (
                  <p
                    key={line.id}
                    ref={(el) => {
                      if (el) lineRefs.current.set(idx, el);
                      else lineRefs.current.delete(idx);
                    }}
                    onClick={() => handleLineClick(line.time)}
                    className={`py-1.5 px-3 rounded-xl transition-colors duration-150 cursor-pointer text-sm sm:text-base font-medium ${
                      isActive
                        ? 'text-purple-200 font-bold bg-purple-500/20 shadow-sm shadow-purple-500/20 pl-4 border-l-2 border-purple-400'
                        : isPast
                        ? 'text-slate-400 hover:text-slate-200 opacity-70'
                        : 'text-slate-500 hover:text-slate-300 opacity-50'
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })}
            </div>
          )}

          {/* Fallback Plain Lyrics View */}
          {!isLoading &&
            !displayedLyricsData?.instrumental &&
            displayedLines.length === 0 &&
            displayedLyricsData?.plainLyrics && (
              <div className="whitespace-pre-line text-xs sm:text-sm text-slate-300 leading-relaxed py-2 font-sans opacity-85">
                {displayedLyricsData.plainLyrics}
              </div>
            )}

          {/* No Lyrics Found */}
          {!isLoading &&
            !displayedLyricsData?.instrumental &&
            displayedLines.length === 0 &&
            !displayedLyricsData?.plainLyrics && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center text-xs text-slate-400">
                <span className="text-2xl">✨</span>
                <span className="font-medium text-slate-300">
                  {currentTrack ? 'No synced lyrics found for this track' : 'Play a track to view live lyrics'}
                </span>
                <p className="text-[11px] text-slate-500">
                  Instrumental beats and unlisted tracks may not have LRC records on LRCLIB.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
