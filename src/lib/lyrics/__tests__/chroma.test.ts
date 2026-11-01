import {
  getWordChromaInfo,
  getWordChromaColor,
  getAngularHueDifference,
  clearChromaCache,
} from '../chroma';

console.log('====================================================');
console.log('RUNNING CHROMA COLOR DETERMINISM & SEPARATION TESTS');
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

clearChromaCache();

// ----------------------------------------------------
// Test 1: Determinism & Repeatability
// ----------------------------------------------------
console.log('--- 1. Determinism & Repeatability Tests ---');
const trackId = 'test_track_123';
const lineIndex = 2;
const wordIndex = 4;
const vividness = 80;

const first = getWordChromaInfo(trackId, lineIndex, wordIndex, vividness);
const second = getWordChromaInfo(trackId, lineIndex, wordIndex, vividness);
const colorOnly = getWordChromaColor(trackId, lineIndex, wordIndex, vividness);

assert('Same input produces identical hue', first.hue === second.hue);
assert('Same input produces identical hex code', first.hex === second.hex);
assert('getWordChromaColor matches getWordChromaInfo.hex', colorOnly === first.hex);
assert('Same input produces identical oklch', first.oklch === second.oklch);
assert('Lightness is fixed at 0.78', first.lightness === 0.78);
assert('Same input produces identical chroma', first.chroma === second.chroma);
assert('Same input produces identical glow text-shadow', first.glowShadow === second.glowShadow);

// ----------------------------------------------------
// Test 2: Adjacent Words Separation >= 60 degrees
// ----------------------------------------------------
console.log('\n--- 2. Adjacent Words Hue Separation Tests (>= 60 deg) ---');
const trackIds = ['thriller_mj', 'billie_jean', 'chill_lofi_01', 'xyz_unknown', ''];
let minObservedDiff = 360;
let maxObservedDiff = 0;
let allAdjacentSeparated = true;

for (const tId of trackIds) {
  for (let line = 0; line < 10; line++) {
    for (let word = 0; word < 8; word++) {
      const c1 = getWordChromaInfo(tId, line, word, 80);
      const c2 = getWordChromaInfo(tId, line, word + 1, 80);

      const diff = getAngularHueDifference(c1.hue, c2.hue);
      if (diff < minObservedDiff) minObservedDiff = diff;
      if (diff > maxObservedDiff) maxObservedDiff = diff;

      if (diff < 60) {
        allAdjacentSeparated = false;
        console.error(`Failed at track=${tId}, line=${line}, word=${word}: diff=${diff}`);
      }
    }
  }
}

assert(
  `All adjacent words have angular hue difference >= 60 deg (observed min=${minObservedDiff}°, max=${maxObservedDiff}°)`,
  allAdjacentSeparated && minObservedDiff >= 60
);

// ----------------------------------------------------
// Test 3: Valid Hex & Gamut Clamping
// ----------------------------------------------------
console.log('\n--- 3. Gamut Clamping & Format Tests ---');
let allHexValid = true;
let allRgbValid = true;

for (let i = 0; i < 50; i++) {
  const info = getWordChromaInfo('sample_track', 0, i, 80);
  if (!/^#[0-9a-f]{6}$/i.test(info.hex)) allHexValid = false;
  if (
    info.rgb[0] < 0 || info.rgb[0] > 255 ||
    info.rgb[1] < 0 || info.rgb[1] > 255 ||
    info.rgb[2] < 0 || info.rgb[2] > 255
  ) {
    allRgbValid = false;
  }
}

assert('Generated hex values match /^#[0-9a-f]{6}$/i', allHexValid);
assert('All sRGB channels are bounded in [0, 255]', allRgbValid);

// ----------------------------------------------------
// Test 4: Vividness Modulation
// ----------------------------------------------------
console.log('\n--- 4. Vividness Modulation Tests ---');
const track = 'vivid_test';
const soft = getWordChromaInfo(track, 1, 2, 20);    // Soft
const vibrant = getWordChromaInfo(track, 1, 2, 80); // Vibrant
const neon = getWordChromaInfo(track, 1, 2, 100);   // Neon

assert('Hue identity is preserved across vividness levels', soft.hue === vibrant.hue && vibrant.hue === neon.hue);
assert('Soft chroma is lower than vibrant chroma', soft.chroma < vibrant.chroma);
assert('Vibrant chroma is lower than neon chroma', vibrant.chroma < neon.chroma);

console.log(`\nFinal result: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES OCCURRED ❌'}`);
if (!allPassed) {
  process.exit(1);
}
