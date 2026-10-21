import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;

function setup() {
  const e = createEditor();
  const a = e.create('rect', { name: 'A', x: 0, y: 0, width: 50, height: 40 });
  const t = e.create('text', {
    name: 'Title',
    x: 100,
    y: 10,
    width: 120,
    height: 20,
  });
  return { e, a, t };
}

function listen(e: Editor) {
  const seen: any[] = [];
  e.plugins.load({
    name: 'watcher',
    main(api) {
      api.on('selectionchange' as never, (payload: unknown) =>
        seen.push(payload)
      );
    },
  });
  assert.deepEqual(e.plugins.errors(), []);
  return seen;
}

const summary = (payload: any) =>
  payload.layers.map((l: any) => [
    l.id,
    l.name,
    l.type,
    l.x,
    l.y,
    l.width,
    l.height,
  ]);

test('selectionchange lists the selected layers in selection order', () => {
  const { e, a, t } = setup();
  const seen = listen(e);
  e.selection.set([t, a]);
  assert.equal(seen.length, 1);
  assert.deepEqual(summary(seen[0]), [
    [t, 'Title', 'text', 100, 10, 120, 20],
    [a, 'A', 'rect', 0, 0, 50, 40],
  ]);
});

test('clearing the selection sends an empty list', () => {
  const { e, a } = setup();
  const seen = listen(e);
  e.selection.set([a]);
  e.selection.clear();
  assert.equal(seen.length, 2);
  assert.deepEqual(seen[1].layers, []);
});

test('it fires once per change and not when nothing changed', () => {
  const { e, a } = setup();
  const seen = listen(e);
  e.selection.set([a]);
  e.selection.set([a]);
  e.panel.edit('X', '30');
  assert.equal(seen.length, 1);
});

test('selecting from the canvas and the layers panel fires it too', () => {
  const { e, a, t } = setup();
  const seen = listen(e);
  e.canvas.click({ x: 10, y: 10 });
  e.layers.click(t);
  assert.deepEqual(
    seen.map((p) => p.layers.map((l: any) => l.id)),
    [[a], [t]]
  );
});

test('a plugin can stop listening', () => {
  const { e, a } = setup();
  const seen: unknown[] = [];
  const listener = (p: unknown) => seen.push(p);
  let api: any;
  e.plugins.load({ name: 'w', main: (x) => (api = x) });
  api.on('selectionchange', listener);
  e.selection.set([a]);
  api.off('selectionchange', listener);
  e.selection.clear();
  assert.equal(seen.length, 1);
});
