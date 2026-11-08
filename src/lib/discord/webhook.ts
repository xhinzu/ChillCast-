/**
 * Discord "Now Playing" Webhook Manager
 *
 * Persists webhook configuration strictly on the local device (localStorage).
 * Posts an embed on first track, and edits (PATCH) the same message on subsequent tracks.
 * Handles rate limits, message deletion (re-posts on 404), and optional cleanup on stop.
 * Works seamlessly in both standard web browsers (via /api/discord/webhook relay) and Tauri desktop.
 */

import { isTauri, sendDesktopWebhook } from '../desktop';

export const DISCORD_WEBHOOK_URL_KEY = 'myujiku_discord_webhook_url';
export const DISCORD_WEBHOOK_ENABLED_KEY = 'myujiku_discord_webhook_enabled';
export const DISCORD_WEBHOOK_BOT_NAME_KEY = 'myujiku_discord_webhook_bot_name';
export const DISCORD_WEBHOOK_DELETE_ON_STOP_KEY = 'myujiku_discord_webhook_delete_on_stop';
export const DISCORD_WEBHOOK_LAST_MSG_ID_KEY = 'myujiku_discord_webhook_last_msg_id';

export const DISCORD_WEBHOOK_REGEX =
  /^https:\/\/(?:(?:ptb\.|canary\.)?discord(?:app)?\.com)\/api\/webhooks\/\d{17,21}\/[A-Za-z0-9_-]+$/;

export interface WebhookConfig {
  url: string;
  enabled: boolean;
  botName: string;
  deleteOnStop: boolean;
}

export function getWebhookConfig(): WebhookConfig {
  if (typeof window === 'undefined') {
    return { url: '', enabled: false, botName: 'MyuJiku', deleteOnStop: false };
  }
  return {
    url: localStorage.getItem(DISCORD_WEBHOOK_URL_KEY) || '',
    enabled: localStorage.getItem(DISCORD_WEBHOOK_ENABLED_KEY) === 'true',
    botName: localStorage.getItem(DISCORD_WEBHOOK_BOT_NAME_KEY) || 'MyuJiku',
    deleteOnStop: localStorage.getItem(DISCORD_WEBHOOK_DELETE_ON_STOP_KEY) === 'true',
  };
}

export function setWebhookConfig(config: Partial<WebhookConfig>): void {
  if (typeof window === 'undefined') return;
  if (config.url !== undefined) localStorage.setItem(DISCORD_WEBHOOK_URL_KEY, config.url.trim());
  if (config.enabled !== undefined) localStorage.setItem(DISCORD_WEBHOOK_ENABLED_KEY, String(config.enabled));
  if (config.botName !== undefined) localStorage.setItem(DISCORD_WEBHOOK_BOT_NAME_KEY, config.botName.trim() || 'MyuJiku');
  if (config.deleteOnStop !== undefined) localStorage.setItem(DISCORD_WEBHOOK_DELETE_ON_STOP_KEY, String(config.deleteOnStop));
}

export function isValidDiscordWebhookUrl(url: string): boolean {
  return DISCORD_WEBHOOK_REGEX.test(url.trim());
}

// In-memory state for throttling & tracking
let lastWebhookSendTime = 0;
let lastPostedTrackKey = '';
let inFlightRequest = false;

interface PostTrackOptions {
  title: string;
  artist: string;
  coverUrl?: string;
  duration?: number;
  roomCode?: string;
}

function buildEmbedPayload(options: PostTrackOptions, botName: string) {
  const { title, artist, coverUrl, roomCode } = options;
  const siteUrl = 'https://myujiku.vercel.app';
  const listenUrl = roomCode ? `${siteUrl}/together/${roomCode}` : siteUrl;

  return {
    username: botName || 'MyuJiku',
    avatar_url: `${siteUrl}/myujiku-logo.png`,
    embeds: [
      {
        title: title || 'Unknown Track',
        description: `by **${artist || 'Unknown Artist'}**\n\n[▶ Listen on MyuJiku](${listenUrl})`,
        color: 0x1db954, // Spotify/MyuJiku accent green
        thumbnail: coverUrl ? { url: coverUrl } : undefined,
        footer: {
          text: roomCode ? `Room: ${roomCode} • MyuJiku Now Playing` : 'MyuJiku Now Playing',
          icon_url: `${siteUrl}/myujiku-logo.png`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function sendRequest(
  webhookUrl: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  messageId?: string,
  payload?: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string; notFound?: boolean }> {
  // If running in Tauri desktop, use Rust command to bypass browser CORS completely
  if (isTauri()) {
    return sendDesktopWebhook({ webhookUrl, method, messageId, payload });
  }

  // In browser, use server relay (/api/discord/webhook)
  const res = await fetch('/api/discord/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      webhookUrl,
      method,
      messageId,
      payload,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: data.error || `HTTP ${res.status}`,
      notFound: data.notFound,
    };
  }

  return { success: true, messageId: data.messageId };
}

/**
 * Updates or sends the Now Playing embed to the configured Discord webhook.
 * Automatically edits the existing message or creates a new one if deleted.
 */
export async function updateWebhookNowPlaying(options: PostTrackOptions): Promise<void> {
  const config = getWebhookConfig();
  if (!config.enabled || !isValidDiscordWebhookUrl(config.url)) return;

  const trackKey = `${options.title}---${options.artist}`;
  if (trackKey === lastPostedTrackKey) return;

  const now = Date.now();
  // Throttle to at most one update per 5 seconds
  if (now - lastWebhookSendTime < 5000 || inFlightRequest) return;

  inFlightRequest = true;
  lastWebhookSendTime = now;
  lastPostedTrackKey = trackKey;

  try {
    const payload = buildEmbedPayload(options, config.botName);
    const lastMsgId = localStorage.getItem(DISCORD_WEBHOOK_LAST_MSG_ID_KEY);

    if (lastMsgId) {
      // Attempt to PATCH the existing message
      const patchRes = await sendRequest(config.url, 'PATCH', lastMsgId, payload);
      if (patchRes.success) {
        return;
      }
      // If 404 (deleted message), fall through to POST a new one
      if (!patchRes.notFound) {
        console.warn('[Webhook] Failed to update message:', patchRes.error);
        return;
      }
    }

    // POST new message
    const postRes = await sendRequest(config.url, 'POST', undefined, payload);
    if (postRes.success && postRes.messageId) {
      localStorage.setItem(DISCORD_WEBHOOK_LAST_MSG_ID_KEY, postRes.messageId);
    }
  } catch (err) {
    console.warn('[Webhook] Error sending Now Playing update:', err);
  } finally {
    inFlightRequest = false;
  }
}

/**
 * Handles playback stopped / paused. If deleteOnStop is enabled, deletes the message.
 */
export async function handleWebhookPlaybackStopped(): Promise<void> {
  const config = getWebhookConfig();
  if (!config.enabled || !config.deleteOnStop || !isValidDiscordWebhookUrl(config.url)) return;

  const lastMsgId = localStorage.getItem(DISCORD_WEBHOOK_LAST_MSG_ID_KEY);
  if (!lastMsgId) return;

  try {
    await sendRequest(config.url, 'DELETE', lastMsgId);
    localStorage.removeItem(DISCORD_WEBHOOK_LAST_MSG_ID_KEY);
    lastPostedTrackKey = '';
  } catch (err) {
    console.warn('[Webhook] Failed to delete stop message:', err);
  }
}

/**
 * Tests sending a sample embed to the specified webhook URL.
 */
export async function testDiscordWebhook(
  url: string,
  botName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidDiscordWebhookUrl(url)) {
    return { success: false, error: 'Invalid Discord webhook URL format' };
  }

  const payload = {
    username: botName || 'MyuJiku',
    embeds: [
      {
        title: '🔔 Webhook Connected Successfully',
        description: 'MyuJiku will update this channel when you listen to music!\n\n[Open MyuJiku](https://myujiku.vercel.app)',
        color: 0x1db954,
        footer: { text: 'MyuJiku • Discord Webhook Test' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await sendRequest(url, 'POST', undefined, payload);
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
