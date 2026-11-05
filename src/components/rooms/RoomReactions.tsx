'use client';

import React from 'react';
import { useRoom, FloatingReaction } from '@/context/RoomContext';

const AVAILABLE_EMOJIS = ['❤️', '🔥', '🎵', '👏', '💃', '🎧'];

export default function RoomReactions() {
  const { reactions, sendReaction } = useRoom();

  return (
    <>
      {/* Floating Reactions Container */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {reactions.map((r: FloatingReaction) => (
          <div
            key={r.id}
            className="absolute bottom-24 animate-float-up text-3xl sm:text-4xl filter drop-shadow-md flex flex-col items-center"
            style={{
              left: `${15 + ((r.timestamp * 17) % 70)}%`,
            }}
          >
            <span>{r.emoji}</span>
            <span className="text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-full mt-1">
              {r.userName}
            </span>
          </div>
        ))}
      </div>

      {/* Emoji Reaction Action Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 bg-[#181818]/90 backdrop-blur-md border border-[#2a2a2a] px-3 py-1.5 rounded-full shadow-lg">
        {AVAILABLE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => sendReaction(emoji)}
            className="text-lg sm:text-xl p-1 sm:p-1.5 hover:scale-125 active:scale-95 transition-transform cursor-pointer rounded-full hover:bg-white/10"
            title={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}

