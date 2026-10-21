import { displayNumber } from './precision.ts';
import { radToDeg } from '../util/math.ts';

/** A length in px as a field shows it: no unit suffix for px. */
export function formatLength(px: number): string {
  return displayNumber(px, 'px');
}

/** An angle stored in radians, shown in degrees with a ° sign. */
export function formatAngle(radians: number): string {
  return `${displayNumber(radToDeg(radians), 'deg')}°`;
}

/** A 0–1 share shown as a percentage: 0.5 → "50%". */
export function formatPercent(share: number): string {
  return `${displayNumber(share * 100, '%')}%`;
}

export function formatCount(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
