'use client';

import React from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import { useRoom } from '@/context/RoomContext';

export default function PlaybackSection() {
  const { settings, updateSettings, resetSection } = useSettings();
  const roomContext = useRoom();
  const isInRoom = Boolean(roomContext?.room && roomContext?.roomStatus === 'connected');
  const playback = settings.playback;

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            Playback Settings
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Continuous autoplay, similar track discovery, and queue behavior
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetSection('playback')}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Reset playback settings to defaults"
        >
          Reset Playback
        </button>
      </div>

      {/* ─────────────────── PART 5: AUTOPLAY ─────────────────── */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-white">Autoplay Similar Songs</h4>
            <p className="text-[11px] text-zinc-400">
              When your queue or playlist ends, automatically discover and play a similar track so the music never stops.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={playback.autoplay}
            onClick={() => updateSettings('playback', { autoplay: !playback.autoplay })}
            style={{
              backgroundColor: playback.autoplay ? 'var(--accent)' : '#2e2e36',
            }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                playback.autoplay ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        {isInRoom && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px] flex items-center gap-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Autoplay is automatically paused while you are in a Listen Together room.</span>
          </div>
        )}

        <div className="pt-3 border-t border-[#22222a] space-y-2 text-[11px] text-zinc-400">
          <span className="font-semibold text-zinc-300 block">Candidate Discovery Hierarchy:</span>
          <ol className="list-decimal list-inside space-y-1 text-[11px]">
            <li>YouTube Radio / Mix of the current track</li>
            <li>Direct music-filtered search for similar tracks &amp; top artist releases</li>
            <li>Last.fm track recommendation similarity engine (when configured)</li>
            <li>Curated fallback shuffle from your Liked Songs library</li>
          </ol>
          <p className="text-[10px] text-zinc-500 pt-1">
            Strict filters prevent repeats (tracks not played in the last 50, maximum 2 consecutive tracks by the same artist, and duration 1.5–10 min).
          </p>
        </div>
      </div>
    </div>
  );
}
