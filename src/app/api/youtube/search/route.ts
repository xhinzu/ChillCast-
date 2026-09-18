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

  const rawQuery = query.trim();

  // Music-targeted query refinement: if user didn't specify music terms, append "song"
  const musicKeywords = /(song|audio|music|track|album|remix|lofi|instrumental|soundtrack|ost|melam|beats|cover|acoustic|chenda)/i;
  const searchQueryText = musicKeywords.test(rawQuery)
    ? rawQuery
    : `${rawQuery} song official audio`;

  // Negative patterns for random non-music videos
  const nonMusicPattern = /\b(reaction|reacting|review|interview|podcast|unboxing|gameplay|walkthrough|tutorial|news|vlog|vlogs|vlogging|breakdown|tier list|behind the scenes|trailer|teaser|episode|ep\s*\d+|season|scene|highlights|commentary|livestream|shorts|tiktok|meme|prank|comedy|challenge|movie|full movie|standup|parody|troll|press meet|speech)\b/i;

  // Allow longer tracks only if user specifically searches for mixes or albums
  const allowLongTracks = /(mix|album|hours|hour|set|compilation|live|playlist|jukebox)/i.test(rawQuery);

  function parseDurationSeconds(durStr: string): number {
    const parts = durStr.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      searchQueryText
    )}&sp=EgIQAQ%253D%253D`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `YouTube search error: ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const marker = 'ytInitialData = ';
    const startIdx = html.indexOf(marker);

    if (startIdx === -1) {
      return NextResponse.json({ results: [] });
    }

    const jsonStart = startIdx + marker.length;
    let endIdx = html.indexOf(';</script>', jsonStart);
    if (endIdx === -1) {
      endIdx = html.indexOf('</script>', jsonStart);
    }
    if (endIdx === -1) {
      return NextResponse.json({ results: [] });
    }

    const jsonStr = html.substring(jsonStart, endIdx);
    const data = JSON.parse(jsonStr);
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
          const durSec = parseDurationSeconds(duration);

          // 1. Filter out shorts and micro-clips (< 55s)
          if (durSec > 0 && durSec < 55) continue;

          // 2. Filter out non-song videos (vlogs, podcasts, reactions, interviews, memes)
          if (nonMusicPattern.test(title) || nonMusicPattern.test(channel)) continue;

          // 3. Filter out videos longer than 11 minutes unless searching for full mixes/albums
          if (!allowLongTracks && durSec > 660) continue;

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

          if (results.length >= 18) break;
        }
      }
      if (results.length >= 18) break;
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('YouTube zero-quota search error:', message);
    return NextResponse.json({ results: [], error: message }, { status: 500 });
  }
}
