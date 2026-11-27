import type { EdgeGlowStyle } from '@/lib/settings/settings-store';

export type LyricsStyle =
  | 'classic'
  | 'visual'
  | 'constellation'
  | 'ship'
  | 'camera'
  | 'disc'
  | 'windows98'
  | 'fisheye'
  | 'codestyle'
  | 'branches'
  | 'web';

export type LyricsQuality = 'auto' | 'low' | 'high';
export type DiscRevealMode = 'phrase' | 'word';
export type DiscLayout = 'right' | 'left' | 'center';
export type DiscCaseStyle = 'jewel' | 'disc_only' | 'vinyl';
export type DiscFinish = 'silver' | 'cover';

export interface DiscTuningSettings {
  blurMaxPx: number;              // 0 to 8 (default 3)
  gapMs: number;                  // 0 to 300 (default 100)
  longPhraseThresholdSec: number; // 0.6 to 3.0 (default 1.2)
  longPhraseHoldAtSec: number;    // 0.3 to 2.0 (default 0.8)
  tiltDeg: number;                // 0 to 15 (default 5)
  driftXPct: number;              // 0 to 15 (default 5)
  driftYPct: number;              // 0 to 15 (default 6)
  driftXPeriodSec: number;        // 1.5 to 10 (default 4.3)
  driftYPeriodSec: number;        // 1.5 to 10 (default 3.6)
  scalePulsePct: number;          // 0 to 0.15 (default 0.04)
  scalePulsePeriodSec: number;    // 1.5 to 8 (default 3.0)
  spinModPct: number;             // 0 to 0.6 (default 0.3)
  spinModPeriodSec: number;       // 0.5 to 5 (default 1.7)
}

export interface DiscStyleSettings {
  revealMode: DiscRevealMode;
  wordsPerPhrase: 1 | 2 | 3 | 4;
  buildupStrength: number; // 0 to 1
  layout: DiscLayout;
  caseStyle: DiscCaseStyle;
  discFinish: DiscFinish;
  spinPeriodSec: number;   // 4 to 30
  floatAmount: number;     // 0 to 2
  tiltAmount: number;      // 0 to 2
  tiltPeriodSec: number;   // 2 to 6
  syncTiltToBeat: boolean;
  beatPulse: boolean;
  showCase: boolean;
  tuning: DiscTuningSettings;
}

export const DEFAULT_DISC_TUNING: DiscTuningSettings = {
  blurMaxPx: 3,
  gapMs: 100,
  longPhraseThresholdSec: 1.2,
  longPhraseHoldAtSec: 0.8,
  tiltDeg: 5,
  driftXPct: 5,
  driftYPct: 6,
  driftXPeriodSec: 4.3,
  driftYPeriodSec: 3.6,
  scalePulsePct: 0.04,
  scalePulsePeriodSec: 3.0,
  spinModPct: 0.3,
  spinModPeriodSec: 1.7,
};

export const DEFAULT_DISC_SETTINGS: DiscStyleSettings = {
  revealMode: 'phrase',
  wordsPerPhrase: 3,
  buildupStrength: 1,
  layout: 'right',
  caseStyle: 'jewel',
  discFinish: 'silver',
  spinPeriodSec: 9,
  floatAmount: 1,
  tiltAmount: 1,
  tiltPeriodSec: 3.0,
  syncTiltToBeat: false,
  beatPulse: true,
  showCase: true,
  tuning: { ...DEFAULT_DISC_TUNING },
};

export type LyricsFont =
  | 'inter'
  | 'nunito'
  | 'newsreader'
  | 'arimo'
  | 'nunito_sans'
  | 'jost'
  | 'playfair';

export type EdgeGlowMode = 'music_sync' | 'static' | 'breathing';
export type EdgeGlowColorSource = 'artwork' | 'custom' | 'accent';
export type EdgeGlowStyleOption = EdgeGlowStyle;

export type VisualStyle = 'illustrated' | 'line' | 'emoji' | 'off';
export type ImageFrequency = 'low' | 'normal' | 'high';
export type EffectFrequency = 'low' | 'normal' | 'high';
export type EffectStrength = 'subtle' | 'normal' | 'strong';

export const DEFAULT_INTENSE_EFFECTS = false;

export interface Windows98StyleSettings {
  titlebarTheme: 'xp_blue' | 'classic_navy' | 'teal' | 'silver';
  desktopWallpaper: 'bliss' | 'teal_98' | 'midnight';
  revealMode: 'word' | 'line';
  stickerMode: 'per_line' | 'per_song' | 'pinned';
  pinnedStickerIndex: number;
  stickerSizePx: number;
  showSticker: boolean;
  showNowPlayingCard: boolean;
  showMyujikuLogo: boolean;
  showTransportBar: boolean;
  windowWidthPct: number;
  clientOpacityPct: number;
  crtEnabled: boolean;
  crtIntensity: number;
  showDesktopIcons: boolean;
  showTaskbar: boolean;
  motionEnabled: boolean;
  motionStyle: 'handheld' | 'float' | 'beat_shake' | 'crt_wobble';
  motionIntensity: number;
  motionSpeed: number;
  motionTarget: 'desktop' | 'window';
}

export const DEFAULT_WINDOWS98_SETTINGS: Windows98StyleSettings = {
  titlebarTheme: 'xp_blue',
  desktopWallpaper: 'bliss',
  revealMode: 'word',
  stickerMode: 'per_line',
  pinnedStickerIndex: 2,
  stickerSizePx: 148,
  showSticker: true,
  showNowPlayingCard: true,
  showMyujikuLogo: true,
  showTransportBar: true,
  windowWidthPct: 78,
  clientOpacityPct: 88,
  crtEnabled: true,
  crtIntensity: 45,
  showDesktopIcons: true,
  showTaskbar: true,
  motionEnabled: true,
  motionStyle: 'handheld',
  motionIntensity: 50,
  motionSpeed: 100,
  motionTarget: 'desktop',
};

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
  edgeGlowColorSource?: EdgeGlowColorSource;
  edgeGlowCustomColor?: string;
  edgeGlowStyle?: EdgeGlowStyleOption;
  edgeGlowIntensity?: number; // 0 to 1
  iconsEnabled: boolean;     // legacy alias for wordImagesEnabled
  wordImagesEnabled: boolean;
  visualStyle: VisualStyle;
  imageFrequency: ImageFrequency;
  wordEffectsEnabled: boolean;
  effectFrequency: EffectFrequency;
  effectStrength: EffectStrength;
  screenShakeEnabled: boolean;
  intenseEffectsEnabled: boolean;
  naturalColors: boolean;
  cameraMovementEnabled: boolean;
  keepAwake: boolean;
  showOutsideLyricsPage: boolean;
  fixAllCaps: boolean;
  quality: LyricsQuality;
  devOverlayEnabled: boolean;
  disc: DiscStyleSettings;
  windows98: Windows98StyleSettings;
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
  edgeGlowColorSource: 'artwork',
  edgeGlowCustomColor: '#06b6d4',
  edgeGlowStyle: 'vignette',
  edgeGlowIntensity: 0.7,
  iconsEnabled: true,
  wordImagesEnabled: true,
  visualStyle: 'illustrated',
  imageFrequency: 'normal',
  wordEffectsEnabled: true,
  effectFrequency: 'normal',
  effectStrength: 'normal',
  screenShakeEnabled: true,
  intenseEffectsEnabled: DEFAULT_INTENSE_EFFECTS,
  naturalColors: true,
  cameraMovementEnabled: true,
  keepAwake: true,
  showOutsideLyricsPage: false,
  fixAllCaps: false,
  quality: 'auto',
  devOverlayEnabled: false,
  disc: { ...DEFAULT_DISC_SETTINGS, tuning: { ...DEFAULT_DISC_TUNING } },
  windows98: { ...DEFAULT_WINDOWS98_SETTINGS },
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
      'disc',
      'windows98',
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

    const wordEffectsEnabled =
      typeof parsed.wordEffectsEnabled === 'boolean'
        ? parsed.wordEffectsEnabled
        : true;

    const validEffectFrequencies: EffectFrequency[] = ['low', 'normal', 'high'];
    const effectFrequency: EffectFrequency = validEffectFrequencies.includes(parsed.effectFrequency)
      ? parsed.effectFrequency
      : 'normal';

    const validEffectStrengths: EffectStrength[] = ['subtle', 'normal', 'strong'];
    const effectStrength: EffectStrength = validEffectStrengths.includes(parsed.effectStrength)
      ? parsed.effectStrength
      : 'normal';

    const screenShakeEnabled =
      typeof parsed.screenShakeEnabled === 'boolean'
        ? parsed.screenShakeEnabled
        : !prefersReducedMotion;

    const intenseEffectsEnabled =
      typeof parsed.intenseEffectsEnabled === 'boolean'
        ? parsed.intenseEffectsEnabled
        : DEFAULT_INTENSE_EFFECTS;

    const naturalColors =
      typeof parsed.naturalColors === 'boolean'
        ? parsed.naturalColors
        : true;

    const parsedDisc = parsed.disc && typeof parsed.disc === 'object' ? parsed.disc : {};
    const parsedTuning =
      parsedDisc.tuning && typeof parsedDisc.tuning === 'object' ? parsedDisc.tuning : {};

    const disc: DiscStyleSettings = {
      ...DEFAULT_DISC_SETTINGS,
      ...parsedDisc,
      wordsPerPhrase:
        parsedDisc.wordsPerPhrase === 1 ||
        parsedDisc.wordsPerPhrase === 2 ||
        parsedDisc.wordsPerPhrase === 3 ||
        parsedDisc.wordsPerPhrase === 4
          ? parsedDisc.wordsPerPhrase
          : 3,
      tuning: {
        ...DEFAULT_DISC_TUNING,
        ...parsedTuning,
      },
    };

    const quality: LyricsQuality =
      parsed.quality === 'low' || parsed.quality === 'high' || parsed.quality === 'auto'
        ? parsed.quality
        : 'auto';

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
      wordEffectsEnabled,
      effectFrequency,
      effectStrength,
      screenShakeEnabled,
      intenseEffectsEnabled,
      naturalColors,
      quality,
      devOverlayEnabled: Boolean(parsed.devOverlayEnabled),
      disc,
      windows98: {
        ...DEFAULT_WINDOWS98_SETTINGS,
        ...(parsed.windows98 && typeof parsed.windows98 === 'object' ? parsed.windows98 : {}),
      },
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
