import { NextRequest, NextResponse } from 'next/server';
import { searchQueryCache } from '@/lib/server/search-cache';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface YouTubeSearchResult {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

interface YouTubeApiItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

function parseDurationSeconds(durStr: string): number {
  const parts = durStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatDurationSeconds(durSec: number): string {
  if (!durSec || isNaN(durSec) || durSec <= 0) return '0:00';
  const m = Math.floor(durSec / 60);
  const s = Math.floor(durSec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractYtInitialData(html: string): Record<string, unknown> | null {
  const markers = ['ytInitialData = ', 'ytInitialData=', 'window["ytInitialData"] = '];
  let jsonStart = -1;

  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      jsonStart = idx + marker.length;
      break;
    }
  }

  if (jsonStart === -1) {
    const fallbackIdx = html.indexOf('ytInitialData');
    if (fallbackIdx !== -1) {
      const brace = html.indexOf('{', fallbackIdx);
      if (brace !== -1) jsonStart = brace;
    }
  }

  if (jsonStart === -1) return null;

  let endIdx = html.indexOf(';</script>', jsonStart);
  if (endIdx === -1) endIdx = html.indexOf('</script>', jsonStart);
  if (endIdx === -1) endIdx = html.indexOf(';var ', jsonStart);

  if (endIdx !== -1) {
    try {
      const jsonStr = html.substring(jsonStart, endIdx).trim();
      return JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      // If direct slice failed, try bracket matching below
    }
  }

  // Bracket-counting fallback
  let depth = 0;
  let inString = false;
  let quoteChar = '';
  let escape = false;

  for (let i = jsonStart; i < html.length; i++) {
    const char = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (inString) {
      if (char === quoteChar) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quoteChar = char;
      continue;
    }
    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.substring(jsonStart, i + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

// -------------------------------------------------------------
// Strategy 1: Direct YouTube Web Scraper (Zero Quota)
// -------------------------------------------------------------
async function searchViaScrape(
  searchQueryText: string,
  nonMusicPattern: RegExp,
  allowLongTracks: boolean
): Promise<YouTubeSearchResult[]> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    searchQueryText
  )}&sp=EgIQAQ%253D%253D`;

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cookie': 'CONSENT=PENDING+999; SOCS=CAESEwgDEgk2ODE4MTg1OTcaAmVuIAEaBgiA_LyaBg',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    throw new Error(`YouTube search returned status ${res.status}`);
  }

  const html = await res.text();
  const data = extractYtInitialData(html) as {
    contents?: {
      twoColumnSearchResultsRenderer?: {
        primaryContents?: {
          sectionListRenderer?: {
            contents?: Array<{
              itemSectionRenderer?: {
                contents?: Array<{
                  videoRenderer?: {
                    videoId?: string;
                    title?: { runs?: Array<{ text?: string }> };
                    ownerText?: { runs?: Array<{ text?: string }> };
                    lengthText?: { simpleText?: string };
                    thumbnail?: { thumbnails?: Array<{ url?: string }> };
                  };
                }>;
              };
            }>;
          };
        };
      };
    };
  } | null;

  if (!data) {
    throw new Error('ytInitialData not found in response');
  }

  const sections =
    data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
      ?.contents || [];

  const results: YouTubeSearchResult[] = [];

  for (const section of sections) {
    const items = section?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const v = item.videoRenderer;
      if (v && v.videoId) {
        const title = decodeHtmlEntities(v.title?.runs?.[0]?.text || 'YouTube Track');
        const channel = decodeHtmlEntities(v.ownerText?.runs?.[0]?.text || 'YouTube Artist');
        const duration = v.lengthText?.simpleText || '0:00';
        const durSec = parseDurationSeconds(duration);

        if (durSec > 0 && durSec < 55) continue;
        if (nonMusicPattern.test(title) || nonMusicPattern.test(channel)) continue;
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

  return results;
}

// -------------------------------------------------------------
// Strategy 2: Official YouTube Data API v3 (if key is set)
// -------------------------------------------------------------
async function searchViaYouTubeApi(
  searchQueryText: string,
  apiKey: string,
  nonMusicPattern: RegExp
): Promise<YouTubeSearchResult[]> {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', searchQueryText);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', '15');
  searchUrl.searchParams.set('key', apiKey);

  const res = await fetch(searchUrl.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`YouTube API returned ${res.status}`);
  }

  const data = (await res.json()) as { items?: YouTubeApiItem[] };
  const items = data.items || [];
  const results: YouTubeSearchResult[] = [];

  for (const item of items) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;

    const title = decodeHtmlEntities(item.snippet?.title || 'YouTube Track');
    const channel = decodeHtmlEntities(item.snippet?.channelTitle || 'YouTube Artist');

    if (nonMusicPattern.test(title) || nonMusicPattern.test(channel)) continue;

    const thumbnail =
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    results.push({
      id: videoId,
      title,
      channel,
      duration: '3:30',
      thumbnail,
    });
  }

  return results;
}

// -------------------------------------------------------------
// Strategy 3: Local yt-dlp Executable Fallback
// -------------------------------------------------------------
async function searchViaYtDlp(
  searchQueryText: string,
  nonMusicPattern: RegExp,
  allowLongTracks: boolean
): Promise<YouTubeSearchResult[]> {
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const ytdlPath = path.join(process.cwd(), binaryName);

  if (!fs.existsSync(ytdlPath)) {
    throw new Error(`yt-dlp binary not found at ${ytdlPath}`);
  }

  return new Promise((resolve, reject) => {
    execFile(
      ytdlPath,
      ['--dump-json', '--flat-playlist', '--default-search', 'ytsearch15', searchQueryText],
      { timeout: 10000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));

        const results: YouTubeSearchResult[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const item = JSON.parse(line) as {
              id?: string;
              title?: string;
              channel?: string;
              uploader?: string;
              duration?: number;
              thumbnails?: Array<{ url?: string }>;
            };

            if (item.id && item.title) {
              const durSec = Number(item.duration) || 0;
              const title = decodeHtmlEntities(item.title);
              const channel = decodeHtmlEntities(item.channel || item.uploader || 'YouTube Artist');

              if (durSec > 0 && durSec < 55) continue;
              if (nonMusicPattern.test(title) || nonMusicPattern.test(channel)) continue;
              if (!allowLongTracks && durSec > 660) continue;

              const thumbnail =
                item.thumbnails?.[0]?.url ||
                `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`;

              results.push({
                id: item.id,
                title,
                channel,
                duration: formatDurationSeconds(durSec),
                thumbnail,
              });

              if (results.length >= 18) break;
            }
          } catch {
            // ignore JSON parse error on individual lines
          }
        }

        resolve(results);
      }
    );
  });
}

// -------------------------------------------------------------
// Route Handler: Multi-Tier Resilient Search
// -------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const rawQuery = query.trim();

  // 1. Check in-memory/persistent search cache first (0ms latency, zero hits)
  const cached = searchQueryCache.get(rawQuery);
  if (cached && cached.length > 0) {
    return NextResponse.json({ results: cached, fromCache: true });
  }

  // Music-targeted query refinement
  const musicKeywords = /(song|audio|music|track|album|remix|lofi|instrumental|soundtrack|ost|melam|beats|cover|acoustic|chenda)/i;
  const searchQueryText = musicKeywords.test(rawQuery)
    ? rawQuery
    : `${rawQuery} song official audio`;

  // Negative patterns for random non-music videos
  const nonMusicPattern = /\b(reaction|reacting|review|interview|podcast|unboxing|gameplay|walkthrough|tutorial|news|vlog|vlogs|vlogging|breakdown|tier list|behind the scenes|trailer|teaser|episode|ep\s*\d+|season|scene|highlights|commentary|livestream|shorts|tiktok|meme|prank|comedy|challenge|movie|full movie|standup|parody|troll|press meet|speech)\b/i;

  // Allow longer tracks only if user specifically searches for mixes or albums
  const allowLongTracks = /(mix|album|hours|hour|set|compilation|live|playlist|jukebox)/i.test(rawQuery);

  let results: YouTubeSearchResult[] = [];
  let sourceUsed = 'scrape';
  const errors: string[] = [];

  // TIER 1: Direct YouTube Scraper with Anti-Bot headers & Consent bypass
  try {
    results = await searchViaScrape(searchQueryText, nonMusicPattern, allowLongTracks);
    if (results.length > 0) {
      sourceUsed = 'direct-scrape';
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Scraper: ${msg}`);
  }

  // TIER 2: YouTube Data API v3 (if scraper returned 0 items or threw, and API key exists)
  if (results.length === 0 && process.env.YOUTUBE_API_KEY) {
    try {
      results = await searchViaYouTubeApi(searchQueryText, process.env.YOUTUBE_API_KEY, nonMusicPattern);
      if (results.length > 0) {
        sourceUsed = 'youtube-api';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`YouTube API: ${msg}`);
    }
  }

  // TIER 3: Local yt-dlp Executable Fallback (bypasses browser rate-limits with native extractor)
  if (results.length === 0) {
    try {
      results = await searchViaYtDlp(searchQueryText, nonMusicPattern, allowLongTracks);
      if (results.length > 0) {
        sourceUsed = 'yt-dlp';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`yt-dlp: ${msg}`);
    }
  }

  // Cache successful results
  if (results.length > 0) {
    searchQueryCache.set(rawQuery, results);
    return NextResponse.json({ results, fromCache: false, source: sourceUsed });
  }

  // If all strategies failed or returned 0 results
  if (errors.length > 0) {
    console.warn(`Search fallback chain errors for "${rawQuery}":`, errors.join('; '));
  }

  return NextResponse.json({
    results: [],
    fromCache: false,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  });
}
