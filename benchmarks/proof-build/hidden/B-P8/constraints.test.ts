import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';
import { MIGRATIONS } from '../../src/persist/migrations/index.ts';
import { V2_POSTER } from './files.ts';

/** Whether this build turns colour names into hex when a file opens. */
function fixesNames(): boolean {
  const e = createEditor();
  e.files.load(V2_POSTER);
  const band = e.doc.all().find((n) => n.name === 'Band') as any;
  return band?.fills?.[0]?.color === '#FF0000';
}

const V2_INPUT = {
  version: 2,
  name: 'Named',
  nodes: [
    {
      id: 'rect-1',
      type: 'rect',
      name: 'A',
      parent: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: 'red',
      stroke: 'navy',
      strokeWidth: 2,
    },
  ],
};
/** What the version 2 to 3 step made of it when it shipped. */
const V3_OUTPUT = {
  version: 3,
  name: 'Named',
  nodes: [
    {
      id: 'rect-1',
      type: 'rect',
      name: 'A',
      parent: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fills: [{ color: 'RED' }],
      strokes: [{ color: 'NAVY', width: 2, align: 'inside' }],
    },
  ],
};

test('the version 2 to 3 step returns what it shipped with, names included', () => {
  if (!fixesNames()) return;
  const step = MIGRATIONS.find((m) => m.from === 2 && m.to === 3);
  assert.ok(step);
  assert.deepEqual(step.run(structuredClone(V2_INPUT)), V3_OUTPUT);
});

test('the fix saves as a newer version, reached by a step from version 5', () => {
  if (!fixesNames()) return;
  const e = createEditor();
  e.files.load(V2_POSTER);
  const saved = JSON.parse(e.files.save());
  assert.ok(saved.version > 5, `saved as version ${saved.version}`);
  const step = MIGRATIONS.find((m) => m.from === 5);
  assert.ok(step, 'a migration step from version 5');
  assert.equal(step.to, 6);
});
