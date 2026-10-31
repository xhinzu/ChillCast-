import { NextRequest, NextResponse } from 'next/server';
import { getSharedOffset, saveSharedOffset, checkIpRateLimit } from '@/lib/lyrics/offsetRedis';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  const sharedOffset = await getSharedOffset(videoId);
  return NextResponse.json({ videoId, sharedOffset });
}

export async function POST(req: NextRequest) {
  // Rate limit by IP: max 10 submissions per minute
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  if (!checkIpRateLimit(ip, 10)) {
    return NextResponse.json(
      { error: 'Too many submissions. Maximum 10 offset adjustments per minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { videoId, offsetSeconds } = body;

    // Strict validation: Reject any payload containing lyric text or invalid types
    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'videoId must be a valid string' }, { status: 400 });
    }

    if (typeof offsetSeconds !== 'number' || isNaN(offsetSeconds)) {
      return NextResponse.json({ error: 'offsetSeconds must be a numeric value' }, { status: 400 });
    }

    if (offsetSeconds < -120 || offsetSeconds > 120) {
      return NextResponse.json(
        { error: 'offsetSeconds must be between -120 and +120' },
        { status: 400 }
      );
    }

    // Number-only contract: ensure no unexpected lyric content is saved
    const result = await saveSharedOffset(videoId, offsetSeconds);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to save offset' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      videoId,
      sharedOffset: result.median,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}
