import { SyncedLyricLine, LyricWord } from '../providers/types';
import {
  VisualConcept,
  VisualCue,
  VisualCueTimeline,
  VisualTimelineOptions,
  ImageFrequency,
} from './types';
import { ENGLISH_LEXICON } from './lexicon';

/**
 * Common filler, pronoun, preposition, and function words that must NEVER
 * trigger a visual concept on their own.
 */
export const STOPLIST = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'because', 'as', 'what', 'when',
  'where', 'how', 'that', 'this', 'these', 'those', 'then', 'so', 'than',
  'too', 'very', 'really', 'just', 'like', 'yeah', 'uh', 'oh', 'ah', 'la',
  'ooh', 'na', 'hey', 'wanna', 'gonna', 'gotta', 'im', 'youre', 'hes',
  'shes', 'theyre', 'were', 'ive', 'youve', 'ill', 'youll', 'well', 'it',
  'its', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from',
  'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
  'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'than', 'will', 'can', 'should', 'would', 'could', 'did', 'do',
  'does', 'doing', 'have', 'has', 'had', 'having', 'be', 'is', 'am', 'are',
  'was', 'were', 'been', 'being', 'me', 'you', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'their', 'our', 'mine', 'yours', 'ours', 'theirs',
]);

/**
 * Words indicating negation when occurring within 2 words prior.
 */
export const NEGATION_WORDS = new Set([
  'no', 'not', 'never', 'none', 'neither', 'nor', 'without', 'stop', 'hardly',
  'scarcely', 'barely', 'dont', 'cant', 'wont', 'aint', 'didnt', 'isnt',
  'arent', 'wasnt', 'werent', 'hasnt', 'havent', 'hadnt',
]);

/**
 * Common lyric contractions expanded for robust tokenization.
 */
const CONTRACTIONS: Record<string, string> = {
  "don't": 'do not',
  "can't": 'can not',
  "won't": 'will not',
  "ain't": 'is not',
  "i'm": 'i am',
  "you're": 'you are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "we're": 'we are',
  "they're": 'they are',
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',
  "i'll": 'i will',
  "you'll": 'you will',
  "he'll": 'he will',
  "she'll": 'she will',
  "we'll": 'we will',
  "they'll": 'they will',
  "didn't": 'did not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
  "couldn't": 'could not',
  "shouldn't": 'should not',
  "wouldn't": 'would not',
};

/**
 * Common irregular verbs encountered in song lyrics mapped to base forms.
 */
const IRREGULAR_VERBS: Record<string, string> = {
  fell: 'fall',
  fallen: 'fall',
  broke: 'break',
  broken: 'break',
  flew: 'fly',
  flown: 'fly',
  ran: 'run',
  shone: 'shine',
  saw: 'see',
  seen: 'see',
  sang: 'sing',
  sung: 'sing',
  spoke: 'speak',
  spoken: 'speak',
  stole: 'steal',
  stolen: 'steal',
  took: 'take',
  taken: 'take',
  drove: 'drive',
  driven: 'drive',
  drank: 'drink',
  drunk: 'drink',
  tore: 'tear',
  torn: 'tear',
  wept: 'weep',
  slept: 'sleep',
  burnt: 'burn',
  lit: 'light',
};

/**
 * Normalizes text: lowercase, remove diacritics, strip punctuation, expand contractions.
 */
export function normalizeLyricText(text: string): string {
  if (!text) return '';

  let str = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Expand contractions
  for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
    str = str.replace(new RegExp(contraction, 'g'), expansion);
  }

  // Strip punctuation but keep alphanumeric and spaces
  return str.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Rule-based lemmatizer with support for lyrics slang spellings:
 * lovin' -> love, gettin' -> get, nothin' -> nothing, plurals, -ed, -er, -ly.
 */
export function lemmatizeWord(raw: string): string {
  if (!raw) return '';
  let w = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.length <= 2) return w;

  // Slang endings: in' -> ing
  if (w.endsWith('in') && w.length > 4 && !w.endsWith('oin') && !w.endsWith('ain')) {
    w = w + 'g';
  }

  // Check irregular verbs table
  if (IRREGULAR_VERBS[w]) {
    return IRREGULAR_VERBS[w];
  }

  // -ing
  if (w.endsWith('ing') && w.length > 4) {
    const stem = w.slice(0, -3);
    // Double consonant check: runn -> run, dropp -> drop (exclude ll, ss like fall, pass)
    const lastChar = stem[stem.length - 1];
    if (stem.length > 3 && lastChar === stem[stem.length - 2] && lastChar !== 'l' && lastChar !== 's' && lastChar !== 'z') {
      return stem.slice(0, -1);
    }
    // Lov -> love, danc -> dance
    if (stem.endsWith('v') || stem.endsWith('c') || stem.endsWith('z')) {
      return stem + 'e';
    }
    return stem;
  }

  // -ed
  if (w.endsWith('ed') && w.length > 3) {
    if (w.endsWith('ied') && w.length > 4) {
      return w.slice(0, -3) + 'y';
    }
    const stem = w.slice(0, -2);
    const lastChar = stem[stem.length - 1];
    if (stem.length > 3 && lastChar === stem[stem.length - 2] && lastChar !== 'l' && lastChar !== 's' && lastChar !== 'z') {
      return stem.slice(0, -1);
    }
    // e.g. danced -> dance, faded -> fade, loved -> love
    if (stem.endsWith('c') || stem.endsWith('v') || stem.endsWith('z') || stem.endsWith('d')) {
      return stem + 'e';
    }
    return stem;
  }

  // -er
  if (w.endsWith('er') && w.length > 4) {
    return w.slice(0, -2);
  }

  // -ly
  if (w.endsWith('ly') && w.length > 4) {
    if (w.endsWith('ily')) {
      return w.slice(0, -3) + 'y';
    }
    return w.slice(0, -2);
  }

  // plurals: -ves -> -f / -fe (wolves -> wolf, knives -> knife)
  if (w.endsWith('ves') && w.length > 4) {
    if (w === 'knives') return 'knife';
    if (w === 'wives') return 'wife';
    if (w === 'lives') return 'life';
    return w.slice(0, -3) + 'f';
  }

  // plurals: -ies -> -y, -es, -s
  if (w.endsWith('ies') && w.length > 4) {
    return w.slice(0, -3) + 'y';
  }
  if (w.endsWith('es') && w.length > 4) {
    return w.slice(0, -2);
  }
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    return w.slice(0, -1);
  }

  return w;
}

/**
 * Builds an index of single words and multi-word phrases for O(1) matching.
 */
export class LexiconIndex {
  private phraseMap: Map<string, VisualConcept[]> = new Map();
  private wordMap: Map<string, VisualConcept[]> = new Map();

  constructor(concepts: VisualConcept[] = ENGLISH_LEXICON) {
    this.indexConcepts(concepts);
  }

  private indexConcepts(concepts: VisualConcept[]) {
    for (const c of concepts) {
      // Index phrases
      if (c.phrases) {
        for (const p of c.phrases) {
          const normP = normalizeLyricText(p);
          if (!this.phraseMap.has(normP)) {
            this.phraseMap.set(normP, []);
          }
          this.phraseMap.get(normP)!.push(c);
        }
      }

      // Index words & stems
      for (const w of c.words) {
        const normW = normalizeLyricText(w);
        const lemW = lemmatizeWord(normW);

        if (!this.wordMap.has(normW)) {
          this.wordMap.set(normW, []);
        }
        this.wordMap.get(normW)!.push(c);

        if (lemW && lemW !== normW) {
          if (!this.wordMap.has(lemW)) {
            this.wordMap.set(lemW, []);
          }
          this.wordMap.get(lemW)!.push(c);
        }
      }
    }
  }

  public getConceptsForPhrase(phrase: string): VisualConcept[] | undefined {
    return this.phraseMap.get(phrase);
  }

  public getConceptsForWord(word: string): VisualConcept[] | undefined {
    const norm = normalizeLyricText(word);
    const lem = lemmatizeWord(norm);
    return this.wordMap.get(norm) || this.wordMap.get(lem);
  }
}

// Global cached instance
let globalIndex: LexiconIndex | null = null;
export function getLexiconIndex(): LexiconIndex {
  if (!globalIndex) {
    globalIndex = new LexiconIndex();
  }
  return globalIndex;
}

/**
 * Checks whether context cues (requires / excludes) match the surrounding line text.
 */
export function checkContextCues(
  concept: VisualConcept,
  lineTokens: string[]
): boolean {
  if (!concept.contextCues) return true;

  const { requires, excludes } = concept.contextCues;

  // If requires are specified, at least one required keyword must appear in the line
  if (requires && requires.length > 0) {
    const hasRequired = requires.some((req) =>
      lineTokens.includes(normalizeLyricText(req))
    );
    if (!hasRequired) return false;
  }

  // If excludes are specified, none of the excluded keywords or multi-word phrases can appear in the line
  if (excludes && excludes.length > 0) {
    const lineJoined = lineTokens.join(' ');
    const hasExcluded = excludes.some((exc) => {
      const normExc = normalizeLyricText(exc);
      if (normExc.includes(' ')) {
        return lineJoined.includes(normExc);
      }
      return lineTokens.includes(normExc);
    });
    if (hasExcluded) return false;
  }

  return true;
}

/**
 * Determines whether a word token is negated by a preceding negation word within 2 positions.
 */
export function isNegated(tokens: string[], index: number): boolean {
  for (let offset = 1; offset <= 2; offset++) {
    const prevIdx = index - offset;
    if (prevIdx >= 0) {
      if (NEGATION_WORDS.has(tokens[prevIdx])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Deterministic PRNG based on string seed.
 */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Precomputes the complete visual cue timeline for a song's lyrics.
 * Runs once upon lyric load; outputs an O(1) lookup table.
 */
export function precomputeVisualTimeline(
  lines: SyncedLyricLine[],
  options: VisualTimelineOptions = {}
): VisualCueTimeline {
  const {
    frequency = 'normal',
    trackId = 'track',
    enabled = true,
  } = options;

  const cueMap = new Map<string, VisualCue>();
  const cues: VisualCue[] = [];

  if (!enabled || !lines || lines.length === 0) {
    return {
      cues,
      cueMap,
      getCue: () => null,
    };
  }

  const index = getLexiconIndex();

  // Frequency rules: minimum word spacing between visual cues
  const minWordSpacing: Record<ImageFrequency, number> = {
    low: 10,
    normal: 6,
    high: 3,
  };
  const spacingThreshold = minWordSpacing[frequency] || 6;

  // Maximum visual cues allowed per line
  const maxCuesPerLine: Record<ImageFrequency, number> = {
    low: 1,
    normal: 2,
    high: 3,
  };
  const lineCap = maxCuesPerLine[frequency] || 2;

  let globalWordCounter = 0;
  let lastCueWordIndex = -999;
  let lastImageId = '';
  let prevLineConceptIds: Set<string> = new Set();

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];
    const words: LyricWord[] = line.words && line.words.length > 0
      ? line.words
      : (line.text || '').trim().split(/\s+/).filter(Boolean).map((t, i) => ({
          text: t,
          start: (line.start || 0) + i * 0.4,
          end: (line.start || 0) + (i + 1) * 0.4,
        }));

    if (words.length === 0) continue;

    const rawTokens = words.map((w) => normalizeLyricText(w.text));
    const currentLineConceptIds = new Set<string>();
    let lineCuesCount = 0;
    let lineHasIntense = false;

    // Collect candidate matches for each position in this line
    interface CandidateMatch {
      wordIndex: number;
      concept: VisualConcept;
      spanLength: number;
      score: number;
    }
    const candidates: CandidateMatch[] = [];

    let wIdx = 0;
    while (wIdx < words.length) {
      globalWordCounter++;
      const currentToken = rawTokens[wIdx];

      // 1. Check multi-word phrases first (longest match first: 3 words down to 2 words)
      let matchedPhrase = false;
      for (let span = Math.min(3, words.length - wIdx); span >= 2; span--) {
        const phraseTokens = rawTokens.slice(wIdx, wIdx + span);
        const phraseStr = phraseTokens.join(' ');
        const phraseConcepts = index.getConceptsForPhrase(phraseStr);

        if (phraseConcepts && phraseConcepts.length > 0) {
          const concept = phraseConcepts[0];
          if (checkContextCues(concept, rawTokens) && !isNegated(rawTokens, wIdx)) {
            candidates.push({
              wordIndex: wIdx,
              concept,
              spanLength: span,
              score: concept.weight * 2 + 10, // Phrases get premium priority
            });
            matchedPhrase = true;
            wIdx += span;
            break;
          }
        }
      }

      if (matchedPhrase) {
        continue;
      }

      // 2. Stoplist check for lone words (filler/function words never map alone)
      if (STOPLIST.has(currentToken)) {
        wIdx++;
        continue;
      }

      // 3. Check single word matches
      const wordConcepts = index.getConceptsForWord(currentToken);
      if (wordConcepts && wordConcepts.length > 0) {
        // Disambiguation: pick best matching concept passing context cues
        const validConcept = wordConcepts.find((c) =>
          checkContextCues(c, rawTokens)
        );

        if (validConcept && !isNegated(rawTokens, wIdx)) {
          // Score = weight + rarity factor (longer words are rarer)
          const rarityBonus = Math.min(5, Math.floor(currentToken.length / 2));
          candidates.push({
            wordIndex: wIdx,
            concept: validConcept,
            spanLength: 1,
            score: validConcept.weight + rarityBonus,
          });
        }
      }

      wIdx++;
    }

    // Sort candidates by score descending with deterministic seeded tiebreaker
    candidates.sort((a, b) => {
      const diff = b.score - a.score;
      if (Math.abs(diff) > 0.001) return diff;
      const hashA = hashSeed(`${trackId}:${lIdx}:${a.wordIndex}`);
      const hashB = hashSeed(`${trackId}:${lIdx}:${b.wordIndex}`);
      return hashB - hashA;
    });

    // Apply cooldown, spacing, and intensity filters
    for (const cand of candidates) {
      if (lineCuesCount >= lineCap) break;

      const { concept, wordIndex } = cand;

      // Filter: max 1 intense visual per line
      if (concept.intensity === 'intense' && lineHasIntense) {
        continue;
      }

      // Filter: never repeat same concept across consecutive lines
      if (prevLineConceptIds.has(concept.id)) {
        continue;
      }

      // Filter: minimum word spacing from previous cue
      const currentGlobalWord = globalWordCounter - (words.length - wordIndex);
      if (currentGlobalWord - lastCueWordIndex < spacingThreshold) {
        continue;
      }

      // Filter: never repeat same imageId within 8 words
      if (concept.imageId === lastImageId && currentGlobalWord - lastCueWordIndex < 8) {
        continue;
      }

      // Deterministic cue selection
      const cue: VisualCue = {
        lineIndex: lIdx,
        wordIndex,
        conceptId: concept.id,
        imageId: concept.imageId,
        effectId: concept.effectId,
        intensity: concept.intensity,
        wordText: words[wordIndex].text,
        weight: concept.weight,
        category: concept.category,
      };

      cues.push(cue);
      cueMap.set(`${lIdx}:${wordIndex}`, cue);

      lineCuesCount++;
      if (concept.intensity === 'intense') {
        lineHasIntense = true;
      }
      lastCueWordIndex = currentGlobalWord;
      lastImageId = concept.imageId;
      currentLineConceptIds.add(concept.id);
    }

    prevLineConceptIds = currentLineConceptIds;
  }

  return {
    cues,
    cueMap,
    getCue: (lineIdx: number, wordIdx: number) => {
      return cueMap.get(`${lineIdx}:${wordIdx}`) || null;
    },
  };
}
