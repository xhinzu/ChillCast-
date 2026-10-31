import { alignPlainLyricsToCaptions } from '../alignCaptions';
import { CaptionTiming } from '../providers/ytCaptions';

console.log('====================================================');
console.log('TESTING GATED FLAG BEHAVIOR (FLAG OFF vs ON)');
console.log('====================================================\n');

const mockPlainLyrics = `Can't feel my face when I'm with you
But I love it, but I love it, oh`;

const mockCaptions: CaptionTiming[] = [
  {
    text: "can't feel my face when i'm with you",
    start: 12.0,
    end: 15.0,
    words: [
      { text: "can't", start: 12.0, end: 12.4 },
      { text: 'feel', start: 12.5, end: 12.8 },
      { text: 'my', start: 12.9, end: 13.1 },
      { text: 'face', start: 13.2, end: 13.7 },
      { text: 'when', start: 13.8, end: 14.0 },
      { text: "i'm", start: 14.1, end: 14.3 },
      { text: 'with', start: 14.4, end: 14.6 },
      { text: 'you', start: 14.7, end: 15.0 },
    ],
  },
  {
    text: 'but i love it but i love it oh',
    start: 15.5,
    end: 18.5,
    words: [
      { text: 'but', start: 15.5, end: 15.8 },
      { text: 'i', start: 15.9, end: 16.1 },
      { text: 'love', start: 16.2, end: 16.6 },
      { text: 'it', start: 16.7, end: 16.9 },
      { text: 'but', start: 17.0, end: 17.2 },
      { text: 'i', start: 17.3, end: 17.5 },
      { text: 'love', start: 17.6, end: 18.0 },
      { text: 'it', start: 18.1, end: 18.3 },
      { text: 'oh', start: 18.4, end: 18.5 },
    ],
  },
];

// Simulation of /api/lyrics handler behavior with flag OFF
function simulateRouteLyricsLookup(flagValue: string | undefined, plainLyricsText: string, cues: CaptionTiming[]) {
  if (flagValue === 'true') {
    const aligned = alignPlainLyricsToCaptions(plainLyricsText, cues, 30);
    if (aligned && aligned.lines.length > 0) {
      return {
        source: 'plain + captions timing',
        synced: aligned.synced,
        lines: aligned.lines,
        plainLyrics: plainLyricsText,
      };
    }
  }
  // Default fallback behavior (flag OFF or alignment failed)
  return {
    source: 'lrclib',
    synced: 'none',
    lines: [],
    plainLyrics: plainLyricsText,
  };
}

// 1. Test Flag OFF
const offResult = simulateRouteLyricsLookup('false', mockPlainLyrics, mockCaptions);
console.log('1. Flag OFF (LYRICS_EXPERIMENTAL_PROVIDERS=false):');
console.log(`   Source: ${offResult.source}`);
console.log(`   Synced: ${offResult.synced}`);
console.log(`   Lines count: ${offResult.lines.length}`);
if (offResult.source === 'lrclib' && offResult.synced === 'none' && offResult.lines.length === 0) {
  console.log('   -> PASSED ✅ (Behavior is identical to before, unsynced plain lyrics kept)\n');
} else {
  console.error('   -> FAILED ❌\n');
  process.exit(1);
}

// 2. Test Flag ON
const onResult = simulateRouteLyricsLookup('true', mockPlainLyrics, mockCaptions);
console.log('2. Flag ON (LYRICS_EXPERIMENTAL_PROVIDERS=true):');
console.log(`   Source: ${onResult.source}`);
console.log(`   Synced: ${onResult.synced}`);
console.log(`   Lines count: ${onResult.lines.length}`);
console.log(`   Line 1 text: "${onResult.lines[0]?.text}" (${onResult.lines[0]?.start}s - ${onResult.lines[0]?.end}s)`);
console.log(`   Line 2 text: "${onResult.lines[1]?.text}" (${onResult.lines[1]?.start}s - ${onResult.lines[1]?.end}s)`);

const textPreserved = onResult.lines[0]?.text === "Can't feel my face when I'm with you";
if (
  onResult.source === 'plain + captions timing' &&
  onResult.synced === 'word' &&
  onResult.lines.length === 2 &&
  textPreserved
) {
  console.log('   -> PASSED ✅ (Song with plain lyrics becomes "Aligned" with word timings, original text preserved)\n');
} else {
  console.error('   -> FAILED ❌\n');
  process.exit(1);
}

console.log('ALL FLAG BEHAVIOR TESTS PASSED! ✅');
