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

export default function SpotifyLyricsView({ onClose }: { onClose: () => void }) {
  const { currentTrack, currentTime, seek } = usePlayback();

  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());

  const activeLineIndex = useMemo(() => {
    if (!currentTrack?.title || lines.length === 0) return -1;
    return findActiveLyricIndex(lines, currentTime);
  }, [currentTrack?.title, lines, currentTime]);

  useEffect(() => {
    if (!currentTrack || !currentTrack.title) {
      setLyricsData(null);
      setLines([]);
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

  // Auto-scroll active line to center
  useEffect(() => {
    if (!autoScroll || activeLineIndex < 0) return;
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
  }, [activeLineIndex, autoScroll]);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-[#0e243d] via-[#091726] to-[#121212] p-6 sm:p-10 rounded-lg overflow-hidden select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1d90f5]">
            {lines.length > 0 ? 'Synced Karaoke Lyrics' : 'Lyrics'}
          </span>
          <h2 className="text-xl font-bold text-white truncate">
            {currentTrack?.title || 'No Track Selected'}
          </h2>
          <p className="text-xs text-[#b3b3b3]">{currentTrack?.artist || 'Ready'}</p>
        </div>

        <div className="flex items-center gap-3">
          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                autoScroll ? 'bg-[#1d90f5] text-white font-semibold' : 'bg-white/10 text-white'
              }`}
            >
              {autoScroll ? 'Auto-Scroll ON' : 'Auto-Scroll OFF'}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Close Lyrics"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Lyrics Body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-8 sm:py-12 space-y-6 sm:space-y-8 pr-2"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-[#b3b3b3]">
            <div className="w-8 h-8 border-2 border-[#1d90f5] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Finding synchronized lyrics...</p>
          </div>
        ) : lyricsData?.instrumental ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-[#b3b3b3] gap-2">
            <span className="text-4xl">🎵</span>
            <p className="text-lg font-bold text-white">Instrumental Track</p>
            <p className="text-xs text-zinc-400">Sit back and enjoy the chill ambient music.</p>
          </div>
        ) : lines.length > 0 ? (
          lines.map((line, idx) => {
            const isActive = idx === activeLineIndex;
            const isPassed = activeLineIndex > idx;
            return (
              <p
                key={idx}
                ref={(el) => {
                  if (el) lineRefs.current.set(idx, el);
                  else lineRefs.current.delete(idx);
                }}
                onClick={() => seek(line.time)}
                className={`font-black tracking-tight transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'text-white text-2xl sm:text-4xl scale-100 opacity-100 drop-shadow-md'
                    : isPassed
                    ? 'text-[#a7a7a7] text-xl sm:text-2xl opacity-60 hover:opacity-90 hover:text-white'
                    : 'text-[#6a6a6a] text-xl sm:text-2xl opacity-40 hover:opacity-80 hover:text-white'
                }`}
              >
                {line.text}
              </p>
            );
          })
        ) : lyricsData?.plainLyrics ? (
          <div className="text-lg sm:text-xl font-medium text-white/80 whitespace-pre-line leading-relaxed">
            {lyricsData.plainLyrics}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center text-[#b3b3b3] gap-2">
            <span className="text-3xl">🎤</span>
            <p className="text-base font-semibold text-white">No lyrics available for this track</p>
            <p className="text-xs text-zinc-400">
              Try searching a song on YouTube or Spotify!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
