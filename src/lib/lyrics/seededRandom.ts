/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 * Ensures repeatable, non-flickering layouts across renders.
 */
export function createSeededRandom(seed: number | string): () => number {
  let s: number;
  if (typeof seed === 'string') {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    s = Math.abs(hash);
  } else {
    s = Math.abs(seed | 0);
  }

  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}
