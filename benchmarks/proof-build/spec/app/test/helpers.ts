import { createEditor } from '../src/editor.ts';
import type { Editor } from '../src/editor.ts';
import { readFileSync } from 'node:fs';

/** An editor with a fixed clock that moves forward 10 ms per read. */
export function editor(): Editor {
  let now = 1_000;
  return createEditor({ clock: () => (now += 10) });
}

/** Three rectangles side by side at y = 0, each 50 × 50, 100 px apart. */
export function threeRects(e: Editor = editor()) {
  const a = e.create('rect', { x: 0, y: 0, width: 50, height: 50, name: 'A' });
  const b = e.create('rect', {
    x: 100,
    y: 0,
    width: 50,
    height: 50,
    name: 'B',
  });
  const c = e.create('rect', {
    x: 200,
    y: 0,
    width: 50,
    height: 50,
    name: 'C',
  });
  return { e, a, b, c };
}

export function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

export function close(
  actual: number,
  expected: number,
  epsilon = 1e-9
): boolean {
  return Math.abs(actual - expected) <= epsilon;
}
