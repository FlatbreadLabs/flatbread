import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

// U2: a step goes to the next size on the type scale (8, 9, 10, 11, 12, 14,
// 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96); a size between two scale
// sizes goes to the next one in the direction of the step.
function texts(sizes: number[]) {
  const e = createEditor();
  const ids = sizes.map((fontSize, i) =>
    e.create('text', { name: `T${i}`, x: i * 200, fontSize } as never)
  );
  e.selection.set(ids);
  const sizesNow = () => ids.map((id) => (e.doc.require(id) as any).fontSize);
  return { e, sizesNow };
}

test('a step up goes to the next size on the type scale', () => {
  const { e, sizesNow } = texts([13, 16, 18, 24, 36, 72]);
  if (!e.palette.has('Increase font size')) return;
  e.palette.run('Increase font size');
  assert.deepEqual(sizesNow(), [14, 18, 20, 28, 48, 96]);
  e.palette.run('Increase font size');
  assert.deepEqual(sizesNow(), [16, 20, 24, 32, 64, 104]);
});

test('a step down goes to the next size down on the type scale', () => {
  const { e, sizesNow } = texts([13, 16, 9, 30, 48, 96]);
  if (!e.palette.has('Decrease font size')) return;
  e.palette.run('Decrease font size');
  assert.deepEqual(sizesNow(), [12, 14, 8, 28, 36, 72]);
});
