import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';
import { parseFile } from '../../src/persist/deserialize.ts';

/** A version 1 file with length strings in units, and the sizes it opened with before. */
const LEGACY = JSON.stringify({
  version: 1,
  name: 'Legacy units',
  nodes: [
    {
      id: 'frame-1',
      type: 'frame',
      name: 'Sheet',
      parent: null,
      children: ['rect-2'],
      x: '0px',
      y: '0',
      width: '8.5in',
      height: '11in',
      fill: '#FFFFFF',
    },
    {
      id: 'rect-2',
      type: 'rect',
      name: 'Margin',
      parent: 'frame-1',
      x: '50%',
      y: '18pt',
      width: '2in',
      height: ' 12 px ',
    },
  ],
});

test('old files with unit strings open as they always did', () => {
  const data = parseFile(LEGACY);
  const sheet = data.nodes['frame-1'];
  const margin = data.nodes['rect-2'];
  assert.deepEqual([sheet.width, sheet.height], [0, 0]);
  assert.deepEqual(
    [margin.x, margin.y, margin.width, margin.height],
    [0, 0, 0, 12]
  );
  const e = createEditor();
  e.files.load(LEGACY);
  e.selection.set(['rect-2']);
  assert.equal(e.panel.value('H'), '12');
});
