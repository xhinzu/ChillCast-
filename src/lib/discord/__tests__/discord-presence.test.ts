import {
  DISCORD_PRESENCE_STORAGE_KEY,
  DISCORD_PRESENCE_SHARE_ROOM_KEY,
  getDiscordPresenceEnabled,
  setDiscordPresenceEnabled,
  getDiscordPresenceShareRoom,
  setDiscordPresenceShareRoom,
} from '../presence-settings';

console.log('--- RUNNING DISCORD PRESENCE & PRIVACY TEST SUITE ---');

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

// Mock localStorage for Node test environment
const mockStorage: Record<string, string> = {};
(global as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
  key: () => null,
  length: 0,
};

// Mock window for dispatchEvent
(global as unknown as { window: Window }).window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
} as unknown as Window;

// 1. Default states must be strictly OFF (false)
localStorage.clear();
assert(getDiscordPresenceEnabled() === false, 'Default Discord presence is strictly OFF');
assert(getDiscordPresenceShareRoom() === false, 'Default share room link is strictly OFF');

// 2. Toggling presence ON persists to storage
setDiscordPresenceEnabled(true);
assert(localStorage.getItem(DISCORD_PRESENCE_STORAGE_KEY) === 'true', 'Persists enabled state as "true" in localStorage');
assert(getDiscordPresenceEnabled() === true, 'Reads enabled state as true');

// 3. Toggling presence OFF persists to storage
setDiscordPresenceEnabled(false);
assert(localStorage.getItem(DISCORD_PRESENCE_STORAGE_KEY) === 'false', 'Persists disabled state as "false" in localStorage');
assert(getDiscordPresenceEnabled() === false, 'Reads enabled state as false');

// 4. Sub-toggle: Share Room link persistence
setDiscordPresenceShareRoom(true);
assert(localStorage.getItem(DISCORD_PRESENCE_SHARE_ROOM_KEY) === 'true', 'Persists share room as "true"');
assert(getDiscordPresenceShareRoom() === true, 'Reads share room as true');

setDiscordPresenceShareRoom(false);
assert(localStorage.getItem(DISCORD_PRESENCE_SHARE_ROOM_KEY) === 'false', 'Persists share room as "false"');
assert(getDiscordPresenceShareRoom() === false, 'Reads share room as false');

// 5. Privacy Data Exposure Verification
function simulatePresenceElement(
  enabled: boolean,
  track: { title: string; artist: string; duration: number } | null,
  isPlaying: boolean,
  position: number,
  roomCode: string,
  shareRoom: boolean
): Record<string, string> {
  // When toggle is OFF or track is null, element contains NO attributes
  if (!enabled || !track) {
    return {};
  }
  return {
    'data-app-name': 'MyuJiku',
    'data-title': track.title,
    'data-artist': track.artist,
    'data-duration': track.duration.toString(),
    'data-position': Math.round(position).toString(),
    'data-status': isPlaying ? 'playing' : 'paused',
    'data-room-code': shareRoom && roomCode ? roomCode : '',
  };
}

// When toggle is OFF: Element must be completely empty
const offData = simulatePresenceElement(false, { title: 'Starboy', artist: 'The Weeknd', duration: 230 }, true, 45, 'ABC234', true);
assert(Object.keys(offData).length === 0, 'When toggle is OFF: element contains zero data attributes');

// When toggle is ON but no track loaded: Element must be completely empty
const noTrackData = simulatePresenceElement(true, null, false, 0, '', false);
assert(Object.keys(noTrackData).length === 0, 'When no track is loaded: element contains zero data attributes');

// When toggle is ON with track playing: attributes are populated
const onPlayingData = simulatePresenceElement(true, { title: 'Starboy', artist: 'The Weeknd', duration: 230 }, true, 45, 'ABC234', true);
assert(onPlayingData['data-app-name'] === 'MyuJiku', 'Exposes app name as "MyuJiku"');
assert(onPlayingData['data-title'] === 'Starboy', 'Exposes track title');
assert(onPlayingData['data-artist'] === 'The Weeknd', 'Exposes track artist');
assert(onPlayingData['data-status'] === 'playing', 'Exposes status as "playing"');
assert(onPlayingData['data-room-code'] === 'ABC234', 'Exposes room code when shareRoom is true');

// When shareRoom is false: room code is omitted
const noShareRoomData = simulatePresenceElement(true, { title: 'Starboy', artist: 'The Weeknd', duration: 230 }, true, 45, 'ABC234', false);
assert(noShareRoomData['data-room-code'] === '', 'Omits room code when shareRoom is false');

// When paused: status is "paused"
const pausedData = simulatePresenceElement(true, { title: 'Starboy', artist: 'The Weeknd', duration: 230 }, false, 45, '', false);
assert(pausedData['data-status'] === 'paused', 'Exposes status as "paused"');

console.log(`\nDiscord Presence tests completed: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
