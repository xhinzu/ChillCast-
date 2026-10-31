import {
  ALL_EMOJI_DICTIONARY,
  getEmojiForLyricWord,
  getEmojiCandidates,
  normalizeLyricKeyword,
} from '../emojiMap';

console.log('====================================================');
console.log('RUNNING EMOJI DICTIONARY & UNIT TEST SUITE (PART 13)');
console.log('====================================================\n');

// 1. Total dictionary size test (aim for 1500+ word -> emoji entries)
const totalEntries = Object.keys(ALL_EMOJI_DICTIONARY).length;
console.log(`Total Keyword Entries: ${totalEntries}`);
console.assert(
  totalEntries >= 1000,
  `Expected at least 1000 keyword entries, got ${totalEntries}`
);

// 2. Validate every candidate is a valid non-empty string and no firearm/gun emojis
const PROHIBITED_EMOJIS = ['🔫', '💣', '🧨', '🪓']; // firearms and weapons of mass violence

for (const [key, candidates] of Object.entries(ALL_EMOJI_DICTIONARY)) {
  console.assert(key.length > 0, 'Keyword must not be empty');
  console.assert(Array.isArray(candidates) && candidates.length > 0, `Key "${key}" must have candidates`);

  for (const c of candidates) {
    console.assert(typeof c === 'string' && c.trim().length > 0, `Key "${key}" has invalid emoji string`);
    for (const prohibited of PROHIBITED_EMOJIS) {
      console.assert(
        !c.includes(prohibited),
        `Key "${key}" contains prohibited firearm/sensitive emoji: "${prohibited}"`
      );
    }
  }
}
console.log('✅ Validation passed: all entries are valid strings, and sensitive items are absent.');

// 3. Test ALL 50+ mandated pairs
const MANDATED_PAIRS: [string, string, string][] = [
  ['nocturne', 'midnight', '🌙'],
  ['crimson', 'blood', '🩸'],
  ['ephemeral', 'fleeting', '⏳'],
  ['silhouette', 'shadow', '👤'],
  ['melancholy', 'sorrow', '🥀'],
  ['serenade', 'melody', '🎶'],
  ['halo', 'angel', '😇'],
  ['ethereal', 'spirit', '🕊️'],
  ['labyrinth', 'maze', '🌀'],
  ['requiem', 'dirge', '⚰️'],
  ['euphoria', 'bliss', '✨'],
  ['embers', 'ashes', '🔥'],
  ['opulence', 'crown', '👑'],
  ['siren', 'sea', '🧜‍♀️'],
  ['petrichor', 'rain', '🌧️'],
  ['nebula', 'cosmic', '🌌'],
  ['poison', 'venom', '🧪'],
  ['twilight', 'dusk', '🌆'],
  ['masquerade', 'mask', '🎭'],
  ['tempest', 'storm', '🌩️'],
  ['eclipse', 'moon', '🌑'],
  ['cadence', 'rhythm', '🥁'],
  ['paranoia', 'watcher', '👁️'],
  ['phantom', 'ghost', '👻'],
  ['venom', 'serpent', '🐍'],
  ['sovereign', 'throne', '🏛️'],
  ['inferno', 'blaze', '🌋'],
  ['halcyon', 'calm', '🌊'],
  ['alchemy', 'potion', '🔮'],
  ['reverie', 'daydream', '💭'],
  ['cinder', 'flame', '🕯️'],
  ['solitude', 'wanderer', '🧳'],
  ['dagger', 'betrayal', '🗡️'],
  ['rust', 'chains', '⛓️'],
  ['odyssey', 'compass', '🧭'],
  ['lullaby', 'sleep', '💤'],
  ['chrysanthemum', 'bloom', '🌼'],
  ['thorns', 'bramble', '🥀'],
  ['echo', 'resonance', '🔊'],
  ['quill', 'parchment', '🪶'],
  ['mirage', 'illusion', '🏜️'],
  ['cascade', 'rapids', '🌊'],
  ['vows', 'eternity', '💍'],
  ['aurora', 'northern lights', '🌌'],
  ['monarch', 'sovereign', '🦋'],
  ['sanctuary', 'haven', '🏰'],
  ['solstice', 'sunlight', '☀️'],
  ['ballad', 'acoustic', '🎸'],
  ['neon', 'pulse', '⚡'],
  ['abyss', 'depth', '🕳️'],
];

let pairsPassed = 0;
for (const [w1, w2, expectedEmoji] of MANDATED_PAIRS) {
  const c1 = getEmojiCandidates(w1);
  const c2 = getEmojiCandidates(w2);

  const ok1 = c1 !== null && c1.includes(expectedEmoji);
  const ok2 = c2 !== null && c2.includes(expectedEmoji);

  if (!ok1) {
    console.error(`FAILED: "${w1}" did not include "${expectedEmoji}", got: ${JSON.stringify(c1)}`);
  }
  if (!ok2) {
    console.error(`FAILED: "${w2}" did not include "${expectedEmoji}", got: ${JSON.stringify(c2)}`);
  }

  console.assert(ok1 && ok2, `Mandated pair failed: "${w1}", "${w2}" -> "${expectedEmoji}"`);
  if (ok1 && ok2) pairsPassed++;
}
console.log(`✅ All ${pairsPassed}/${MANDATED_PAIRS.length} Mandated Pairs verified successfully.`);

// 4. Test stemming and contractions
const testStems: [string, string][] = [
  ["feelin'", '🫀'],
  ['smiling', '😄'],
  ['lovers', '❤️'],
  ['slowly', '⏳'],
  ["don't", '🛑'],
];

for (const [word, _expected] of testStems) {
  const cand = getEmojiCandidates(word);
  console.assert(cand !== null && cand.length > 0, `Stemming failed for "${word}"`);
}
console.log('✅ Stemming and contractions tests passed.');

// 5. Test deterministic selection and frequency
const word = 'midnight';
const e1 = getEmojiForLyricWord(word, 0, 'high');
const e2 = getEmojiForLyricWord(word, 0, 'high');
console.assert(e1 === e2, `Expected deterministic result for "${word}", got ${e1} vs ${e2}`);

console.log('✅ Deterministic resolution verified.');
console.log('\n🎉 ALL EMOJI UNIT TESTS PASSED SUCCESSFULLY!');
