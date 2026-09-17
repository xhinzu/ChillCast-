import { NextRequest, NextResponse } from 'next/server';
import { cleanTitleForLyrics } from '@/lib/lrc-parser';

interface LRCLIBRecord {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawTitle = url.searchParams.get('title');
  const rawArtist = url.searchParams.get('artist');
  const durationStr = url.searchParams.get('duration');

  if (!rawTitle) {
    return NextResponse.json(
      { error: 'Track title query parameter is required' },
      { status: 400 }
    );
  }

  const cleanTitle = cleanTitleForLyrics(rawTitle);
  const cleanArtist = rawArtist ? rawArtist.replace(/\s*-\s*Topic$/i, '').trim() : '';
  const duration = durationStr ? Math.round(parseFloat(durationStr)) : undefined;

  try {
    // 1. Attempt exact lookup on LRCLIB
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('track_name', cleanTitle);
    if (cleanArtist) getUrl.searchParams.set('artist_name', cleanArtist);
    if (duration && duration > 0) getUrl.searchParams.set('duration', duration.toString());

    const exactRes = await fetch(getUrl.toString(), {
      headers: {
        'User-Agent': 'ChillCast/1.0 (https://github.com/chillcast)',
      },
      next: { revalidate: 3600 }, // Cache lyrics response for 1 hour
    });

    if (exactRes.ok) {
      const data = (await exactRes.json()) as LRCLIBRecord;
      return NextResponse.json({
        syncedLyrics: data.syncedLyrics || null,
        plainLyrics: data.plainLyrics || null,
        instrumental: data.instrumental || false,
        trackName: data.trackName,
        artistName: data.artistName,
      });
    }

    // 2. Fallback: Search lookup
    const searchUrl = new URL('https://lrclib.net/api/search');
    const query = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
    searchUrl.searchParams.set('q', query);

    const searchRes = await fetch(searchUrl.toString(), {
      headers: {
        'User-Agent': 'ChillCast/1.0 (https://github.com/chillcast)',
      },
      next: { revalidate: 3600 },
    });

    if (searchRes.ok) {
      const items = (await searchRes.json()) as LRCLIBRecord[];
      if (items && items.length > 0) {
        // Find best match with synced lyrics if available
        const best = items.find((i) => i.syncedLyrics) || items[0];
        return NextResponse.json({
          syncedLyrics: best.syncedLyrics || null,
          plainLyrics: best.plainLyrics || null,
          instrumental: best.instrumental || false,
          trackName: best.trackName,
          artistName: best.artistName,
        });
      }
    }

    return NextResponse.json(
      {
        syncedLyrics: null,
        plainLyrics: null,
        instrumental: false,
        notFound: true,
      },
      { status: 404 }
    );
  } catch (err) {
    console.error('Error querying LRCLIB:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch lyrics' },
      { status: 500 }
    );
  }
}
