import type { RoomData, RoomQueueItem } from '@/types/room';

/**
 * Checks if a user is authorized to control playback (play, pause, seek, skip).
 */
export function canControlPlayback(room: RoomData, userId: string): boolean {
  if (room.host_id === userId) return true;
  return room.settings.controlPlayback === 'everyone';
}

/**
 * Checks if a user is authorized to add a song to the queue.
 */
export function canAddSong(room: RoomData, userId: string): boolean {
  if (room.settings.locked && room.host_id !== userId) return false;
  if (room.host_id === userId) return true;
  return room.settings.addSongs === 'everyone';
}

/**
 * Checks if a user can remove or reorder a specific queue item.
 * Allowed for the host or the person who added the item.
 */
export function canModifyQueueItem(room: RoomData, item: RoomQueueItem, userId: string): boolean {
  if (room.host_id === userId) return true;
  return item.added_by.id === userId;
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

