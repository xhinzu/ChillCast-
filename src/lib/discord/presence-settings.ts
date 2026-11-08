/**
 * Discord Presence Settings & LocalStorage Persistence for MyuJiku.
 *
 * Privacy Guarantees:
 * - Desktop App: Presence is ON by default (Spotify-style) with simple opt-out toggle.
 * - Web Browser: Presence is OFF by default.
 * - When OFF, no playback information is exposed to DOM or extensions.
 * - Privacy toggle "Hide song details" allows showing only "Listening to MyuJiku".
 * - Room link is an opt-out sub-toggle (default ON in desktop).
 */

import { isTauri, setDesktopDiscordClientId } from '@/lib/desktop';

export const DISCORD_PRESENCE_STORAGE_KEY = 'myujiku_discord_presence_enabled';
export const DISCORD_PRESENCE_HIDE_DETAILS_KEY = 'myujiku_discord_presence_hide_details';
export const DISCORD_PRESENCE_SHARE_ROOM_KEY = 'myujiku_discord_presence_share_room';
export const DISCORD_CUSTOM_CLIENT_ID_KEY = 'myujiku_discord_custom_client_id';
export const DISCORD_SETTINGS_CHANGED_EVENT = 'myujiku_discord_settings_changed';

export function getDiscordPresenceEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(DISCORD_PRESENCE_STORAGE_KEY);
    if (val === null) {
      // Default ON in desktop app (Spotify-like experience), OFF in browser
      return isTauri();
    }
    return val === 'true';
  } catch {
    return false;
  }
}

export function setDiscordPresenceEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCORD_PRESENCE_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent(DISCORD_SETTINGS_CHANGED_EVENT, { detail: { enabled } })
    );
  } catch (err) {
    console.warn('Failed to persist Discord presence setting:', err);
  }
}

export function getDiscordPresenceHideDetails(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DISCORD_PRESENCE_HIDE_DETAILS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDiscordPresenceHideDetails(hide: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCORD_PRESENCE_HIDE_DETAILS_KEY, hide ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent(DISCORD_SETTINGS_CHANGED_EVENT, { detail: { hideDetails: hide } })
    );
  } catch (err) {
    console.warn('Failed to persist Discord hide details setting:', err);
  }
}

export function getDiscordPresenceShareRoom(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(DISCORD_PRESENCE_SHARE_ROOM_KEY);
    if (val === null) {
      // Default ON in desktop, OFF in browser
      return isTauri();
    }
    return val === 'true';
  } catch {
    return false;
  }
}

export function setDiscordPresenceShareRoom(share: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCORD_PRESENCE_SHARE_ROOM_KEY, share ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent(DISCORD_SETTINGS_CHANGED_EVENT, { detail: { shareRoom: share } })
    );
  } catch (err) {
    console.warn('Failed to persist Discord share room setting:', err);
  }
}

export function getDiscordCustomClientId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(DISCORD_CUSTOM_CLIENT_ID_KEY) || '';
  } catch {
    return '';
  }
}

export function setDiscordCustomClientId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = id.trim();
    if (trimmed) {
      localStorage.setItem(DISCORD_CUSTOM_CLIENT_ID_KEY, trimmed);
    } else {
      localStorage.removeItem(DISCORD_CUSTOM_CLIENT_ID_KEY);
    }
    if (isTauri()) {
      setDesktopDiscordClientId(trimmed);
    }
    window.dispatchEvent(
      new CustomEvent(DISCORD_SETTINGS_CHANGED_EVENT, { detail: { customClientId: trimmed } })
    );
  } catch (err) {
    console.warn('Failed to persist Discord custom client ID:', err);
  }
}
