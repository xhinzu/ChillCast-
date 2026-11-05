import type { RoomData, RoomQueueItem, RoomSettings } from '@/types/room';

/**
 * Checks if a user is authorized to control playback (play, pause, seek, skip).
 */
export function canControlPlayback(
  roomOrSettings: RoomData | RoomSettings,
  userId: string,
  hostId?: string
): boolean {
  const host = 'host_id' in roomOrSettings ? roomOrSettings.host_id : hostId;
  const settings = 'settings' in roomOrSettings ? roomOrSettings.settings : roomOrSettings;
  if (host === userId) return true;
  return settings.controlPlayback === 'everyone';
}

/**
 * Checks if a user is authorized to add a song to the queue.
 */
export function canAddSong(
  roomOrSettings: RoomData | RoomSettings,
  userId: string,
  hostId?: string
): boolean {
  const host = 'host_id' in roomOrSettings ? roomOrSettings.host_id : hostId;
  const settings = 'settings' in roomOrSettings ? roomOrSettings.settings : roomOrSettings;
  if (settings.locked && host !== userId) return false;
  if (host === userId) return true;
  return settings.addSongs === 'everyone';
}

/**
 * Checks if a user can remove or reorder a specific queue item.
 * Allowed for the host or the person who added the item.
 */
export function canModifyQueueItem(
  roomOrCallerId: RoomData | string,
  itemOrHostId: RoomQueueItem | string,
  callerOrAdderId?: string
): boolean {
  if (typeof roomOrCallerId === 'object' && typeof itemOrHostId === 'object') {
    const room = roomOrCallerId as RoomData;
    const item = itemOrHostId as RoomQueueItem;
    const userId = callerOrAdderId as string;
    if (room.host_id === userId) return true;
    return item.added_by.id === userId;
  }
  const callerId = roomOrCallerId as string;
  const hostId = itemOrHostId as string;
  const addedById = callerOrAdderId as string;
  if (callerId === hostId) return true;
  return callerId === addedById;
}

/**
 * Calculates number of votes required to pass a vote skip (> 50%).
 */
export function getRequiredSkipVotes(totalMembers: number): number {
  if (totalMembers <= 0) return 1;
  return Math.floor(totalMembers / 2) + 1;
}

/**
 * Checks if vote to skip threshold is met.
 * Condition: votes > half of total members (i.e. more than 50%).
 */
export function isVoteSkipPassed(voteCount: number, totalMembers: number): boolean {
  if (totalMembers <= 0) return false;
  const threshold = Math.floor(totalMembers / 2);
  return voteCount > threshold;
}

/**
 * Checks version de-duplication for track-end events.
 * Returns true if the event version matches current room state version.
 */
export function isValidTrackEndEvent(
  currentVersion: number,
  currentQueueItemId: string | null,
  eventVersion: number,
  eventQueueItemId: string
): boolean {
  if (currentQueueItemId !== eventQueueItemId) return false;
  return currentVersion === eventVersion;
}
