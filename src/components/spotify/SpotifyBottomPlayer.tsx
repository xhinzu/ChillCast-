'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { useAmbient } from '@/context/AmbientContext';
import { useRoom } from '@/context/RoomContext';
import { copyDiscordCustomStatus } from '@/lib/discord/custom-status';
import { SavedPlaylistItem, CustomPlaylistTrack } from './AddSourceModal';
import { getSavedPlaylists, toggleLikedSong, PLAYLISTS_UPDATED_EVENT } from '@/lib/playlist-storage';
import Popover from '@/components/common/Popover';
import Toast from '@/components/common/Toast';
import AddToPlaylistMenu from './AddToPlaylistMenu';
import { Z_INDEX } from '@/constants/zIndex';
import {
  HeartIcon,
  MusicNoteIcon,
  HeadphonesIcon,
} from '@/components/common/MinimalIcons';

interface SpotifyBottomPlayerProps {
  showVideo: boolean;
  setShowVideo: (show: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  onToggleNowPlaying?: () => void;
  isNowPlayingOpen?: boolean;
}

export default function SpotifyBottomPlayer({
  showVideo,
  setShowVideo,
  activeView,
  setActiveView,
  onToggleNowPlaying,
  isNowPlayingOpen,
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
    isShuffle,
    isRepeat,
    toggleShuffle,
    toggleRepeat,
  } = usePlayback();

  const { activeCount } = useAmbient();
  const roomContext = useRoom();

  const isInConnectedRoom = Boolean(roomContext?.room && roomContext?.roomStatus === 'connected');
  const effectiveIsPlaying = isInConnectedRoom
    ? roomContext.room?.state?.status === 'playing'
    : isPlaying;

  const handleTogglePlay = () => {
    if (isInConnectedRoom) {
      if (roomContext.canControl) {
        if (effectiveIsPlaying) {
          roomContext.pauseRoom();
        } else {
          roomContext.playRoom();
        }
      }
      return;
    }
    togglePlay();
  };

  const handleSeek = (targetSec: number) => {
    if (isInConnectedRoom) {
      if (roomContext.canControl) {
        roomContext.seekRoom(targetSec * 1000);
      }
      return;
    }
    seek(targetSec);
  };

  const handleNextTrack = () => {
    if (isInConnectedRoom) {
      if (roomContext.canControl) {
        roomContext.skipRoomTrack();
      }
      return;
    }
    nextTrack();
  };

  // Scrubber dragging state
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubTime, setScrubTime] = useState<number>(0);

  // Playlists state for adding current track
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylistItem[]>([]);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState<boolean>(false);
  const playlistButtonRef = useRef<HTMLButtonElement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Derive isLiked directly from currentTrack and savedPlaylists
  const isLiked = Boolean(
    currentTrack &&
      savedPlaylists
        .find((p) => p.id === 'liked-songs')
        ?.tracks?.some((t) => t.id === currentTrack.id)
  );

  useEffect(() => {
    const loadPlaylists = () => {
      setSavedPlaylists(getSavedPlaylists());
    };
    loadPlaylists();
    window.addEventListener('storage', loadPlaylists);
    window.addEventListener(PLAYLISTS_UPDATED_EVENT, loadPlaylists);
    return () => {
      window.removeEventListener('storage', loadPlaylists);
      window.removeEventListener(PLAYLISTS_UPDATED_EVENT, loadPlaylists);
    };
  }, []);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleToggleLike = () => {
    if (!currentTrack) return;
    try {
      const { updated, isLikedNow } = toggleLikedSong({
        id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        duration: formatTime(duration),
        thumbnail: currentTrack.artworkUrl,
      });
      setSavedPlaylists(updated);
      setToastMessage(isLikedNow ? 'Added to Liked Songs' : 'Removed from Liked Songs');
    } catch {}
  };

  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  return (
    <footer
      className="w-full bg-transparent shrink-0 z-40 select-none"
      style={{ zIndex: Z_INDEX.playerBar }}
    >

      {/* ─────────────────────────────── MOBILE MINI-PLAYER (Floating above tab bar when song played) ─────────────────────────────── */}
      <div
        className={`md:hidden fixed bottom-[58px] inset-x-2 z-40 bg-[#161616]/95 backdrop-blur-xl border border-[#2c2c2c] rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
          currentTrack
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
      >
        {/* Thin progress bar across the top */}
        <div className="w-full h-[2.5px] bg-[#282828]">
          <div
            className="h-full bg-[#1d90f5] transition-none"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Single compact row — exactly like Spotify mobile mini-player */}
        <div className="flex items-center gap-3 px-3 h-[58px]">
          {/* Album Art */}
          <div className="relative w-[42px] h-[42px] rounded-lg overflow-hidden bg-[#242424] shrink-0 shadow-md">
            {currentTrack?.artworkUrl ? (
              <Image
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                fill
                sizes="42px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-zinc-800 to-zinc-900 flex items-center justify-center text-zinc-500">
                <MusicNoteIcon className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Title + Artist */}
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <p className="text-[13px] font-bold text-white truncate leading-tight">
              {currentTrack?.title || 'Playing Track'}
            </p>
            <p className="text-[11px] text-[#888888] truncate leading-tight mt-0.5">
              {currentTrack?.artist || 'Unknown Artist'}
            </p>
          </div>

          {/* Like */}
          <button
            type="button"
            onClick={handleToggleLike}
            className={`p-2 shrink-0 transition-colors cursor-pointer ${isLiked ? 'text-white' : 'text-[#888888]'}`}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <HeartIcon filled={isLiked} className="w-5 h-5" />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="w-[36px] h-[36px] shrink-0 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-transform shadow cursor-pointer"
            title={effectiveIsPlaying ? 'Pause' : 'Play'}
          >
            {effectiveIsPlaying ? (
              <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            ) : (
              <svg className="w-[18px] h-[18px] fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={handleNextTrack}
            className="p-2 shrink-0 text-[#b3b3b3] active:text-white transition-colors cursor-pointer"
            title="Next"
          >
            <svg className="w-[20px] h-[20px] fill-current" viewBox="0 0 24 24"><path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────── DESKTOP PLAYER (hidden below md, appears when song played) ─────────────────────────────── */}
      <div
        className={`hidden md:flex w-full px-6 items-center justify-between bg-black/95 backdrop-blur-xl border-[#242424] transition-all duration-300 ease-in-out ${
          currentTrack
            ? 'h-20 opacity-100 translate-y-0 border-t pointer-events-auto'
            : 'h-0 opacity-0 overflow-hidden border-t-0 py-0 pointer-events-none'
        }`}
      >
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
            <div className="w-full h-full bg-gradient-to-tr from-zinc-800 to-zinc-900 flex items-center justify-center text-zinc-500">
              <MusicNoteIcon className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <p
            className="text-xs sm:text-sm font-semibold text-white truncate hover:underline cursor-pointer"
            title={currentTrack?.title || 'No Track Selected'}
          >
            {currentTrack?.title || 'ChillCast • Ready'}
          </p>
          <p
            className="text-[11px] text-[#888888] truncate hover:underline hover:text-white cursor-pointer transition-colors"
            title={currentTrack?.artist || 'Ready'}
          >
            {currentTrack?.artist || 'Select a playlist or track'}
          </p>
        </div>

        {/* Heart / Like Button */}
        <button
          type="button"
          onClick={handleToggleLike}
          className={`p-1 transition-colors cursor-pointer ${
            isLiked ? 'text-white' : 'text-[#888888] hover:text-white'
          }`}
          title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
        >
          <HeartIcon filled={isLiked} className="w-5 h-5" />
        </button>

        {/* ＋ Add currently playing track to a Custom Playlist */}
        {currentTrack && (
          <div className="relative">
            <button
              ref={playlistButtonRef}
              type="button"
              onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
              aria-haspopup="menu"
              aria-expanded={showPlaylistMenu}
              className="p-1 text-[#888888] hover:text-white transition-colors cursor-pointer text-sm font-bold"
              title="Add current track to Custom Playlist"
            >
              ＋
            </button>
            <Popover
              triggerRef={playlistButtonRef}
              isOpen={showPlaylistMenu}
              onClose={() => setShowPlaylistMenu(false)}
              placement="top"
              align="start"
              ariaLabel="Add to Playlist"
            >
              <AddToPlaylistMenu
                currentTrack={currentTrack}
                duration={duration}
                savedPlaylists={savedPlaylists}
                onClose={() => setShowPlaylistMenu(false)}
                onAdded={(title) => setToastMessage(`Added to ${title}`)}
              />
            </Popover>
          </div>
        )}

        {/* Video Popover Button for YouTube */}
        {activeAdapterType === 'youtube' && (
          <button
            type="button"
            onClick={() => setShowVideo(!showVideo)}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              showVideo
                ? 'bg-white text-black border-white'
                : 'bg-[#181818] border-[#2e2e2e] text-[#888888] hover:text-white'
            }`}
            title={showVideo ? 'Hide Video Screen' : 'Show Video Screen'}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
            </svg>
          </button>
        )}

        {/* Copy Discord Custom Status Button */}
        {currentTrack && (
          <button
            type="button"
            onClick={async () => {
              const res = await copyDiscordCustomStatus(
                currentTrack.artist || 'Unknown Artist',
                currentTrack.title || 'Untitled'
              );
              if (res.success) {
                setToastMessage(`Copied Discord status: "${res.text}"`);
              }
            }}
            className="p-1.5 rounded-lg bg-[#181818] hover:bg-[#252525] border border-[#2e2e2e] text-[#888888] hover:text-[#5865F2] transition-colors cursor-pointer"
            title="Copy as Discord Custom Status"
            aria-label="Copy as Discord Custom Status"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
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
            onClick={toggleShuffle}
            className={`transition-colors cursor-pointer hidden sm:block ${
              isShuffle ? 'text-[#1d90f5] font-bold' : 'text-[#888888] hover:text-white'
            }`}
            title={isShuffle ? 'Shuffle is ON (Click to turn OFF)' : 'Enable Shuffle'}
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
            onClick={() => handleSeek(Math.max(0, currentTime - 5))}
            className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xs font-mono font-bold hidden sm:block px-1"
            title="Rewind 5s"
          >
            -5s
          </button>

          {/* Play / Pause - Authentic Circular Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow cursor-pointer"
            title={effectiveIsPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {effectiveIsPlaying ? (
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
            onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
            className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xs font-mono font-bold hidden sm:block px-1"
            title="Forward 5s"
          >
            +5s
          </button>

          {/* Next Track */}
          <button
            type="button"
            onClick={handleNextTrack}
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
            onClick={toggleRepeat}
            className={`transition-colors cursor-pointer hidden sm:block ${
              isRepeat ? 'text-[#1d90f5]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title={isRepeat ? 'Repeat is ON (Click to turn OFF)' : 'Enable Repeat'}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
          </button>
        </div>

        {/* Scrubber Timeline */}
        <div className="w-full flex items-center gap-2 text-[11px] font-mono text-[#b3b3b3]">
          <span className="w-9 text-right">{formatTime(displayTime)}</span>

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
              value={displayTime}
              onPointerDown={() => {
                setIsScrubbing(true);
                setScrubTime(currentTime);
              }}
              onChange={(e) => {
                setScrubTime(parseFloat(e.target.value));
              }}
              onPointerUp={(e) => {
                const targetSec = parseFloat((e.target as HTMLInputElement).value);
                handleSeek(targetSec);
                setIsScrubbing(false);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="w-9">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Right: 8D Spatial & Muffled Effects, Mixer shortcut, Volume */}
      <div className="flex items-center justify-end gap-2.5 w-1/3 min-w-[200px] sm:min-w-[260px]">
        {/* 8D Spatial Audio Toggle */}
        <button
          type="button"
          onClick={toggleSpatial8D}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer select-none ${
            isSpatial8D
              ? 'bg-white/15 text-white border border-white/30 shadow-sm ring-1 ring-white/20'
              : 'text-[#888888] hover:text-white hover:bg-white/10 border border-transparent'
          }`}
          title={
            isSpatial8D
              ? '8D Spatial Audio: ACTIVE (Song orbits left & right around your headset)'
              : 'Turn ON 8D Spatial Audio (Song orbits in 360° around headset)'
          }
        >
          <HeadphonesIcon className="w-3.5 h-3.5 text-zinc-300" />
          <span className="hidden sm:inline text-[11px]">8D</span>
          {isSpatial8D && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>

        {/* Muffled Effect Toggle */}
        <button
          type="button"
          onClick={toggleMuffled}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer select-none ${
            isMuffled
              ? 'bg-white/15 text-white border border-white/30 shadow-sm ring-1 ring-white/20'
              : 'text-[#888888] hover:text-white hover:bg-white/10 border border-transparent'
          }`}
          title={
            isMuffled
              ? 'Muffled Effect: ACTIVE (Song filtered like hearing from another room)'
              : 'Turn ON Muffled Effect (Lo-fi filter from behind a closed door)'
          }
        >
          <span className="hidden sm:inline text-[11px]">Muffled</span>
          {isMuffled && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>

        {/* Lyrics Button */}
        <button
          type="button"
          onClick={() => setActiveView(activeView === 'lyrics' ? 'home' : 'lyrics')}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            activeView === 'lyrics'
              ? 'text-white bg-white/20 ring-1 ring-white/30'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
          title="Live Synced Lyrics"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>

        {/* Ambient Mixer Shortcut Button */}
        <button
          type="button"
          onClick={() => setActiveView(activeView === 'ambience' || activeView === 'mixer' ? 'home' : 'ambience')}
          className={`relative p-1.5 rounded-full transition-colors cursor-pointer ${
            activeView === 'ambience' || activeView === 'mixer'
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

        {/* Now Playing View Toggle Button */}
        {onToggleNowPlaying && (
          <button
            type="button"
            onClick={onToggleNowPlaying}
            className={`p-1.5 rounded-full transition-colors cursor-pointer hidden md:flex ${
              isNowPlayingOpen ? 'text-[#1d90f5] bg-white/10' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title="Now Playing View (Toggle Right Panel)"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H5V5h9v12zm5 0h-3V5h3v12z" />
            </svg>
          </button>
        )}

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
      {/* end right column */}
      </div>
      {/* Confirmation Toast */}
      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </footer>
  );
}
