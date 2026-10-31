export type LyricsStyle =
  | 'classic'
  | 'visual'
  | 'constellation'
  | 'ship'
  | 'fisheye'
  | 'fisheye_visual'
  | 'codestyle'
  | 'codestyle_visual'
  | 'branches'
  | 'web';

export type LyricsFont =
  | 'inter'
  | 'nunito'
  | 'newsreader'
  | 'arimo'
  | 'nunito_sans'
  | 'jost'
  | 'playfair';

export type EdgeGlowMode = 'music_sync' | 'static';

export interface LyricsSettings {
  version: number;
  style: LyricsStyle;
  font: LyricsFont;
  textSize: number; // 70 to 150 (percentage)
  autoSyncColor: boolean;
  lyricColor: string;
  highlightColor: string;
  secondaryColor: string;
  edgeGlowEnabled: boolean;
  edgeGlowMode: EdgeGlowMode;
  edgeGlowThickness: number; // 2 to 14 px
  edgeGlowSize: number;      // 10 to 60 px
  iconsEnabled: boolean;
  keepAwake: boolean;
  showOutsideLyricsPage: boolean;
  fixAllCaps: boolean;
  offsets: Record<string, number>; // trackId -> offset seconds (-3.0 to +3.0)
}

export const DEFAULT_LYRICS_SETTINGS: LyricsSettings = {
  version: 1,
  style: 'classic',
  font: 'inter',
  textSize: 100,
  autoSyncColor: true,
  lyricColor: '#ffffff',
  highlightColor: '#ef4444',
  secondaryColor: '#888888',
  edgeGlowEnabled: true,
  edgeGlowMode: 'music_sync',
  edgeGlowThickness: 4,
  edgeGlowSize: 28,
  iconsEnabled: true,
  keepAwake: true,
  showOutsideLyricsPage: false,
  fixAllCaps: false,
  offsets: {},
};

export const LYRICS_SETTINGS_KEY = 'chillify_lyrics_settings_v1';

export function loadLyricsSettings(): LyricsSettings {
  if (typeof window === 'undefined') return DEFAULT_LYRICS_SETTINGS;
  try {
    const raw = localStorage.getItem(LYRICS_SETTINGS_KEY);
    if (!raw) return DEFAULT_LYRICS_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_LYRICS_SETTINGS,
      ...parsed,
      offsets: { ...parsed.offsets },
    };
  } catch {
    return DEFAULT_LYRICS_SETTINGS;
  }
}

export function saveLyricsSettings(settings: LyricsSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LYRICS_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('chillify_lyrics_settings_updated', { detail: settings }));
  } catch {
    // ignore
  }
}
