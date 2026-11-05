'use client';

import React, { useEffect, useState } from 'react';
import { useRoom } from '@/context/RoomContext';
import RoomQueuePanel from './RoomQueuePanel';
import RoomReactions from './RoomReactions';
import RoomSettingsModal from './RoomSettingsModal';
import { calculateTargetPosition } from '@/lib/rooms/sync';

interface RoomMainViewProps {
  onOpenLyrics?: () => void;
  onLeave?: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function RoomMainView({ onOpenLyrics, onLeave }: RoomMainViewProps) {
  const {
    room,
    queue,
    members,
    isHost,
    canControl,
    roomStatus,
    errorMessage,
    needsAutoplayUnlock,
    unlockAutoplay,
    playRoom,
    pauseRoom,
    seekRoom,
    skipRoomTrack,
    leaveRoom,
  } = useRoom();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [now, setNow] = useState(() => (typeof window !== 'undefined' ? Date.now() : 0));

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // States handling: kicked, ended, error, loading
  if (roomStatus === 'kicked') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center text-red-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Removed from Room</h2>
        <p className="text-sm text-[#888888] max-w-md">
          {errorMessage || 'The host has removed you from this room.'}
        </p>
        <button
          type="button"
          onClick={() => {
            leaveRoom();
            if (onLeave) onLeave();
          }}
          className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  if (roomStatus === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#1c1c1c] border border-[#2c2c2c] flex items-center justify-center text-[#888888]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Room Closed</h2>
        <p className="text-sm text-[#888888] max-w-md">
          {errorMessage || 'This listening room was closed by the host.'}
        </p>
        <button
          type="button"
          onClick={() => {
            leaveRoom();
            if (onLeave) onLeave();
          }}
          className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors"
        >
          Back to Rooms
        </button>
      </div>
    );
  }

  if (roomStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/30 border border-red-900/40 flex items-center justify-center text-red-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Unable to Connect</h2>
        <p className="text-sm text-red-400 max-w-md">{errorMessage || 'Unable to connect to room.'}</p>
        <button
          type="button"
          onClick={() => {
            leaveRoom();
            if (onLeave) onLeave();
          }}
          className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (roomStatus === 'connecting' || !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <h2 className="text-base font-semibold text-white">Connecting to Room...</h2>
        <p className="text-xs text-[#888888]">Synchronizing with listeners</p>
      </div>
    );
  }

  const currentQueueItem = queue.find((q) => q.id === room.state.queueItemId);
  const isPlaying = room.state.status === 'playing';

  // Target synced progress calculation
  const targetMs = calculateTargetPosition(room.state, now || room.state.serverTimeMs, currentQueueItem?.duration_sec || 0);
  const currentSec = Math.floor(targetMs / 1000);
  const totalSec = currentQueueItem?.duration_sec || 0;
  const progressPercent = totalSec > 0 ? Math.min(100, (currentSec / totalSec) * 100) : 0;

  const roomLink = typeof window !== 'undefined' ? `${window.location.origin}/together/${room.code}` : `/together/${room.code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${room.name} on ChillCast`,
          text: `Listen to music together in real-time on ChillCast. Code: ${room.code}`,
          url: roomLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canControl || totalSec <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seekMs = Math.round(ratio * totalSec * 1000);
    seekRoom(seekMs);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* Autoplay Unlock Gesture Bar */}
      {needsAutoplayUnlock && (
        <div className="p-4 bg-[#141414] border border-[#2e2e2e] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Audio Sync Ready</p>
              <p className="text-xs text-[#888888]">
                Click to enable live synced audio for this session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={unlockAutoplay}
            className="px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors shadow-sm shrink-0 cursor-pointer"
          >
            Start Listening
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-[#121212] border border-[#242424] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Room Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white truncate max-w-md">
              {room.name}
            </h1>
            {isHost && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="w-7 h-7 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#2e2e2e] flex items-center justify-center text-[#888888] hover:text-white transition-colors"
                title="Room settings"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#888888]">
            {/* Room Code Badge */}
            <span className="font-mono font-semibold text-white bg-[#1c1c1c] px-2.5 py-0.5 rounded-md border border-[#333333] tracking-wider text-[11px]">
              {room.code}
            </span>

            <button
              type="button"
              onClick={copyCode}
              className="px-2 py-0.5 rounded-md bg-[#1a1a1a] hover:bg-[#252525] hover:text-white border border-[#2a2a2a] transition-colors text-[11px]"
            >
              {isCopiedCode ? 'Copied' : 'Copy Code'}
            </button>

            <button
              type="button"
              onClick={copyLink}
              className="px-2 py-0.5 rounded-md bg-[#1a1a1a] hover:bg-[#252525] hover:text-white border border-[#2a2a2a] transition-colors text-[11px]"
            >
              {isCopiedLink ? 'Copied' : 'Copy Link'}
            </button>

            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={shareNative}
                className="px-2 py-0.5 rounded-md bg-[#1a1a1a] hover:bg-[#252525] hover:text-white border border-[#2a2a2a] transition-colors text-[11px]"
              >
                Share
              </button>
            )}

            <span>•</span>
            <span className="text-[11px]">
              {members.length} / {room.settings.maxMembers} members
            </span>
          </div>
        </div>

        {/* Member Avatars & Leave Button */}
        <div className="flex items-center gap-3">
          {/* Member Avatars Overlap */}
          <div className="flex -space-x-2 overflow-hidden items-center">
            {members.slice(0, 5).map((m) => (
              <div
                key={m.id}
                title={`${m.name}${m.isHost ? ' (Host)' : ''}`}
                className="relative inline-block ring-2 ring-[#121212] rounded-full"
              >
                {m.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#2a2a2a] text-white flex items-center justify-center text-xs font-bold">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Presence Indicator */}
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-[#121212] rounded-full" />
              </div>
            ))}
            {members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-[#242424] text-xs font-semibold text-[#aaaaaa] flex items-center justify-center ring-2 ring-[#121212]">
                +{members.length - 5}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              leaveRoom();
              if (onLeave) onLeave();
            }}
            className="px-3 py-1 rounded-lg text-xs font-medium text-neutral-400 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#2e2e2e] transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Main Grid: Now Playing / Controls & Queue Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Synced Player & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Now Playing Synced Card */}
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
            {currentQueueItem ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentQueueItem.thumbnail}
                    alt={currentQueueItem.title}
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl object-cover shadow-2xl bg-[#1c1c1c] shrink-0"
                  />
                  <div className="text-center sm:text-left space-y-1.5 truncate w-full">
                    <span className="inline-block text-[10px] font-semibold tracking-wider text-neutral-400 bg-[#1c1c1c] px-2 py-0.5 rounded-full border border-[#2a2a2a]">
                      Live Synced
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                      {currentQueueItem.title}
                    </h2>
                    <p className="text-xs text-[#888888] truncate">{currentQueueItem.artist}</p>

                    <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-[11px] text-[#666666]">
                      <span>Queued by {currentQueueItem.added_by.name}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Timestamps */}
                <div className="space-y-1.5">
                  <div
                    onClick={handleSeekClick}
                    className={`w-full h-1.5 rounded-full bg-[#242424] overflow-hidden relative ${
                      canControl ? 'cursor-pointer hover:h-2 transition-all' : 'cursor-default'
                    }`}
                  >
                    <div
                      className="h-full bg-white transition-[width] duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#888888] font-mono">
                    <span>{formatTime(currentSec)}</span>
                    <span>{formatTime(totalSec)}</span>
                  </div>
                </div>

                {/* Controls & Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#202020]">
                  {/* Lyrics Shortcut */}
                  {onOpenLyrics && (
                    <button
                      type="button"
                      onClick={onOpenLyrics}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#242424] text-xs font-semibold text-neutral-300 hover:text-white border border-[#2a2a2a] transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                      <span>Live Lyrics</span>
                    </button>
                  )}

                  {/* Playback Controls (Permission-Gated) */}
                  <div className="flex items-center gap-3">
                    {/* Play / Pause */}
                    <button
                      type="button"
                      disabled={!canControl}
                      onClick={() => (isPlaying ? pauseRoom() : playRoom())}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${
                        canControl
                          ? 'bg-white text-black hover:scale-105 active:scale-95 cursor-pointer shadow-md'
                          : 'bg-[#222222] text-[#555555] cursor-not-allowed'
                      }`}
                      title={canControl ? (isPlaying ? 'Pause' : 'Play') : 'Host-controlled playback'}
                    >
                      {isPlaying ? (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    {/* Next Track */}
                    <button
                      type="button"
                      disabled={!canControl}
                      onClick={skipRoomTrack}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform ${
                        canControl
                          ? 'bg-[#1e1e1e] hover:bg-[#282828] text-white hover:scale-105 cursor-pointer border border-[#333333]'
                          : 'bg-[#161616] text-[#444444] cursor-not-allowed border border-[#242424]'
                      }`}
                      title={canControl ? 'Skip Track' : 'Host-controlled playback'}
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                      </svg>
                    </button>
                  </div>

                  {!canControl && (
                    <span className="text-[11px] text-[#666666]">
                      Host-only controls
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#181818] border border-[#242424] flex items-center justify-center text-[#555555]">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white">Queue is empty</h3>
                <p className="text-xs text-[#888888] max-w-sm">
                  Search tracks or browse playlists and click &quot;＋ Room&quot; to queue up songs.
                </p>
              </div>
            )}
          </div>

          {/* Reactions Bar */}
          <div className="flex justify-center">
            <RoomReactions />
          </div>
        </div>

        {/* Right Column: Queue Panel (5 cols) */}
        <div className="lg:col-span-5 h-[560px]">
          <RoomQueuePanel />
        </div>
      </div>

      {/* Host Settings Modal */}
      {isSettingsOpen && (
        <RoomSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
