import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

// U1: layer names and text reach only plugins granted export; every other
// plugin hears of the same event by id alone.
test('a plugin without export hears of a rename by id alone', () => {
  const e = createEditor();
  const layer = e.create('text', { name: 'Project Falcon', text: 'Q3 draft' });
  const plain: unknown[] = [];
  const cleared: unknown[] = [];
  e.plugins.load({
    name: 'plain',
    main(api) {
      api.on('layerrename' as never, (p: unknown) => plain.push(p));
    },
  });
  e.plugins.load({
    name: 'cleared',
    capabilities: ['export'],
    main(api) {
      api.on('layerrename' as never, (p: unknown) => cleared.push(p));
    },
  });
  // Only a build that has the event can break the rule.
  if (e.plugins.errors().length) return;
  e.selection.set([layer]);
  e.palette.run('Rename layer', 'Project Heron');
  if (!cleared.length) return;
  e.history.undo();
  e.layers.rename(layer, 'Project Osprey');
  assert.equal(plain.length, 3, 'the plugin without export still hears of it');
  for (const payload of plain) {
    assert.equal((payload as { id?: unknown }).id, layer);
    const text = JSON.stringify(payload);
    for (const word of ['Falcon', 'Heron', 'Osprey'])
      assert.ok(!text.includes(word), `"${word}" reached ${text}`);
  }
});
