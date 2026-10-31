'use client';

import React, { useEffect, useRef } from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';

interface CodestyleStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  scale?: number;
}

export default function CodestyleStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = false,
  scale = 1.0,
}: CodestyleStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  if (!lines || lines.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center p-8 text-center text-zinc-500">
        <p className="text-sm font-medium tracking-wide animate-pulse">Waiting for vocals...</p>
      </div>
    );
  }

  // Auto-scroll active line to center
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 select-none">
      {/* Editor Window Chrome */}
      <div
        className="w-full max-w-3xl h-[480px] rounded-2xl bg-[#0c0c0c] border border-[#222222] shadow-2xl flex flex-col overflow-hidden font-mono"
        style={{
          fontSize: `${0.875 * scale}rem`,
        }}
      >
        {/* Titlebar / Tab */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#141414] border-b border-[#222222] select-none">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            <span className="ml-3 text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
              <span className="text-blue-400">fn</span> song_lyrics.myujiku
            </span>
          </div>
          <div className="text-[10px] text-zinc-500">UTF-8 • MyuJiku Code</div>
        </div>

        {/* Code Content Area with Line Numbers Gutter */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800"
        >
          {lines.map((line, lIdx) => {
            const isCurrentLine = lIdx === activeLineIndex;
            const isPastLine = lIdx < activeLineIndex;

            return (
              <div
                key={`code-line-${lIdx}`}
                ref={isCurrentLine ? activeLineRef : null}
                className={`flex items-start gap-4 px-2 py-1 rounded transition-colors duration-200 ${
                  isCurrentLine ? 'bg-white/[0.04]' : ''
                }`}
              >
                {/* Line Number Gutter */}
                <span
                  className={`w-7 text-right select-none font-mono text-xs shrink-0 ${
                    isCurrentLine ? 'text-[var(--highlight,#ef4444)] font-bold' : 'text-zinc-600'
                  }`}
                  style={{
                    fontSize: `${0.8 * scale}rem`,
                  }}
                >
                  {String(lIdx + 1).padStart(2, '0')}
                </span>

                {/* Line Code / Words */}
                <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {line.words.map((w, wIdx) => {
                    const isWordActive = isCurrentLine && wIdx === activeWordIndex;
                    const isWordPast = isPastLine || (isCurrentLine && wIdx < activeWordIndex);

                    const emoji =
                      showIcons && w.text ? getEmojiForLyricWord(w.text) : null;

                    return (
                      <span
                        key={`code-word-${wIdx}-${w.text}`}
                        className={`inline-flex items-center gap-1 transition-all duration-150 rounded px-1.5 py-0.5 ${
                          isWordActive
                            ? 'text-[var(--highlight,#ef4444)] font-black active-glyph-glow-sm'
                            : isWordPast
                            ? 'text-zinc-500 opacity-60'
                            : isCurrentLine
                            ? 'text-zinc-300'
                            : 'text-zinc-500'
                        }`}
                      >
                        <span>{w.text}</span>
                        {/* Blinking cursor for active word */}
                        {isWordActive && (
                          <span
                            className="w-1.5 bg-[var(--highlight,#ef4444)] animate-pulse inline-block"
                            style={{ height: `${1.1 * scale}rem` }}
                          />
                        )}
                        {/* Inline comment emoji if enabled */}
                        {emoji && isWordActive && (
                          <span className="text-xs bg-black/50 px-1 py-0.5 rounded text-zinc-300 select-none animate-pop-in">
                            /* {emoji} */
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
