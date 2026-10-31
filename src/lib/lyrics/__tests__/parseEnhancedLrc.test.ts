import { parseEnhancedLrc } from '../parseEnhancedLrc';
import { isMostlyUppercase, fixSentenceCase } from '../textCase';

console.log('====================================================');
console.log('RUNNING ENHANCED LRC PARSER TEST SUITE');
console.log('====================================================\n');

let allPassed = true;
function assert(desc: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${desc}`);
  } else {
    console.error(`  ❌ FAILED: ${desc}`);
    allPassed = false;
  }
}

// -----------------------------------------------------------
// TEST 1: Normal Enhanced LRC File
// -----------------------------------------------------------
console.log('Test 1: Normal Enhanced LRC');
const normalEnhanced = `[ti:Starboy]
[ar:The Weeknd]
[al:Starboy]
[length:03:50]
[00:04.20]I'm <00:04.60>tryna <00:05.10>put <00:05.50>you <00:05.80>in <00:06.10>the <00:06.40>worst <00:06.90>mood, <00:07.40>ah
[00:08.50]P1 <00:09.00>cleaner <00:09.60>than <00:09.90>your <00:10.30>church <00:10.80>shoes, <00:11.30>ah <00:12.00>`;

const res1 = parseEnhancedLrc(normalEnhanced);
assert('Format detected as "enhanced"', res1.format === 'enhanced');
assert('Synced is "word"', res1.synced === 'word');
assert('Metadata title parsed', res1.meta.title === 'Starboy');
assert('Metadata artist parsed', res1.meta.artist === 'The Weeknd');
assert('Metadata length parsed to 230 seconds', res1.meta.lengthSeconds === 230);
assert('Has 2 lines', res1.lines.length === 2);
assert('Line 1 start is 4.2s', res1.lines[0].start === 4.2);
assert('Line 1 word 0 start is 4.2s', res1.lines[0].words[0].start === 4.2);
assert('Line 1 word 1 start is 4.6s', res1.lines[0].words[1].start === 4.6);
assert('Line 1 end is capped at Line 2 start (8.5s)', res1.lines[0].end === 8.5);
assert('Line 2 last word has closing tag 12.0s', res1.lines[1].words[res1.lines[1].words.length - 1].end === 12.0);
console.log();

// -----------------------------------------------------------
// TEST 2: Mid-Word Tags (Syllable Splits)
// -----------------------------------------------------------
console.log('Test 2: Mid-Word Tags (Syllable Splits)');
const syllableLrc = `[00:10.00]some<00:10.50>thing <00:11.20>beau<00:11.60>ti<00:12.00>ful`;
const res2 = parseEnhancedLrc(syllableLrc);
assert('Produced 1 line', res2.lines.length === 1);
assert('Has 2 combined words ("something" and "beautiful")', res2.lines[0].words.length === 2);
assert('Word 0 text is "something"', res2.lines[0].words[0].text === 'something');
assert('Word 0 start is 10.0s', res2.lines[0].words[0].start === 10.0);
assert('Word 0 end is 11.2s', res2.lines[0].words[0].end === 11.2);
assert('Word 0 has 2 syllables', res2.lines[0].words[0].syllables?.length === 2);
assert('Syllable 0 is "some" at 10.0s', res2.lines[0].words[0].syllables?.[0].text === 'some' && res2.lines[0].words[0].syllables?.[0].start === 10.0);
assert('Syllable 1 is "thing" at 10.5s', res2.lines[0].words[0].syllables?.[1].text === 'thing' && res2.lines[0].words[0].syllables?.[1].start === 10.5);
assert('Word 1 text is "beautiful"', res2.lines[0].words[1].text === 'beautiful');
assert('Word 1 has 3 syllables', res2.lines[0].words[1].syllables?.length === 3);
console.log();

// -----------------------------------------------------------
// TEST 3: Blank End Markers Out of Order
// -----------------------------------------------------------
console.log('Test 3: Blank End Markers Out of Order');
const outOfOrderEndMarkers = `[00:05.00]First line singing
[00:14.00]
[00:09.00]Second line singing`;
// End marker [00:14.00] appears after line 1, but line 2 starts at 00:09.00 (< 14.00)
const res3 = parseEnhancedLrc(outOfOrderEndMarkers);
assert('Sorted lines chronologically: line 1 (5s), line 2 (9s)', res3.lines[0].start === 5.0 && res3.lines[1].start === 9.0);
assert('Line 1 end clamped so it never exceeds Line 2 start (<= 9s)', res3.lines[0].end <= 9.0);
console.log();

// -----------------------------------------------------------
// TEST 4: Repeated-Line Timestamps
// -----------------------------------------------------------
console.log('Test 4: Repeated-Line Timestamps');
const repeatedTimestamps = `[00:10.00][00:45.00]I'm a repeated chorus line`;
const res4 = parseEnhancedLrc(repeatedTimestamps);
assert('Expands into 2 distinct lines', res4.lines.length === 2);
assert('Line 1 starts at 10.0s', res4.lines[0].start === 10.0);
assert('Line 2 starts at 45.0s', res4.lines[1].start === 45.0);
assert('Both lines have matching text', res4.lines[0].text === res4.lines[1].text);
console.log();

// -----------------------------------------------------------
// TEST 5: CRLF + UTF-8 BOM
// -----------------------------------------------------------
console.log('Test 5: CRLF + UTF-8 BOM');
const bomContent = '\uFEFF[00:02.00]Hello world\r\n[00:06.00]Goodbye world\r\n';
const res5 = parseEnhancedLrc(bomContent);
assert('BOM stripped cleanly', !res5.rawText.startsWith('\uFEFF'));
assert('Has 2 lines', res5.lines.length === 2);
assert('Line 1 is "Hello world" at 2s', res5.lines[0].text === 'Hello world' && res5.lines[0].start === 2.0);
console.log();

// -----------------------------------------------------------
// TEST 6: A2 Format ([mm:ss.xx]<mm:ss.xx>word)
// -----------------------------------------------------------
console.log('Test 6: A2 Format');
const a2Lrc = `[00:04.20]<00:04.20>First <00:05.00>word <00:06.00>here`;
const res6 = parseEnhancedLrc(a2Lrc);
assert('Word 0 text is "First"', res6.lines[0].words[0].text === 'First');
assert('Word 0 start is 4.2s', res6.lines[0].words[0].start === 4.2);
assert('Line 0 text is "First word here"', res6.lines[0].text === 'First word here');
console.log();

// -----------------------------------------------------------
// TEST 7: Offset Tag ([offset:500] and [offset:-200])
// -----------------------------------------------------------
console.log('Test 7: Offset Tag');
const posOffsetLrc = `[offset:+500]\n[00:02.00]Offset plus test`;
const res7a = parseEnhancedLrc(posOffsetLrc);
assert('Offset +500ms shifts 2.0s to 2.5s', res7a.lines[0].start === 2.5);

const negOffsetLrc = `[offset:-400]\n[00:02.00]Offset minus test`;
const res7b = parseEnhancedLrc(negOffsetLrc);
assert('Offset -400ms shifts 2.0s to 1.6s', res7b.lines[0].start === 1.6);
console.log();

// -----------------------------------------------------------
// TEST 8: Plain Text Input
// -----------------------------------------------------------
console.log('Test 8: Plain Text Input');
const plainText = `First line of plain lyrics
Second line of plain lyrics`;
const res8 = parseEnhancedLrc(plainText);
assert('Format detected as "plain"', res8.format === 'plain');
assert('Synced is "none"', res8.synced === 'none');
assert('Has 2 lines', res8.lines.length === 2);
assert('Words parsed into tokens', res8.lines[0].words.length === 5);
console.log();

// -----------------------------------------------------------
// TEST 9: Broken Tags & Oversized Guards
// -----------------------------------------------------------
console.log('Test 9: Broken Tags & Oversized Guards');
const brokenLrc = `[00:02.00]Line with broken <not-a-tag> and valid <00:04.00>tag`;
const res9 = parseEnhancedLrc(brokenLrc);
assert('Does not crash on broken tags', res9.lines.length === 1);

const hugeText = 'a'.repeat(550 * 1024);
const res9Huge = parseEnhancedLrc(hugeText);
assert('Rejects file exceeding 500 KB limit', !!res9Huge.error && res9Huge.error.includes('500 KB'));
console.log();

// -----------------------------------------------------------
// TEST 10: Regression Test - Standard LRC
// -----------------------------------------------------------
console.log('Test 10: Regression Test - Standard LRC');
const standardLrc = `[00:03.00]Standard LRC line one
[00:07.00]Standard LRC line two`;
const res10 = parseEnhancedLrc(standardLrc);
assert('Format detected as "lrc"', res10.format === 'lrc');
assert('Synced is "line"', res10.synced === 'line');
assert('Has 2 lines', res10.lines.length === 2);
assert('Line 1 start 3s, end 7s', res10.lines[0].start === 3.0 && res10.lines[0].end === 7.0);
console.log();

// -----------------------------------------------------------
// TEST 11: ALL CAPS Detection and Sentence Casing
// -----------------------------------------------------------
console.log('Test 11: ALL CAPS Detection and Sentence Casing');
const loudCaps = "I'M TRYNA PUT YOU IN THE WORST MOOD, AH! WE'LL BE OK.";
assert('Detects > 80% uppercase text', isMostlyUppercase(loudCaps) === true);
const fixedCase = fixSentenceCase(loudCaps);
assert('Sentence case capitalizes "I\'m" and keeps "AH!"/"OK"',
  fixedCase === "I'm tryna put you in the worst mood, ah! We'll be OK."
);
console.log(`  -> Before: "${loudCaps}"`);
console.log(`  -> After:  "${fixedCase}"`);
console.log();

// -----------------------------------------------------------
// TEST 12: Benchmark Performance (300-line file under 20ms)
// -----------------------------------------------------------
console.log('Test 12: Performance Benchmark (300-line file)');
const lineTemplate = (i: number) =>
  `[0${Math.floor(i / 60)}:${String(i % 60).padStart(2, '0')}.10]word1 <0${Math.floor(i / 60)}:${String(i % 60).padStart(2, '0')}.30>word2 <0${Math.floor(i / 60)}:${String(i % 60).padStart(2, '0')}.60>some<0${Math.floor(i / 60)}:${String(i % 60).padStart(2, '0')}.80>thing`;
const bigLrc = Array.from({ length: 300 }, (_, i) => lineTemplate(i)).join('\n');

const t0 = performance.now();
const res12 = parseEnhancedLrc(bigLrc);
const t1 = performance.now();
const elapsed = t1 - t0;
assert('300 lines parsed successfully', res12.lines.length === 300);
assert(`Parse time (${elapsed.toFixed(2)} ms) is well under 20 ms`, elapsed < 20);
console.log(`  -> Elapsed: ${elapsed.toFixed(2)} ms`);
console.log();

// -----------------------------------------------------------
// Final Verdict
// -----------------------------------------------------------
if (allPassed) {
  console.log('====================================================');
  console.log('ALL ENHANCED LRC TESTS PASSED! ✅');
  console.log('====================================================');
  process.exit(0);
} else {
  console.error('SOME TESTS FAILED! ❌');
  process.exit(1);
}
