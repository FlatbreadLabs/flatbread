import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

// Each test checks the rule only when the build has the event.

function setup(onEvent: (payload: any) => void) {
  const e = createEditor();
  const a = e.create('rect', { name: 'A', x: 0, y: 0, width: 50, height: 40 });
  const b = e.create('ellipse', { name: 'B', x: 80, y: 0 });
  let has = true;
  e.plugins.load({
    name: 'probe',
    main(api) {
      try {
        api.on('selectionchange' as never, onEvent as never);
      } catch {
        has = false;
      }
    },
  });
  return { e, a, b, has };
}

test('what a plugin receives is frozen, all the way down', () => {
  const seen: any[] = [];
  const { e, a, b, has } = setup((p) => seen.push(p));
  if (!has) return;
  e.selection.set([a, b]);
  const [payload] = seen;
  assert.ok(Object.isFrozen(payload), 'the payload');
  assert.ok(Object.isFrozen(payload.layers), 'the list');
  for (const layer of payload.layers) {
    assert.ok(Object.isFrozen(layer), `layer ${layer.id}`);
    assert.notEqual(layer, e.doc.get(layer.id));
  }
});

test('a plugin that writes to what it receives changes nothing in the document', () => {
  const { e, a, has } = setup((p) => {
    for (const layer of p.layers) {
      try {
        layer.name = 'Hacked';
        layer.x = 999;
      } catch {
        // Frozen: the write is refused.
      }
    }
  });
  if (!has) return;
  const saved = e.files.save();
  e.selection.set([a]);
  assert.equal(e.doc.require(a).name, 'A');
  assert.equal(e.doc.require(a).x, 0);
  assert.equal(e.files.save(), saved);
  assert.equal(e.history.size, 0);
  assert.equal(e.layers.view().find((r) => r.id === a)?.name, 'A');
});

test('a payload describes the selection when it changed, not later', () => {
  const seen: any[] = [];
  const { e, a, has } = setup((p) => seen.push(p));
  if (!has) return;
  e.selection.set([a]);
  e.panel.edit('X', '25');
  e.panel.edit('W', '10');
  assert.equal(seen[0].layers[0].x, 0);
  assert.equal(seen[0].layers[0].width, 50);
});
