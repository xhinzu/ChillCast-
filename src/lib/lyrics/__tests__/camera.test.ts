// Setup window and localStorage mock for Node test environment
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  length: 0,
  key: () => null,
};

(global as unknown as { window: unknown }).window = {
  localStorage: mockLocalStorage,
  matchMedia: () => ({ matches: false }),
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
(global as unknown as { localStorage: Storage }).localStorage = mockLocalStorage;

import { loadLyricsSettings, LYRICS_SETTINGS_KEY } from '../settings';

function testSpringStep(
  current: number,
  velocity: number,
  target: number,
  omega: number,
  dt: number
): [number, number] {
  const x0 = current - target;
  const expTerm = Math.exp(-omega * dt);
  const b = velocity + omega * x0;
  const newPos = target + (x0 + b * dt) * expTerm;
  const newVel = (velocity - omega * b * dt) * expTerm;
  return [newPos, newVel];
}

console.log('====================================================');
console.log('RUNNING CAMERA & SETTINGS MIGRATION TEST SUITE');
console.log('====================================================');

let testsPassed = 0;
let totalTests = 0;

function assert(desc: string, condition: boolean) {
  totalTests++;
  if (condition) {
    console.log(`✅ ${desc}`);
    testsPassed++;
  } else {
    console.error(`❌ FAILED: ${desc}`);
    process.exitCode = 1;
  }
}

// Test 1: Migration from fisheye_visual to fisheye
storage.set(LYRICS_SETTINGS_KEY, JSON.stringify({ style: 'fisheye_visual', version: 1 }));
let loaded = loadLyricsSettings();
assert('Migrates fisheye_visual to fisheye', loaded.style === 'fisheye');

// Test 2: Migration from codestyle_visual to codestyle
storage.set(LYRICS_SETTINGS_KEY, JSON.stringify({ style: 'codestyle_visual', version: 1 }));
loaded = loadLyricsSettings();
assert('Migrates codestyle_visual to codestyle', loaded.style === 'codestyle');

// Test 3: Camera style is valid and preserved
storage.set(LYRICS_SETTINGS_KEY, JSON.stringify({ style: 'camera', version: 1 }));
loaded = loadLyricsSettings();
assert('Accepts camera style', loaded.style === 'camera');

// Test 4: Default cameraMovementEnabled is true
assert('Default cameraMovementEnabled is true', loaded.cameraMovementEnabled === true);

// Test 5: Preserves cameraMovementEnabled = false when set
storage.set(LYRICS_SETTINGS_KEY, JSON.stringify({ style: 'camera', cameraMovementEnabled: false, version: 1 }));
loaded = loadLyricsSettings();
assert('Preserves cameraMovementEnabled false', loaded.cameraMovementEnabled === false);

// Test 6: Spring critically damped motion does not overshoot target
let pos = 0;
let vel = 0;
const target = 100;
const omega = 7.5; // ~0.6s settle time
let overshot = false;

for (let step = 0; step < 60; step++) {
  const [newPos, newVel] = testSpringStep(pos, vel, target, omega, 1 / 60);
  if (newPos > target + 0.0001) {
    overshot = true;
    break;
  }
  pos = newPos;
  vel = newVel;
}
assert('Critically-damped spring step never overshoots target', !overshot);
assert('Critically-damped spring converges to target smoothly (> 98% in 60 frames)', pos > 98);

console.log('====================================================');
console.log(`SUMMARY: ${testsPassed}/${totalTests} Tests Passed!`);
console.log('====================================================');
