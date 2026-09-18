'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { useAmbient } from '@/context/AmbientContext';

interface SpotifyBottomPlayerProps {
  showVideo: boolean;
  setShowVideo: (show: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export default function SpotifyBottomPlayer({
  showVideo,
  setShowVideo,
  activeView,
  setActiveView,
}: SpotifyBottomPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    activeAdapterType,
    isSpatial8D,
    isMuffled,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    previousTrack,
    toggleSpatial8D,
    toggleMuffled,
  } = usePlayback();

  const { activeCount } = useAmbient();

  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  return (
    <footer className="h-20 sm:h-22 w-full bg-black border-t border-[#242424] px-4 sm:px-6 flex items-center justify-between shrink-0 z-50 select-none">
      {/* 1. Left: Track Info & Artwork */}
      <div className="flex items-center gap-3 w-1/4 min-w-[160px] sm:min-w-[200px]">
        {/* Track Artwork */}
        <div className="relative w-14 h-14 rounded-md overflow-hidden bg-[#282828] shrink-0 shadow-md">
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
            <div className="w-full h-full bg-gradient-to-tr from-zinc-800 to-zinc-900 flex items-center justify-center text-xl text-zinc-500">
              🎵
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <p
            className="text-xs sm:text-sm font-semibold text-white truncate hover:underline cursor-pointer"
            title={currentTrack?.title || 'No Track Selected'}
          >
            {currentTrack?.title || 'Chillify • Ready'}
          </p>
          <p
            className="text-[11px] text-[#b3b3b3] truncate hover:underline hover:text-white cursor-pointer transition-colors"
            title={currentTrack?.artist || 'Ready'}
          >
            {currentTrack?.artist || 'Select a playlist or track'}
          </p>
        </div>

        {/* Heart / Like Button */}
        <button
          type="button"
          onClick={() => setIsLiked(!isLiked)}
          className={`p-1 transition-colors cursor-pointer ${
            isLiked ? 'text-[#1d90f5]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title={isLiked ? 'Remove from Your Library' : 'Save to Your Library'}
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {isLiked ? (
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            ) : (
              <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
            )}
          </svg>
        </button>

        {/* Video Popover Button for YouTube */}
        {activeAdapterType === 'youtube' && (
          <button
            type="button"
            onClick={() => setShowVideo(!showVideo)}
            className={`p-1 text-xs transition-colors cursor-pointer ${
              showVideo ? 'text-[#1d90f5]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title={showVideo ? 'Hide Video Screen' : 'Show Video Screen'}
          >
            📺
          </button>
        )}
      </div>

      {/* 2. Center: Controls & Scrubber */}
      <div className="flex flex-col items-center justify-center max-w-xl w-2/4 px-2">
        {/* Top Controls Row */}
        <div className="flex items-center gap-3 sm:gap-5 mb-1.5">
          {/* Shuffle */}
          <button
            type="button"
            onClick={() => setIsShuffle(!isShuffle)}
            className={`transition-colors cursor-pointer hidden sm:block ${
              isShuffle ? 'text-[#1d90f5]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title="Enable Shuffle"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>

          {/* Previous Track */}
          <button
            type="button"
            onClick={previousTrack}
            className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
            title="Previous"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          {/* Rewind 5s */}
          <button
            type="button"
            onClick={() => seek(Math.max(0, currentTime - 5))}
            className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer text-xs hidden sm:block"
            title="Rewind 5s"
          >
            ⏪
          </button>

          {/* Play / Pause - Authentic Circular Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow cursor-pointer"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Forward 5s */}
          <button
            type="button"
            onClick={() => seek(Math.min(duration, currentTime + 5))}
            className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer text-xs hidden sm:block"
            title="Forward 5s"
          >
            ⏩
          </button>

          {/* Next Track */}
          <button
            type="button"
            onClick={nextTrack}
            className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
            title="Next"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          {/* Repeat */}
          <button
            type="button"
            onClick={() => setIsRepeat(!isRepeat)}
            className={`transition-colors cursor-pointer hidden sm:block ${
              isRepeat ? 'text-[#1d90f5]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title="Enable Repeat"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
          </button>
        </div>

        {/* Scrubber Timeline */}
        <div className="w-full flex items-center gap-2 text-[11px] font-mono text-[#b3b3b3]">
          <span className="w-9 text-right">{formatTime(currentTime)}</span>

          {/* Spotify Blue Range Scrubber */}
          <div className="relative flex-1 flex items-center group h-3 cursor-pointer">
            <div className="w-full h-1 group-hover:h-1.5 bg-[#4d4d4d] rounded-full overflow-hidden transition-all">
              <div
                className="h-full bg-white group-hover:bg-[#1d90f5] transition-colors"
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

          <span className="w-9">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Right: 8D Spatial & Muffled Effects, Mixer shortcut, Volume */}
      <div className="flex items-center justify-end gap-2.5 w-1/3 min-w-[200px] sm:min-w-[260px]">
        {/* 🎧 8D Spatial Audio Toggle */}
        <button
          type="button"
          onClick={toggleSpatial8D}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer select-none ${
            isSpatial8D
              ? 'bg-[#1d90f5]/20 text-[#1d90f5] border border-[#1d90f5]/60 shadow-sm shadow-[#1d90f5]/30 ring-1 ring-[#1d90f5]/40'
              : 'text-[#b3b3b3] hover:text-white hover:bg-white/10 border border-transparent'
          }`}
          title={
            isSpatial8D
              ? '8D Spatial Audio: ACTIVE (Song orbits left & right around your headset)'
              : 'Turn ON 8D Spatial Audio (Song orbits in 360° around headset)'
          }
        >
          <span className="text-xs">🎧</span>
          <span className="hidden sm:inline text-[11px]">8D</span>
          {isSpatial8D && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#1d90f5] animate-pulse" />
          )}
        </button>

        {/* 🚪 Muffled Effect Toggle */}
        <button
          type="button"
          onClick={toggleMuffled}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer select-none ${
            isMuffled
              ? 'bg-[#1d90f5]/20 text-[#1d90f5] border border-[#1d90f5]/60 shadow-sm shadow-[#1d90f5]/30 ring-1 ring-[#1d90f5]/40'
              : 'text-[#b3b3b3] hover:text-white hover:bg-white/10 border border-transparent'
          }`}
          title={
            isMuffled
              ? 'Muffled Effect: ACTIVE (Song filtered like hearing from another room)'
              : 'Turn ON Muffled Effect (Lo-fi filter from behind a closed door)'
          }
        >
          <span className="text-xs">🚪</span>
          <span className="hidden sm:inline text-[11px]">Muffled</span>
          {isMuffled && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#1d90f5] animate-pulse" />
          )}
        </button>

        {/* Ambient Mixer Shortcut Button */}
        <button
          type="button"
          onClick={() => setActiveView(activeView === 'mixer' ? 'home' : 'mixer')}
          className={`relative p-1.5 rounded-full transition-colors cursor-pointer ${
            activeView === 'mixer'
              ? 'text-[#1d90f5] bg-white/10'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
          title="Ambient Sound Mixer"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5.75A.75.75 0 0 1 3.75 5h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75zm0 6.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12zm0 6.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75z" />
          </svg>
          {activeCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1d90f5] shadow-sm shadow-[#1d90f5]" />
          )}
        </button>

        {/* Volume Mute & Slider */}
        <div className="flex items-center gap-2 group">
          <button
            type="button"
            onClick={toggleMute}
            className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : volume < 0.5 ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>

          <div className="relative w-20 sm:w-24 h-3 flex items-center cursor-pointer">
            <div className="w-full h-1 group-hover:h-1.5 bg-[#4d4d4d] rounded-full overflow-hidden transition-all">
              <div
                className="h-full bg-white group-hover:bg-[#1d90f5] transition-colors"
                style={{ width: `${volumePercent}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
