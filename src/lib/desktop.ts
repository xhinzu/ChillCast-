/**
 * Desktop Interop Layer for MyuJiku
 * Thin abstraction providing feature detection and safe IPC calls to Tauri 2 backend.
 * All functions are completely inert when running in standard web browsers.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface PresencePayload {
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  paused: boolean;
  roomUrl?: string;
  hideDetails?: boolean;
}

export interface DiscordDebugInfo {
  lastPayloadSent: Record<string, unknown> | null;
  lastResponse: Record<string, unknown> | null;
  lastError: string | null;
  updateCount: number;
}

export type DiscordConnectionStatus =
  | { status: 'NotRunning' }
  | { status: 'Connecting' }
  | { status: 'Connected'; data: { username: string; displayName?: string; avatarUrl?: string } }
  | { status: 'Error'; data: { kind: string } };

export interface WebhookSendPayload {
  webhookUrl: string;
  method?: 'POST' | 'PATCH' | 'DELETE';
  messageId?: string;
  payload?: Record<string, unknown>;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
      event?: {
        listen: <T = unknown>(
          event: string,
          handler: (event: { payload: T }) => void
        ) => Promise<() => void>;
      };
    };
  }
}

/**
 * Returns true if running inside the Tauri desktop app
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.__TAURI_INTERNALS__ ||
    window.__TAURI__ ||
    (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window)
  );
}

/**
 * Query current Discord IPC connection status from the desktop backend
 */
export async function getDiscordStatus(): Promise<DiscordConnectionStatus> {
  if (!isTauri()) {
    return { status: 'NotRunning' };
  }
  try {
    return await invoke<DiscordConnectionStatus>('get_discord_status');
  } catch (err) {
    console.debug('[Desktop] get_discord_status error:', err);
    return { status: 'NotRunning' };
  }
}

/**
 * Listen for live Discord IPC connection status changes emitted by the backend
 */
export async function listenDiscordStatus(
  callback: (status: DiscordConnectionStatus) => void
): Promise<() => void> {
  if (!isTauri()) {
    return () => {};
  }
  try {
    const unlisten = await listen<DiscordConnectionStatus>('discord-status', (event) => {
      callback(event.payload);
    });
    return unlisten;
  } catch (err) {
    console.debug('[Desktop] listenDiscordStatus error:', err);
    return () => {};
  }
}

/**
 * Update Discord Rich Presence via Tauri backend IPC
 */
export async function setDesktopPresence(payload: PresencePayload): Promise<void> {
  if (!isTauri()) return;
  try {
    if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
      console.debug('[Desktop IPC Update] Sending set_presence:', payload);
    }
    await invoke('set_presence', { payload });
  } catch (err) {
    // Fail silently, never crash or block UI
    console.debug('[Desktop] set_presence error:', err);
  }
}

/**
 * Retrieve diagnostic information about the last payload sent to Discord and Discord's response
 */
export async function getDiscordDebugInfo(): Promise<DiscordDebugInfo> {
  if (!isTauri()) {
    return { lastPayloadSent: null, lastResponse: null, lastError: null, updateCount: 0 };
  }
  try {
    return await invoke<DiscordDebugInfo>('get_discord_debug_info');
  } catch (err) {
    console.debug('[Desktop] get_discord_debug_info error:', err);
    return { lastPayloadSent: null, lastResponse: null, lastError: String(err), updateCount: 0 };
  }
}

/**
 * Clear Discord Rich Presence via Tauri backend IPC
 */
export async function clearDesktopPresence(): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke('clear_presence');
  } catch (err) {
    console.debug('[Desktop] clear_presence error:', err);
  }
}

/**
 * Pushes a 10-second sample activity to Discord so the user can verify their status
 */
export async function sendDesktopTestPresence(): Promise<{ success: boolean; error?: string }> {
  if (!isTauri()) {
    return { success: false, error: 'Automatic Discord status requires the desktop app.' };
  }
  try {
    await invoke('send_test_presence');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Dynamically configure or update the Discord Client ID on the desktop backend
 */
export async function setDesktopDiscordClientId(clientId: string): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke('set_discord_client_id', { clientId });
  } catch (err) {
    console.debug('[Desktop] set_discord_client_id error:', err);
  }
}

/**
 * Send Discord Webhook request via Tauri backend IPC (bypasses browser CORS completely)
 */
export async function sendDesktopWebhook(
  options: WebhookSendPayload
): Promise<{ success: boolean; messageId?: string; error?: string; notFound?: boolean }> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  try {
    const res = await invoke<{
      success: boolean;
      messageId?: string;
      error?: string;
      notFound?: boolean;
    }>('send_discord_webhook', {
      webhookUrl: options.webhookUrl,
      method: options.method,
      messageId: options.messageId,
      payload: options.payload,
    });
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Hide the main window to the system tray (desktop only)
 */
export async function hideWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke('hide_window');
  } catch (err) {
    console.debug('[Desktop] hide_window error:', err);
  }
}

/**
 * Quit the application completely (clears Discord presence and exits)
 */
export async function quitApp(): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke('quit_app');
  } catch (err) {
    console.debug('[Desktop] quit_app error:', err);
  }
}

/**
 * Update the system tray icon tooltip with the current song info
 */
export async function updateTrayTooltip(title: string, artist: string): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke('update_tray_tooltip', { title, artist });
  } catch (err) {
    console.debug('[Desktop] update_tray_tooltip error:', err);
  }
}

/**
 * Listen for the window close requested event from Tauri
 */
export async function listenWindowCloseRequested(callback: () => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    const unlisten = await listen('window-close-requested', () => {
      callback();
    });
    return unlisten;
  } catch (err) {
    console.debug('[Desktop] listenWindowCloseRequested error:', err);
    return () => {};
  }
}

/**
 * Listen for tray playback control events
 */
export async function listenTrayControls(handlers: {
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}): Promise<() => void> {
  if (!isTauri()) return () => {};
  const unlistens: (() => void)[] = [];
  try {
    if (handlers.onPlayPause) {
      unlistens.push(await listen('tray-play-pause', () => handlers.onPlayPause?.()));
    }
    if (handlers.onNext) {
      unlistens.push(await listen('tray-next-track', () => handlers.onNext?.()));
    }
    if (handlers.onPrev) {
      unlistens.push(await listen('tray-prev-track', () => handlers.onPrev?.()));
    }
  } catch (err) {
    console.debug('[Desktop] listenTrayControls error:', err);
  }
  return () => {
    unlistens.forEach((fn) => fn());
  };
}
