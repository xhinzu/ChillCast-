import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
} from '../code';
import {
  calculateClockOffset,
  calculateTargetPosition,
  shouldSeek,
  DRIFT_SEEK_THRESHOLD_MS,
  SEEK_COOLDOWN_MS,
} from '../sync';
import {
  canControlPlayback,
  canAddSong,
  canModifyQueueItem,
  isVoteSkipPassed,
  isValidTrackEndEvent,
} from '../permissions';
import type { RoomData, RoomQueueItem } from '@/types/room';

console.log('--- RUNNING LISTEN TOGETHER UNIT TEST SUITE ---');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    passed++;
    console.log(`✓ ${testName}`);
  } else {
    failed++;
    console.error(`✗ FAILED: ${testName}`);
  }
}

// 1. Room Code Generator Tests
const code1 = generateRoomCode();
assert(code1.length === ROOM_CODE_LENGTH, `Generates exactly ${ROOM_CODE_LENGTH} character code`);
assert(isValidRoomCode(code1), 'Generated code matches valid alphabet');
assert(!ROOM_CODE_ALPHABET.includes('I'), 'Excludes ambiguous letter "I"');
assert(!ROOM_CODE_ALPHABET.includes('O'), 'Excludes ambiguous letter "O"');
assert(!ROOM_CODE_ALPHABET.includes('0'), 'Excludes ambiguous digit "0"');
assert(!ROOM_CODE_ALPHABET.includes('1'), 'Excludes ambiguous digit "1"');
assert(isValidRoomCode('ABC234'), 'Accepts valid code "ABC234"');
assert(!isValidRoomCode('ABC23I'), 'Rejects code containing "I"');
assert(!isValidRoomCode('ABC23O'), 'Rejects code containing "O"');
assert(!isValidRoomCode('ABC23'), 'Rejects code with length < 6');
assert(!isValidRoomCode('ABC2345'), 'Rejects code with length > 6');
assert(normalizeRoomCode('  abc234  ') === 'ABC234', 'Normalizes code to uppercase and trimmed');

// Test uniqueness across 1,000 generated codes
const codeSet = new Set<string>();
for (let i = 0; i < 1000; i++) {
  codeSet.add(generateRoomCode());
}
assert(codeSet.size === 1000, 'Generates 1,000 collision-free codes');

// 2. Clock-Offset Estimation Tests
const samples = [
  { t0: 1000, serverTime: 1050, t1: 1100 }, // RTT = 100ms, offset = 1050 - (1000 + 50) = 0
  { t0: 2000, serverTime: 2080, t1: 2040 }, // RTT = 40ms (lowest!), offset = 2080 - (2000 + 20) = +60ms
  { t0: 3000, serverTime: 3090, t1: 3200 }, // RTT = 200ms, offset = 3090 - (3000 + 100) = -10ms
];
const estimatedOffset = calculateClockOffset(samples);
assert(estimatedOffset === 60, `Estimates clock offset using lowest RTT sample (+60ms, got ${estimatedOffset}ms)`);

// 3. Target Position Math Tests
const playingState = {
  queueItemId: 'item-1',
  status: 'playing' as const,
  positionMs: 10000,
  serverTimeMs: 50000,
  version: 1,
};
// 5 seconds elapsed on server (serverNow = 55000)
const targetWhenPlaying = calculateTargetPosition(playingState, 55000, 300);
assert(targetWhenPlaying === 15000, `Target position increases while playing (expected 15000ms, got ${targetWhenPlaying}ms)`);

const pausedState = {
  queueItemId: 'item-1',
  status: 'paused' as const,
  positionMs: 10000,
  serverTimeMs: 50000,
  version: 1,
};
const targetWhenPaused = calculateTargetPosition(pausedState, 55000, 300);
assert(targetWhenPaused === 10000, 'Target position stays fixed while paused');

// 4. Drift Decision Tests (threshold 600ms, cooldown 3000ms)
assert(DRIFT_SEEK_THRESHOLD_MS === 600, 'Seek drift threshold is 600ms');
assert(SEEK_COOLDOWN_MS === 3000, 'Seek cooldown is 3000ms');

// Drift below 600ms -> do NOT seek
const smallDrift = shouldSeek(10000, 10400, 0, 10000); // 400ms drift
assert(!smallDrift.shouldSeek, 'Does NOT seek when drift <= 600ms');

// Drift above 600ms outside cooldown -> seek
const largeDrift = shouldSeek(10000, 11000, 0, 10000); // 1000ms drift, 10s since last seek
assert(largeDrift.shouldSeek, 'Seeks when drift > 600ms and outside cooldown');

// Drift above 600ms within 3s cooldown -> do NOT seek
const withinCooldown = shouldSeek(10000, 11000, 9000, 10000); // 1s since last seek (< 3s)
assert(!withinCooldown.shouldSeek, 'Enforces 3s seek cooldown to prevent seek loops');

// 5. Permission Checks Tests
const dummyRoom: RoomData = {
  code: 'TST999',
  name: 'Test Room',
  host_id: 'host-123',
  settings: {
    controlPlayback: 'host',
    addSongs: 'everyone',
    locked: false,
    maxMembers: 12,
  },
  state: playingState,
  created_at: new Date().toISOString(),
  last_active_at: new Date().toISOString(),
  ended_at: null,
};

assert(canControlPlayback(dummyRoom, 'host-123'), 'Host can always control playback');
assert(!canControlPlayback(dummyRoom, 'guest-456'), 'Guest cannot control playback when setting is "host"');

const openRoom: RoomData = {
  ...dummyRoom,
  settings: { ...dummyRoom.settings, controlPlayback: 'everyone' },
};
assert(canControlPlayback(openRoom, 'guest-456'), 'Everyone can control playback when setting is "everyone"');

assert(canAddSong(dummyRoom, 'guest-456'), 'Members can add songs when addSongs is "everyone"');
const lockedRoom: RoomData = {
  ...dummyRoom,
  settings: { ...dummyRoom.settings, locked: true },
};
assert(!canAddSong(lockedRoom, 'guest-456'), 'Non-host cannot add songs when room is locked');

// Queue item modification permissions
const queueItem: RoomQueueItem = {
  id: 'q-1',
  room_code: 'TST999',
  position: 0,
  video_id: 'vid-123',
  title: 'Song',
  artist: 'Artist',
  thumbnail: '',
  duration_sec: 180,
  added_by: { id: 'guest-456', name: 'Guest 456', avatar: null },
  added_at: new Date().toISOString(),
};
assert(canModifyQueueItem(dummyRoom, queueItem, 'host-123'), 'Host can remove any queue item');
assert(canModifyQueueItem(dummyRoom, queueItem, 'guest-456'), 'Adder can remove their own queue item');
assert(!canModifyQueueItem(dummyRoom, queueItem, 'other-789'), 'Other member cannot remove someone else\'s queue item');

// 6. Vote to Skip Threshold (> 50%)
// 10 members: threshold is floor(10/2) = 5. Need > 5 (i.e. at least 6 votes)
assert(!isVoteSkipPassed(5, 10), '5/10 votes does NOT pass skip (need > 50%)');
assert(isVoteSkipPassed(6, 10), '6/10 votes passes skip (> 50%)');
// 3 members: threshold is floor(3/2) = 1. Need > 1 (i.e. at least 2 votes)
assert(!isVoteSkipPassed(1, 3), '1/3 votes does NOT pass skip');
assert(isVoteSkipPassed(2, 3), '2/3 votes passes skip (2/3 = 66%)');

// 7. Track-End Version De-duplication Tests
assert(
  isValidTrackEndEvent(1, 'item-1', 1, 'item-1'),
  'Accepts track-end event when version and queueItemId match'
);
assert(
  !isValidTrackEndEvent(2, 'item-2', 1, 'item-1'),
  'Rejects duplicate track-end event with outdated version'
);
assert(
  !isValidTrackEndEvent(1, 'item-2', 1, 'item-1'),
  'Rejects track-end event when queueItemId does not match current'
);

console.log(`\nListen Together tests completed: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
}

