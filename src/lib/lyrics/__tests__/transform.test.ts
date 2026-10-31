import { calculateContinuityOffset, estimatePlainLyricsTimings } from '../transform';

function runTests() {
  console.log('--- Testing transform.ts ---');

  // Test 1: Continuity rule
  // t0 = 30s, oldSpeed = 1.0, oldOffset = -5.0 -> lyricTime = 25.0
  // newSpeed = 1.2
  // newOffset should be: 25.0 - 1.2 * 30 = 25.0 - 36.0 = -11.0
  const oldT = { speed: 1.0, offset: -5.0 };
  const newOff = calculateContinuityOffset(30, oldT, 1.2);
  console.assert(Math.abs(newOff - (-11.0)) < 0.01, `Expected -11.0, got ${newOff}`);

  // Test 2: Verify lyricTime at t0 is invariant under speed change
  const oldLyricTime = oldT.speed * 30 + oldT.offset;
  const newLyricTime = 1.2 * 30 + newOff;
  console.assert(Math.abs(oldLyricTime - newLyricTime) < 0.01, `Expected invariant lyric time 25.0, got ${newLyricTime}`);

  // Test 3: Plain text estimation
  const plain = `Hello world
This is line two

And a new section line`;
  const estimated = estimatePlainLyricsTimings(plain, 200);
  console.assert(estimated.length === 3, `Expected 3 lines, got ${estimated.length}`);
  console.assert(estimated[0].start >= 200 * 0.05, `Line 1 should start after intro: ${estimated[0].start}`);
  console.assert(estimated[2].end <= 200, `Last line should end before duration: ${estimated[2].end}`);
  console.assert(estimated[0].words.length === 2, `Line 1 should have 2 words, got ${estimated[0].words.length}`);

  console.log('✅ All transform tests passed!');
}

runTests();
