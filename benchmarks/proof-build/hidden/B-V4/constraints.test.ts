import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';
import type { Command } from '../../src/commands/types.ts';

// Each test checks the rule only when the build has Duplicate.

/**
 * An editor whose id counter is ahead of what its document needs: a layer
 * was made and dropped, so a copy loaded from its file counts differently.
 */
function setup() {
  const e = createEditor();
  const a = e.create('rect', { name: 'A', x: 0, y: 0, width: 50, height: 50 });
  const f = e.create('frame', {
    name: 'F',
    x: 100,
    y: 0,
    width: 200,
    height: 200,
  });
  e.create('ellipse', { name: 'E', x: 120, y: 20 }, { parent: f });
  const gone = e.create('rect', { name: 'Gone' });
  e.doc.remove(gone);
  return { e, a, f };
}

function record(e: ReturnType<typeof createEditor>) {
  const log: Command[] = [];
  const atRun: string[] = [];
  e.commands.on('executed', ({ command }) => {
    log.push(command);
    atRun.push(JSON.stringify(command));
  });
  return { log, atRun };
}

test('the recorded commands replay as JSON on a copy of the document', () => {
  const { e, a, f } = setup();
  const saved = e.files.save();
  const { log } = record(e);
  e.selection.set([a, f]);
  if (!e.palette.has('Duplicate')) return;
  e.palette.run('Duplicate');
  e.keys.press('Mod+D');
  const copy = createEditor();
  copy.files.load(saved);
  copy.commands.replay(JSON.parse(JSON.stringify(log)));
  assert.equal(copy.files.save(), e.files.save());
});

test('a command keeps the payload it ran with', () => {
  const { e, a } = setup();
  const { log, atRun } = record(e);
  e.selection.set([a]);
  if (!e.palette.has('Duplicate')) return;
  e.palette.run('Duplicate');
  e.palette.run('Duplicate');
  e.commands.dispatch({
    type: 'move',
    payload: { ids: e.selection.ids(), dx: 30, dy: 0 },
  });
  e.history.undo();
  e.history.undo();
  e.history.redo();
  assert.deepEqual(
    log.map((c) => JSON.stringify(c)),
    atRun
  );
});

test('Redo brings back the very same copies, selected', () => {
  const { e, a, f } = setup();
  e.selection.set([a, f]);
  if (!e.palette.has('Duplicate')) return;
  e.palette.run('Duplicate');
  const copies = e.selection.ids();
  const saved = e.files.save();
  e.history.undo();
  e.history.redo();
  assert.deepEqual(e.selection.ids(), copies);
  assert.equal(e.files.save(), saved);
});
