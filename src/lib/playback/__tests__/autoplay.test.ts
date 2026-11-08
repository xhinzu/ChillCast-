import assert from 'node:assert';
import {
  isDurationValid,
  isExcludedTitle,
  filterCandidates,
  type AutoplayCandidate,
} from '../autoplay';

console.log('--- RUNNING AUTOPLAY FILTERING & DEDUPLICATION TEST SUITE ---');

// 1. Duration Validation Tests (1.5 to 10 minutes / 90s to 600s)
console.log('\n1. Testing Duration Validation [90s to 600s]...');
assert.strictEqual(isDurationValid(45), false, '45s track should be rejected (too short)');
assert.strictEqual(isDurationValid(89), false, '89s track should be rejected (under 1.5 min)');
assert.strictEqual(isDurationValid(90), true, '90s track should be accepted');
assert.strictEqual(isDurationValid(210), true, '210s track should be accepted (3.5 min)');
assert.strictEqual(isDurationValid(600), true, '600s track should be accepted (10 min)');
assert.strictEqual(isDurationValid(601), false, '601s track should be rejected (over 10 min)');
assert.strictEqual(isDurationValid(3600), false, '1-hour video should be rejected');
console.log('   ✓ Duration boundaries strictly enforced');

// 2. Excluded Title Pattern Tests (Live, Mixes, Compilations, Podcasts)
console.log('\n2. Testing Excluded Title Filters...');
assert.strictEqual(isExcludedTitle('Lofi Hip Hop Radio - Live 24/7 Stream'), true, 'Live stream should be excluded');
assert.strictEqual(isExcludedTitle('Artist - Track (Live at Wembley)'), true, 'Live concert recording should be excluded');
assert.strictEqual(isExcludedTitle('Best of 2024 Full Album HD'), true, 'Full album upload should be excluded');
assert.strictEqual(isExcludedTitle('Relaxing Beats 1 Hour Compilation'), true, '1-hour compilation should be excluded');
assert.strictEqual(isExcludedTitle('Chillhop Megamix 2 Hours'), true, 'Megamix should be excluded');
assert.strictEqual(isExcludedTitle('Music Theory Podcast Episode 12'), true, 'Podcast should be excluded');
assert.strictEqual(isExcludedTitle('Guitar Solo Tutorial - Easy'), true, 'Tutorial should be excluded');

// Legitimate music tracks should pass
assert.strictEqual(isExcludedTitle('Timeless (Official Audio)'), false, 'Standard official audio should pass');
assert.strictEqual(isExcludedTitle('Feel Good Inc. - Studio Version'), false, 'Studio version should pass');
assert.strictEqual(isExcludedTitle('Midnight Rain'), false, 'Simple track name should pass');
console.log('   ✓ Non-music & compilation titles filtered successfully');

// 3. Deduplication & History Filter Tests
console.log('\n3. Testing 50-Track History Deduplication...');
const history = new Set(['track-1', 'track-2', 'track-3']);
const rawCandidates: AutoplayCandidate[] = [
  { id: 'track-1', title: 'Song 1', artist: 'Artist A', duration: 180 },
  { id: 'track-4', title: 'Song 4', artist: 'Artist B', duration: 200 },
  { id: 'track-2', title: 'Song 2', artist: 'Artist A', duration: 190 },
  { id: 'track-5', title: 'Song 5 (Live at Festival)', artist: 'Artist C', duration: 220 },
  { id: 'track-6', title: 'Song 6', artist: 'Artist D', duration: 240 },
];

const filtered = filterCandidates(rawCandidates, history, []);
assert.strictEqual(filtered.length, 2, 'Only tracks not in history and not excluded should remain');
assert.strictEqual(filtered[0].id, 'track-4');
assert.strictEqual(filtered[1].id, 'track-6');
console.log('   ✓ History deduplication verified');

// 4. Consecutive Artist Cap (Max 2 in a row by same artist)
console.log('\n4. Testing Consecutive Artist Variety Cap (Max 2 in a row)...');
const recentArtists = ['The Weeknd', 'The Weeknd']; // Already 2 in a row
const candidatesWithSameArtist: AutoplayCandidate[] = [
  { id: 'weeknd-3', title: 'Blinding Lights', artist: 'The Weeknd', duration: 200 },
  { id: 'carti-1', title: 'Magnolia', artist: 'Playboi Carti', duration: 180 },
];

const varietyFiltered = filterCandidates(candidatesWithSameArtist, new Set(), recentArtists);
assert.strictEqual(varietyFiltered.length, 1, 'Third consecutive track by same artist should be skipped for variety');
assert.strictEqual(varietyFiltered[0].artist, 'Playboi Carti');
console.log('   ✓ Artist variety constraint enforced');

console.log('\n========================================================');
console.log('🎉 ALL AUTOPLAY ENGINE TESTS PASSED SUCCESSFULLY!');
console.log('========================================================');
