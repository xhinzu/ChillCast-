import assert from 'node:assert';
import { WORD_EFFECTS, EFFECT_BY_ID, getEffectDef, getEffectIdForWord } from '../catalog';
import { FlashBudget } from '../FlashBudget';
import { ParticlePool } from '../ParticlePool';
import { EffectManager } from '../EffectManager';

import { EffectCategory } from '../types';

console.log('--- RUNNING WORD EFFECTS ENGINE TEST SUITE ---\n');

// 1. EFFECT CATALOG INTEGRITY (ALL 49 EFFECTS)
console.log('1. Testing Effect Catalog Integrity (49 Effects)...');
assert.strictEqual(WORD_EFFECTS.length, 49, `Must have exactly 49 effects, found ${WORD_EFFECTS.length}`);
assert.strictEqual(EFFECT_BY_ID.size, 49, `EFFECT_BY_ID must index all 49 effects, found ${EFFECT_BY_ID.size}`);

const expectedCategories: EffectCategory[] = ['impact', 'fire', 'water', 'emotion', 'motion', 'intense'];
const foundCategories = new Set(WORD_EFFECTS.map((e) => e.category));
for (const cat of expectedCategories) {
  assert.ok(foundCategories.has(cat), `Category '${cat}' must be present in catalog`);
}

// Intense effects count
const intenseEffects = WORD_EFFECTS.filter((e) => e.intensity === 'intense');
assert.strictEqual(intenseEffects.length, 5, `Must have exactly 5 intense effects, found ${intenseEffects.length}`);
const intenseIds = new Set(intenseEffects.map((e) => e.id));
assert.ok(intenseIds.has('gun'), 'Gun must be intense');
assert.ok(intenseIds.has('knife'), 'Knife must be intense');
assert.ok(intenseIds.has('blood'), 'Blood must be intense');
assert.ok(intenseIds.has('skull'), 'Skull must be intense');
assert.ok(intenseIds.has('war'), 'War must be intense');

// Verify all 49 effects have valid properties
for (const eff of WORD_EFFECTS) {
  assert.ok(eff.id && eff.id.length > 0, `Effect must have an id`);
  assert.ok(eff.name && eff.name.length > 0, `Effect ${eff.id} must have a name`);
  assert.ok(Array.isArray(eff.words) && eff.words.length > 0, `Effect ${eff.id} must have words`);
  assert.ok(eff.durationMs >= 300 && eff.durationMs <= 1200, `Effect ${eff.id} duration must be between 300ms and 1200ms`);
  assert.strictEqual(typeof eff.update, 'function', `Effect ${eff.id} must have an update method`);
  assert.strictEqual(typeof eff.draw, 'function', `Effect ${eff.id} must have a draw method`);

  // Verify getEffectDef
  assert.strictEqual(getEffectDef(eff.id), eff, `getEffectDef(${eff.id}) must return definition`);
}
console.log('   ✓ Catalog integrity verified: all 49 effects present and valid.\n');

// 2. WORD TO EFFECT RESOLUTION
console.log('2. Testing Word-to-Effect Mapping...');
const sampleWordPairs: [string, string][] = [
  ['bomb', 'bomb'],
  ['explode', 'bomb'],
  ['thunder', 'lightning'],
  ['lightning', 'lightning'],
  ['fire', 'fire'],
  ['flame', 'fire'],
  ['rain', 'rain'],
  ['tears', 'rain'],
  ['ocean', 'ocean'],
  ['snow', 'snow'],
  ['love', 'love'],
  ['heartbreak', 'heartbreak'],
  ['angel', 'angel'],
  ['ghost', 'ghost'],
  ['speed', 'speed'],
  ['run', 'speed'],
  ['clock', 'clock'],
  ['money', 'coins'],
  ['music', 'music'],
  ['gun', 'gun'],
  ['knife', 'knife'],
  ['blood', 'blood'],
  ['skull', 'skull'],
  ['war', 'war'],
];

for (const [word, expectedEffectId] of sampleWordPairs) {
  const resolved = getEffectIdForWord(word);
  assert.strictEqual(resolved, expectedEffectId, `Word '${word}' must resolve to effect '${expectedEffectId}', got '${resolved}'`);
}
console.log('   ✓ Word-to-effect mappings verified.\n');

// 3. FLASH BUDGET & PHOTOSENSITIVITY SAFETY
console.log('3. Testing Flash Budget & Photosensitivity Safety...');
const flashBudget = new FlashBudget();

// Within a 1-second window, maximum 3 flashes are permitted
const t0 = 1000;
const f1 = flashBudget.requestFlash(t0);
assert.strictEqual(f1.allowed, true, 'Flash 1 must be allowed');
assert.ok(f1.maxDurationMs <= 150, 'Flash duration must be under 150ms');
assert.ok(f1.maxOpacity <= 0.35, 'Flash opacity must be low-contrast (<= 0.35)');

const f2 = flashBudget.requestFlash(t0 + 200);
assert.strictEqual(f2.allowed, true, 'Flash 2 must be allowed');

const f3 = flashBudget.requestFlash(t0 + 400);
assert.strictEqual(f3.allowed, true, 'Flash 3 must be allowed');

// 4th flash within the same 1-second window MUST be rejected!
const f4 = flashBudget.requestFlash(t0 + 600);
assert.strictEqual(f4.allowed, false, 'Flash 4 in same 1-second window MUST be rejected');
assert.strictEqual(flashBudget.getRecentFlashCount(t0 + 600), 3, 'Recent flash count must be 3');

// After window expires (>1000ms), new flash is allowed
const f5 = flashBudget.requestFlash(t0 + 1200);
assert.strictEqual(f5.allowed, true, 'Flash after 1s window expiry must be allowed');
console.log('   ✓ Flash budget enforced: max 3 flashes/sec, short duration, soft contrast.\n');

// 4. PARTICLE POOL (ZERO-ALLOCATION)
console.log('4. Testing Particle Pool Zero-Allocation Behavior...');
const pool = new ParticlePool(50);
assert.strictEqual(pool.getActiveCount(), 0, 'New pool must have 0 active particles');

const p1 = pool.acquire();
const p2 = pool.acquire();
assert.ok(p1 !== -1 && p2 !== -1, 'Must acquire valid indices');
assert.strictEqual(pool.getActiveCount(), 2, 'Pool must reflect 2 active particles');

// Release one
pool.release(p1);
assert.strictEqual(pool.getActiveCount(), 1, 'Pool must reflect 1 active particle');

// Release all
pool.releaseAll([p2]);
assert.strictEqual(pool.getActiveCount(), 0, 'Pool must be empty after releaseAll');

// Fill pool to capacity
const acquired: number[] = [];
for (let i = 0; i < 50; i++) {
  acquired.push(pool.acquire());
}
assert.strictEqual(pool.getActiveCount(), 50, 'Pool should be at capacity 50');
const overflow = pool.acquire();
assert.strictEqual(overflow, -1, 'Exceeding pool capacity must return -1');

pool.reset();
assert.strictEqual(pool.getActiveCount(), 0, 'Reset must return all particles to pool');
console.log('   ✓ Particle pool handles zero-allocation recycling and capacity correctly.\n');

// 5. EFFECT MANAGER LIMITS & COOLDOWNS
console.log('5. Testing Effect Manager Concurrent Limits & Cooldowns...');
const manager = new EffectManager({
  wordEffectsEnabled: true,
  effectFrequency: 'normal',
  intenseEffectsEnabled: false, // Intense disabled by default
  screenShakeEnabled: true,
});

const dummyParams = {
  wordRect: { x: 100, y: 100, width: 60, height: 20 },
  palette: { primary: '#fff', secondary: '#888', glow: '#f00', isChroma: false },
  naturalColors: true,
  seed: 42,
  wordText: 'test',
  lineIndex: 0,
};

// Test intense gating
const intenseTriggered = manager.triggerEffect('gun', dummyParams);
assert.strictEqual(intenseTriggered, false, 'Intense effect "gun" must be rejected when intenseEffectsEnabled is false');

// Enable intense effects
manager.updateOptions({ intenseEffectsEnabled: true });
const intenseAllowed = manager.triggerEffect('gun', dummyParams);
assert.strictEqual(intenseAllowed, true, 'Intense effect "gun" must be allowed when intenseEffectsEnabled is true');

// Concurrent limit: max 2 effects at once
const secondTrigger = manager.triggerEffect('star', dummyParams);
assert.strictEqual(secondTrigger, true, 'Second concurrent effect must be allowed');
assert.strictEqual(manager.getActiveInstancesCount(), 2, 'Manager must report 2 active instances');

// Third trigger should be blocked by max 2 limit
const thirdTrigger = manager.triggerEffect('fire', dummyParams);
assert.strictEqual(thirdTrigger, false, 'Third concurrent effect must be rejected by max 2 limit');

// Test 1 big effect per line limit
manager.clearAll();
const big1 = manager.triggerEffect('bomb', { ...dummyParams, lineIndex: 5 });
assert.strictEqual(big1, true, 'First big effect on line 5 allowed');
manager.clearAll(); // clears active instances, but line history remains
const big2SameLine = manager.triggerEffect('bomb', { ...dummyParams, lineIndex: 5 });
assert.strictEqual(big2SameLine, false, 'Second big effect on line 5 must be rejected');

// Test 3s cooldown between large effects of same type
const bigOtherLine = manager.triggerEffect('bomb', { ...dummyParams, lineIndex: 6 });
assert.strictEqual(bigOtherLine, false, 'Large effect of same type must respect 3s cooldown');

// Test reduced motion suppression
manager.clearAll();
manager.prefersReducedMotion = true;
const motionSuppressed = manager.triggerEffect('star', dummyParams);
assert.strictEqual(motionSuppressed, false, 'Effects must be suppressed when prefersReducedMotion is true');
manager.prefersReducedMotion = false;

// Test wordEffectsEnabled: false disables triggers
manager.updateOptions({ wordEffectsEnabled: false });
const disabledTrigger = manager.triggerEffect('star', dummyParams);
assert.strictEqual(disabledTrigger, false, 'Effects must be rejected when wordEffectsEnabled is false');

console.log('   ✓ Manager limits (concurrent max 2, line cap, 3s cooldown, intense gate, reduced-motion) verified.\n');

console.log('--- ALL WORD EFFECTS ENGINE TESTS PASSED SUCCESSFULLY! ---');
