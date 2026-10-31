/**
 * NetEase Cloud Music Provider (Tier 2 Experimental - Opt-in)
 *
 * DISCLAIMER:
 * This provider uses unofficial, publicly accessible endpoints of the NetEase Cloud Music API
 * (https://music.163.com/api). These endpoints are unauthenticated, undocumented, and subject
 * to rate limits or changes by NetEase without notice.
 * Use solely for personal non-commercial playback when LYRICS_EXPERIMENTAL_PROVIDERS=true is set.
 */

import { parseLrc } from '../parseLrc';
import { deriveWordTimingsFromLrc } from '../wordTiming';
import { LyricsResult } from './types';
import { tokenSetRatio } from '../normalize';

interface NetEaseSong {
  id: number;
  name: string;
  artists?: { name: string }[];
  duration?: number;
}

interface NetEaseSearchResponse {
  result?: {
    songs?: NetEaseSong[];
  };
  code: number;
}

interface NetEaseLyricResponse {
  lrc?: {
    lyric?: string;
  };
  tlyric?: {
    lyric?: string;
  };
  code: number;
}

export async function fetchNetEaseLyrics(
  title: string,
  artist?: string,
  targetDuration?: number
): Promise<LyricsResult | null> {
  if (!title) return null;

  try {
    const query = artist ? `${artist} ${title}` : title;
    const searchUrl = `https://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${encodeURIComponent(
      query
    )}&type=1&offset=0&total=true&limit=5`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as NetEaseSearchResponse;
    const songs = searchData?.result?.songs;
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return null;
    }

    // Pick best matching song
    let bestSong: NetEaseSong | null = null;
    let bestScore = -1;

    for (const song of songs) {
      const songArtist = song.artists?.map((a) => a.name).join(' ') || '';
      const titleSim = tokenSetRatio(song.name, title);
      const artistSim = artist ? tokenSetRatio(songArtist, artist) : 0.8;

      let score = titleSim * 60 + artistSim * 40;

      if (targetDuration && targetDuration > 0 && song.duration) {
        // NetEase duration is in ms
        const durSec = song.duration / 1000;
        const diff = Math.abs(durSec - targetDuration);
        if (diff <= 5) score += 15;
        else if (diff > 15) score -= 15;
      }

      if (score > bestScore && score >= 40) {
        bestScore = score;
        bestSong = song;
      }
    }

    if (!bestSong) return null;

    // Fetch lyric for song ID
    const lyricUrl = `https://music.163.com/api/song/lyric?os=pc&id=${bestSong.id}&lv=-1&kv=-1&tv=-1`;
    const lyricRes = await fetch(lyricUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!lyricRes.ok) return null;

    const lyricData = (await lyricRes.json()) as NetEaseLyricResponse;
    const rawLrc = lyricData?.lrc?.lyric;

    if (!rawLrc || !rawLrc.trim()) {
      return null;
    }

    const parsedLines = parseLrc(rawLrc);
    const primaryArtist = bestSong.artists?.[0]?.name || artist;

    if (parsedLines.length > 0) {
      const derived = deriveWordTimingsFromLrc(
        parsedLines,
        targetDuration || (bestSong.duration ? bestSong.duration / 1000 : undefined)
      );
      return {
        source: 'netease (experimental)',
        synced: 'line',
        lines: derived,
        plainLyrics: rawLrc,
        instrumental: false,
        trackName: bestSong.name,
        artistName: primaryArtist,
        matchedTitle: bestSong.name,
        matchedArtist: primaryArtist,
        durationMismatch: false,
      };
    }

    return {
      source: 'netease (experimental)',
      synced: 'none',
      lines: [],
      plainLyrics: rawLrc,
      instrumental: false,
      trackName: bestSong.name,
      artistName: primaryArtist,
      matchedTitle: bestSong.name,
      matchedArtist: primaryArtist,
      durationMismatch: false,
    };
  } catch {
    return null;
  }
}
