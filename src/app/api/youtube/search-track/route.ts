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
    const searchQuery = `${artistName} - ${trackTitle} audio`;

    if (apiKey) {
      try {
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('q', searchQuery);
        searchUrl.searchParams.set('type', 'video');
        searchUrl.searchParams.set('videoEmbeddable', 'true');
        searchUrl.searchParams.set('maxResults', '1');
        searchUrl.searchParams.set('key', apiKey);

        const res = await fetch(searchUrl.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          next: { revalidate: 0 },
        });

        if (res.ok) {
          const data = (await res.json()) as YouTubeSearchResponse;
          const videoId = data.items?.[0]?.id?.videoId;
          if (videoId) {
            youtubeSearchCache.set(artistName, trackTitle, videoId);
            return NextResponse.json({
              videoId,
              artist: artistName,
              title: trackTitle,
              fromCache: false,
            });
          }
        }
      } catch (apiErr) {
        console.warn('YouTube Data API error, falling back to Innertube search:', apiErr);
      }
    }

    // 3. Fallback: Zero-quota YouTube Innertube search
    try {
      const itRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240101.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
          query: searchQuery,
        }),
        cache: 'no-store',
      });

      if (itRes.ok) {
        const itData = (await itRes.json()) as {
          contents?: {
            twoColumnSearchResultsRenderer?: {
              primaryContents?: {
                sectionListRenderer?: {
                  contents?: Array<{
                    itemSectionRenderer?: {
                      contents?: Array<{
                        videoRenderer?: {
                          videoId?: string;
                        };
                      }>;
                    };
                  }>;
                };
              };
            };
          };
        };

        const sections =
          itData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
            ?.contents || [];

        for (const section of sections) {
          const items = section?.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const vid = item.videoRenderer?.videoId;
            if (vid && vid.length === 11) {
              youtubeSearchCache.set(artistName, trackTitle, vid);
              return NextResponse.json({
                videoId: vid,
                artist: artistName,
                title: trackTitle,
                fromCache: false,
              });
            }
          }
        }
      }
    } catch (itErr) {
      console.warn('Innertube search fallback failed:', itErr);
    }

    return NextResponse.json(
      { error: `No YouTube video match found for: ${searchQuery}` },
      { status: 404 }
    );
  } catch (err) {
    console.error('Server error in youtube search-track:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
