import { NextRequest, NextResponse } from 'next/server';
import { youtubeSearchCache } from '@/lib/server/cache';

interface YouTubeSearchResponse {
  items?: Array<{
    id?: {
      videoId?: string;
    };
    snippet?: {
      title?: string;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { artist, title } = body as { artist?: string; title?: string };

    if (!title) {
      return NextResponse.json(
        { error: 'Track title is required for search' },
        { status: 400 }
      );
    }

    const artistName = artist?.trim() || 'Various Artists';
    const trackTitle = title.trim();

    // 1. Check persistent server-side cache (Zero Quota Cost)
    const cached = youtubeSearchCache.get(artistName, trackTitle);
    if (cached) {
      return NextResponse.json({
        videoId: cached.videoId,
        artist: cached.artist,
        title: cached.title,
        fromCache: true,
        cachedAt: cached.cachedAt,
      });
    }

    // 2. Cache miss: Check server-side YouTube Data API key
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'YouTube Data API key is not configured in YOUTUBE_API_KEY server environment variable.',
          needsKey: true,
        },
        { status: 503 }
      );
    }

    // 3. Query YouTube Data API v3 (strictly server-side)
    const searchQuery = `${artistName} - ${trackTitle} audio`;
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', '1');
    searchUrl.searchParams.set('key', apiKey);

    const res = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    });

    const data = (await res.json()) as YouTubeSearchResponse;

    if (!res.ok || data.error) {
      console.error('YouTube Data API Error:', data.error);
      return NextResponse.json(
        {
          error: data.error?.message || 'Failed to search track on YouTube Data API',
          code: data.error?.code || res.status,
        },
        { status: res.status }
      );
    }

    const videoId = data.items?.[0]?.id?.videoId;
    if (!videoId) {
      return NextResponse.json(
        { error: `No YouTube video match found for: ${searchQuery}` },
        { status: 404 }
      );
    }

    // 4. Save to persistent cache so this query is never searched again!
    youtubeSearchCache.set(artistName, trackTitle, videoId);

    return NextResponse.json({
      videoId,
      artist: artistName,
      title: trackTitle,
      fromCache: false,
    });
  } catch (err) {
    console.error('Server error in youtube search-track:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
