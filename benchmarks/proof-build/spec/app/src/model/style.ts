import type { Document } from './document.ts';
import type { Paint, SceneNode, Stroke } from './types.ts';
import { isStyled } from './types.ts';
import { clamp } from '../util/math.ts';

export const DEFAULT_FILL = '#D9D9D9';

const HEX6 = /^#?([0-9a-f]{6})$/i;

/** Parses `#rrggbb` in any case. Returns `#RRGGBB`, or null. */
export function parseColor(text: string): string | null {
  const match = HEX6.exec(text.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

export function formatColor(color: string): string {
  return color.toUpperCase();
}

export function firstFill(node: SceneNode): Paint | null {
  return isStyled(node) && node.fills.length ? node.fills[0] : null;
}

export function firstStroke(node: SceneNode): Stroke | null {
  return isStyled(node) && node.strokes.length ? node.strokes[0] : null;
}

/** Fills with the first paint's colour replaced (or added). */
export function withFillColor(fills: readonly Paint[], color: string): Paint[] {
  if (!fills.length) return [{ color }];
  return fills.map((paint, i) => (i === 0 ? { ...paint, color } : paint));
}

export function withStroke(
  strokes: readonly Stroke[],
  patch: Partial<Stroke>
): Stroke[] {
  if (!strokes.length)
    return [{ color: '#000000', width: 1, align: 'inside', ...patch }];
  return strokes.map((stroke, i) =>
    i === 0 ? { ...stroke, ...patch } : stroke
  );
}

export function clampOpacity(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * The opacity a node renders at: its own, times that of every group and
 * frame above it.
 */
export function effectiveOpacity(doc: Document, id: string): number {
  let node: SceneNode | undefined = doc.require(id);
  let opacity = 1;
  while (node) {
    opacity *= node.opacity;
    node = node.parent === null ? undefined : doc.require(node.parent);
  }
  return opacity;
}
