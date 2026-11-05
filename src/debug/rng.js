// The seeded random numbers behind repeatable matches: the same generator as `npm run sim` (mulberry32).
// A debug recording installs it with a fresh seed when the match starts, and the replay tool installs it
// with that same seed, so CPU choices, item drops and hazards come out exactly the same both times.

/**
 * A Math.random replacement that always produces the same sequence for the same seed.
 * @param {number} seed - any 32-bit integer
 * @returns {() => number} numbers in [0, 1), like Math.random
 */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random 32-bit seed that doesn't touch Math.random (so it can't shift the match's numbers). */
export function newSeed() {
  const u = new Uint32Array(1);
  if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(u);
  else u[0] = (Date.now() ^ 0x5bd1e995) >>> 0;
  return u[0];
}
