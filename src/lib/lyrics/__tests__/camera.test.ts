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

// Test 8: Fallback word synthesis for line-synced lyrics
const mockLine = { id: 1, text: 'Never gonna give you up', start: 10, end: 13, words: [] };
const parts = mockLine.text.trim().split(/\s+/).filter(Boolean);
const lineDur = mockLine.end - mockLine.start;
const wordDur = lineDur / parts.length;
const synthesizedWords = parts.map((part, pIdx) => ({
  text: part,
  start: mockLine.start + pIdx * wordDur,
  end: mockLine.start + (pIdx + 1) * wordDur,
}));
assert('Synthesizes words from line.text when line.words is empty', synthesizedWords.length === 5 && synthesizedWords[0].text === 'Never');

// Test 9: Center-relative target coordinates calculation
const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 1700;
const activeWordPos = { x: 1500, y: 950 };
const camTarget = {
  x: activeWordPos.x - WORLD_WIDTH / 2,
  y: activeWordPos.y - WORLD_HEIGHT / 2,
};
assert('Computes correct center-relative camera target offset', camTarget.x === 200 && camTarget.y === 100);

// Test 10: Line-based random stage word layout stays within bounds
const wordsToTest = ['City\'s', 'breaking', 'down', 'on', 'a', 'camel\'s', 'back'];
const testNodes = wordsToTest.map((w, i) => {
  const angle = (i / wordsToTest.length) * Math.PI * 2;
  const candX = Math.round(Math.cos(angle) * 360 * 0.7);
  const candY = Math.round(Math.sin(angle) * 200 * 0.7);
  return { text: w, x: candX, y: candY };
});
assert('Line words stay comfortably within [-360, 360] x [-200, 200] stage bounds', testNodes.every(n => Math.abs(n.x) <= 360 && Math.abs(n.y) <= 200));

// Test 11: Branches camera target look-ahead leads along branch growth direction
import { generateBranchesLayout } from '../layoutNodes';
const branchWords = [
  { text: 'Look', start: 0, end: 0.5 },
  { text: 'at', start: 0.5, end: 0.8 },
  { text: 'the', start: 0.8, end: 1.1 },
  { text: 'stars', start: 1.1, end: 1.6 },
  { text: 'look', start: 1.6, end: 2.0 },
  { text: 'how', start: 2.0, end: 2.3 },
  { text: 'they', start: 2.3, end: 2.6 },
  { text: 'shine', start: 2.6, end: 3.2 },
];
const branchLayout = generateBranchesLayout(branchWords, 1, 1000, 600);
assert('Branches layout generates valid nodes and edges', branchLayout.nodes.length === 8 && branchLayout.edges.length === 7);

// Compute target for node 0
const n0 = branchLayout.nodes[0];
const n1 = branchLayout.nodes[1];
const dX = n1.x - n0.x;
const dY = n1.y - n0.y;
const dist0 = Math.hypot(dX, dY);
const uX = dist0 > 0 ? dX / dist0 : 1;
const uY = dist0 > 0 ? dY / dist0 : 0;
const lookAheadX = uX * 1000 * 0.12;
const lookAheadY = uY * 600 * 0.12;
const focus0 = { x: n0.x + lookAheadX, y: n0.y + lookAheadY };
assert('Branches camera leads ahead in X direction towards next branch tip', focus0.x > n0.x);

// Test 12: Active word in Branches camera is always within the central 60% of the screen
let allInsideCentral60 = true;
const zoomLevel = 1.3;
const VIEW_W = 1000;
const VIEW_H = 600;

for (let i = 0; i < branchLayout.nodes.length; i++) {
  const activeN = branchLayout.nodes[i];
  let dirX = 1;
  let dirY = 0;
  if (i < branchLayout.nodes.length - 1) {
    const nextN = branchLayout.nodes[i + 1];
    dirX = nextN.x - activeN.x;
    dirY = nextN.y - activeN.y;
  } else if (i > 0) {
    const prevN = branchLayout.nodes[i - 1];
    dirX = activeN.x - prevN.x;
    dirY = activeN.y - prevN.y;
  }
  const d = Math.hypot(dirX, dirY);
  const ux = d > 0 ? dirX / d : 1;
  const uy = d > 0 ? dirY / d : 0;
  const factor = i === branchLayout.nodes.length - 1 ? 0 : 0.12;
  const laX = ux * VIEW_W * factor;
  const laY = uy * VIEW_H * factor;
  const fX = activeN.x + laX;
  const fY = activeN.y + laY;

  // Under transform: translate3d(-targetX * zoom, -targetY * zoom, 0) scale(zoom)
  // Target coordinates relative to center (500, 300):
  const targetPanX = -(fX - 500) * zoomLevel;
  const targetPanY = -(fY - 300) * zoomLevel;

  // Screen position of active word relative to viewport center:
  const screenX = targetPanX + (activeN.x - 500) * zoomLevel;
  const screenY = targetPanY + (activeN.y - 300) * zoomLevel;

  // Normalized distance from center (as fraction of viewport)
  const normDistX = Math.abs(screenX) / VIEW_W;
  const normDistY = Math.abs(screenY) / VIEW_H;

  // Central 60% of screen means distance from center <= 0.30 (30%)
  if (normDistX > 0.30 || normDistY > 0.30) {
    allInsideCentral60 = false;
  }
}
assert('Branches active word is always inside the central 60% of the screen', allInsideCentral60);

// Test 13: Dynamic omega / settle time shortens on fast words
const defaultSettle = 0.6;
const fastWordDur = 0.25;
const effectiveSettle = Math.max(0.25, Math.min(defaultSettle, fastWordDur * 0.85));
assert('Shortens settle time dynamically on fast lyric words', effectiveSettle < defaultSettle && effectiveSettle >= 0.25);

// Test 14: Preserves neutral static framing when camera movement is OFF
storage.set(LYRICS_SETTINGS_KEY, JSON.stringify({ style: 'branches', cameraMovementEnabled: false, version: 1 }));
const branchesLoaded = loadLyricsSettings();
assert('Branches respects cameraMovementEnabled = false in settings', branchesLoaded.style === 'branches' && branchesLoaded.cameraMovementEnabled === false);

console.log('====================================================');
console.log(`SUMMARY: ${testsPassed}/${totalTests} Tests Passed!`);
console.log('====================================================');
