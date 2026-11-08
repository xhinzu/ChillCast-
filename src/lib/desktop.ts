/**
 * Desktop Interop Layer for MyuJiku
 * Thin abstraction providing feature detection and safe IPC calls to Tauri 2 backend.
 * All functions are inert when running in standard web browsers.
 */

export interface PresencePayload {
  title: string;
  artist: string;
  coverUrl?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  paused: boolean;
  roomUrl?: string;
}

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
    };
  }
}

/**
 * Returns true if running inside the Tauri desktop app
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

/**
 * Update Discord Rich Presence via Tauri backend IPC
 */
export async function setDesktopPresence(payload: PresencePayload): Promise<void> {
  if (!isTauri()) return;
  try {
    if (window.__TAURI__?.core?.invoke) {
      await window.__TAURI__.core.invoke('set_presence', { payload });
    }
  } catch (err) {
    // Fail silently, never crash or block UI
    console.debug('[Desktop] set_presence error:', err);
  }
}

/**
 * Clear Discord Rich Presence via Tauri backend IPC
 */
export async function clearDesktopPresence(): Promise<void> {
  if (!isTauri()) return;
  try {
    if (window.__TAURI__?.core?.invoke) {
      await window.__TAURI__.core.invoke('clear_presence');
    }
  } catch (err) {
    console.debug('[Desktop] clear_presence error:', err);
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
    if (window.__TAURI__?.core?.invoke) {
      const res = await window.__TAURI__.core.invoke<{ success: boolean; messageId?: string; error?: string; notFound?: boolean }>(
        'send_discord_webhook',
        { ...options }
      );
      return res;
    }
    throw new Error('Tauri invoke not found');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

