export const MAX_NAME_LENGTH = 64;

/** Trims and collapses whitespace. Returns null when nothing is left. */
export function normalizeLayerName(name: string): string | null {
  const clean = name.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return clean.length > MAX_NAME_LENGTH
    ? clean.slice(0, MAX_NAME_LENGTH)
    : clean;
}

/** `base`, or `base 2`, `base 3`… so that it is not in `taken`. */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base} ${n}`)) return `${base} ${n}`;
}
