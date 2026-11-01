import { sanitizeQueryText, normalizeTrackCandidates } from '../normalize';
import { isCandidateAcceptable, rankCandidates, LRCLIBRecord } from '../searchLrclib';

console.log('====================================================');
console.log('RUNNING QUERY SANITIZATION & ACCEPTANCE TEST SUITE');
console.log('====================================================\n');

let allPassed = true;
function assert(desc: string, condition: boolean) {
  if (condition) {
    console.log(`✅ ${desc}`);
  } else {
    console.error(`❌ FAILED: ${desc}`);
    allPassed = false;
  }
}

// ----------------------------------------------------
// Test 1: Query Sanitization
// ----------------------------------------------------
console.log('--- 1. Query Sanitization Tests ---');

const pollutedThriller = 'm.youtube.com - Michael Jackson - Thriller (Official Video) Video Lyric #2 - YouTube';
const cleanedThriller = sanitizeQueryText(pollutedThriller);
assert(
  `Cleans m.youtube.com, (Official Video), Video Lyric #2, and - YouTube: got "${cleanedThriller}"`,
  cleanedThriller === 'Michael Jackson - Thriller'
);

const pollutedWww = 'www.youtube.com/watch?v=123 - Queen - Bohemian Rhapsody (Official Video) #shorts';
const cleanedWww = sanitizeQueryText(pollutedWww);
assert(
  `Cleans www. and domain tokens and #shorts: got "${cleanedWww}"`,
  cleanedWww === 'Queen - Bohemian Rhapsody'
);

const pollutedCounters = 'Lady Gaga - Bad Romance #1 Video Lyric #2 (Official Music Video) 🔥';
const cleanedCounters = sanitizeQueryText(pollutedCounters);
assert(
  `Cleans "#1", "#2", "Video Lyric", and emoji: got "${cleanedCounters}"`,
  cleanedCounters === 'Bad Romance' || cleanedCounters === 'Lady Gaga - Bad Romance'
);

// Verify candidate normalization on the polluted Thriller string
const candidates = normalizeTrackCandidates(pollutedThriller, 'Michael Jackson - Topic');
const topCandidate = candidates[0];
assert(
  `Normalized candidate artist is "Michael Jackson": got "${topCandidate?.artist}"`,
  topCandidate?.artist.toLowerCase() === 'michael jackson'
);
assert(
  `Normalized candidate title is "Thriller": got "${topCandidate?.title}"`,
  topCandidate?.title.toLowerCase() === 'thriller'
);

// ----------------------------------------------------
// Test 2: Low-similarity Candidate Rejection
// ----------------------------------------------------
console.log('\n--- 2. Low-similarity & Different Language Rejection ---');

const frenchSongRecord: LRCLIBRecord = {
  id: 901,
  trackName: "J'en ai marre",
  artistName: 'Alizée',
  duration: 350,
  instrumental: false,
  syncedLyrics: '[00:10.00] Des petits bouts de mousse',
  plainLyrics: 'Des petits bouts de mousse',
};

const acceptableUnrelated = isCandidateAcceptable(frenchSongRecord, 'Thriller', 'Michael Jackson', 357);
assert(
  'Unrelated French song candidate is rejected (isCandidateAcceptable = false)',
  acceptableUnrelated === false
);

const rankUnrelated = rankCandidates([frenchSongRecord], 'Thriller', 'Michael Jackson', 357);
assert(
  'rankCandidates returns null when only unrelated low-similarity candidate is present',
  rankUnrelated === null
);

// ----------------------------------------------------
// Test 3: Duration Boundary Check (> 15s difference)
// ----------------------------------------------------
console.log('\n--- 3. Duration Difference Acceptance Threshold ---');

const liveThrillerRecord: LRCLIBRecord = {
  id: 902,
  trackName: 'Thriller',
  artistName: 'Michael Jackson',
  duration: 480, // 8 minutes (diff = 123s > 15s)
  instrumental: false,
  syncedLyrics: '[01:20.00] Midnight',
  plainLyrics: 'Midnight',
};

const acceptableOver15s = isCandidateAcceptable(liveThrillerRecord, 'Thriller', 'Michael Jackson', 357);
assert(
  'Candidate with duration diff > 15s (480s vs 357s) is rejected for auto-apply',
  acceptableOver15s === false
);

const acceptableUnder15s = isCandidateAcceptable(
  { ...liveThrillerRecord, duration: 365 }, // diff = 8s <= 15s
  'Thriller',
  'Michael Jackson',
  357
);
assert(
  'Candidate with duration diff <= 15s (365s vs 357s) is accepted',
  acceptableUnder15s === true
);

// ----------------------------------------------------
// Test 4: Thriller / Michael Jackson Matching
// ----------------------------------------------------
console.log('\n--- 4. Thriller / Michael Jackson Full Match ---');

const recordsPool: LRCLIBRecord[] = [
  frenchSongRecord,
  {
    id: 903,
    trackName: 'Random Beat #2',
    artistName: 'Unknown',
    duration: 120,
    instrumental: true,
  },
  {
    id: 904,
    trackName: 'Thriller',
    artistName: 'Michael Jackson',
    duration: 358,
    instrumental: false,
    syncedLyrics: "[00:15.20] It's close to midnight\n[00:19.40] And something evil's lurking in the dark",
    plainLyrics: "It's close to midnight\nAnd something evil's lurking in the dark",
  },
];

const bestMatch = rankCandidates(recordsPool, 'Thriller', 'Michael Jackson', 357);
assert(
  'Correct Thriller / Michael Jackson song is selected from mixed pool',
  bestMatch !== null && bestMatch.record.id === 904
);
assert(
  'Selected Thriller candidate is Tier 1 (diff <= 3s)',
  bestMatch?.tier === 1
);

console.log('\n====================================================');
if (allPassed) {
  console.log('ALL QUERY & ACCEPTANCE TESTS PASSED! ✅');
  process.exit(0);
} else {
  console.error('SOME TESTS FAILED! ❌');
  process.exit(1);
}
