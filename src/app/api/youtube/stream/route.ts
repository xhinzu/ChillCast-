import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';

// Cache direct audio URLs for 2 hours (they expire in ~6 hours)
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<string>>();

function getDirectStreamUrl(videoId: string): Promise<string> {
  const cached = urlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.url);
  }

  if (inFlightRequests.has(videoId)) {
    return inFlightRequests.get(videoId)!;
  }

  const promise = new Promise<string>((resolve, reject) => {
    const ytdlPath = path.join(process.cwd(), 'yt-dlp.exe');
    execFile(
      ytdlPath,
      ['-g', '-f', 'ba/b', `https://www.youtube.com/watch?v=${videoId}`],
      { timeout: 15000 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(stderr || err.message));
        }
        const lines = stdout.trim().split('\n').filter((l) => l.startsWith('http'));
        if (lines.length > 0) {
          const directUrl = lines[0].trim();
          urlCache.set(videoId, {
            url: directUrl,
            expiresAt: Date.now() + 2 * 60 * 60 * 1000,
          });
          resolve(directUrl);
        } else {
          reject(new Error('No stream URL found in yt-dlp output'));
        }
      }
    );
  }).finally(() => {
    inFlightRequests.delete(videoId);
  });

  inFlightRequests.set(videoId, promise);
  return promise;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('v');

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: 'Valid 11-char videoId required' }, { status: 400 });
  }

  try {
    const directUrl = await getDirectStreamUrl(videoId);
    const rangeHeader = req.headers.get('range');

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(directUrl, { headers });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      // Clear cache on failure
      urlCache.delete(videoId);
      return NextResponse.json(
        { error: `Upstream error ${upstreamRes.status}` },
        { status: 502 }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'audio/webm');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Authorization');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('YouTube stream route error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function HEAD(req: NextRequest) {
  return GET(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Authorization',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    },
  });
}
