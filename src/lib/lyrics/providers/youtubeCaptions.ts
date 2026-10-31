/**
 * YouTube Captions Provider (Tier 2 Experimental - Opt-in)
 *
 * DISCLAIMER:
 * This provider extracts timed caption tracks directly from YouTube's watch page / timedtext service.
 * It uses unauthenticated, unofficial endpoints that are not part of the official YouTube Data API.
 * Google may throttle, change HTML structures, or return bot-detection blocks on server IP ranges.
 * This provider is only active when LYRICS_EXPERIMENTAL_PROVIDERS=true is explicitly set.
 */

import { LyricsResult, SyncedLyricLine } from './types';
import { deriveWordTimingsFromLrc } from '../wordTiming';

interface CaptionTrackInfo {
  baseUrl: string;
  name?: { simpleText?: string };
  vssId?: string;
  languageCode?: string;
  kind?: string; // 'asr' indicates automatic speech recognition
}

export async function fetchYouTubeCaptions(videoId: string): Promise<LyricsResult | null> {
  if (!videoId || videoId.length < 5) return null;

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const pageRes = await fetch(watchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    // Extract ytInitialPlayerResponse JSON
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|<\/script>)/);
    if (!match || !match[1]) return null;

    let playerResponse: any;
    try {
      playerResponse = JSON.parse(match[1]);
    } catch {
      return null;
    }

    const tracks: CaptionTrackInfo[] =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return null;
    }

    // Prefer manual English captions, then any English captions, then first available
    let selectedTrack: CaptionTrackInfo | undefined =
      tracks.find((t) => t.languageCode?.startsWith('en') && t.kind !== 'asr') ||
      tracks.find((t) => t.languageCode?.startsWith('en')) ||
      tracks[0];

    if (!selectedTrack?.baseUrl) return null;

    // Fetch caption XML or JSON (format=json3 is supported by timedtext)
    const captionUrl = `${selectedTrack.baseUrl}&fmt=json3`;
    const captionRes = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!captionRes.ok) return null;
    const captionJson = await captionRes.json();
    const events = captionJson?.events;

    if (!Array.isArray(events) || events.length === 0) {
      return null;
    }

    const rawLines = [];
    let idCounter = 1;

    for (const evt of events) {
      if (!evt.segs || !Array.isArray(evt.segs)) continue;

      const segText = evt.segs.map((s: any) => s.utf8 || '').join('').trim();
      if (!segText || segText === '\n') continue;

      const start = (evt.tStartMs || 0) / 1000;

      rawLines.push({
        id: idCounter++,
        time: start,
        text: segText.replace(/\n+/g, ' '),
      });
    }

    if (rawLines.length === 0) return null;

    // Derive word timings across the lines
    const derivedLines = deriveWordTimingsFromLrc(rawLines);
    const plainLyrics = rawLines.map((l) => l.text).join('\n');

    return {
      source: 'youtube-captions (experimental)',
      synced: 'line',
      lines: derivedLines,
      plainLyrics,
      instrumental: false,
      durationMismatch: false,
    };
  } catch {
    return null;
  }
}
