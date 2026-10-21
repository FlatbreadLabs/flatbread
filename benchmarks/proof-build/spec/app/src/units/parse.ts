// Reads a length written as a string, such as `12`, `12px` or ` 4.5 px `.
// Version 1 files stored lengths this way; the v1→v2 migration reads them
// through here.

const LENGTH = /^\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*(px)?\s*$/i;

export function parseLength(text: string): number | null {
  const match = LENGTH.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/** Reads a stored value that may be a number or a legacy length string. */
export function readLength(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return parseLength(value) ?? fallback;
  return fallback;
}
