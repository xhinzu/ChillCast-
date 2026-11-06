/**
 * Discord Presence Settings & LocalStorage Persistence for MyuJiku.
 *
 * Privacy Guarantees:
 * - Default state is OFF (false).
 * - When OFF, no playback information is exposed to DOM or extensions.
 * - Only title, artist, cover URL, and app name are exposed when ON.
 * - Room link is an opt-in sub-toggle (default OFF).
 */

export const DISCORD_PRESENCE_STORAGE_KEY = 'myujiku_discord_presence_enabled';
export const DISCORD_PRESENCE_SHARE_ROOM_KEY = 'myujiku_discord_presence_share_room';
export const DISCORD_SETTINGS_CHANGED_EVENT = 'myujiku_discord_settings_changed';

export function getDiscordPresenceEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DISCORD_PRESENCE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDiscordPresenceEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCORD_PRESENCE_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent(DISCORD_SETTINGS_CHANGED_EVENT, { detail: { enabled } }));
  } catch (err) {
    console.warn('Failed to persist Discord presence setting:', err);
  }
}

export function getDiscordPresenceShareRoom(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DISCORD_PRESENCE_SHARE_ROOM_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDiscordPresenceShareRoom(share: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCORD_PRESENCE_SHARE_ROOM_KEY, share ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent(DISCORD_SETTINGS_CHANGED_EVENT, { detail: { shareRoom: share } }));
  } catch (err) {
    console.warn('Failed to persist Discord share room setting:', err);
  }
}
