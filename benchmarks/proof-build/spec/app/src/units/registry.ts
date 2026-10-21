// The unit registry. Every length is stored in px; a unit only says how to
// turn a typed number into px and back.

export type UnitId = 'px' | 'pt' | 'in' | '%';

export interface UnitContext {
  /** The length that 100% means, such as the parent frame's width. */
  reference?: number;
}

export interface Unit {
  id: UnitId;
  label: string;
  /** px per one of this unit; null for relative units. */
  perUnit: number | null;
}

export const UNITS: Readonly<Record<UnitId, Unit>> = Object.freeze({
  px: { id: 'px', label: 'pixels', perUnit: 1 },
  pt: { id: 'pt', label: 'points', perUnit: 96 / 72 },
  in: { id: 'in', label: 'inches', perUnit: 96 },
  '%': { id: '%', label: 'percent', perUnit: null },
});

export function isUnitId(value: string): value is UnitId {
  return Object.prototype.hasOwnProperty.call(UNITS, value);
}

export function unitFor(suffix: string): Unit | null {
  const key = suffix.trim().toLowerCase();
  return isUnitId(key) ? UNITS[key] : null;
}

export function toPx(
  value: number,
  unit: UnitId,
  context: UnitContext = {}
): number | null {
  const u = UNITS[unit];
  if (u.perUnit !== null) return value * u.perUnit;
  if (context.reference === undefined) return null;
  return (value / 100) * context.reference;
}

export function fromPx(
  px: number,
  unit: UnitId,
  context: UnitContext = {}
): number | null {
  const u = UNITS[unit];
  if (u.perUnit !== null) return px / u.perUnit;
  if (!context.reference) return null;
  return (px / context.reference) * 100;
}
