'use client';

import React from 'react';
import { SyncedLyricLine } from '@/lib/lyrics/providers/types';
import { getEmojiForLyricWord } from '@/lib/lyrics/emojiMap';

interface VisualStageProps {
  lines: SyncedLyricLine[];
  activeLineIndex: number;
  activeWordIndex: number;
  showIcons?: boolean;
  scale?: number;
}

function getWordHash(lineIdx: number, wordIdx: number, text: string): number {
  let hash = (lineIdx * 31 + wordIdx) * 17;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function VisualStage({
  lines,
  activeLineIndex,
  activeWordIndex,
  showIcons = true,
  scale = 1.0,
}: VisualStageProps) {
  const activeLine =
    activeLineIndex >= 0 && activeLineIndex < lines.length
      ? lines[activeLineIndex]
      : null;

  if (!activeLine) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center p-8 text-center text-zinc-500">
        <p className="text-sm font-medium tracking-wide animate-pulse">Waiting for vocals...</p>
      </div>
    );
  }

  const activeWord =
    activeLine && activeWordIndex >= 0 && activeWordIndex < activeLine.words.length
      ? activeLine.words[activeWordIndex]
      : null;

  // Previous 1-3 words
  const prevWords: string[] = [];
  if (activeLine && activeWordIndex > 0) {
    const start = Math.max(0, activeWordIndex - 3);
    for (let i = start; i < activeWordIndex; i++) {
      prevWords.push(activeLine.words[i].text);
    }
  }

  // Next word sneak-peek
  const nextWord: string | null =
    activeLine && activeWordIndex + 1 < activeLine.words.length
      ? activeLine.words[activeWordIndex + 1].text
      : null;

  const wordText = activeWord?.text || '';
  const emoji = showIcons && wordText ? getEmojiForLyricWord(wordText) : null;

  // Deterministic 1 in 4 marker box behind active word
  const hasMarkerBox =
    wordText.length > 1 &&
    getWordHash(activeLineIndex, activeWordIndex, wordText) % 4 === 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 select-none relative overflow-hidden text-center">
      {/* Drifting previous words */}
      <div className="flex items-center gap-3 mb-6 transition-all duration-300 min-h-[32px] justify-center">
        {prevWords.map((w, idx) => (
          <span
            key={`prev-${idx}-${w}`}
            className="font-bold tracking-tight text-[var(--secondary,#888888)] opacity-40 -translate-y-2 transition-all duration-300 transform-gpu"
            style={{
              fontSize: `${1.2 * scale}rem`,
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Main Single Active Word with Spring Scale-in and Soft Glyph Glow */}
      <div
        key={`${activeLineIndex}-${activeWordIndex}-${wordText}`}
        className="relative flex items-center justify-center gap-3 sm:gap-6 animate-spring-scale p-6 -m-6"
      >
        {/* Optional solid marker box behind text */}
        {hasMarkerBox && (
          <div
            className="absolute inset-0 -inset-x-6 -inset-y-3 rounded-2xl opacity-20 -z-10 pointer-events-none transition-all duration-200"
            style={{
              backgroundColor: 'var(--highlight, #ef4444)',
            }}
          />
        )}

        <span
          className="font-black tracking-tighter transition-all duration-150 inline-block active-glyph-glow select-none"
          style={{
            fontSize: `calc(clamp(48px, 10vw, 120px) * ${scale})`,
            color: hasMarkerBox ? 'var(--highlight, #ef4444)' : 'var(--lyric, #ffffff)',
          }}
        >
          {wordText || '♪'}
        </span>

        {/* Pop-in Emoji Icon without shifting layout */}
        {emoji && (
          <span
            className="inline-block animate-pop-in select-none"
            style={{
              fontSize: `calc(clamp(36px, 8vw, 80px) * ${scale})`,
            }}
            role="img"
            aria-label="icon"
          >
            {emoji}
          </span>
        )}
      </div>

      {/* Subtle upcoming next word below */}
      <div className="mt-8 min-h-[28px] transition-all duration-300">
        {nextWord && (
          <span
            className="font-semibold text-[var(--secondary,#666666)] opacity-25 translate-y-1 inline-block"
            style={{
              fontSize: `${1.0 * scale}rem`,
            }}
          >
            {nextWord}
          </span>
        )}
      </div>
    </div>
  );
}
