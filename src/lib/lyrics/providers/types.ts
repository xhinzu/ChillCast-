export interface LyricSyllable {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface LyricWord {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
  syllables?: LyricSyllable[];
}

export interface SyncedLyricLine {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  words: LyricWord[];
}

export type LyricSyncType = 'word' | 'line' | 'none';

export interface LyricsResult {
  source: string; // 'lrclib' | 'lyrics.ovh' | 'community' | 'user' etc.
  synced: LyricSyncType;
  lines: SyncedLyricLine[];
  plainLyrics?: string;
  rawText?: string;
  fixAllCaps?: boolean;
  instrumental?: boolean;
  trackName?: string;
  artistName?: string;
  matchedTitle?: string;
  matchedArtist?: string;
  durationMismatch?: boolean;
  diffSeconds?: number;
  sharedOffset?: number;
  error?: string;
}

export interface LyricsProvider {
  name: string;
  getLyrics(track: {
    id: string;
    title: string;
    artist: string;
    duration?: number;
  }): Promise<LyricsResult>;
}
