import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const YT_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const CANDIDATE_QUALITIES = ['maxresdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg'] as const;

// In-memory cache for fallback logo buffer
let cachedFallbackLogo: Buffer | null = null;

async function getFallbackLogo(): Promise<Buffer> {
  if (cachedFallbackLogo) return cachedFallbackLogo;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'myujiku-logo.png');
    if (fs.existsSync(logoPath)) {
      const raw = await fs.promises.readFile(logoPath);
      cachedFallbackLogo = await sharp(raw)
        .resize(512, 512, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85 })
        .toBuffer();
      return cachedFallbackLogo;
    }
  } catch (err) {
    console.error('[API /cover] Error loading fallback logo:', err);
  }

  // Minimal 512x512 dark square fallback in pure sharp if file is missing
  cachedFallbackLogo = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 3,
      background: { r: 18, g: 18, b: 20 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();

  return cachedFallbackLogo;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Validate YouTube Video ID (strictly 11 chars: alphanumeric, _, -)
  if (!id || !YT_ID_REGEX.test(id)) {
    const fallback = await getFallbackLogo();
    return new NextResponse(new Uint8Array(fallback), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': fallback.length.toString(),
      },
    });
  }

  // Restrict upstream requests strictly to i.ytimg.com with timeout
  let imageBuffer: Buffer | null = null;
  for (const quality of CANDIDATE_QUALITIES) {
    try {
      const upstreamUrl = `https://i.ytimg.com/vi/${id}/${quality}`;
      const res = await fetch(upstreamUrl, {
        signal: AbortSignal.timeout(4000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
      });

      if (res.ok && res.status === 200) {
        const ab = await res.arrayBuffer();
        // YouTube returns tiny placeholder (< 2000 bytes) on non-existent thumbnails
        if (ab.byteLength > 2048) {
          imageBuffer = Buffer.from(ab);
          break;
        }
      }
    } catch {
      // Continue to next quality candidate
    }
  }

  if (!imageBuffer) {
    const fallback = await getFallbackLogo();
    return new NextResponse(new Uint8Array(fallback), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': fallback.length.toString(),
      },
    });
  }

  try {
    const baseImg = sharp(imageBuffer);
    let trimmedBuffer: Buffer;
    try {
      // Detect and remove black or solid-color letterbox bars
      trimmedBuffer = await sharp(imageBuffer).trim({ threshold: 15 }).toBuffer();
    } catch {
      trimmedBuffer = imageBuffer;
    }

    // Crop to centered square and resize to 512x512
    const finalJpg = await sharp(trimmedBuffer)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(finalJpg), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': finalJpg.length.toString(),
      },
    });
  } catch (err) {
    console.error('[API /cover] Image processing failed:', err);
    const fallback = await getFallbackLogo();
    return new NextResponse(new Uint8Array(fallback), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': fallback.length.toString(),
      },
    });
  }
}
