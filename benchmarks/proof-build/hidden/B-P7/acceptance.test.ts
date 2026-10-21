import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

const RED = [{ color: '#FF0000' }];
const BLUE_EDGE = [{ color: '#0000FF', width: 3, align: 'center' }];

function setup() {
  const e = createEditor();
  const src = e.create('rect', {
    name: 'Source',
    x: 0,
    fills: RED,
    strokes: BLUE_EDGE,
    opacity: 0.5,
  } as never);
  const b = e.create('ellipse', { name: 'B', x: 100 });
  const t = e.create('text', { name: 'T', x: 200, text: 'Hi' });
  const g = e.create('group', { name: 'G', opacity: 0.8 } as never);
  const inner = e.create('rect', { name: 'Inner', x: 300 }, { parent: g });
  return { e, src, b, t, g, inner };
}
type Editor = ReturnType<typeof createEditor>;
const look = (e: Editor, id: string) => {
  const n = e.doc.require(id) as any;
  return { fills: n.fills, strokes: n.strokes, opacity: n.opacity };
};

test('Paste style gives the selected layers the copied fills, strokes and opacity', () => {
  const { e, src, b, t } = setup();
  e.selection.set([src]);
  assert.ok(e.palette.run('Copy style'));
  e.selection.set([b, t]);
  assert.ok(e.palette.run('Paste style'));
  for (const id of [b, t])
    assert.deepEqual(look(e, id), {
      fills: RED,
      strokes: BLUE_EDGE,
      opacity: 0.5,
    });
  e.selection.set([b]);
  assert.equal(e.panel.value('Fill'), '#FF0000');
  assert.equal(e.panel.value('Opacity'), '50%');
});

test('groups in the selection are left as they are', () => {
  const { e, src, b, g, inner } = setup();
  e.selection.set([src]);
  e.palette.run('Copy style');
  const groupBefore = structuredClone(e.doc.require(g));
  const innerBefore = look(e, inner);
  e.selection.set([b, g]);
  e.palette.run('Paste style');
  assert.deepEqual(e.doc.require(g), groupBefore);
  assert.deepEqual(look(e, inner), innerBefore);
  assert.equal((e.doc.require(b) as any).opacity, 0.5);
});

test('Copy style is offered only for one layer that is not a group', () => {
  const { e, src, b, g } = setup();
  e.selection.set([src]);
  assert.ok(e.palette.list().includes('Copy style'));
  e.selection.set([src, b]);
  assert.ok(!e.palette.list().includes('Copy style'));
  e.selection.set([g]);
  assert.ok(!e.palette.list().includes('Copy style'));
  e.selection.clear();
  assert.ok(!e.palette.list().includes('Copy style'));
});

test('Paste style is offered only after a copy and with a selection', () => {
  const { e, src, b } = setup();
  e.selection.set([b]);
  assert.ok(!e.palette.list().includes('Paste style'));
  e.selection.set([src]);
  e.palette.run('Copy style');
  e.selection.clear();
  assert.ok(!e.palette.list().includes('Paste style'));
  e.selection.set([b]);
  assert.ok(e.palette.list().includes('Paste style'));
});

test('the copied style can be pasted again, and copying again replaces it', () => {
  const { e, src, b, t } = setup();
  e.selection.set([src]);
  e.palette.run('Copy style');
  e.selection.set([b]);
  e.palette.run('Paste style');
  e.selection.set([t]);
  e.palette.run('Paste style');
  assert.deepEqual(look(e, t), look(e, src));
  e.selection.set([b]);
  e.panel.edit('Fill', '#00FF00');
  e.palette.run('Copy style');
  e.selection.set([src]);
  e.palette.run('Paste style');
  assert.equal(e.panel.value('Fill'), '#00FF00');
  assert.equal(e.doc.require(t).fills[0].color, '#FF0000');
});

test('a paste copies the style: changing one layer later leaves the others alone', () => {
  const { e, src, b, t } = setup();
  e.selection.set([src]);
  e.palette.run('Copy style');
  e.selection.set([b, t]);
  e.palette.run('Paste style');
  e.selection.set([b]);
  e.panel.edit('Fill', '#123456');
  assert.equal(e.doc.require(t).fills[0].color, '#FF0000');
  assert.equal(e.doc.require(src).fills[0].color, '#FF0000');
});

test('the paste can be undone', () => {
  const { e, src, b, t } = setup();
  const before = [look(e, b), look(e, t)];
  e.selection.set([src]);
  e.palette.run('Copy style');
  e.selection.set([b, t]);
  const size = e.history.size;
  e.palette.run('Paste style');
  assert.ok(e.history.size > size);
  while (e.history.size > size && e.history.undo());
  assert.deepEqual([look(e, b), look(e, t)], before);
});

test('each editor keeps its own copied style', () => {
  const one = setup();
  const two = setup();
  one.e.selection.set([one.src]);
  one.e.palette.run('Copy style');
  two.e.selection.set([two.b]);
  assert.ok(!two.e.palette.list().includes('Paste style'));
});
