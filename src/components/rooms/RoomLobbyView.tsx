'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRoom } from '@/context/RoomContext';
import AuthModal from '@/components/auth/AuthModal';
import { normalizeRoomCode } from '@/lib/rooms/code';

interface RoomLobbyViewProps {
  onRoomJoined?: (code: string) => void;
}

export default function RoomLobbyView({ onRoomJoined }: RoomLobbyViewProps) {
  const { user, profile } = useAuth();
  const { createRoom, joinRoom } = useRoom();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createControl, setCreateControl] = useState<'host' | 'everyone'>('host');
  const [createAdd, setCreateAdd] = useState<'everyone' | 'host'>('everyone');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [joinNickname, setJoinNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const res = await createRoom(createName.trim() || undefined, {
        controlPlayback: createControl,
        addSongs: createAdd,
      });

      if (res.error) {
        setCreateError(res.error);
      } else if (res.code) {
        if (onRoomJoined) onRoomJoined(res.code);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating room';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    const code = normalizeRoomCode(joinCode);
    if (code.length !== 6) {
      setJoinError('Please enter a valid 6-character room code.');
      return;
    }

    if (!user && (joinNickname.trim().length < 2 || joinNickname.trim().length > 24)) {
      setJoinError('Guest nickname must be between 2 and 24 characters.');
      return;
    }

    setIsJoining(true);
    try {
      const res = await joinRoom(code, !user ? joinNickname.trim() : undefined);
      if (!res.success) {
        setJoinError(res.error || 'Failed to join room');
      } else if (onRoomJoined) {
        onRoomJoined(code);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error joining room';
      setJoinError(msg);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const urlMatch = raw.match(/\/together\/([A-Za-z0-9]{6})/);
    if (urlMatch) {
      setJoinCode(urlMatch[1].toUpperCase());
    } else {
      setJoinCode(raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Banner & Intro */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161616] border border-[#262626] text-xs font-medium text-neutral-400">
          <svg className="w-3.5 h-3.5 fill-current text-neutral-300" viewBox="0 0 24 24">
            <path d="M12 3a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h1a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H5v-3a7 7 0 1 1 14 0v3h-2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9z" />
          </svg>
          <span>Together</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Real-time Collaborative Music
        </h1>
        <p className="text-sm sm:text-base text-[#888888] max-w-xl mx-auto">
          Synchronize audio and lyrics with your friends. Audio streams directly on each device so your 8D spatial and vinyl effects stay personal.
        </p>
      </div>

      {/* Grid: Join Room & Create Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Join Room Card */}
        <div className="bg-[#121212] border border-[#242424] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-neutral-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Join a Room</h2>
                <p className="text-xs text-[#888888]">Enter a 6-character invite code</p>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={handleCodeChange}
                  placeholder="e.g. 7K9XP2"
                  maxLength={6}
                  className="w-full bg-[#181818] border border-[#333333] rounded-xl px-4 py-3 text-lg font-mono tracking-widest uppercase text-white focus:outline-none focus:border-white transition-colors text-center"
                />
              </div>

              {user ? (
                <div className="p-3 bg-[#181818] border border-[#282828] rounded-xl flex items-center gap-3">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#2a2a2a] text-white flex items-center justify-center text-xs font-bold">
                      {profile?.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs text-[#888888]">Joining as</p>
                    <p className="text-sm font-semibold text-white truncate">
                      {profile?.display_name || user.email?.split('@')[0]}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2">
                    Your Guest Nickname
                  </label>
                  <input
                    type="text"
                    value={joinNickname}
                    onChange={(e) => setJoinNickname(e.target.value)}
                    placeholder="e.g. ChillListener"
                    maxLength={24}
                    className="w-full bg-[#181818] border border-[#333333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              )}

              {joinError && (
                <p className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded-lg border border-red-900/40">
                  {joinError}
                </p>
              )}

              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isJoining ? 'Joining Room...' : 'Enter Room'}
              </button>
            </form>
          </div>
        </div>

        {/* Create Room Card */}
        <div className="bg-[#121212] border border-[#242424] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-neutral-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Host a Room</h2>
                <p className="text-xs text-[#888888]">Create an interactive listening space</p>
              </div>
            </div>

            {user ? (
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2">
                    Room Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Lo-Fi Study Room"
                    maxLength={40}
                    className="w-full bg-[#181818] border border-[#333333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[#888888] mb-1 font-semibold">Playback Controls</label>
                    <select
                      value={createControl}
                      onChange={(e) => setCreateControl(e.target.value as 'host' | 'everyone')}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-2 text-white focus:outline-none"
                    >
                      <option value="host">Host Only</option>
                      <option value="everyone">Everyone</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#888888] mb-1 font-semibold">Add Songs</label>
                    <select
                      value={createAdd}
                      onChange={(e) => setCreateAdd(e.target.value as 'everyone' | 'host')}
                      className="w-full bg-[#181818] border border-[#333333] rounded-lg px-2.5 py-2 text-white focus:outline-none"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="host">Host Only</option>
                    </select>
                  </div>
                </div>

                {createError && (
                  <div className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded-lg border border-red-900/40 flex items-center justify-between gap-2">
                    <span>{createError}</span>
                    {createError.toLowerCase().includes('signed in') && (
                      <button
                        type="button"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="underline text-white font-medium hover:text-neutral-200 shrink-0"
                      >
                        Sign in
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Creating Room...' : 'Create Room'}
                </button>
              </form>
            ) : (
              <div className="py-8 text-center space-y-4">
                <p className="text-sm text-[#aaaaaa]">
                  Hosting a room requires a free ChillCast account.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Sign in to host a room
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Safety & Privacy Notice */}
      <div className="p-3.5 rounded-xl bg-[#121212] border border-[#202020] text-xs text-[#777777] flex items-center gap-2.5">
        <svg className="w-4 h-4 text-[#888888] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <p>
          <strong className="text-neutral-300 font-medium">Privacy:</strong> Everyone in the room can see your display name, avatar, and queued songs. IP addresses are never stored.
        </p>
      </div>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      )}
    </div>
  );
}
