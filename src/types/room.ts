export type PlaybackControlPermission = 'host' | 'everyone';
export type AddSongPermission = 'everyone' | 'host';

export interface RoomSettings {
  controlPlayback: PlaybackControlPermission;
  addSongs: AddSongPermission;
  locked: boolean;
  maxMembers: number; // default 12, hard cap 20
}

export interface RoomPlaybackState {
  queueItemId: string | null;
  status: 'playing' | 'paused';
  positionMs: number;
  serverTimeMs: number;
  version: number;
}

export interface RoomMemberInfo {
  id: string; // user id or guest_...
  name: string;
  avatar: string | null;
  isHost: boolean;
  isGuest: boolean;
  joinedAt: number;
}

export interface RoomQueueItem {
  id: string;
  room_code: string;
  position: number;
  video_id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration_sec: number;
  added_by: {
    id: string;
    name: string;
    avatar: string | null;
  };
  added_at: string;
}

export interface RoomData {
  code: string;
  name: string;
  host_id: string;
  settings: RoomSettings;
  state: RoomPlaybackState;
  created_at: string;
  last_active_at: string;
  ended_at: string | null;
}

export interface RoomReactionEvent {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
}

