import { rankCandidates, LRCLIBRecord } from '../searchLrclib';

console.log('====================================================');
console.log('RUNNING DURATION-AWARE RANKING TEST SUITE (PART B)');
console.log('====================================================\n');

const mockRecords: LRCLIBRecord[] = [
  // Record A: Studio version (230s), synced lyrics
  {
    id: 101,
    trackName: 'Starboy',
    artistName: 'The Weeknd',
    duration: 230,
    instrumental: false,
    syncedLyrics: '[00:04.20] I\'m tryna put you in the worst mood, ah\n[00:08.50] P1 cleaner than your church shoes, ah',
    plainLyrics: 'I\'m tryna put you in the worst mood, ah',
  },
  // Record B: Music video edit (273s), synced lyrics
  {
    id: 102,
    trackName: 'Starboy (Official Video)',
    artistName: 'The Weeknd',
    duration: 273,
    instrumental: false,
    syncedLyrics: '[00:44.20] I\'m tryna put you in the worst mood, ah\n[00:48.50] P1 cleaner than your church shoes, ah',
    plainLyrics: 'I\'m tryna put you in the worst mood, ah',
  },
  // Record C: Plain lyrics (233s)
  {
    id: 103,
    trackName: 'Starboy',
    artistName: 'The Weeknd',
    duration: 233,
    instrumental: false,
    syncedLyrics: undefined,
    plainLyrics: 'I\'m tryna put you in the worst mood, ah',
  },
];

// Test 1: When player has the 4:33 (273s) music video, it should prefer Record B (diff 0s <= 3s -> Tier 1)
const result1 = rankCandidates(mockRecords, 'Starboy', 'The Weeknd', 273);
console.log('Test 1: Video duration 273s (both 230s and 273s versions available)');
console.log(`  -> Selected Record ID: ${result1?.record.id} (duration: ${result1?.record.duration}s)`);
console.log(`  -> Tier: ${result1?.tier}`);
console.log(`  -> durationMismatch: ${result1?.durationMismatch}`);
console.log(`  -> Result: ${result1?.record.id === 102 && result1?.tier === 1 && !result1?.durationMismatch ? 'PASSED ✅' : 'FAILED ❌'}\n`);

// Test 2: When ONLY the 230s studio version exists and player is 273s (diff = 43s > 8s)
const result2 = rankCandidates([mockRecords[0]], 'Starboy', 'The Weeknd', 273);
console.log('Test 2: Video duration 273s (ONLY 230s studio version available)');
console.log(`  -> Selected Record ID: ${result2?.record.id} (duration: ${result2?.record.duration}s)`);
console.log(`  -> Tier: ${result2?.tier}`);
console.log(`  -> durationMismatch: ${result2?.durationMismatch}`);
console.log(`  -> diffSeconds: ${result2?.diffSeconds}`);
console.log(`  -> Result: ${result2?.durationMismatch === true && result2?.diffSeconds === 43 ? 'PASSED ✅' : 'FAILED ❌'}\n`);

// Test 3: When player duration is 231s and record is 230s (diff = 1s <= 3s -> Tier 1)
const result3 = rankCandidates([mockRecords[0]], 'Starboy', 'The Weeknd', 231);
console.log('Test 3: Audio duration 231s vs 230s record');
console.log(`  -> Tier: ${result3?.tier}`);
console.log(`  -> durationMismatch: ${result3?.durationMismatch}`);
console.log(`  -> Result: ${result3?.tier === 1 && result3?.durationMismatch === false ? 'PASSED ✅' : 'FAILED ❌'}\n`);

// Test 4: Plain lyrics within 8s (diff = 2s <= 8s -> Tier 3)
const result4 = rankCandidates([mockRecords[2]], 'Starboy', 'The Weeknd', 235);
console.log('Test 4: Plain lyrics 233s vs 235s');
console.log(`  -> Tier: ${result4?.tier}`);
console.log(`  -> Result: ${result4?.tier === 3 ? 'PASSED ✅' : 'FAILED ❌'}\n`);

if (
  result1?.record.id === 102 &&
  result2?.durationMismatch === true &&
  result2?.diffSeconds === 43 &&
  result3?.tier === 1 &&
  result4?.tier === 3
) {
  console.log('ALL DURATION-AWARE RANKING TESTS PASSED! ✅');
} else {
  console.error('TESTS FAILED ❌');
  process.exit(1);
}
