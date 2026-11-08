'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { HeartIcon, MusicNoteIcon } from '@/components/common/MinimalIcons';
import { getSavedPlaylists, toggleLikedSong } from '@/lib/playlist-storage';
import { isTauri, toggleDesktopMiniplayer } from '@/lib/desktop';

interface MiniplayerProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function Miniplayer({ isOpen, onClose }: MiniplayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isSpatial8D,
    isMuffled,
  } = usePlayback();

  const [isLiked, setIsLiked] = useState<boolean>(() => {
    if (!currentTrack) return false;
    const pl = getSavedPlaylists().find((p) => p.id === 'liked-songs');
    return pl?.tracks?.some((t) => t.id === currentTrack.id) || false;
  });

  if (!isOpen) return null;

  const handleToggleLike = () => {
    if (!currentTrack) return;
    const res = toggleLikedSong({
      id: currentTrack.id,
      title: currentTrack.title,
      artist: currentTrack.artist || 'Unknown Artist',
      duration: formatTime(duration),
      thumbnail: currentTrack.artworkUrl,
    });
    setIsLiked(res.isLikedNow);
  };

  const handleClose = () => {
    if (isTauri()) {
      toggleDesktopMiniplayer(false).catch(() => {});
    }
    onClose();
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      role="region"
      aria-label="Miniplayer"
      className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl bg-[#141418]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-4 select-none animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Top Bar: Label & Window Controls */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Miniplayer
          </span>
          {isSpatial8D && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white border border-white/20">
              8D
            </span>
          )}
          {isMuffled && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              Muffled
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Expand to Full App */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Expand to Full App"
            aria-label="Expand to Full App"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z" />
            </svg>
          </button>

          {/* Close Miniplayer */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Miniplayer"
            aria-label="Close Miniplayer"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Row: Artwork + Track Details */}
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-md border border-white/10">
          {currentTrack?.artworkUrl ? (
            <Image
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <MusicNoteIcon className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-xs sm:text-sm font-bold text-white truncate"
            title={currentTrack?.title || 'No Track Playing'}
          >
            {currentTrack?.title || 'No Track Playing'}
          </p>
          <p
            className="text-[11px] text-zinc-400 truncate mt-0.5"
            title={currentTrack?.artist || 'Ready'}
          >
            {currentTrack?.artist || 'Select a track to start'}
          </p>
        </div>

        {/* Like Button */}
        {currentTrack && (
          <button
            type="button"
            onClick={handleToggleLike}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLiked ? 'text-white' : 'text-zinc-500 hover:text-white'
            }`}
            title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          >
            <HeartIcon filled={isLiked} className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrubber Timeline */}
      <div className="mt-3 space-y-1">
        <div className="relative flex items-center group h-2 cursor-pointer">
          <div className="w-full h-1 group-hover:h-1.5 bg-zinc-700 rounded-full overflow-hidden transition-all">
            <div
              className="h-full bg-[var(--accent)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={duration > 0 ? duration : 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="mt-2 flex items-center justify-between">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={previousTrack}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Previous track"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all cursor-pointer shadow-md"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={nextTrack}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Next track"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
}
