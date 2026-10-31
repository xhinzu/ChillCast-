export type LyricsStyle =
  | 'classic'
  | 'visual'
  | 'constellation'
  | 'ship'
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

export type QualitySetting = 'auto' | 'high' | 'low';

export type FisheyeCurvatureAxis = 'both' | 'vertical' | 'horizontal';

export type CameraMovementSetting = 'off' | 'subtle' | 'cinematic';

export type GlowStyle =
  | 'ring'
  | 'corners'
  | 'top_bottom'
  | 'sides'
  | 'vignette'
  | 'spotlight'
  | 'aurora'
  | 'neon_tube'
  | 'rotating_conic'
  | 'ripple'
  | 'breathing';

export type GlowColorSource = 'palette' | 'custom' | 'gradient' | 'palette_gradient';

export type GlowMode = 'static' | 'breathing' | 'music_sync';

export type GlowBlendMode = 'normal' | 'screen' | 'plus-lighter';

export type PaletteHarmonyMode =
  | 'match'
  | 'analogous'
  | 'complementary'
  | 'triadic'
  | 'split'
  | 'monochrome';

export type PalettePreset =
  | 'custom'
  | 'midnight'
  | 'crimson'
  | 'aurora'
  | 'sunset'
  | 'ocean'
  | 'mono';

export type BackgroundType =
  | 'black'
  | 'cover'
  | 'blurred'
  | 'custom_image'
  | 'custom_video'
  | 'gradient';

export type TextEffect =
  | 'glow'
  | 'neon'
  | 'distressed'
  | 'neon_distressed'
  | 'chromatic'
  | 'glitch';

export type EmojiFrequency = 'low' | 'normal' | 'high';

export interface LyricsSettings {
  version: number;
  style: LyricsStyle;
  font: LyricsFont;
  size: number; // 50 to 200 (percentage)
  textSize?: number; // legacy alias for backward compatibility

  // Quality & motion
  quality: QualitySetting;

  // Fisheye 2D curvature
  fisheyeStrength: number; // 0 to 100 (%)
  fisheyeAxis: FisheyeCurvatureAxis;

  // Camera system
  cameraMovement: CameraMovementSetting;
  cameraZoom: number; // 0.5 to 2.0

  // Colors & Palette
  autoSyncColor: boolean;
  lyricColor: string;
  highlightColor: string;
  secondaryColor: string;
  chroma: number; // 0 to 200 (%)
  harmonyMode: PaletteHarmonyMode;
  breathingColors: boolean;
  breathingPeriod: number; // 6 to 20 (seconds)
  textGradient: boolean;
  textGradientStops: string;
  palettePreset: PalettePreset;

  // Edge Glow / Lighting
  edgeGlowEnabled: boolean;
  glowStyle: GlowStyle;
  glowColorSource: GlowColorSource;
  glowCustomColor: string;
  glowGradient: string;
  glowIntensity: number; // 0 to 100
  glowThickness: number; // 2 to 30 (px)
  glowBlur: number; // 4 to 80 (px)
  glowSpeed: number; // 0.2 to 3.0
  glowMode: GlowMode;
  glowBlendMode: GlowBlendMode;

  // Background
  backgroundType: BackgroundType;
  backgroundDim: number; // 0 to 100 (%)
  backgroundBlur: number; // 0 to 60 (px)
  backgroundBrightness: number; // 0 to 200 (%)
  backgroundParallax: number; // 0 to 100 (%)

  // Overlays & Text effects
  masterOverlayEnabled: boolean;
  activeOverlays: string[]; // e.g. ['raindrops', 'snow', 'embers', etc.]
  overlayOpacity: number; // 0 to 100 (%)
  overlaySpeed: number; // 0.2 to 3.0
  overlayBlendMode: string;
  raindropsVariant: 'drizzle' | 'heavy';
  textEffect: TextEffect;

  // Emojis & Display
  iconsEnabled: boolean;
  emojiFrequency: EmojiFrequency;
  keepAwake: boolean;
  showOutsideLyricsPage: boolean;
  fixAllCaps: boolean;

  // Offsets per track
  offsets: Record<string, number>;
}

export const DEFAULT_LYRICS_SETTINGS: LyricsSettings = {
  version: 2,
  style: 'classic',
  font: 'inter',
  size: 100,
  textSize: 100,

  quality: 'auto',

  fisheyeStrength: 60,
  fisheyeAxis: 'both',

  cameraMovement: 'subtle',
  cameraZoom: 1.0,

  autoSyncColor: true,
  lyricColor: '#ffffff',
  highlightColor: '#ef4444',
  secondaryColor: '#888888',
  chroma: 100,
  harmonyMode: 'match',
  breathingColors: false,
  breathingPeriod: 10,
  textGradient: false,
  textGradientStops: 'linear-gradient(90deg, #ef4444, #f59e0b)',
  palettePreset: 'custom',

  edgeGlowEnabled: true,
  glowStyle: 'ring',
  glowColorSource: 'palette',
  glowCustomColor: '#ef4444',
  glowGradient: 'linear-gradient(45deg, #ef4444, #f59e0b)',
  glowIntensity: 65,
  glowThickness: 4,
  glowBlur: 28,
  glowSpeed: 1.0,
  glowMode: 'music_sync',
  glowBlendMode: 'normal',

  backgroundType: 'black',
  backgroundDim: 30,
  backgroundBlur: 20,
  backgroundBrightness: 100,
  backgroundParallax: 25,

  masterOverlayEnabled: false,
  activeOverlays: [],
  overlayOpacity: 50,
  overlaySpeed: 1.0,
  overlayBlendMode: 'screen',
  raindropsVariant: 'drizzle',
  textEffect: 'glow',

  iconsEnabled: true,
  emojiFrequency: 'normal',
  keepAwake: true,
  showOutsideLyricsPage: false,
  fixAllCaps: false,
  offsets: {},
};

export const LYRICS_SETTINGS_KEY = 'myujiku_lyrics_settings_v2';
export const LEGACY_SETTINGS_KEY = 'chillify_lyrics_settings_v1';

export function migrateLyricsSettings(rawObj: Record<string, unknown>): LyricsSettings {
  const base = { ...DEFAULT_LYRICS_SETTINGS };

  // 1. Style migration: remove 'fisheye_visual' -> 'fisheye', 'codestyle_visual' -> 'codestyle'
  let migratedStyle = (rawObj.style as string) || base.style;
  if (migratedStyle === 'fisheye_visual') {
    migratedStyle = 'fisheye';
  } else if (migratedStyle === 'codestyle_visual') {
    migratedStyle = 'codestyle';
  }
  const validStyles: LyricsStyle[] = [
    'classic',
    'visual',
    'constellation',
    'ship',
    'fisheye',
    'codestyle',
    'branches',
    'web',
  ];
  if (!validStyles.includes(migratedStyle as LyricsStyle)) {
    migratedStyle = 'classic';
  }

  // 2. Size migration: textSize -> size
  const size =
    typeof rawObj.size === 'number'
      ? rawObj.size
      : typeof rawObj.textSize === 'number'
      ? rawObj.textSize
      : base.size;

  // 3. Edge glow mode migration
  let glowMode: GlowMode = base.glowMode;
  if (rawObj.edgeGlowMode === 'static' || rawObj.edgeGlowMode === 'music_sync') {
    glowMode = rawObj.edgeGlowMode;
  } else if (
    rawObj.glowMode === 'static' ||
    rawObj.glowMode === 'music_sync' ||
    rawObj.glowMode === 'breathing'
  ) {
    glowMode = rawObj.glowMode;
  }

  const glowThickness =
    typeof rawObj.glowThickness === 'number'
      ? rawObj.glowThickness
      : typeof rawObj.edgeGlowThickness === 'number'
      ? rawObj.edgeGlowThickness
      : base.glowThickness;

  const glowBlur =
    typeof rawObj.glowBlur === 'number'
      ? rawObj.glowBlur
      : typeof rawObj.edgeGlowSize === 'number'
      ? rawObj.edgeGlowSize
      : base.glowBlur;

  const merged: LyricsSettings = {
    ...base,
    ...rawObj,
    version: 2,
    style: migratedStyle as LyricsStyle,
    size,
    textSize: size,
    glowMode,
    glowThickness,
    glowBlur,
    offsets: typeof rawObj.offsets === 'object' && rawObj.offsets !== null ? { ...(rawObj.offsets as Record<string, number>) } : {},
  };

  return merged;
}

export function loadLyricsSettings(): LyricsSettings {
  if (typeof window === 'undefined') return DEFAULT_LYRICS_SETTINGS;
  try {
    // Try primary key v2
    const rawV2 = localStorage.getItem(LYRICS_SETTINGS_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      return migrateLyricsSettings(parsed);
    }

    // Try legacy key v1
    const rawV1 = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      const migrated = migrateLyricsSettings(parsed);
      // Persist migrated to v2
      localStorage.setItem(LYRICS_SETTINGS_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return DEFAULT_LYRICS_SETTINGS;
  } catch {
    return DEFAULT_LYRICS_SETTINGS;
  }
}

export function saveLyricsSettings(settings: LyricsSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(settings);
    localStorage.setItem(LYRICS_SETTINGS_KEY, payload);
    window.dispatchEvent(new CustomEvent('myujiku_lyrics_settings_updated', { detail: settings }));
    window.dispatchEvent(new CustomEvent('chillify_lyrics_settings_updated', { detail: settings }));
  } catch {
    // ignore
  }
}
