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
        <div className="text-5xl">🚫</div>
        <h2 className="text-2xl font-bold text-white">You Were Removed</h2>
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
        <div className="text-5xl">👋</div>
        <h2 className="text-2xl font-bold text-white">Room Has Ended</h2>
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
        <div className="text-5xl">⚠️</div>
        <h2 className="text-2xl font-bold text-white">Room Error</h2>
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
        <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin" />
        <h2 className="text-xl font-bold text-white">Connecting to Room...</h2>
        <p className="text-sm text-[#888888]">Synchronizing with listeners</p>
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
          text: `Listen to music together in real-time on ChillCast! Code: ${room.code}`,
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
      {/* Autoplay Unlock Modal / Gesture Alert */}
      {needsAutoplayUnlock && (
        <div className="p-4 bg-gradient-to-r from-neutral-900 to-black border border-white/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔊</span>
            <div>
              <p className="text-sm font-bold text-white">Browser Audio Gesture Required</p>
              <p className="text-xs text-[#888888]">
                Click to unlock synced real-time audio playback for this session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={unlockAutoplay}
            className="px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
          >
            Join and start listening ▶
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
                className="text-xs text-[#888888] hover:text-white bg-[#1a1a1a] p-1.5 rounded-lg border border-[#333333]"
                title="Edit room settings"
              >
                ⚙️
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#888888]">
            {/* Room Code Badge */}
            <span className="font-mono font-bold text-white bg-[#1c1c1c] px-2.5 py-1 rounded-md border border-[#333333] tracking-wider">
              {room.code}
            </span>

            <button
              type="button"
              onClick={copyCode}
              className="px-2.5 py-1 rounded-md bg-[#1a1a1a] hover:bg-[#252525] hover:text-white border border-[#2a2a2a] transition-colors"
            >
              {isCopiedCode ? '✓ Copied Code' : 'Copy Code'}
            </button>

            <button
              type="button"
              onClick={copyLink}
              className="px-2.5 py-1 rounded-md bg-[#1a1a1a] hover:bg-[#252525] hover:text-white border border-[#2a2a2a] transition-colors"
            >
              {isCopiedLink ? '✓ Copied Link' : 'Copy Link'}
            </button>

            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={shareNative}
                className="px-2.5 py-1 rounded-md bg-[#1a1a1a] hover:bg-[#252525] hover:text-white border border-[#2a2a2a] transition-colors"
              >
                Share
              </button>
            )}

            <span>•</span>
            <span>
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
                {/* Host Crown Indicator */}
                {m.id === room.host_id && (
                  <span className="absolute -top-1.5 -right-1 text-[10px]">👑</span>
                )}
                {/* Presence Green Dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#121212] rounded-full" />
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
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 transition-colors"
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
                  <div className="text-center sm:text-left space-y-2 truncate w-full">
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      ● Live Synced Track
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                      {currentQueueItem.title}
                    </h2>
                    <p className="text-sm text-[#888888] truncate">{currentQueueItem.artist}</p>

                    <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-xs text-[#666666]">
                      <span>Added by {currentQueueItem.added_by.name}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Timestamps */}
                <div className="space-y-1.5">
                  <div
                    onClick={handleSeekClick}
                    className={`w-full h-2 rounded-full bg-[#242424] overflow-hidden relative ${
                      canControl ? 'cursor-pointer hover:h-2.5 transition-all' : 'cursor-default'
                    }`}
                  >
                    <div
                      className="h-full bg-white transition-[width] duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#888888]">
                    <span>{formatTime(currentSec)}</span>
                    <span>{formatTime(totalSec)}</span>
                  </div>
                </div>

                {/* Controls & Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#222222]">
                  {/* Lyrics Shortcut */}
                  {onOpenLyrics && (
                    <button
                      type="button"
                      onClick={onOpenLyrics}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-xs font-semibold text-neutral-300 hover:text-white border border-[#2e2e2e] transition-colors"
                    >
                      <span>🎤</span> Live Lyrics
                    </button>
                  )}

                  {/* Playback Controls (Permission-Gated) */}
                  <div className="flex items-center gap-4">
                    {/* Play / Pause */}
                    <button
                      type="button"
                      disabled={!canControl}
                      onClick={() => (isPlaying ? pauseRoom() : playRoom())}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-transform ${
                        canControl
                          ? 'bg-white text-black hover:scale-105 active:scale-95 cursor-pointer shadow-lg'
                          : 'bg-[#2a2a2a] text-[#666666] cursor-not-allowed'
                      }`}
                      title={canControl ? (isPlaying ? 'Pause' : 'Play') : 'Only host can control playback'}
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>

                    {/* Next Track */}
                    <button
                      type="button"
                      disabled={!canControl}
                      onClick={skipRoomTrack}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-transform ${
                        canControl
                          ? 'bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white hover:scale-105 cursor-pointer border border-[#333333]'
                          : 'bg-[#181818] text-[#555555] cursor-not-allowed'
                      }`}
                      title={canControl ? 'Skip Track' : 'Only host can skip track'}
                    >
                      ⏭
                    </button>
                  </div>

                  {!canControl && (
                    <span className="text-[11px] text-[#666666]">
                      🔒 Host-controlled playback
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-4xl">📻</span>
                <h3 className="text-lg font-bold text-white">No song currently playing</h3>
                <p className="text-xs text-[#888888] max-w-sm">
                  Add songs to the room queue from search results, trending songs, or playlists to get the music started!
                </p>
              </div>
            )}
          </div>

          {/* Floating Reactions Bar */}
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
