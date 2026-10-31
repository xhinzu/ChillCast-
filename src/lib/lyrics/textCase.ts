/**
 * Text Case Normalization Helpers
 *
 * Provides display-only sentence casing for lyrics that were typed in ALL CAPS,
 * preserving personal pronouns ("I", "I'm", "I'd", "I'll", "I've"), acronyms, and punctuation.
 */

// Common contractions and pronouns that must always be capitalized in English
const ALWAYS_CAPITALIZED = new Set([
  'i',
  "i'm",
  'im',
  "i'd",
  'id',
  "i'll",
  'ill',
  "i've",
  'ive',
  'ok',
  'dj',
  'mc',
  'tv',
  'cd',
  'vip',
]);

/**
 * Checks if a string is mostly uppercase (> 80% of alphabetic letters).
 */
export function isMostlyUppercase(text: string): boolean {
  if (!text) return false;
  let upper = 0;
  let totalLetters = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= 'A' && ch <= 'Z') {
      upper++;
      totalLetters++;
    } else if (ch >= 'a' && ch <= 'z') {
      totalLetters++;
    }
  }

  if (totalLetters < 10) return false;
  return upper / totalLetters >= 0.8;
}

/**
 * Converts a line of text to sentence case:
 * Capitalizes the first letter of the line and after sentence-ending punctuation (. ! ?),
 * preserves "I" and contractions, and preserves short acronyms (2-4 uppercase letters).
 */
export function fixSentenceCase(text: string): string {
  if (!text) return '';

  const words = text.split(/(\s+)/);
  let capitalizeNext = true;

  const resultWords = words.map((token) => {
    // If whitespace, return as is
    if (/^\s+$/.test(token)) return token;

    // Separate leading/trailing punctuation from word core
    const match = token.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'’]+)([^a-zA-Z0-9]*)$/);
    if (!match) return token;

    const leadPunct = match[1];
    const core = match[2];
    const trailPunct = match[3];

    const lowerCore = core.toLowerCase();
    let transformedCore: string;

    // Check if it's a known pronoun/contraction like "I", "I'm", etc.
    if (ALWAYS_CAPITALIZED.has(lowerCore)) {
      if (lowerCore.startsWith("i'") || lowerCore.startsWith("i’")) {
        transformedCore = "I'" + lowerCore.slice(2);
      } else if (lowerCore === 'i') {
        transformedCore = 'I';
      } else if (lowerCore === 'im' && core.toUpperCase() === 'IM') {
        transformedCore = "I'm";
      } else {
        transformedCore = lowerCore.toUpperCase();
      }
    } else if (capitalizeNext) {
      // Capitalize first letter
      transformedCore = lowerCore.charAt(0).toUpperCase() + lowerCore.slice(1);
    } else {
      transformedCore = lowerCore;
    }

    // Determine if next word should be capitalized (e.g. after ., !, ?)
    capitalizeNext = /[.!?]$/.test(trailPunct);

    return `${leadPunct}${transformedCore}${trailPunct}`;
  });

  return resultWords.join('');
}

/**
 * Transforms a SyncedLyricLine into sentence case display,
 * preserving timing, syllables, and word structures.
 */
export function fixLineSentenceCase<
  T extends { text: string; words?: Array<{ text: string; start: number; end: number; syllables?: Array<{ text: string; start: number; end: number }> }> }
>(
  line: T
): T {
  const transformedText = fixSentenceCase(line.text);
  if (!line.words || line.words.length === 0) {
    return {
      ...line,
      text: transformedText,
    };
  }

  let capitalizeNext = true;
  const transformedWords = line.words.map((w) => {
    const token = w.text;
    const match = token.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'’]+)([^a-zA-Z0-9]*)$/);
    if (!match) return w;

    const leadPunct = match[1];
    const core = match[2];
    const trailPunct = match[3];
    const lowerCore = core.toLowerCase();
    let transformedCore: string;

    if (ALWAYS_CAPITALIZED.has(lowerCore)) {
      if (lowerCore.startsWith("i'") || lowerCore.startsWith("i’")) {
        transformedCore = "I'" + lowerCore.slice(2);
      } else if (lowerCore === 'i') {
        transformedCore = 'I';
      } else if (lowerCore === 'im' && core.toUpperCase() === 'IM') {
        transformedCore = "I'm";
      } else {
        transformedCore = lowerCore.toUpperCase();
      }
    } else if (capitalizeNext) {
      transformedCore = lowerCore.charAt(0).toUpperCase() + lowerCore.slice(1);
    } else {
      transformedCore = lowerCore;
    }

    capitalizeNext = /[.!?]$/.test(trailPunct);
    return {
      ...w,
      text: `${leadPunct}${transformedCore}${trailPunct}`,
    };
  });

  return {
    ...line,
    text: transformedText,
    words: transformedWords,
  };
}
