import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LATEST,
  MIGRATIONS,
  migrate,
} from '../src/persist/migrations/index.ts';
import { parseFile } from '../src/persist/deserialize.ts';
import { SCHEMA_VERSION } from '../src/persist/schema.ts';
import { fixture } from './helpers.ts';

test('migrations form one chain up to the current version', () => {
  assert.equal(LATEST, SCHEMA_VERSION);
  MIGRATIONS.forEach((m, i) => {
    assert.equal(m.from, i + 1);
    assert.equal(m.to, i + 2);
  });
});

test('a version 1 file opens', () => {
  const data = parseFile(fixture('v1.json'));
  const card = data.nodes['frame-1'];
  assert.equal(card.type, 'frame');
  assert.equal(card.width, 320);
  assert.deepEqual(data.top, ['frame-1']);
  const label = data.nodes['text-3'];
  assert.equal(label.type === 'text' && label.fontSize, 14);
  assert.equal(label.visible, false);
  const rect = data.nodes['rect-2'];
  assert.ok(rect.type === 'rect');
  assert.deepEqual(rect.fills, [{ color: '#3366FF' }]);
  assert.deepEqual(rect.strokes, [
    { color: '#000000', width: 2, align: 'inside' },
  ]);
});

test('a version 4 file opens with its rotation in radians', () => {
  const data = parseFile(fixture('v4.json'));
  assert.ok(Math.abs(data.nodes['rect-2'].rotation - Math.PI / 4) < 1e-12);
  assert.equal(data.nodes['frame-1'].rotation, 0);
});

test('each step runs once, in order', () => {
  const out = migrate(JSON.parse(fixture('v1.json')));
  assert.equal(out.version, LATEST);
  assert.ok(!('hidden' in (out.nodes as Record<string, object>)['text-3']));
});
