import assert from 'node:assert';
import { selectSmartPicks, SMART_PICK_WEIGHTS, type SmartPickCandidate } from '../../smartPicks';
import type { TrackInfo } from '../../../types/playback';

console.log('--- RUNNING SMART SHUFFLE SCORING & SELECTION TEST SUITE ---');

const mkTrack = (id: string, title: string, artist: string): TrackInfo => ({
  id,
  title,
  artist,
  duration: 210,
  source: 'youtube',
});

const current = mkTrack('curr-1', 'Current Song', 'Artist A');
const now = 1_700_000_000_000;

const candidates: SmartPickCandidate[] = [
  { track: mkTrack('liked-1', 'Liked Replay', 'Artist B'), isLiked: true, inPlaylist: true },
  { track: mkTrack('skip-1', 'Always Skipped', 'Artist C'), isLiked: false, inPlaylist: true },
  { track: mkTrack('same-a1', 'Same Artist 1', 'Artist A'), isLiked: false, inPlaylist: true },
  { track: mkTrack('same-a2', 'Same Artist 2', 'Artist A'), isLiked: false, inPlaylist: true },
  { track: mkTrack('new-1', 'Fresh Discovery', 'Artist D'), isNewSuggestion: true },
];

const historyTracks = {
  'youtube:liked-1': {
    trackKey: 'youtube:liked-1',
    id: 'liked-1',
    source: 'youtube' as const,
    title: 'Liked Replay',
    artist: 'Artist B',
    duration: 210,
    playCount: 10,
    completeCount: 9,
    skipCount: 0,
    consecutiveSkips: 0,
    firstPlayedAt: now - 30 * 86400_000,
    lastPlayedAt: now - 3 * 86400_000,
  },
  'youtube:skip-1': {
    trackKey: 'youtube:skip-1',
    id: 'skip-1',
    source: 'youtube' as const,
    title: 'Always Skipped',
    artist: 'Artist C',
    duration: 210,
    playCount: 6,
    completeCount: 0,
    skipCount: 6,
    consecutiveSkips: 3,
    firstPlayedAt: now - 10 * 86400_000,
    lastPlayedAt: now - 86400_000,
  },
};

assert.ok(SMART_PICK_WEIGHTS.likedBonus > 0, 'Weights config should be exported');

// 1. Familiar liked/completed track beats heavily skipped track
const picks1 = selectSmartPicks({
  currentTrack: current,
  candidates,
  historyTracks,
  transitions: [{ fromKey: 'youtube:curr-1', toKey: 'youtube:liked-1', count: 4, lastAt: now - 86400_000 }],
  recentTrackIds: new Set(),
  queueTrackIds: new Set(),
  sessionRemovedIds: new Set(),
  recentArtists: [],
  includeNewPct: 0,
  count: 2,
  seed: 123,
  now,
});
assert.strictEqual(picks1[0].track.id, 'liked-1', 'Liked + completed + co-played track should rank #1');
assert.ok(picks1[0].reason.length > 0, 'Reason string should be populated');
assert.strictEqual(picks1.some((p) => p.track.id === 'new-1'), false, '0% new suggestions should exclude new tracks when familiar ones exist');

// 2. Session-removed and recent-50 tracks are excluded
const picks2 = selectSmartPicks({
  currentTrack: current,
  candidates,
  historyTracks,
  transitions: [],
  recentTrackIds: new Set(['same-a1']),
  queueTrackIds: new Set(),
  sessionRemovedIds: new Set(['liked-1']),
  recentArtists: [],
  includeNewPct: 0,
  count: 3,
  seed: 123,
  now,
});
assert.strictEqual(picks2.some((p) => p.track.id === 'liked-1'), false, 'Session-removed pick must not be re-suggested');
assert.strictEqual(picks2.some((p) => p.track.id === 'same-a1'), false, 'Recent-50 track must be excluded');

// 3. Max 2 consecutive same artist diversity cap
const picks3 = selectSmartPicks({
  currentTrack: current,
  candidates: [
    { track: mkTrack('same-a1', 'Same Artist 1', 'Artist A'), isLiked: true },
    { track: mkTrack('other-1', 'Other Artist', 'Artist Z'), isLiked: false },
  ],
  historyTracks: {},
  transitions: [],
  recentTrackIds: new Set(),
  queueTrackIds: new Set(),
  sessionRemovedIds: new Set(),
  recentArtists: ['Artist A', 'Artist A'],
  includeNewPct: 0,
  count: 1,
  seed: 99,
  now,
});
assert.strictEqual(picks3[0].track.id, 'other-1', 'Artist diversity cap should skip 3rd consecutive same-artist track');

// 4. Deterministic output for identical seed
const detA = selectSmartPicks({
  currentTrack: current,
  candidates,
  historyTracks,
  transitions: [],
  recentTrackIds: new Set(),
  queueTrackIds: new Set(),
  sessionRemovedIds: new Set(),
  recentArtists: [],
  includeNewPct: 20,
  count: 2,
  seed: 777,
  now,
});
const detB = selectSmartPicks({
  currentTrack: current,
  candidates,
  historyTracks,
  transitions: [],
  recentTrackIds: new Set(),
  queueTrackIds: new Set(),
  sessionRemovedIds: new Set(),
  recentArtists: [],
  includeNewPct: 20,
  count: 2,
  seed: 777,
  now,
});
assert.deepStrictEqual(detA.map((p) => p.track.id), detB.map((p) => p.track.id), 'Selection must be deterministic for same seed');

console.log('✓ All Smart Shuffle scoring, exclusion, diversity, and determinism tests passed!');

