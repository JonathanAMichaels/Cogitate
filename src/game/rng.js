// Seedable pseudo-random number generator.
//
// We avoid Math.random() so that a given config reproduces the exact same
// stimulus set on every machine and every participant session — essential for
// controlled, shareable experimental stimuli.

/**
 * Hash an arbitrary string into a 32-bit unsigned integer seed.
 * Lets configs use human-readable seeds like "pilot-v1".
 * @param {string} str
 * @returns {number} 32-bit unsigned int
 */
export function hashSeed(str) {
  let h = 2166136261 >>> 0; // FNV-1a offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV prime
  }
  return h >>> 0;
}

/**
 * mulberry32 — a fast, well-distributed 32-bit PRNG.
 * @param {number|string} seed - numeric seed, or a string (hashed automatically)
 * @returns {() => number} function returning floats in [0, 1)
 */
export function makeRng(seed) {
  let a = (typeof seed === 'string' ? hashSeed(seed) : seed >>> 0) || 1;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
