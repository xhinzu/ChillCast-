/**
 * Cleans track titles from noise commonly present in YouTube and uploaded video names
 * (e.g. "(Official Video)", "[Lyrics]", "ft. Bruno Mars", "4K", "| Lofi Chill")
 * to maximize lyrics provider hit rate on LRCLIB.
 */
export function cleanTitleForLyrics(rawTitle: string): string {
  if (!rawTitle) return '';

  let cleaned = rawTitle;

  // 1. Remove bracketed notes: [Official Music Video], [Lyrics], [Visualizer], [4K], etc.
  cleaned = cleaned.replace(/\[.*?\]/g, '');

  // 2. Remove parenthetical video/audio tags: (Official Video), (Lyric Video), (Audio), etc.
  cleaned = cleaned.replace(/\(.*?(official|video|audio|lyric|visualizer|remaster|live|edit|prod|clip|4k|hd).*?\)/gi, '');

  // 3. Remove trailing "feat." / "ft." / "featuring" clauses
  cleaned = cleaned.replace(/\s*(?:feat\.|ft\.|featuring)\s+.*$/i, '');

  // 4. Remove trailing separators like "| Lofi Chill", "// Official Audio", "- Slowed + Reverb"
  cleaned = cleaned.replace(/\s*[|/\\].*$/, '');

  // 5. Remove "Slowed + Reverb" or "(Slowed & Reverb)"
  cleaned = cleaned.replace(/\s*[-–—]?\s*(?:slowed\s*\+?\s*reverb|speed\s*up).*$/i, '');

  // 6. Clean quotes and extra whitespace
  cleaned = cleaned.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();

  // If over-cleaned to empty, fallback to raw
  return cleaned || rawTitle.trim();
}

/**
 * Cleans artist names (e.g. removes " - Topic" appended by YouTube Music distributor feeds)
 */
export function cleanArtistForLyrics(rawArtist: string): string {
  if (!rawArtist) return '';
  return rawArtist
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*(?:feat\.|ft\.|featuring)\s+.*$/i, '')
    .trim();
}
