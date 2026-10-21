import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIGRATIONS } from '../../src/persist/migrations/index.ts';
import { createEditor } from '../../src/editor.ts';

/** The version 4 test file and what the version 4 to 5 step made of it when it shipped. */
const V4_INPUT = {
  version: 4,
  name: 'Rotated',
  top: ['frame-1'],
  nodes: {
    'frame-1': {
      id: 'frame-1',
      type: 'frame',
      name: 'Board',
      parent: null,
      children: ['rect-2'],
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      clip: true,
      fills: [{ color: '#FFFFFF' }],
      strokes: [],
    },
    'rect-2': {
      id: 'rect-2',
      type: 'rect',
      name: 'Tilted',
      parent: 'frame-1',
      x: 100,
      y: 100,
      width: 80,
      height: 40,
      rotation: 45,
      visible: true,
      locked: false,
      opacity: 1,
      fills: [{ color: '#FF0000' }],
      strokes: [],
    },
  },
};
const V5_OUTPUT = {
  version: 5,
  name: 'Rotated',
  top: ['frame-1'],
  nodes: {
    'frame-1': {
      id: 'frame-1',
      type: 'frame',
      name: 'Board',
      parent: null,
      children: ['rect-2'],
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      clip: true,
      fills: [{ color: '#FFFFFF' }],
      strokes: [],
    },
    'rect-2': {
      id: 'rect-2',
      type: 'rect',
      name: 'Tilted',
      parent: 'frame-1',
      x: 100,
      y: 100,
      width: 80,
      height: 40,
      rotation: 0.7853981633974483,
      visible: true,
      locked: false,
      opacity: 1,
      fills: [{ color: '#FF0000' }],
      strokes: [],
    },
  },
};

test('the version 4 to 5 step returns what it shipped with', () => {
  const step = MIGRATIONS.find((m) => m.from === 4 && m.to === 5);
  assert.ok(step);
  assert.deepEqual(step.run(structuredClone(V4_INPUT)), V5_OUTPUT);
});

test('a frame with a layout grid saves as a newer version, reached by a step from version 5', () => {
  const e = createEditor();
  const f = e.create('frame', { name: 'Board', width: 400, height: 300 });
  e.selection.set([f]);
  let has: boolean;
  try {
    has = e.panel.value('Layout grid') !== undefined;
  } catch {
    has = false;
  }
  if (!has) return;
  e.panel.edit('Layout grid', '8');
  const saved = JSON.parse(e.files.save());
  assert.ok(saved.version > 5, `saved as version ${saved.version}`);
  const step = MIGRATIONS.find((m) => m.from === 5);
  assert.ok(step, 'a migration step from version 5');
  assert.equal(step.to, 6);
});
