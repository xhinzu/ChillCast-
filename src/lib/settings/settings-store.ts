/**
 * MyuJiku Settings Store (v2)
 *
 * Typed settings store with migration from legacy individual localStorage keys.
 * Preserves every existing key, provides safe defaults, per-section reset,
 * and secret-safe JSON export/import.
 */

import { isTauri } from '@/lib/desktop';
import {
  DISCORD_PRESENCE_STORAGE_KEY,
  DISCORD_PRESENCE_HIDE_DETAILS_KEY,
  DISCORD_PRESENCE_SHARE_ROOM_KEY,
  DISCORD_CUSTOM_CLIENT_ID_KEY,
  DISCORD_SETTINGS_CHANGED_EVENT,
} from '@/lib/discord/presence-settings';
import {
  DISCORD_WEBHOOK_URL_KEY,
  DISCORD_WEBHOOK_ENABLED_KEY,
  DISCORD_WEBHOOK_BOT_NAME_KEY,
  DISCORD_WEBHOOK_DELETE_ON_STOP_KEY,
} from '@/lib/discord/webhook';

export const SETTINGS_STORAGE_KEY = 'myujiku_settings_v2';
export const SETTINGS_CHANGED_EVENT = 'myujiku_settings_changed';

export type ThemeMode = 'dark' | 'light' | 'amoled' | 'system';

export interface AppearanceSettings {
  theme: ThemeMode;
  accentPreset: string; // 'emerald' | 'spotify' | 'blue' | 'violet' | 'rose' | 'amber' | 'cyan' | 'lime' | 'orange' | 'magenta'
  customAccent: string | null;
  backgroundTint: string | null;
  surfaceTint: string | null;
  textColor: string | null;
  followCoverArtAccent: boolean;
  lyricsStageFollowsTheme: boolean;
  holdLogoToInspect: boolean;
}

export type EdgeGlowStyle =
  | 'ring'
  | 'corners'
  | 'top_bottom'
  | 'side_bars'
  | 'vignette'
  | 'spotlight'
  | 'aurora'
  | 'neon_tube'
  | 'rotating_conic'
  | 'ripple'
  | 'breathing';

export interface GlowSettings {
  uiGlowEnabled: boolean;
  uiGlowIntensity: number; // 0 to 1
  uiGlowColor: 'accent' | 'custom';
  uiGlowCustomColor: string;

  // Lyrics Edge Glow
  lyricsEdgeGlowEnabled: boolean;
  lyricsEdgeGlowColorSource: 'palette' | 'custom' | 'gradient';
  lyricsEdgeGlowCustomColor: string;
  lyricsEdgeGlowGradient: { stops: string[]; angle: number };
  lyricsEdgeGlowStyle: EdgeGlowStyle;
  lyricsEdgeGlowIntensity: number; // 0 to 1
  lyricsEdgeGlowThickness: number; // 2 to 16 px
  lyricsEdgeGlowSize: number; // blur 10 to 80 px
  lyricsEdgeGlowSpeed: number; // 0.5 to 2.5
  lyricsEdgeGlowMode: 'static' | 'breathing' | 'music_sync';
  lyricsEdgeGlowBlendMode: 'normal' | 'screen' | 'plus-lighter';
}

export interface AudioSettings {
  spatial8DEnabled: boolean;
  spatial8DSpeed: number; // Period in seconds: 4 to 20 s (default 8 s)
  spatial8DWidth: number; // 0.2 to 1.0 (default 0.85)
  muffledEnabled: boolean;
  muffledCutoff: number; // 300 to 2000 Hz (default 700 Hz)
}

export interface PlaybackSettings {
  autoplay: boolean;
  defaultVolume: number; // 0 to 1
}

export interface DesktopSettings {
  closeAction: 'tray' | 'quit' | 'ask';
  startWithWindows: boolean;
  startMinimizedToTray: boolean;
}

export interface DiscordSettings {
  presenceEnabled: boolean;
  hideDetails: boolean;
  shareRoom: boolean;
  customClientId: string;
  webhookUrl: string; // Sensitive, omitted from export
  webhookEnabled: boolean;
  webhookBotName: string;
  webhookDeleteOnStop: boolean;
}

export interface AccountSettings {
  syncPlaylistsAndLiked: boolean;
  syncSettings: boolean;
}

export interface ShortcutsSettings {
  bindings: Record<string, string>; // actionId -> keyCombo
}

export interface AppSettings {
  version: number;
  appearance: AppearanceSettings;
  glow: GlowSettings;
  audio: AudioSettings;
  playback: PlaybackSettings;
  desktop: DesktopSettings;
  discord: DiscordSettings;
  account: AccountSettings;
  shortcuts: ShortcutsSettings;
}

export const DEFAULT_KEY_BINDINGS: Record<string, string> = {
  play_pause: 'Space',
  seek_backward: 'ArrowLeft',
  seek_forward: 'ArrowRight',
  prev_track: 'ctrl+ArrowLeft',
  next_track: 'ctrl+ArrowRight',
  volume_down: 'ArrowDown',
  volume_up: 'ArrowUp',
  toggle_mute: 'KeyM',
  toggle_shuffle: 'KeyS',
  toggle_repeat: 'KeyR',
  toggle_like: 'KeyL',
  focus_search: 'Slash',
  open_lyrics: 'KeyG KeyL',
  fullscreen_lyrics: 'KeyF',
  toggle_8d: 'Digit8',
  toggle_muffled: 'KeyU',
  open_settings: 'ctrl+Comma',
  show_shortcuts_overlay: 'Shift+Slash',
  close_dialog: 'Escape',
};

export const DEFAULT_SETTINGS: AppSettings = {
  version: 2,
  appearance: {
    theme: 'dark',
    accentPreset: 'emerald',
    customAccent: null,
    backgroundTint: null,
    surfaceTint: null,
    textColor: null,
    followCoverArtAccent: false,
    lyricsStageFollowsTheme: false,
    holdLogoToInspect: true,
  },
  glow: {
    uiGlowEnabled: true,
    uiGlowIntensity: 0.6,
    uiGlowColor: 'accent',
    uiGlowCustomColor: '#10b981',
    lyricsEdgeGlowEnabled: false,
    lyricsEdgeGlowColorSource: 'palette',
    lyricsEdgeGlowCustomColor: '#10b981',
    lyricsEdgeGlowGradient: { stops: ['#10b981', '#3b82f6'], angle: 135 },
    lyricsEdgeGlowStyle: 'vignette',
    lyricsEdgeGlowIntensity: 0.7,
    lyricsEdgeGlowThickness: 4,
    lyricsEdgeGlowSize: 32,
    lyricsEdgeGlowSpeed: 1.0,
    lyricsEdgeGlowMode: 'music_sync',
    lyricsEdgeGlowBlendMode: 'screen',
  },
  audio: {
    spatial8DEnabled: false,
    spatial8DSpeed: 8,
    spatial8DWidth: 0.85,
    muffledEnabled: false,
    muffledCutoff: 700,
  },
  playback: {
    autoplay: true,
    defaultVolume: 0.8,
  },
  desktop: {
    closeAction: 'ask',
    startWithWindows: false,
    startMinimizedToTray: false,
  },
  discord: {
    presenceEnabled: false, // will be migrated with isTauri() check
    hideDetails: false,
    shareRoom: true,
    customClientId: '',
    webhookUrl: '',
    webhookEnabled: false,
    webhookBotName: 'MyuJiku',
    webhookDeleteOnStop: false,
  },
  account: {
    syncPlaylistsAndLiked: true,
    syncSettings: false,
  },
  shortcuts: {
    bindings: { ...DEFAULT_KEY_BINDINGS },
  },
};

let cachedSettings: AppSettings | null = null;

/**
 * Migration helper: loads legacy individual keys from localStorage
 * and merges them into the unified AppSettings schema without losing anything.
 */
function loadAndMigrateSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    let settings: AppSettings = { ...DEFAULT_SETTINGS };

    // 1. Try reading the unified v2 settings blob if it exists
    const rawV2 = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (rawV2) {
      try {
        const parsed = JSON.parse(rawV2);
        settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          appearance: { ...DEFAULT_SETTINGS.appearance, ...(parsed.appearance || {}) },
          glow: { ...DEFAULT_SETTINGS.glow, ...(parsed.glow || {}) },
          audio: { ...DEFAULT_SETTINGS.audio, ...(parsed.audio || {}) },
          playback: { ...DEFAULT_SETTINGS.playback, ...(parsed.playback || {}) },
          desktop: { ...DEFAULT_SETTINGS.desktop, ...(parsed.desktop || {}) },
          discord: { ...DEFAULT_SETTINGS.discord, ...(parsed.discord || {}) },
          account: { ...DEFAULT_SETTINGS.account, ...(parsed.account || {}) },
          shortcuts: {
            bindings: { ...DEFAULT_KEY_BINDINGS, ...(parsed.shortcuts?.bindings || {}) },
          },
        };
      } catch (err) {
        console.warn('[SettingsStore] Failed to parse v2 settings, falling back to migration:', err);
      }
    }

    // 2. Migration from individual legacy keys if present
    const legacyPresence = localStorage.getItem(DISCORD_PRESENCE_STORAGE_KEY);
    if (legacyPresence !== null) {
      settings.discord.presenceEnabled = legacyPresence === 'true';
    } else if (!rawV2) {
      // Default to ON in Tauri desktop app, OFF in browser
      settings.discord.presenceEnabled = isTauri();
    }

    const legacyHide = localStorage.getItem(DISCORD_PRESENCE_HIDE_DETAILS_KEY);
    if (legacyHide !== null) {
      settings.discord.hideDetails = legacyHide === 'true';
    }

    const legacyShareRoom = localStorage.getItem(DISCORD_PRESENCE_SHARE_ROOM_KEY);
    if (legacyShareRoom !== null) {
      settings.discord.shareRoom = legacyShareRoom === 'true';
    } else if (!rawV2) {
      settings.discord.shareRoom = isTauri();
    }

    const legacyCustomId = localStorage.getItem(DISCORD_CUSTOM_CLIENT_ID_KEY);
    if (legacyCustomId) {
      settings.discord.customClientId = legacyCustomId;
    }

    const legacyWebhookUrl = localStorage.getItem(DISCORD_WEBHOOK_URL_KEY);
    if (legacyWebhookUrl) {
      settings.discord.webhookUrl = legacyWebhookUrl;
    }

    const legacyWebhookEnabled = localStorage.getItem(DISCORD_WEBHOOK_ENABLED_KEY);
    if (legacyWebhookEnabled !== null) {
      settings.discord.webhookEnabled = legacyWebhookEnabled === 'true';
    }

    const legacyWebhookBot = localStorage.getItem(DISCORD_WEBHOOK_BOT_NAME_KEY);
    if (legacyWebhookBot) {
      settings.discord.webhookBotName = legacyWebhookBot;
    }

    const legacyWebhookDel = localStorage.getItem(DISCORD_WEBHOOK_DELETE_ON_STOP_KEY);
    if (legacyWebhookDel !== null) {
      settings.discord.webhookDeleteOnStop = legacyWebhookDel === 'true';
    }

    return settings;
  } catch (err) {
    console.warn('[SettingsStore] Migration error:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Returns current application settings
 */
export function getSettings(): AppSettings {
  if (!cachedSettings) {
    cachedSettings = loadAndMigrateSettings();
  }
  return cachedSettings;
}

/**
 * Saves entire settings object and syncs legacy keys
 */
export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  cachedSettings = settings;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

    // Mirror to legacy discord keys for maximum compatibility
    localStorage.setItem(DISCORD_PRESENCE_STORAGE_KEY, String(settings.discord.presenceEnabled));
    localStorage.setItem(DISCORD_PRESENCE_HIDE_DETAILS_KEY, String(settings.discord.hideDetails));
    localStorage.setItem(DISCORD_PRESENCE_SHARE_ROOM_KEY, String(settings.discord.shareRoom));
    if (settings.discord.customClientId) {
      localStorage.setItem(DISCORD_CUSTOM_CLIENT_ID_KEY, settings.discord.customClientId);
    } else {
      localStorage.removeItem(DISCORD_CUSTOM_CLIENT_ID_KEY);
    }
    if (settings.discord.webhookUrl) {
      localStorage.setItem(DISCORD_WEBHOOK_URL_KEY, settings.discord.webhookUrl);
    }
    localStorage.setItem(DISCORD_WEBHOOK_ENABLED_KEY, String(settings.discord.webhookEnabled));
    localStorage.setItem(DISCORD_WEBHOOK_BOT_NAME_KEY, settings.discord.webhookBotName);
    localStorage.setItem(DISCORD_WEBHOOK_DELETE_ON_STOP_KEY, String(settings.discord.webhookDeleteOnStop));

    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings }));
    window.dispatchEvent(new CustomEvent(DISCORD_SETTINGS_CHANGED_EVENT, { detail: settings.discord }));
  } catch (err) {
    console.error('[SettingsStore] Failed to save settings:', err);
  }
}

/**
 * Update partial settings
 */
export function updateSettings<K extends keyof AppSettings>(
  section: K,
  patch: Partial<AppSettings[K]>
): AppSettings {
  const current = getSettings();
  const updated: AppSettings = {
    ...current,
    [section]: {
      ...(typeof current[section] === 'object' && current[section] !== null ? current[section] : {}),
      ...patch,
    },
  };
  saveSettings(updated);
  return updated;
}

/**
 * Reset a specific section back to its safe defaults
 */
export function resetSection<K extends keyof AppSettings>(section: K): AppSettings {
  const current = getSettings();
  const updated: AppSettings = {
    ...current,
    [section]: JSON.parse(JSON.stringify(DEFAULT_SETTINGS[section])),
  };
  saveSettings(updated);
  return updated;
}

/**
 * Reset all settings back to default
 */
export function resetAllSettings(): AppSettings {
  const reset = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (isTauri()) {
    reset.discord.presenceEnabled = true;
    reset.discord.shareRoom = true;
  }
  saveSettings(reset);
  return reset;
}

/**
 * Export settings to a sanitized JSON string.
 * CRITICAL: Never includes secrets such as webhook URLs or tokens.
 */
export function exportSettings(): string {
  const current = getSettings();
  const sanitized = JSON.parse(JSON.stringify(current));

  // Strip secrets
  if (sanitized.discord) {
    sanitized.discord.webhookUrl = '';
  }

  return JSON.stringify(sanitized, null, 2);
}

/**
 * Import settings from a JSON string with safe schema validation
 */
export function importSettings(jsonStr: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid settings JSON format' };
    }

    const current = getSettings();
    const merged: AppSettings = {
      ...current,
      appearance: { ...current.appearance, ...(parsed.appearance || {}) },
      glow: { ...current.glow, ...(parsed.glow || {}) },
      audio: { ...current.audio, ...(parsed.audio || {}) },
      playback: { ...current.playback, ...(parsed.playback || {}) },
      desktop: { ...current.desktop, ...(parsed.desktop || {}) },
      discord: {
        ...current.discord,
        ...(parsed.discord || {}),
        // Retain existing webhook URL if imported object has empty/stripped URL
        webhookUrl: parsed.discord?.webhookUrl || current.discord.webhookUrl,
      },
      account: { ...current.account, ...(parsed.account || {}) },
      shortcuts: {
        bindings: {
          ...current.shortcuts.bindings,
          ...(parsed.shortcuts?.bindings || {}),
        },
      },
    };

    saveSettings(merged);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message || 'Failed to parse JSON' };
  }
}

/**
 * Subscribe to settings changes
 */
export function subscribeSettings(callback: (settings: AppSettings) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<AppSettings>;
    callback(custom.detail || getSettings());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    window.addEventListener('storage', () => callback(getSettings()));
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
    }
  };
}
