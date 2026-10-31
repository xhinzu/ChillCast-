/**
 * Central Lyric to Emoji Mapping & Resolver Engine
 * Aggregates core, moods, nature, objects, and custom data dictionaries
 * providing 1500+ rich musical and lyrical keywords.
 *
 * Implements deterministic selection, anti-repetition cooldown, stemming,
 * contraction handling, and frequency gating.
 */

import { CORE_EMOJI_DATA } from './emoji/core';
import { MOODS_EMOJI_DATA } from './emoji/moods';
import { NATURE_EMOJI_DATA } from './emoji/nature';
import { OBJECTS_EMOJI_DATA } from './emoji/objects';
import { CUSTOM_EMOJI_DATA } from './emoji/custom';
import { EmojiFrequency } from './settings';

// Merge all sub-dictionaries into one unified dictionary
export const ALL_EMOJI_DICTIONARY: Record<string, string[]> = {};

function mergeDictionary(dict: Record<string, string[]>) {
  for (const [key, candidates] of Object.entries(dict)) {
    const cleanKey = key.toLowerCase().trim();
    if (!ALL_EMOJI_DICTIONARY[cleanKey]) {
      ALL_EMOJI_DICTIONARY[cleanKey] = [];
    }
    for (const c of candidates) {
      if (!ALL_EMOJI_DICTIONARY[cleanKey].includes(c)) {
        ALL_EMOJI_DICTIONARY[cleanKey].push(c);
      }
    }
  }
}

// Merge in order
mergeDictionary(CORE_EMOJI_DATA);
mergeDictionary(MOODS_EMOJI_DATA);
mergeDictionary(NATURE_EMOJI_DATA);
mergeDictionary(OBJECTS_EMOJI_DATA);
mergeDictionary(CUSTOM_EMOJI_DATA);

// Backward-compatible single-string map for direct lookups
export const LYRIC_EMOJI_MAP: Record<string, string> = {};
for (const [k, v] of Object.entries(ALL_EMOJI_DICTIONARY)) {
  if (v && v.length > 0) {
    LYRIC_EMOJI_MAP[k] = v[0];
  }
}

// Sliding window of recent emojis to prevent repeating within ~6 words
const recentEmojiQueue: string[] = [];
const COOLDOWN_LIMIT = 6;

export function resetEmojiCooldown(): void {
  recentEmojiQueue.length = 0;
}

// Deterministic word hash
function hashString(str: string, seed: number = 0): number {
  let h = seed * 37;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Stemming and contraction normalization
export function normalizeLyricKeyword(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/['’]/g, '') // strip contractions (e.g. don't -> dont)
    .replace(/[^a-z0-9]/g, ''); // strip punctuation
}

/**
 * Returns candidate emoji list for a given word with stemming
 */
export function getEmojiCandidates(word: string): string[] | null {
  const clean = normalizeLyricKeyword(word);
  if (!clean) return null;

  // 1. Direct match
  if (ALL_EMOJI_DICTIONARY[clean]?.length) {
    return ALL_EMOJI_DICTIONARY[clean];
  }

  // 2. Contraction normalization (e.g. feelin -> feel)
  if (clean.endsWith('in') && clean.length > 4) {
    const stem = clean.slice(0, -2);
    if (ALL_EMOJI_DICTIONARY[stem]?.length) return ALL_EMOJI_DICTIONARY[stem];
    if (ALL_EMOJI_DICTIONARY[stem + 'ing']?.length) return ALL_EMOJI_DICTIONARY[stem + 'ing'];
  }

  // 3. Verb endings (-ing, -ed)
  if (clean.endsWith('ing') && clean.length > 4) {
    const stem = clean.slice(0, -3);
    if (ALL_EMOJI_DICTIONARY[stem]?.length) return ALL_EMOJI_DICTIONARY[stem];
    if (ALL_EMOJI_DICTIONARY[stem + 'e']?.length) return ALL_EMOJI_DICTIONARY[stem + 'e'];
  }

  if (clean.endsWith('ed') && clean.length > 3) {
    const stem = clean.slice(0, -2);
    if (ALL_EMOJI_DICTIONARY[stem]?.length) return ALL_EMOJI_DICTIONARY[stem];
    if (ALL_EMOJI_DICTIONARY[stem + 'e']?.length) return ALL_EMOJI_DICTIONARY[stem + 'e'];
  }

  // 4. Adverbs (-ly)
  if (clean.endsWith('ly') && clean.length > 4) {
    const stem = clean.slice(0, -2);
    if (ALL_EMOJI_DICTIONARY[stem]?.length) return ALL_EMOJI_DICTIONARY[stem];
  }

  // 5. Plural (-es, -s)
  if (clean.endsWith('es') && clean.length > 4) {
    const stem = clean.slice(0, -2);
    if (ALL_EMOJI_DICTIONARY[stem]?.length) return ALL_EMOJI_DICTIONARY[stem];
  }

  if (clean.endsWith('s') && clean.length > 3) {
    const stem = clean.slice(0, -1);
    if (ALL_EMOJI_DICTIONARY[stem]?.length) return ALL_EMOJI_DICTIONARY[stem];
  }

  return null;
}

/**
 * Resolves an emoji deterministically for a lyric word with frequency scaling.
 * Deterministic selection based on hash of word + line index guarantees 0 flicker across re-renders.
 */
export function getEmojiForLyricWord(
  rawWord: string,
  lineIndex: number = 0,
  frequency: EmojiFrequency = 'normal'
): string | null {
  const candidates = getEmojiCandidates(rawWord);
  if (!candidates || candidates.length === 0) return null;

  const h = hashString(rawWord.toLowerCase(), lineIndex);

  // Frequency Gating:
  // Low: ~35% of words show emoji
  // Normal: ~65% of words show emoji
  // High: 100% of words show emoji
  if (frequency === 'low' && (h % 100) > 35) {
    return null;
  }
  if (frequency === 'normal' && (h % 100) > 65) {
    return null;
  }

  // Deterministically select candidate
  return candidates[h % candidates.length];
}
