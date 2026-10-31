import { NextRequest, NextResponse } from 'next/server';
import { getCommunityLyrics, saveCommunityLyrics } from '@/lib/lyrics/communityRedis';
import { parseEnhancedLrc } from '@/lib/lyrics/parseEnhancedLrc';
import { LyricsResult } from '@/lib/lyrics/providers/types';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const trackId = url.searchParams.get('trackId') || '';
  const artist = url.searchParams.get('artist') || '';
  const title = url.searchParams.get('title') || '';

  if (!trackId && !title) {
    return NextResponse.json({ error: 'trackId or title required' }, { status: 400 });
  }

  const result = await getCommunityLyrics(trackId, artist, title);
  if (result) {
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'No community lyrics found' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trackId, artist, title, duration, text } = body;

    if (!title || !text || !text.trim()) {
      return NextResponse.json(
        { error: 'title and lyric text are required' },
        { status: 400 }
      );
    }

    const cleanText = text.trim();
    const parsed = parseEnhancedLrc(cleanText, { songDuration: duration });

    const lyricsResult: LyricsResult = {
      source: 'community',
      synced: parsed.synced,
      lines: parsed.lines,
      plainLyrics: cleanText,
      rawText: cleanText,
      instrumental: false,
      trackName: title,
      artistName: artist || '',
      matchedTitle: title,
      matchedArtist: artist || '',
      durationMismatch: false,
    };

    const saved = await saveCommunityLyrics(trackId, artist || '', title, lyricsResult);

    return NextResponse.json({
      success: true,
      persistedToRedis: saved,
      result: lyricsResult,
    });
  } catch (err) {
    console.error('[community-lyrics] Error in POST /api/lyrics/community:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to process community lyrics' },
      { status: 500 }
    );
  }
}
