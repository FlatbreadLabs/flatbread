import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

// Every plugin here has the export capability, so it may read names.
function setup() {
  const e = createEditor();
  const card = e.create('rect', { name: 'Card' });
  const badge = e.create('rect', { name: 'Badge' });
  const got: any[] = [];
  e.plugins.load({
    name: 'watcher',
    capabilities: ['export'],
    main(api) {
      api.on('layerrename' as never, (p: any) => got.push(p));
    },
  });
  const seen = () =>
    got.map((p) => ({ id: p.id, before: p.before, after: p.after }));
  return { e, card, badge, got, seen };
}

test('layerrename is a plugin event', () => {
  const { e } = setup();
  assert.deepEqual(e.plugins.errors(), []);
});

test('renaming from the palette tells the plugin the old and new names', () => {
  const { e, card, seen } = setup();
  e.selection.set([card]);
  e.palette.run('Rename layer', 'Hero');
  assert.deepEqual(seen(), [{ id: card, before: 'Card', after: 'Hero' }]);
});

test('renaming in the layers panel fires it too', () => {
  const { e, badge, seen } = setup();
  assert.ok(e.layers.rename(badge, 'Price tag'));
  assert.deepEqual(seen(), [
    { id: badge, before: 'Badge', after: 'Price tag' },
  ]);
});

test('undo and redo of a rename fire it', () => {
  const { e, card, seen } = setup();
  e.selection.set([card]);
  e.palette.run('Rename layer', 'Hero');
  assert.ok(e.history.undo());
  assert.ok(e.history.redo());
  assert.deepEqual(seen(), [
    { id: card, before: 'Card', after: 'Hero' },
    { id: card, before: 'Hero', after: 'Card' },
    { id: card, before: 'Card', after: 'Hero' },
  ]);
});

test('other edits and an unchanged name do not fire it', () => {
  const { e, card, badge, got } = setup();
  e.selection.set([card, badge]);
  e.panel.edit('X', '40');
  e.panel.edit('Fill', '#336699');
  e.palette.run('Hide');
  assert.equal(e.layers.rename(card, 'Card'), false);
  assert.equal(got.length, 0);
});

test('each rename of several layers is reported once', () => {
  const { e, card, badge, seen } = setup();
  e.layers.rename(card, 'One');
  e.layers.rename(badge, 'Two');
  e.layers.rename(card, 'Three');
  assert.deepEqual(seen(), [
    { id: card, before: 'Card', after: 'One' },
    { id: badge, before: 'Badge', after: 'Two' },
    { id: card, before: 'One', after: 'Three' },
  ]);
});
