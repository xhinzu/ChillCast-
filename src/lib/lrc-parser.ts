export interface LyricLine {
  id: number;
  time: number; // in seconds
  text: string;
}

export interface ParsedLyrics {
  isSynced: boolean;
  isInstrumental: boolean;
  lines: LyricLine[];
  plainText?: string;
}

/**
 * Clean track title from common YouTube/Spotify suffixes that hinder lyrics matching
 * e.g. "Song Title (Official Video) [feat. Artist]" -> "Song Title"
 */
export function cleanTitleForLyrics(rawTitle: string): string {
  return rawTitle
    .replace(/\[.*?\]/g, '') // remove bracketed text e.g. [Official Audio]
    .replace(/\(.*?(official|video|audio|lyric|remaster|live|edit).*?\)/gi, '') // remove parenthetical media tags
    .replace(/\s*(feat\.|ft\.|featuring)\s+.*$/i, '') // remove trailing featuring
    .replace(/[|/\\].*$/, '') // remove trailing separators
    .trim();
}

/**
 * Parse standard LRC format: [mm:ss.xx] Lyrics text
 */
export function parseLrc(lrcContent: string): LyricLine[] {
  if (!lrcContent) return [];

  const lines = lrcContent.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  let idCounter = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // A single line might have multiple timestamp tags: [00:10.00][00:20.00] Chorus
    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length === 0) continue;

    const text = trimmed.replace(timeRegex, '').trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fracStr = match[3] || '0';
      const fraction = parseInt(fracStr.padEnd(3, '0').slice(0, 3), 10) / 1000;

      const timeInSeconds = minutes * 60 + seconds + fraction;

      result.push({
        id: idCounter++,
        time: timeInSeconds,
        text: text || '♪',
      });
    }
  }

  // Sort chronologically
  return result.sort((a, b) => a.time - b.time);
}

/**
 * Find the index of the line that corresponds to the given timestamp
 */
export function findActiveLyricIndex(lines: LyricLine[], currentTime: number): number {
  if (lines.length === 0) return -1;
  if (currentTime < lines[0].time) return -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTime >= lines[i].time) {
      return i;
    }
  }
  return 0;
}
