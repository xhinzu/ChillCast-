'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { usePlayback } from '@/context/PlaybackContext';
import {
  RoomData,
  RoomMemberInfo,
  RoomQueueItem,
  RoomReactionEvent,
  RoomSettings,
} from '@/types/room';
import {
  calculateTargetPosition,
  measureClockOffset,
  shouldSeek,
} from '@/lib/rooms/sync';
import {
  canAddSong,
  canControlPlayback,
  canModifyQueueItem,
} from '@/lib/rooms/permissions';

export interface FloatingReaction extends RoomReactionEvent {
  id: string;
}

export interface RoomContextValue {
  room: RoomData | null;
  queue: RoomQueueItem[];
  members: RoomMemberInfo[];
  currentMember: RoomMemberInfo | null;
  isHost: boolean;
  canControl: boolean;
  canAdd: boolean;
  roomStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'kicked' | 'ended';
  errorMessage: string | null;
  reactions: FloatingReaction[];
  needsAutoplayUnlock: boolean;
  skipVotes: string[];
  hasVotedSkip: boolean;
  activeRoomCode: string | null;

  createRoom: (name?: string, settings?: Partial<RoomSettings>) => Promise<{ code?: string; error?: string }>;
  joinRoom: (code: string, nickname?: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  unlockAutoplay: () => void;
  sendReaction: (emoji: string) => Promise<void>;
  playRoom: () => Promise<void>;
  pauseRoom: () => Promise<void>;
  seekRoom: (positionMs: number) => Promise<void>;
  skipRoomTrack: () => Promise<void>;
  voteSkip: () => Promise<void>;
  addToQueue: (
    track: {
      videoId: string;
      title: string;
      artist: string;
      thumbnail: string;
      durationSec: number;
    },
    playNext?: boolean
  ) => Promise<{ success: boolean; warning?: string; error?: string }>;
  removeFromQueue: (queueItemId: string) => Promise<void>;
  reorderQueue: (queueItemId: string, newPosition: number) => Promise<void>;
  updateSettings: (settings: Partial<RoomSettings>, name?: string) => Promise<void>;
  kickMember: (targetUserId: string) => Promise<void>;
  transferHost: (newHostId: string) => Promise<void>;
  endRoom: () => Promise<void>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return ctx;
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const playback = usePlayback();

  const [room, setRoom] = useState<RoomData | null>(null);
  const [queue, setQueue] = useState<RoomQueueItem[]>([]);
  const [members, setMembers] = useState<RoomMemberInfo[]>([]);
  const [currentMember, setCurrentMember] = useState<RoomMemberInfo | null>(null);
  const [roomStatus, setRoomStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'error' | 'kicked' | 'ended'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [needsAutoplayUnlock, setNeedsAutoplayUnlock] = useState<boolean>(false);
  const [skipVotes, setSkipVotes] = useState<string[]>([]);
  const [clockOffsetMs, setClockOffsetMs] = useState<number>(0);

  const activeChannelRef = useRef<RealtimeChannel | null>(null);
  const lastSeekTimestampRef = useRef<number>(0);
  const hostLastSeenRef = useRef<number>(0);
  const roomRef = useRef<RoomData | null>(null);
  const queueRef = useRef<RoomQueueItem[]>([]);
  const currentMemberRef = useRef<RoomMemberInfo | null>(null);

  useEffect(() => {
    roomRef.current = room;
    queueRef.current = queue;
    currentMemberRef.current = currentMember;
  }, [room, queue, currentMember]);

  const isHost = Boolean(room && currentMember && room.host_id === currentMember.id);
  const canControl = Boolean(room && currentMember && canControlPlayback(room.settings, currentMember.id, room.host_id));
  const canAdd = Boolean(room && currentMember && canAddSong(room.settings, currentMember.id, room.host_id));
  const hasVotedSkip = Boolean(currentMember && skipVotes.includes(currentMember.id));

  // 1. Initial & periodic clock synchronization
  const syncClock = useCallback(async () => {
    try {
      const offset = await measureClockOffset(5);
      setClockOffsetMs(offset);
    } catch {
      // Retain previous offset if failed
    }
  }, []);

  useEffect(() => {
    if (roomStatus === 'connected') {
      const run = () => {
        void syncClock();
      };
      run();
      const interval = setInterval(run, 60000);
      return () => clearInterval(interval);
    }
  }, [roomStatus, syncClock]);

  // 2. Fetch full room details + queue from server
  const fetchRoomData = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}`, { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 404) {
          setErrorMessage('Room not found or expired.');
          setRoomStatus('error');
        }
        return null;
      }
      const data = await res.json();
      setRoom(data.room);
      setQueue(data.queue || []);
      return data;
    } catch (err) {
      console.error('Failed to fetch room data:', err);
      return null;
    }
  }, []);

  // 3. Audio synchronization: align playback engine with room state
  useEffect(() => {
    if (!room || roomStatus !== 'connected' || needsAutoplayUnlock) return;

    const currentTrackId = playback.currentTrack?.id;
    const currentRoomItem = queue.find((q) => q.id === room.state.queueItemId);

    if (!currentRoomItem) {
      // Room is idle with nothing playing
      return;
    }

    const estimatedServerNow = Date.now() + clockOffsetMs;
    const targetMs = calculateTargetPosition(room.state, estimatedServerNow, currentRoomItem.duration_sec);
    const targetSec = Math.max(0, targetMs / 1000);

    // If local player is on a different track, load the room track
    if (currentTrackId !== currentRoomItem.video_id) {
      playback.loadPlaylist(currentRoomItem.video_id, 'youtube', {
        title: currentRoomItem.title,
        artist: currentRoomItem.artist,
        duration: currentRoomItem.duration_sec,
        artworkUrl: currentRoomItem.thumbnail,
      }).then(() => {
        playback.seek(targetSec);
        if (room.state.status === 'playing') {
          playback.play().catch(() => {
            setNeedsAutoplayUnlock(true);
          });
        } else {
          playback.pause();
        }
      });
      return;
    }

    // Handle play/pause state synchronization
    if (room.state.status === 'playing' && !playback.isPlaying) {
      playback.play().catch(() => {
        setNeedsAutoplayUnlock(true);
      });
    } else if (room.state.status === 'paused' && playback.isPlaying) {
      playback.pause();
    }
  }, [room, queue, roomStatus, needsAutoplayUnlock, clockOffsetMs, playback]);

  // 4. Periodic drift monitor (every 4s compares actual player position to target)
  useEffect(() => {
    if (!room || roomStatus !== 'connected' || needsAutoplayUnlock) return;
    if (room.state.status !== 'playing' || !playback.currentTrack) return;

    const interval = setInterval(() => {
      const currentRoom = roomRef.current;
      if (!currentRoom || currentRoom.state.status !== 'playing') return;

      const currentRoomItem = queueRef.current.find((q) => q.id === currentRoom.state.queueItemId);
      if (!currentRoomItem) return;

      const estimatedServerNow = Date.now() + clockOffsetMs;
      const targetMs = calculateTargetPosition(currentRoom.state, estimatedServerNow, currentRoomItem.duration_sec);
      const actualMs = (playback.getCurrentTime ? playback.getCurrentTime() : playback.currentTime) * 1000;
      const now = Date.now();

      const { shouldSeek: mustSeek } = shouldSeek(
        actualMs,
        targetMs,
        lastSeekTimestampRef.current,
        now
      );

      if (mustSeek) {
        lastSeekTimestampRef.current = now;
        playback.seek(targetMs / 1000);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [room, roomStatus, needsAutoplayUnlock, clockOffsetMs, playback]);

  // 5. Host auto-advances queue on track completion
  useEffect(() => {
    if (!isHost || !room || roomStatus !== 'connected') return;

    if (playback.playbackState === 'ended' && room.state.queueItemId) {
      fetch(`/api/rooms/${room.code}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentQueueItemId: room.state.queueItemId,
          version: room.state.version,
        }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setRoom(data.room);
          setQueue(data.queue);
          setSkipVotes([]);
        }
      });
    }
  }, [isHost, room, playback.playbackState, roomStatus]);

  // 6. Host inactivity & disconnect monitor (promotes longest-present member after 60s)
  useEffect(() => {
    if (roomStatus !== 'connected' || !room || isHost) return;

    const interval = setInterval(async () => {
      const currentHostPresent = members.some((m) => m.id === room.host_id);
      if (currentHostPresent) {
        hostLastSeenRef.current = Date.now();
      } else {
        const timeSinceLastSeen = Date.now() - hostLastSeenRef.current;
        if (timeSinceLastSeen > 60000 && members.length > 0) {
          // Find longest-present member (lowest joinedAt)
          const sorted = [...members].sort((a, b) => a.joinedAt - b.joinedAt);
          const longestMember = sorted[0];

          if (longestMember && currentMember && longestMember.id === currentMember.id) {
            // Auto-promote self as new host
            try {
              const res = await fetch(`/api/rooms/${room.code}/promote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  newHostId: currentMember.id,
                  reason: 'host_disconnected',
                }),
              });
              if (res.ok) {
                hostLastSeenRef.current = Date.now();
                setRoom((prev) => (prev ? { ...prev, host_id: currentMember.id } : null));
              }
            } catch (err) {
              console.error('Failed to promote fallback host:', err);
            }
          }
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [roomStatus, room, isHost, members, currentMember]);

  // 7. Subscribe to Supabase Realtime channel
  const subscribeToRoom = useCallback((code: string, memberInfo: RoomMemberInfo) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      console.warn('Supabase client not initialized, running in fallback mode');
      return;
    }

    if (activeChannelRef.current) {
      activeChannelRef.current.unsubscribe();
    }

    const channel = supabase.channel(`room:${code}`, {
      config: {
        presence: { key: memberInfo.id },
        broadcast: { ack: false },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const activeMembers: RoomMemberInfo[] = [];

        Object.values(presenceState).forEach((presences) => {
          (presences as unknown as RoomMemberInfo[]).forEach((p) => {
            if (p && p.id && !activeMembers.some((m) => m.id === p.id)) {
              activeMembers.push(p);
            }
          });
        });

        // Ensure current host flag is accurately reflected
        const currentHostId = roomRef.current?.host_id;
        const normalized = activeMembers.map((m) => ({
          ...m,
          isHost: m.id === currentHostId,
        }));

        setMembers(normalized);
      })
      .on('broadcast', { event: 'state_updated' }, ({ payload }) => {
        if (payload?.state) {
          setRoom((prev) => (prev ? { ...prev, state: payload.state } : null));
        }
      })
      .on('broadcast', { event: 'queue_updated' }, ({ payload }) => {
        if (payload?.queue) {
          setQueue(payload.queue);
        } else {
          fetchRoomData(code);
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        if (payload?.emoji) {
          const reactionId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          setReactions((prev) => [...prev, { ...payload, id: reactionId }]);
          setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== reactionId));
          }, 3500);
        }
      })
      .on('broadcast', { event: 'member_kicked' }, ({ payload }) => {
        if (payload?.targetUserId && currentMemberRef.current?.id === payload.targetUserId) {
          setRoomStatus('kicked');
          setErrorMessage('You were removed from this room by the host.');
          playback.pause();
          channel.unsubscribe();
        }
      })
      .on('broadcast', { event: 'host_transferred' }, ({ payload }) => {
        if (payload?.newHostId) {
          setRoom((prev) => (prev ? { ...prev, host_id: payload.newHostId } : null));
        }
      })
      .on('broadcast', { event: 'room_ended' }, () => {
        setRoomStatus('ended');
        setErrorMessage('This room has ended.');
        playback.pause();
        channel.unsubscribe();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(memberInfo);
          setRoomStatus('connected');
        }
      });

    activeChannelRef.current = channel;
  }, [fetchRoomData, playback]);

  // 8. Join Room Action
  const joinRoom = useCallback(async (code: string, nickname?: string) => {
    setRoomStatus('connecting');
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to join room');
        setRoomStatus('error');
        return { success: false, error: data.error };
      }

      setRoom(data.room);
      setQueue(data.queue || []);
      setCurrentMember(data.memberInfo);
      setSkipVotes([]);
      hostLastSeenRef.current = Date.now();

      // Check autoplay permission
      setNeedsAutoplayUnlock(true);

      // Subscribe to Realtime channel
      subscribeToRoom(data.room.code, data.memberInfo);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error joining room';
      setErrorMessage(msg);
      setRoomStatus('error');
      return { success: false, error: msg };
    }
  }, [subscribeToRoom]);

  // 9. Create Room Action
  const createRoom = useCallback(async (name?: string, settings?: Partial<RoomSettings>) => {
    if (!user) {
      return { error: 'Sign in to host a room' };
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, settings }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Failed to create room' };
      }

      await joinRoom(data.room.code);
      return { code: data.room.code };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating room';
      return { error: msg };
    }
  }, [user, joinRoom]);

  // 10. Leave Room Action
  const leaveRoom = useCallback(() => {
    if (activeChannelRef.current) {
      activeChannelRef.current.unsubscribe();
      activeChannelRef.current = null;
    }
    setRoom(null);
    setQueue([]);
    setMembers([]);
    setCurrentMember(null);
    setRoomStatus('idle');
    setErrorMessage(null);
    setSkipVotes([]);
  }, []);

  // 11. Autoplay unlock gesture handler
  const unlockAutoplay = useCallback(() => {
    setNeedsAutoplayUnlock(false);
    if (room?.state.status === 'playing') {
      playback.play().catch(() => {});
    }
  }, [playback, room?.state.status]);

  // 12. Send Reaction Action
  const sendReaction = useCallback(async (emoji: string) => {
    if (!activeChannelRef.current || !currentMember) return;
    const event: RoomReactionEvent = {
      emoji,
      userId: currentMember.id,
      userName: currentMember.name,
      timestamp: Date.now(),
    };
    await activeChannelRef.current.send({
      type: 'broadcast',
      event: 'reaction',
      payload: event,
    });
  }, [currentMember]);

  // 13. Room Playback Controls (gated & routed through server API)
  const playRoom = useCallback(async () => {
    if (!room || !canControl) return;
    const currentMs = Math.round(playback.currentTime * 1000);
    const res = await fetch(`/api/rooms/${room.code}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'play',
        positionMs: currentMs,
        version: room.state.version,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoom(data.room);
    }
  }, [room, canControl, playback.currentTime]);

  const pauseRoom = useCallback(async () => {
    if (!room || !canControl) return;
    const currentMs = Math.round(playback.currentTime * 1000);
    const res = await fetch(`/api/rooms/${room.code}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pause',
        positionMs: currentMs,
        version: room.state.version,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoom(data.room);
    }
  }, [room, canControl, playback.currentTime]);

  const seekRoom = useCallback(async (positionMs: number) => {
    if (!room || !canControl) return;
    const res = await fetch(`/api/rooms/${room.code}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'seek',
        positionMs,
        version: room.state.version,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoom(data.room);
      lastSeekTimestampRef.current = Date.now();
    }
  }, [room, canControl]);

  const skipRoomTrack = useCallback(async () => {
    if (!room || !canControl) return;
    const res = await fetch(`/api/rooms/${room.code}/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentQueueItemId: room.state.queueItemId,
        version: room.state.version,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoom(data.room);
      setQueue(data.queue);
      setSkipVotes([]);
    }
  }, [room, canControl]);

  const voteSkip = useCallback(async () => {
    if (!room) return;
    const res = await fetch(`/api/rooms/${room.code}/vote-skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalMembers: Math.max(1, members.length),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.skipped) {
        setRoom(data.room);
        setQueue(data.queue);
        setSkipVotes([]);
      } else {
        setSkipVotes(data.votes || []);
      }
    }
  }, [room, members.length]);

  // 14. Room Queue Operations
  const addToQueue = useCallback(async (
    track: {
      videoId: string;
      title: string;
      artist: string;
      thumbnail: string;
      durationSec: number;
    },
    playNext: boolean = false
  ) => {
    if (!room || !canAdd) {
      return { success: false, error: 'You do not have permission to add songs' };
    }

    const res = await fetch(`/api/rooms/${room.code}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...track, playNext }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to add song' };
    }

    setQueue(data.queue);
    if (data.room) {
      setRoom(data.room);
    }

    return { success: true, warning: data.warning };
  }, [room, canAdd]);

  const removeFromQueue = useCallback(async (queueItemId: string) => {
    if (!room || !currentMember) return;
    const item = queue.find((q) => q.id === queueItemId);
    if (!item || !canModifyQueueItem(currentMember.id, room.host_id, item.added_by.id)) return;

    const res = await fetch(`/api/rooms/${room.code}/queue`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueItemId }),
    });
    if (res.ok) {
      const data = await res.json();
      setQueue(data.queue);
      if (data.room) setRoom(data.room);
    }
  }, [room, currentMember, queue]);

  const reorderQueue = useCallback(async (queueItemId: string, newPosition: number) => {
    if (!room || !currentMember) return;
    const item = queue.find((q) => q.id === queueItemId);
    if (!item || !canModifyQueueItem(currentMember.id, room.host_id, item.added_by.id)) return;

    const res = await fetch(`/api/rooms/${room.code}/queue`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueItemId, newPosition }),
    });
    if (res.ok) {
      const data = await res.json();
      setQueue(data.queue);
    }
  }, [room, currentMember, queue]);

  // 15. Room Host Management
  const updateSettings = useCallback(async (settings: Partial<RoomSettings>, name?: string) => {
    if (!room || !isHost) return;
    const res = await fetch(`/api/rooms/${room.code}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, name }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoom(data.room);
    }
  }, [room, isHost]);

  const kickMember = useCallback(async (targetUserId: string) => {
    if (!room || !isHost) return;
    await fetch(`/api/rooms/${room.code}/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });
    setMembers((prev) => prev.filter((m) => m.id !== targetUserId));
  }, [room, isHost]);

  const transferHost = useCallback(async (newHostId: string) => {
    if (!room || !isHost) return;
    const res = await fetch(`/api/rooms/${room.code}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newHostId, reason: 'transfer' }),
    });
    if (res.ok) {
      setRoom((prev) => (prev ? { ...prev, host_id: newHostId } : null));
    }
  }, [room, isHost]);

  const endRoom = useCallback(async () => {
    if (!room || !isHost) return;
    await fetch(`/api/rooms/${room.code}`, {
      method: 'DELETE',
    });
    leaveRoom();
  }, [room, isHost, leaveRoom]);

  const value: RoomContextValue = {
    room,
    queue,
    members,
    currentMember,
    isHost,
    canControl,
    canAdd,
    roomStatus,
    errorMessage,
    reactions,
    needsAutoplayUnlock,
    skipVotes,
    hasVotedSkip,
    activeRoomCode: room?.code || null,

    createRoom,
    joinRoom,
    leaveRoom,
    unlockAutoplay,
    sendReaction,
    playRoom,
    pauseRoom,
    seekRoom,
    skipRoomTrack,
    voteSkip,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    updateSettings,
    kickMember,
    transferHost,
    endRoom,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
