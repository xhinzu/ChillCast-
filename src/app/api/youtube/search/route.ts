import { NextRequest, NextResponse } from 'next/server';

export interface YouTubeSearchResult {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      query.trim()
    )}&sp=EgIQAQ%253D%253D`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 300 }, // Cache search for 5 minutes
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `YouTube search error: ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);

    if (!match) {
      return NextResponse.json({ results: [] });
    }

    const data = JSON.parse(match[1]);
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents || [];

    const results: YouTubeSearchResult[] = [];

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (v && v.videoId) {
          const title = v.title?.runs?.[0]?.text || 'YouTube Track';
          const channel = v.ownerText?.runs?.[0]?.text || 'YouTube Artist';
          const duration = v.lengthText?.simpleText || '0:00';
          const thumbnail =
            v.thumbnail?.thumbnails?.[0]?.url ||
            `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;

          results.push({
            id: v.videoId,
            title,
            channel,
            duration,
            thumbnail,
          });

          if (results.length >= 15) break;
        }
      }
      if (results.length >= 15) break;
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('YouTube zero-quota search error:', message);
    return NextResponse.json({ results: [], error: message }, { status: 500 });
  }
}
