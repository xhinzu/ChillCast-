import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

// Cache direct audio URLs for 2 hours (they expire in ~6 hours)
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<string>>();

function findYtDlpBinary(): string {
  if (process.env.YT_DLP_PATH && fs.existsSync(process.env.YT_DLP_PATH)) {
    return process.env.YT_DLP_PATH;
  }
  const proc = process as unknown as { resourcesPath?: string };
  const candidates = [
    path.join(process.cwd(), 'yt-dlp.exe'),
    path.join(process.cwd(), '..', 'yt-dlp.exe'),
    path.join(__dirname, 'yt-dlp.exe'),
    ...(proc.resourcesPath ? [path.join(proc.resourcesPath, 'yt-dlp.exe')] : []),
  ];
  for (const cand of candidates) {
    if (cand && fs.existsSync(cand)) {
      return cand;
    }
  }
  return 'yt-dlp';
}

async function resolveViaInnertube(videoId: string): Promise<string> {
  const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; Quest 3 Build/SQ3A.220605.009.A1) gzip',
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: 'ANDROID_VR',
          clientVersion: '1.56.21',
          androidSdkVersion: 32,
          hl: 'en',
          gl: 'US',
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Innertube player returned ${res.status}`);
  }

  const data = (await res.json()) as {
    streamingData?: {
      adaptiveFormats?: Array<{
        mimeType?: string;
        bitrate?: number;
        url?: string;
      }>;
    };
  };

  const audioFormats = (data?.streamingData?.adaptiveFormats || [])
    .filter((f) => f.mimeType?.startsWith('audio/') && f.url)
    .sort((a, b) => {
      const aM4a = a.mimeType?.includes('mp4') ? 1 : 0;
      const bM4a = b.mimeType?.includes('mp4') ? 1 : 0;
      if (aM4a !== bM4a) return bM4a - aM4a;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });

  if (audioFormats.length > 0 && audioFormats[0].url) {
    return audioFormats[0].url;
  }

  throw new Error('No audio formats returned by Innertube');
}

function getDirectStreamUrl(videoId: string): Promise<string> {
  const cached = urlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.url);
  }

  if (inFlightRequests.has(videoId)) {
    return inFlightRequests.get(videoId)!;
  }

  const promise = new Promise<string>((resolve, reject) => {
    const ytdlPath = findYtDlpBinary();
    const resolveFallback = () => {
      resolveViaInnertube(videoId)
        .then((directUrl) => {
          urlCache.set(videoId, {
            url: directUrl,
            expiresAt: Date.now() + 2 * 60 * 60 * 1000,
          });
          resolve(directUrl);
        })
        .catch(reject);
    };

    execFile(
      ytdlPath,
      [
        '-g',
        '-f',
        'bestaudio[ext=m4a][abr>=160]/bestaudio[ext=webm][abr>=160]/bestaudio/best',
        '--audio-quality',
        '0',
        '--extractor-args',
        'youtube:player_client=android,web',
        '--no-playlist',
        '--no-warnings',
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { timeout: 15000 },
      (err, stdout) => {
        if (err) {
          resolveFallback();
          return;
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
          resolveFallback();
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
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'audio/mp4');
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
