// Small numeric helpers shared by geometry, units and the panel.

export const EPSILON = 1e-9;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function approxEqual(a: number, b: number, epsilon = EPSILON): boolean {
  return Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function sum(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function uniq<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}
