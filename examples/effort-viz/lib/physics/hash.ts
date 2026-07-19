/**
 * Tiny deterministic hashing / PRNG helpers.
 *
 * We use these to derive stable-but-scattered spawn positions and vein
 * curvatures from string ids, so that reloading the app doesn't randomly
 * re-shuffle the layout while physics is still allowed to settle.
 */

/** FNV-1a 32-bit hash of a string. Fast, allocation-free, good spread. */
export function hashString(input: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG. Given a 32-bit integer seed, returns a `() => number` in
 * [0, 1). Deterministic and cheap; perfect for per-node / per-edge streams.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: build a PRNG from a string id + optional seed offset. */
export function rngFromId(id: string, seed = 0): () => number {
  return mulberry32(hashString(id) ^ (seed >>> 0));
}

/** Uniform value in [min, max). */
export function randRange(rand: () => number, min: number, max: number): number {
  return min + (max - min) * rand();
}

/** Uniform angle in [0, 2π). */
export function randAngle(rand: () => number): number {
  return rand() * Math.PI * 2;
}
