import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

interface PaletteResult {
  lyric: string;
  highlight: string;
  secondary: string;
}

const paletteCache = new Map<string, PaletteResult>();

// RGB to HSL helper
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  l = Math.max(0, Math.min(1, l));
  s = Math.max(0, Math.min(1, s));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const trackId = url.searchParams.get('id') || '';
  const customUrl = url.searchParams.get('url') || '';

  const cacheKey = trackId || customUrl;
  if (!cacheKey) {
    return NextResponse.json({ lyric: '#ffffff', highlight: '#ef4444', secondary: '#888888' });
  }

  if (paletteCache.has(cacheKey)) {
    return NextResponse.json(paletteCache.get(cacheKey));
  }

  try {
    const targetUrl = customUrl || `https://img.youtube.com/vi/${trackId}/hqdefault.jpg`;
    const res = await fetch(targetUrl, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize to 32x32 raw RGB pixels (1024 samples)
    const { data } = await sharp(buffer)
      .resize(32, 32, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Collect color candidates and find most vibrant chromatic hue
    let bestHighlightHue = 0;
    let maxSaturation = 0.35;
    let highlightHex = '#ef4444'; // fallback vivid red

    // Average hue accumulator for light tint
    let avgR = 0, avgG = 0, avgB = 0;
    let validPixelCount = 0;

    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const [h, s, l] = rgbToHsl(r, g, b);

      // Filter near-black and near-white
      if (l > 0.15 && l < 0.88) {
        avgR += r;
        avgG += g;
        avgB += b;
        validPixelCount++;

        // Reject greys/monochromes; prioritize high saturation
        if (s > maxSaturation) {
          maxSaturation = s;
          bestHighlightHue = h;
          // Boost lightness into readable range (0.50 - 0.65)
          highlightHex = hslToHex(h, Math.max(0.75, s), 0.58);
        }
      }
    }

    // If image was monochrome/grey, fallback to golden or warm red
    if (maxSaturation < 0.38) {
      highlightHex = '#f59e0b'; // Gold
      bestHighlightHue = 42;
    }

    // High contrast lyric text: off-white with very subtle tint matching the palette hue
    const lyricHex = hslToHex(bestHighlightHue, 0.12, 0.94);

    // Secondary text: balanced muted tone with good readability against pure black
    const secondaryHex = hslToHex(bestHighlightHue, 0.20, 0.60);

    const palette: PaletteResult = {
      lyric: lyricHex,
      highlight: highlightHex,
      secondary: secondaryHex,
    };

    paletteCache.set(cacheKey, palette);
    return NextResponse.json(palette);
  } catch (err) {
    const fallbackPalette: PaletteResult = {
      lyric: '#ffffff',
      highlight: '#ef4444',
      secondary: '#888888',
    };
    return NextResponse.json(fallbackPalette);
  }
}
