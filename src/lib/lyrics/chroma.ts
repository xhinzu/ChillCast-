/**
 * Deterministic Chroma (Per-Word RGB) Color System
 *
 * Provides deterministic golden-angle hue generation and OKLCH color synthesis
 * for live lyrics words and stages.
 *
 * Rules:
 * - Deterministic: (trackId + lineIndex + wordIndex) always yields the exact same hue.
 * - Consecutive words differ by golden angle (~137.5 deg) plus small seeded jitter,
 *   guaranteeing a circular hue separation >= 60 deg between adjacent words.
 * - OKLCH Lightness is fixed at ~0.78 for high legibility on dark/cover art scrims.
 * - Chroma is scaled by vividness (soft to neon).
 * - Colors are converted with gamut clipping to vibrant sRGB hex/rgb.
 * - Memoized by track + line + word + vividness to prevent render overhead.
 */

export interface ChromaColorInfo {
  hue: number;
  lightness: number;
  chroma: number;
  oklch: string;
  hex: string;
  rgb: [number, number, number];
  glowShadow: string;
  glowShadowSm: string;
  isLight: boolean;
}

const GOLDEN_ANGLE = 137.50776405;
const LINE_STEP = 73.12345;

function hashTrackId(trackId?: string): number {
  if (!trackId) return 0;
  let h = 0;
  for (let i = 0; i < trackId.length; i++) {
    h = (Math.imul(31, h) + trackId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededJitter(trackSeed: number, lineIndex: number, wordIndex: number): number {
  let n = (trackSeed ^ (lineIndex * 397) ^ (wordIndex * 7919)) | 0;
  n = (n ^ (n << 13)) | 0;
  n = (n ^ (n >>> 17)) | 0;
  n = (n ^ (n << 5)) | 0;
  // Bounded jitter in [-8, +8] degrees
  return (Math.abs(n) % 17) - 8;
}

/**
 * Convert OKLCH (L in [0,1], C in [0, ~0.4], hDeg in [0, 360]) to sRGB bytes [0..255]
 * with linear gamut clipping to preserve vibrancy.
 */
export function oklchToRgb(L: number, C: number, hDeg: number): [number, number, number] {
  const hRad = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let rLin = +4.07674347721 * l - 3.3077115913 * m + 0.2309699292 * s;
  let gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Gamut clipping to [0, 1]
  rLin = Math.max(0, Math.min(1, rLin));
  gLin = Math.max(0, Math.min(1, gLin));
  bLin = Math.max(0, Math.min(1, bLin));

  const toGamma = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;

  const r = Math.round(Math.max(0, Math.min(255, toGamma(rLin) * 255)));
  const g = Math.round(Math.max(0, Math.min(255, toGamma(gLin) * 255)));
  const bOut = Math.round(Math.max(0, Math.min(255, toGamma(bLin) * 255)));

  return [r, g, bOut];
}

/**
 * Return shortest angular difference between two hues on the [0, 360) color circle.
 */
export function getAngularHueDifference(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return Math.min(diff, 360 - diff);
}

// In-memory memoization cache
const chromaCache = new Map<string, ChromaColorInfo>();

/**
 * Calculate deterministic Chroma color info for a word.
 */
export function getWordChromaInfo(
  trackId: string | undefined,
  lineIndex: number,
  wordIndex: number,
  vividness = 80
): ChromaColorInfo {
  const safeVividness = Math.max(20, Math.min(100, typeof vividness === 'number' ? vividness : 80));
  const key = `${trackId || ''}:${lineIndex}:${wordIndex}:${safeVividness}`;
  const existing = chromaCache.get(key);
  if (existing) return existing;

  const trackSeed = hashTrackId(trackId);
  const trackOffset = trackSeed % 360;
  const jitter = seededJitter(trackSeed, lineIndex, wordIndex);

  const rawHue = (trackOffset + lineIndex * LINE_STEP + wordIndex * GOLDEN_ANGLE + jitter) % 360;
  const hue = Math.round(((rawHue + 360) % 360) * 10) / 10;

  // Fixed OKLCH lightness ~0.78 for great readability on dark backgrounds
  const lightness = 0.78;

  // Chroma scaled by Vividness setting (0.15 to 0.25)
  const vNorm = (safeVividness - 20) / 80; // 0 to 1
  const chroma = Math.round((0.15 + vNorm * 0.10) * 1000) / 1000;

  const rgb = oklchToRgb(lightness, chroma, hue);
  const hex =
    '#' +
    rgb
      .map((val) => val.toString(16).padStart(2, '0'))
      .join('');

  const oklch = `oklch(${lightness} ${chroma} ${hue}deg)`;

  // Relative luminance for contrast checks (marker boxes etc.)
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  const isLight = lum > 0.48;

  // Glow text-shadows using the word's exact hue
  const glowShadow = `0 0 4px ${hex}e6, 0 0 12px ${hex}b3, 0 0 28px ${hex}73, 0 0 56px ${hex}40`;
  const glowShadowSm = `0 0 3px ${hex}e6, 0 0 8px ${hex}b3, 0 0 18px ${hex}66`;

  const info: ChromaColorInfo = {
    hue,
    lightness,
    chroma,
    oklch,
    hex,
    rgb,
    glowShadow,
    glowShadowSm,
    isLight,
  };

  chromaCache.set(key, info);
  return info;
}

/**
 * Convenient shorthand returning the hex color string.
 */
export function getWordChromaColor(
  trackId: string | undefined,
  lineIndex: number,
  wordIndex: number,
  vividness = 80
): string {
  return getWordChromaInfo(trackId, lineIndex, wordIndex, vividness).hex;
}

/**
 * Clear the chroma cache when resetting or testing.
 */
export function clearChromaCache(): void {
  chromaCache.clear();
}
