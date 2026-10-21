import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

test('the shortcut table plugins read stays the frozen v1 table', () => {
  const e = createEditor();
  let api: any;
  e.plugins.load({ name: 'probe', main: (a) => (api = a) });
  const table = api.shortcuts();
  assert.equal(table.canvas['Mod+Shift+H'], undefined);
  assert.equal(Object.keys(table.canvas).length, 18);
  assert.ok(Object.isFrozen(table) && Object.isFrozen(table.canvas));
});
