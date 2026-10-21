import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

const RED = [{ color: '#FF0000' }];
const BLUE = [{ color: '#0000FF' }];

/** Layers straight on the page, one of them in a group; no frames. */
function page() {
  const e = createEditor();
  const a = e.create('rect', { name: 'A', fills: RED } as never);
  const g = e.create('group', { name: 'G' });
  const b = e.create('ellipse', { name: 'B', x: 100, fills: RED } as never, {
    parent: g,
  });
  const c = e.create('rect', { name: 'C', x: 200, fills: BLUE } as never);
  const t = e.create('text', {
    name: 'T',
    x: 300,
    text: 'Hi',
    fills: RED,
  } as never);
  const line = e.create('line', { name: 'Rule', y: 200, width: 300 });
  return { e, a, g, b, c, t, line };
}
type Editor = ReturnType<typeof createEditor>;
const picked = (e: Editor) => [...e.selection.ids()].sort();

test('it selects the layers with the same fill colour, groups included', () => {
  const { e, a, b, t } = page();
  e.selection.set([a]);
  assert.ok(e.palette.run('Select same fill'));
  assert.deepEqual(picked(e), [a, b, t].sort());
});

test('it starts from whichever layer is selected', () => {
  const { e, c } = page();
  e.selection.set([c]);
  e.palette.run('Select same fill');
  assert.deepEqual(picked(e), [c]);
});

test('inside one frame it finds the matches at any depth', () => {
  const e = createEditor();
  const screen = e.create('frame', { name: 'Screen', width: 800, height: 600 });
  const card = e.create('frame', { name: 'Card', fills: BLUE } as never, {
    parent: screen,
  });
  const x = e.create('rect', { name: 'X', fills: RED } as never, {
    parent: screen,
  });
  const g = e.create('group', { name: 'Row' }, { parent: card });
  const y = e.create('rect', { name: 'Y', x: 50, fills: RED } as never, {
    parent: g,
  });
  e.create('rect', { name: 'Z', x: 90, fills: BLUE } as never, {
    parent: card,
  });
  e.selection.set([y]);
  e.palette.run('Select same fill');
  assert.deepEqual(picked(e), [x, y].sort());
});

test('it is offered only when exactly one layer with a fill is selected', () => {
  const { e, a, c, g, line } = page();
  const offered = (ids: string[]) => {
    e.selection.set(ids);
    return e.palette.list().includes('Select same fill');
  };
  assert.equal(offered([]), false);
  assert.equal(offered([a, c]), false);
  assert.equal(offered([g]), false);
  assert.equal(offered([line]), false);
  assert.equal(offered([a]), true);
});

test('selecting is not an edit', () => {
  const { e, a } = page();
  e.selection.set([a]);
  e.palette.run('Select same fill');
  assert.equal(e.history.size, 0);
});
