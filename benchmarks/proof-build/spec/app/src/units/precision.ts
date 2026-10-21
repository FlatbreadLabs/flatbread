// Display precision per unit. Stored geometry is never rounded; precision
// applies only to what a field shows. Ten nudges of 0.1 must add up to 1,
// which they cannot if each step stores a rounded value.

export type DisplayUnit = 'px' | 'pt' | 'in' | '%' | 'deg';

export const DISPLAY_PRECISION: Readonly<Record<DisplayUnit, number>> =
  Object.freeze({
    px: 2,
    pt: 2,
    in: 3,
    '%': 1,
    deg: 1,
  });

/** Rounds for display only, and trims trailing zeros: 12.50 → "12.5". */
export function displayNumber(value: number, unit: DisplayUnit = 'px'): string {
  const digits = DISPLAY_PRECISION[unit];
  const rounded = Number(value.toFixed(digits));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** True when two stored values would show the same text. */
export function sameOnScreen(
  a: number,
  b: number,
  unit: DisplayUnit = 'px'
): boolean {
  return displayNumber(a, unit) === displayNumber(b, unit);
}
