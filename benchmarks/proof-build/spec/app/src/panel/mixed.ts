import type { FieldValue } from './schema.ts';

/** What a field shows when the selected nodes disagree. */
export const MIXED = 'Mixed';

export type Combined =
  | { mixed: false; value: FieldValue; text: string }
  | { mixed: true; text: string };

/**
 * One value for many nodes, or mixed. Values count as equal when they show
 * the same text, so 10 and 10.000001 are not mixed.
 */
export function combine(
  values: readonly FieldValue[],
  format: (value: FieldValue) => string
): Combined | null {
  if (!values.length) return null;
  const texts = values.map(format);
  return texts.every((text) => text === texts[0])
    ? { mixed: false, value: values[0], text: texts[0] }
    : { mixed: true, text: MIXED };
}

export function isMixed(text: string): boolean {
  return text === MIXED;
}
