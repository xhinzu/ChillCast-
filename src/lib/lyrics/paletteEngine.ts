/**
 * OKLCH Color Space & Harmony Engine
 * Provides accurate perceptual color transformations, Chroma boost/mute,
 * harmonious palette generation, and presets.
 */

import { PaletteHarmonyMode, PalettePreset, LyricsSettings } from './settings';

export interface OklchColor {
  l: number; // 0 to 1
  c: number; // 0 to ~0.4
  h: number; // 0 to 360 (degrees)
}

// Convert sRGB [0..255] to Linear sRGB
function sRgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// Convert Linear sRGB to sRGB [0..255]
function linearToSRgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}

// Hex to RGB
export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [239, 68, 68];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// RGB to Hex
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Hex to OKLCH
export function hexToOklch(hex: string): OklchColor {
  const [r, g, b] = hexToRgb(hex);
  const lr = sRgbToLinear(r);
  const lg = sRgbToLinear(g);
  const lb = sRgbToLinear(b);

  // Approximate LMS
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bO = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.hypot(a, bO);
  let h = (Math.atan2(bO, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { l: L, c: C, h };
}

// OKLCH to Hex
export function oklchToHex(col: OklchColor): string {
  const rad = (col.h * Math.PI) / 180;
  const a = col.c * Math.cos(rad);
  const b = col.c * Math.sin(rad);

  const l_ = col.l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = col.l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = col.l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = Math.pow(Math.max(0, l_), 3);
  const m3 = Math.pow(Math.max(0, m_), 3);
  const s3 = Math.pow(Math.max(0, s_), 3);

  const lr = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  return rgbToHex(linearToSRgb(lr), linearToSRgb(lg), linearToSRgb(lb));
}

// Adjust Chroma & Harmony in OKLCH
export function deriveHarmoniousPalette(
  baseHex: string,
  mode: PaletteHarmonyMode,
  chromaPercent: number
): { lyric: string; highlight: string; secondary: string } {
  const base = hexToOklch(baseHex);
  const chromaScale = Math.max(0, Math.min(2.0, chromaPercent / 100));

  let highlightH = base.h;
  let secondaryH = (base.h + 30) % 360;

  switch (mode) {
    case 'analogous':
      highlightH = (base.h + 30) % 360;
      secondaryH = (base.h - 30 + 360) % 360;
      break;
    case 'complementary':
      highlightH = (base.h + 180) % 360;
      secondaryH = base.h;
      break;
    case 'triadic':
      highlightH = (base.h + 120) % 360;
      secondaryH = (base.h + 240) % 360;
      break;
    case 'split':
      highlightH = (base.h + 150) % 360;
      secondaryH = (base.h + 210) % 360;
      break;
    case 'monochrome':
      highlightH = base.h;
      secondaryH = base.h;
      break;
    case 'match':
    default:
      highlightH = base.h;
      secondaryH = (base.h + 25) % 360;
      break;
  }

  // Active Highlight: High clarity, vibrant
  const highlightCol: OklchColor = {
    l: Math.max(0.62, Math.min(0.78, base.l > 0.4 ? base.l : 0.68)),
    c: Math.max(0.12, base.c) * chromaScale,
    h: highlightH,
  };

  // Secondary text: softer, balanced
  const secondaryCol: OklchColor = {
    l: 0.58,
    c: Math.max(0.04, base.c * 0.4) * chromaScale,
    h: secondaryH,
  };

  // High-contrast Main lyric text: off-white tinted very subtly with base hue
  const lyricCol: OklchColor = {
    l: 0.94,
    c: 0.015 * chromaScale,
    h: base.h,
  };

  return {
    lyric: oklchToHex(lyricCol),
    highlight: oklchToHex(highlightCol),
    secondary: oklchToHex(secondaryCol),
  };
}

// Named Presets
export const PALETTE_PRESETS: Record<
  Exclude<PalettePreset, 'custom'>,
  Partial<LyricsSettings>
> = {
  midnight: {
    lyricColor: '#f8fafc',
    highlightColor: '#818cf8',
    secondaryColor: '#64748b',
    glowCustomColor: '#6366f1',
    glowStyle: 'ring',
    glowGradient: 'linear-gradient(135deg, #4f46e5, #9333ea)',
    textGradient: true,
    textGradientStops: 'linear-gradient(90deg, #818cf8, #c084fc)',
  },
  crimson: {
    lyricColor: '#fff1f2',
    highlightColor: '#ef4444',
    secondaryColor: '#991b1b',
    glowCustomColor: '#dc2626',
    glowStyle: 'aurora',
    glowGradient: 'linear-gradient(135deg, #dc2626, #f97316)',
    textGradient: true,
    textGradientStops: 'linear-gradient(90deg, #ef4444, #f97316)',
  },
  aurora: {
    lyricColor: '#f0fdf4',
    highlightColor: '#10b981',
    secondaryColor: '#06b6d4',
    glowCustomColor: '#10b981',
    glowStyle: 'aurora',
    glowGradient: 'linear-gradient(135deg, #059669, #06b6d4, #8b5cf6)',
    textGradient: true,
    textGradientStops: 'linear-gradient(90deg, #10b981, #06b6d4)',
  },
  sunset: {
    lyricColor: '#fdf4ff',
    highlightColor: '#f59e0b',
    secondaryColor: '#ec4899',
    glowCustomColor: '#f59e0b',
    glowStyle: 'top_bottom',
    glowGradient: 'linear-gradient(135deg, #f59e0b, #ec4899)',
    textGradient: true,
    textGradientStops: 'linear-gradient(90deg, #f59e0b, #ec4899)',
  },
  ocean: {
    lyricColor: '#f0f9ff',
    highlightColor: '#0ea5e9',
    secondaryColor: '#0284c7',
    glowCustomColor: '#0284c7',
    glowStyle: 'ripple',
    glowGradient: 'linear-gradient(135deg, #0284c7, #38bdf8)',
    textGradient: true,
    textGradientStops: 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
  },
  mono: {
    lyricColor: '#fafafa',
    highlightColor: '#e4e4e7',
    secondaryColor: '#71717a',
    glowCustomColor: '#e4e4e7',
    glowStyle: 'neon_tube',
    glowGradient: 'linear-gradient(135deg, #ffffff, #a1a1aa)',
    textGradient: false,
    textGradientStops: 'linear-gradient(90deg, #ffffff, #a1a1aa)',
  },
};
