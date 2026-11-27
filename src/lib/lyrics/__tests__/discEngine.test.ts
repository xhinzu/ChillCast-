import assert from 'node:assert';
import {
  chunkLineIntoPhrases,
  computePhraseLifecycle,
  computeCaseMotion,
  computeDiscSpinStep,
  type DiscMotionConfig,
  type DiscSpinConfig,
} from '../discEngine';
import type { SyncedLyricLine } from '../providers/types';

console.log('--- RUNNING DISC STYLE ENGINE UNIT TESTS ---');

// 1. Chunking function tests
console.log('\n1. Testing Line Chunking into 1-3 Word Phrases...');
const line1: SyncedLyricLine = {
  id: 1,
  start: 1.0,
  end: 5.0,
  text: 'I want to hold you, in the dark',
  words: [
    { text: 'I', start: 1.0, end: 1.2 },
    { text: 'want', start: 1.2, end: 1.5 },
    { text: 'to', start: 1.5, end: 1.7 },
    { text: 'hold', start: 1.7, end: 2.1 },
    { text: 'you,', start: 2.1, end: 2.5 },
    { text: 'in', start: 3.0, end: 3.2 }, // 0.5s gap > 250ms & punctuation
    { text: 'the', start: 3.2, end: 3.4 },
    { text: 'dark', start: 3.4, end: 4.0 },
  ],
};

const phrases = chunkLineIntoPhrases(line1, 0, {
  maxWordsPerPhrase: 3,
  gapThresholdSec: 0.25,
  gapSec: 0.1,
  nextLineStartSec: 5.0,
});

assert.ok(phrases.length >= 2, 'Should split into multiple phrases');
for (const ph of phrases) {
  assert.ok(ph.words.length >= 1 && ph.words.length <= 4, `Phrase "${ph.text}" word count valid`);
  const cleanFirst = ph.words[0].text.replace(/[^a-zA-Z0-9]/g, '');
  if (ph.words.length === 1) {
    assert.ok(cleanFirst.length > 1, `Must never leave a one-letter orphan, got "${ph.text}"`);
  }
}

// Verify 100ms gap and NO overlap between consecutive phrases
for (let i = 0; i < phrases.length - 1; i++) {
  const cur = phrases[i];
  const nxt = phrases[i + 1];
  assert.ok(cur.end <= nxt.start - 0.099, `Expected >=100ms gap before next phrase, got ${(nxt.start - cur.end).toFixed(3)}s`);
  assert.ok(cur.end < nxt.start, 'Phrases must never overlap');
}

// Test one-letter orphan prevention explicitly ("a" at end after punctuation)
const orphanLine: SyncedLyricLine = {
  id: 2,
  start: 0,
  end: 2,
  text: 'Wait, a',
  words: [
    { text: 'Wait,', start: 0.0, end: 0.5 },
    { text: 'a', start: 0.5, end: 1.0 },
  ],
};
const orphanPhrases = chunkLineIntoPhrases(orphanLine, 1, { maxWordsPerPhrase: 3 });
assert.strictEqual(orphanPhrases.length, 1, 'One-letter word "a" must merge with neighbor instead of standing alone');
console.log('   ✓ Chunking, punctuation/gap breaks, orphan prevention, and 100ms non-overlapping gaps verified');

// 2. Phrase lifecycle progress curve tests (p = 0, 0.5, 1)
console.log('\n2. Testing Phrase Lifecycle Curve (p = 0, 0.5, 1)...');
const lc0 = computePhraseLifecycle(0, 1.0, { buildupStrength: 1, blurMaxPx: 3 });
assert.strictEqual(lc0.visible, true);
assert.ok(Math.abs(lc0.opacity - 0.28) < 0.001, `p=0 opacity should be 0.28, got ${lc0.opacity}`);
assert.ok(Math.abs(lc0.blurPx - 3.0) < 0.001, `p=0 blur should be 3px, got ${lc0.blurPx}`);
assert.ok(Math.abs(lc0.scale - 0.97) < 0.001, `p=0 scale should be 0.97, got ${lc0.scale}`);

const lcHalf = computePhraseLifecycle(0.5, 1.0, { buildupStrength: 1, blurMaxPx: 3 });
// easeOutCubic(0.5) = 1 - 0.125 = 0.875 -> opacity = 0.28 + 0.72*0.875 = 0.91; blur = 3*0.125 = 0.375; scale = 0.995
assert.ok(Math.abs(lcHalf.opacity - 0.91) < 0.001, `p=0.5 opacity should be 0.91, got ${lcHalf.opacity}`);
assert.ok(Math.abs(lcHalf.blurPx - 0.375) < 0.001, `p=0.5 blur should be 0.375px, got ${lcHalf.blurPx}`);
assert.ok(Math.abs(lcHalf.scale - 0.995) < 0.001, `p=0.5 scale should be 0.995, got ${lcHalf.scale}`);

const lcAlmostEnd = computePhraseLifecycle(0.999, 1.0, { buildupStrength: 1, blurMaxPx: 3 });
assert.ok(lcAlmostEnd.opacity > 0.99, `p~1 opacity should approach 1.0, got ${lcAlmostEnd.opacity}`);
assert.ok(lcAlmostEnd.blurPx < 0.01, `p~1 blur should approach 0, got ${lcAlmostEnd.blurPx}`);
assert.ok(lcAlmostEnd.scale > 1.019, `p~1 scale should approach 1.02, got ${lcAlmostEnd.scale}`);

// Instant cut-out at end (no fade-out)
const lcEnd = computePhraseLifecycle(1.0, 1.0);
assert.strictEqual(lcEnd.visible, false, 'Phrase must cut out instantly at end (no fade-out)');

// Long phrase (>1.2s) reaches full brightness by 0.8s and holds
const lcLongHold = computePhraseLifecycle(0.85, 2.5, { longPhraseThresholdSec: 1.2, longPhraseHoldAtSec: 0.8 });
assert.strictEqual(lcLongHold.visible, true);
assert.strictEqual(lcLongHold.p, 1, 'Long phrase (>1.2s) should reach p=1 by 0.8s and hold');
assert.strictEqual(lcLongHold.opacity, 1);
assert.strictEqual(lcLongHold.blurPx, 0);
console.log('   ✓ Phrase lifecycle curve (opacity, blur, scale, instant cut-out, long-phrase hold) verified');

// 3. Case tilt & drift bounds and periods
console.log('\n3. Testing Case Tilt & Drift Motion Bounds...');
const motionCfg: DiscMotionConfig = {
  floatAmount: 1,
  tiltAmount: 1,
  tiltPeriodSec: 3.0,
  syncTiltToBeat: false,
  tiltDeg: 5,
  driftXPct: 5,
  driftYPct: 6,
  driftXPeriodSec: 4.3,
  driftYPeriodSec: 3.6,
  scalePulsePct: 0.04,
  scalePulsePeriodSec: 3.0,
};

let minZ = Infinity, maxZ = -Infinity;
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minS = Infinity, maxS = -Infinity;

for (let t = 0; t <= 12; t += 0.05) {
  const m = computeCaseMotion(t, motionCfg, 0);
  minZ = Math.min(minZ, m.rotateZDeg);
  maxZ = Math.max(maxZ, m.rotateZDeg);
  minX = Math.min(minX, m.translateXPercent);
  maxX = Math.max(maxX, m.translateXPercent);
  minY = Math.min(minY, m.translateYPercent);
  maxY = Math.max(maxY, m.translateYPercent);
  minS = Math.min(minS, m.scale);
  maxS = Math.max(maxS, m.scale);
  assert.ok(Math.abs(m.rotateZDeg) <= 5.001, 'Tilt within +/-5 deg');
  assert.ok(Math.abs(m.translateXPercent) <= 5.001, 'Drift X within +/-5%');
  assert.ok(Math.abs(m.translateYPercent) <= 6.001, 'Drift Y within +/-6%');
  assert.ok(m.scale >= 0.959 && m.scale <= 1.041, 'Scale within +/-4%');
}
assert.ok(maxZ > 4.5 && minZ < -4.5, 'Tilt sweeps near full +/-5 deg range');
assert.ok(maxX > 4.5 && minX < -4.5, 'Drift X sweeps near full +/-5% range');
assert.ok(maxY > 5.5 && minY < -5.5, 'Drift Y sweeps near full +/-6% range');
assert.ok(maxS > 1.03 && minS < 0.97, 'Scale pulse sweeps near +/-4%');

// Verify spin speed averages ~40 deg/s clockwise for 9s period
const spinCfg: DiscSpinConfig = {
  spinPeriodSec: 9,
  beatPulse: false,
  spinModPct: 0.3,
  spinModPeriodSec: 1.7,
};
let totalDeg = 0;
for (let t = 0; t < 9; t += 0.01) {
  totalDeg += computeDiscSpinStep(0.01, t, 1, spinCfg, 0);
}
assert.ok(totalDeg > 340 && totalDeg < 380, `Expected ~360 deg over 9s (~40 deg/s), got ${totalDeg.toFixed(1)}`);
console.log('   ✓ Case tilt, drift, scale pulse, and clockwise disc spin bounds verified');

console.log('\n=== ALL DISC ENGINE TESTS PASSED ===\n');

