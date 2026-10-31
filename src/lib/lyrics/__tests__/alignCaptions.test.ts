import { alignPlainLyricsToCaptions, normalizeWord, wordSimilarity } from '../alignCaptions';
import { CaptionTiming, isMostlySoundEffects, hasInsufficientDuration } from '../providers/ytCaptions';

console.log('====================================================');
console.log('RUNNING CAPTION ALIGNMENT & FILTERING TEST SUITE');
console.log('====================================================\n');

let allPassed = true;
function assert(desc: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${desc}`);
  } else {
    console.error(`  ❌ FAILED: ${desc}`);
    allPassed = false;
  }
}

// -----------------------------------------------------------
// TEST 0: Word Normalization & Similarity
// -----------------------------------------------------------
console.log('Test 0: Word Normalization & Similarity');
assert('normalizeWord removes punctuation and diacritics', normalizeWord("Feelin'!") === 'feelin');
assert('wordSimilarity exact match is 1.0', wordSimilarity('hello', 'hello') === 1.0);
assert('wordSimilarity close fuzzy match >= 0.8', wordSimilarity('feelin', 'feeling') >= 0.8);
console.log();

// -----------------------------------------------------------
// TEST 1: Clean Match
// -----------------------------------------------------------
console.log('Test 1: Clean Match');
const cleanLyrics = `I'm tryna put you in the worst mood, ah
P1 cleaner than your church shoes, ah`;

const cleanCaptions: CaptionTiming[] = [
  {
    text: "I'm tryna put you in the worst mood ah",
    start: 4.2,
    end: 8.0,
    words: [
      { text: "I'm", start: 4.2, end: 4.5 },
      { text: 'tryna', start: 4.6, end: 5.0 },
      { text: 'put', start: 5.1, end: 5.4 },
      { text: 'you', start: 5.5, end: 5.7 },
      { text: 'in', start: 5.8, end: 6.0 },
      { text: 'the', start: 6.1, end: 6.3 },
      { text: 'worst', start: 6.4, end: 6.8 },
      { text: 'mood', start: 6.9, end: 7.3 },
      { text: 'ah', start: 7.4, end: 7.8 },
    ],
  },
  {
    text: 'P1 cleaner than your church shoes ah',
    start: 8.5,
    end: 12.0,
    words: [
      { text: 'P1', start: 8.5, end: 8.9 },
      { text: 'cleaner', start: 9.0, end: 9.5 },
      { text: 'than', start: 9.6, end: 9.8 },
      { text: 'your', start: 9.9, end: 10.2 },
      { text: 'church', start: 10.3, end: 10.7 },
      { text: 'shoes', start: 10.8, end: 11.2 },
      { text: 'ah', start: 11.3, end: 11.7 },
    ],
  },
];

const res1 = alignPlainLyricsToCaptions(cleanLyrics, cleanCaptions, 30);
assert('Returns non-null result on clean match', res1 !== null);
assert('Source is "plain + captions timing"', res1?.source === 'plain + captions timing');
assert('Quality score >= 0.90 on clean match', (res1?.qualityScore ?? 0) >= 0.9);
assert('Produced 2 lines', res1?.lines.length === 2);
assert('Line 1 starts at 4.2s', Math.abs((res1?.lines[0].start ?? 0) - 4.2) < 0.1);
assert('Line 1 ends at Line 2 start (8.5s)', Math.abs((res1?.lines[0].end ?? 0) - 8.5) < 0.1);
assert('Line 2 starts at 8.5s', Math.abs((res1?.lines[1].start ?? 0) - 8.5) < 0.1);
console.log();

// -----------------------------------------------------------
// TEST 2: Noisy Captions with Word Errors
// -----------------------------------------------------------
console.log('Test 2: Noisy Captions with Word Errors');
const noisyLyrics = `Wake up in the morning feeling good
Walking down the boulevard with my crew`;

const noisyCaptions: CaptionTiming[] = [
  {
    text: 'wake up in da mornin feelin gud yeah',
    start: 2.0,
    end: 6.0,
  },
  {
    text: 'walkin down the bullevard with ma crew',
    start: 6.5,
    end: 10.5,
  },
];

const res2 = alignPlainLyricsToCaptions(noisyLyrics, noisyCaptions, 20);
assert('Returns non-null result on noisy captions', res2 !== null);
assert('Quality score >= 0.50 passes quality gate', (res2?.qualityScore ?? 0) >= 0.5);
assert('Produced 2 lines with monotonic timestamps', (res2?.lines[0].start ?? 0) < (res2?.lines[1].start ?? 0));
assert('Word timings are monotonic within line 1',
  (res2?.lines[0].words.every((w, i, arr) => i === 0 || w.start >= arr[i - 1].start) ?? false)
);
console.log();

// -----------------------------------------------------------
// TEST 3: Missing Sections (Outro uncaptioned)
// -----------------------------------------------------------
console.log('Test 3: Missing Sections');
const missingLyrics = `Verse one starts the track right here
Verse two continues with the vibe
Outro fades away quietly into the night`;

const partialCaptions: CaptionTiming[] = [
  { text: 'Verse one starts the track right here', start: 5.0, end: 9.0 },
  { text: 'Verse two continues with the vibe', start: 10.0, end: 14.0 },
  // Outro is omitted in captions (e.g. whispered or instrumental outro)
];

const res3 = alignPlainLyricsToCaptions(missingLyrics, partialCaptions, 30);
assert('Returns non-null when >= 50% matched', res3 !== null);
assert('Has 3 lines', res3?.lines.length === 3);
assert('Outro line has interpolated start > line 2 start',
  (res3?.lines[2].start ?? 0) > (res3?.lines[1].start ?? 0)
);
assert('All lines strictly monotonic',
  (res3?.lines[0].start ?? 0) < (res3?.lines[1].start ?? 0) &&
  (res3?.lines[1].start ?? 0) < (res3?.lines[2].start ?? 0)
);
console.log();

// -----------------------------------------------------------
// TEST 4: Repeated Choruses
// -----------------------------------------------------------
console.log('Test 4: Repeated Choruses');
const repeatedChorusLyrics = `Intro line begins the journey
This is the chorus we sing together loud
Verse line tells a different story
This is the chorus we sing together loud`;

const repeatedCaptions: CaptionTiming[] = [
  { text: 'Intro line begins the journey', start: 2.0, end: 5.0 },
  { text: 'This is the chorus we sing together loud', start: 8.0, end: 12.0 },
  { text: 'Verse line tells a different story', start: 18.0, end: 22.0 },
  { text: 'This is the chorus we sing together loud', start: 26.0, end: 30.0 },
];

const res4 = alignPlainLyricsToCaptions(repeatedChorusLyrics, repeatedCaptions, 45);
assert('Returns non-null for repeated choruses', res4 !== null);
assert('Line 2 (Chorus 1) starts near 8s', Math.abs((res4?.lines[1].start ?? 0) - 8.0) < 0.5);
assert('Line 4 (Chorus 2) starts near 26s', Math.abs((res4?.lines[3].start ?? 0) - 26.0) < 0.5);
assert('Chorus 2 start > Chorus 1 start by at least 15s',
  (res4?.lines[3].start ?? 0) - (res4?.lines[1].start ?? 0) > 15
);
console.log();

// -----------------------------------------------------------
// TEST 5: Quality Gate Rejection (< 50% match)
// -----------------------------------------------------------
console.log('Test 5: Quality Gate Rejection (< 50% match)');
const songA = `Look at the stars look how they shine for you
And everything you do yeah they were all yellow`;

const unrelatedCaptions: CaptionTiming[] = [
  { text: 'welcome to the podcast episode forty two today we discuss quantum physics', start: 1.0, end: 6.0 },
  { text: 'and biological neural networks in machine learning applications', start: 7.0, end: 12.0 },
];

const res5 = alignPlainLyricsToCaptions(songA, unrelatedCaptions, 60);
assert('Unrelated captions fail quality gate and return null', res5 === null);
console.log();

// -----------------------------------------------------------
// TEST 6: Caption Filtering: Mostly [Music] Tracks Rejected
// -----------------------------------------------------------
console.log('Test 6: Caption Filtering (Sound-effect tags & Duration coverage)');
const musicOnlyCaptions: CaptionTiming[] = [
  { text: '[Music]', start: 0.0, end: 10.0 },
  { text: '(Music)', start: 10.0, end: 25.0 },
  { text: '[Applause]', start: 25.0, end: 35.0 },
  { text: '♪', start: 35.0, end: 50.0 },
  { text: '[Music]', start: 50.0, end: 70.0 },
];

assert('Mostly sound effect cues are rejected', isMostlySoundEffects(musicOnlyCaptions) === true);

const legitCaptions: CaptionTiming[] = [
  { text: '[Music]', start: 0.0, end: 4.0 },
  { text: "I'm tryna put you in the worst mood", start: 4.2, end: 8.0 },
  { text: 'P1 cleaner than your church shoes', start: 8.5, end: 12.0 },
  { text: 'Milli point two just to hurt you', start: 12.5, end: 16.0 },
  { text: 'All red Lamb just to tease you', start: 16.5, end: 20.0 },
];

assert('Legitimate lyric cues are NOT rejected', isMostlySoundEffects(legitCaptions) === false);

// Duration coverage: 200s song with captions only spanning 20s (< 40%)
const shortCaptions: CaptionTiming[] = [
  { text: 'Hello world this is a test', start: 5.0, end: 15.0 },
];
assert('Captions spanning < 40% of duration are rejected', hasInsufficientDuration(shortCaptions, 200) === true);

// Duration coverage: 200s song with captions spanning 150s (>= 40%)
const fullCaptions: CaptionTiming[] = [
  { text: 'Hello world this is the intro', start: 5.0, end: 15.0 },
  { text: 'This is the outro of the song', start: 150.0, end: 165.0 },
];
assert('Captions spanning >= 40% of duration are accepted', hasInsufficientDuration(fullCaptions, 200) === false);
console.log();

// -----------------------------------------------------------
// Final Verdict
// -----------------------------------------------------------
if (allPassed) {
  console.log('====================================================');
  console.log('ALL ALIGNMENT & FILTERING TESTS PASSED! ✅');
  console.log('====================================================');
  process.exit(0);
} else {
  console.error('SOME TESTS FAILED! ❌');
  process.exit(1);
}
