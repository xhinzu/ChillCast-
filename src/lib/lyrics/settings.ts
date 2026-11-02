export type LyricsStyle =
  | 'classic'
  | 'visual'
  | 'constellation'
  | 'ship'
  | 'camera'
  | 'fisheye'
  | 'codestyle'
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

export type VisualStyle = 'illustrated' | 'line' | 'emoji' | 'off';
export type ImageFrequency = 'low' | 'normal' | 'high';

export interface LyricsSettings {
  version: number;
  style: LyricsStyle;
  font: LyricsFont;
  textSize: number; // 70 to 150 (percentage)
  autoSyncColor: boolean;
  lyricColor: string;
  highlightColor: string;
  secondaryColor: string;
  chromaEnabled: boolean;
  chromaSpeed: number;     // 10 to 100 (default 50 = medium)
  chromaVividness: number; // 20 to 100 (default 80 = vibrant/neon)
  edgeGlowEnabled: boolean;
  edgeGlowMode: EdgeGlowMode;
  edgeGlowThickness: number; // 2 to 14 px
  edgeGlowSize: number;      // 10 to 60 px
  iconsEnabled: boolean;     // legacy alias for wordImagesEnabled
  wordImagesEnabled: boolean;
  visualStyle: VisualStyle;
  imageFrequency: ImageFrequency;
  cameraMovementEnabled: boolean;
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
  chromaEnabled: false,
  chromaSpeed: 50,
  chromaVividness: 80,
  edgeGlowEnabled: true,
  edgeGlowMode: 'music_sync',
  edgeGlowThickness: 4,
  edgeGlowSize: 28,
  iconsEnabled: true,
  wordImagesEnabled: true,
  visualStyle: 'illustrated',
  imageFrequency: 'normal',
  cameraMovementEnabled: true,
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

    // Migration: fisheye_visual -> fisheye, codestyle_visual -> codestyle
    let style: LyricsStyle = parsed.style;
    if ((style as string) === 'fisheye_visual') {
      style = 'fisheye';
    } else if ((style as string) === 'codestyle_visual') {
      style = 'codestyle';
    }

    const validStyles: LyricsStyle[] = [
      'classic',
      'visual',
      'constellation',
      'ship',
      'camera',
      'fisheye',
      'codestyle',
      'branches',
      'web',
    ];
    if (!validStyles.includes(style)) {
      style = 'classic';
    }

    // Default camera movement to OFF if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cameraMovementEnabled =
      typeof parsed.cameraMovementEnabled === 'boolean'
        ? parsed.cameraMovementEnabled
        : !prefersReducedMotion;

    const chromaEnabled =
      typeof parsed.chromaEnabled === 'boolean' ? parsed.chromaEnabled : false;
    const chromaSpeed =
      typeof parsed.chromaSpeed === 'number'
        ? Math.max(10, Math.min(100, parsed.chromaSpeed))
        : 50;
    const chromaVividness =
      typeof parsed.chromaVividness === 'number'
        ? Math.max(20, Math.min(100, parsed.chromaVividness))
        : 80;

    // Migration: wordImagesEnabled from iconsEnabled
    const wordImagesEnabled =
      typeof parsed.wordImagesEnabled === 'boolean'
        ? parsed.wordImagesEnabled
        : typeof parsed.iconsEnabled === 'boolean'
        ? parsed.iconsEnabled
        : true;

    const validVisualStyles: VisualStyle[] = ['illustrated', 'line', 'emoji', 'off'];
    const visualStyle: VisualStyle = validVisualStyles.includes(parsed.visualStyle)
      ? parsed.visualStyle
      : 'illustrated';

    const validFrequencies: ImageFrequency[] = ['low', 'normal', 'high'];
    const imageFrequency: ImageFrequency = validFrequencies.includes(parsed.imageFrequency)
      ? parsed.imageFrequency
      : 'normal';

    return {
      ...DEFAULT_LYRICS_SETTINGS,
      ...parsed,
      style,
      cameraMovementEnabled,
      chromaEnabled,
      chromaSpeed,
      chromaVividness,
      iconsEnabled: wordImagesEnabled,
      wordImagesEnabled,
      visualStyle,
      imageFrequency,
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
