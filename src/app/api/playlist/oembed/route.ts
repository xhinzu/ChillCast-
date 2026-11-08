import { NextRequest, NextResponse } from 'next/server';
import { decodePlaylistShareData } from '@/lib/playlist-share';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url') || '';
  const dParam = searchParams.get('d') || '';

  let d = dParam;
  if (!d && targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      d = parsed.searchParams.get('d') || '';
    } catch {}
  }

  const playlist = decodePlaylistShareData(d);
  const title = playlist?.title || 'MyuJiku Playlist';
  const cover = playlist?.coverUrl || 'https://myujiku.vercel.app/favicon.ico';
  const trackCount = playlist?.tracks?.length || 0;

  const oembed = {
    version: '1.0',
    type: 'rich',
    title: `${title} (${trackCount} tracks)`,
    author_name: 'MyuJiku',
    author_url: 'https://myujiku.vercel.app',
    provider_name: 'MyuJiku',
    provider_url: 'https://myujiku.vercel.app',
    thumbnail_url: cover,
    thumbnail_width: 320,
    thumbnail_height: 320,
    width: 480,
    height: 360,
    html: `<iframe src="${targetUrl}" width="100%" height="360" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`,
  };

  return NextResponse.json(oembed, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Content-Type': 'application/json',
    },
  });
}

