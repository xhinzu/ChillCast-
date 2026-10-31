export interface RawParsedLine {
  id: number;
  time: number; // in seconds
  text: string;
}

const LRC_TIMESTAMP_REGEX = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

/**
 * Parses raw LRC string into chronological timestamped lines.
 */
export function parseLrc(lrcContent: string): RawParsedLine[] {
  if (!lrcContent || typeof lrcContent !== 'string') return [];

  const rawLines = lrcContent.split('\n');
  const parsedLines: RawParsedLine[] = [];
  let idCounter = 0;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // A single line can contain multiple timestamp tags: [00:12.50][00:25.00] Chorus line
    const matches = Array.from(trimmed.matchAll(LRC_TIMESTAMP_REGEX));
    if (matches.length === 0) continue;

    const lineText = trimmed.replace(LRC_TIMESTAMP_REGEX, '').trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fracStr = match[3] || '0';
      const fraction = parseInt(fracStr.padEnd(3, '0').slice(0, 3), 10) / 1000;

      const timeInSeconds = minutes * 60 + seconds + fraction;

      parsedLines.push({
        id: idCounter++,
        time: Math.max(0, timeInSeconds),
        text: lineText || '♪',
      });
    }
  }

  // Sort strictly by timestamp
  return parsedLines.sort((a, b) => a.time - b.time);
}
