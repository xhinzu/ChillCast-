export interface LyricWord {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
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
  source: string; // 'lrclib' | 'word-stub' | 'plain' etc.
  synced: LyricSyncType;
  lines: SyncedLyricLine[];
  plainLyrics?: string;
  instrumental?: boolean;
  trackName?: string;
  artistName?: string;
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
