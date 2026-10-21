import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLUGIN_API_V1_SURFACE } from '../src/plugin/api.ts';
import type { PluginApiV1 } from '../src/plugin/api.ts';
import { PLUGIN_EVENTS } from '../src/plugin/events.ts';
import { DEFAULT_KEYMAP } from '../src/keys/keymap.ts';
import { threeRects } from './helpers.ts';

function capture(
  e: ReturnType<typeof threeRects>['e'],
  capabilities: string[] = []
) {
  let api!: PluginApiV1;
  e.plugins.load({ name: 'probe', capabilities, main: (a) => (api = a) });
  return api;
}

test('plugin API v1 surface is frozen', () => {
  const { e } = threeRects();
  const api = capture(e, ['export']);
  assert.deepEqual(Object.keys(api).sort(), [...PLUGIN_API_V1_SURFACE]);
  assert.deepEqual(PLUGIN_API_V1_SURFACE, [
    'export',
    'getSelection',
    'listCommands',
    'name',
    'off',
    'on',
    'runCommand',
    'shortcuts',
    'version',
  ]);
  assert.equal(api.version, 1);
  assert.ok(Object.isFrozen(api));
});

test('without the export capability there is no export', () => {
  const { e } = threeRects();
  const api = capture(e);
  assert.equal(api.export, undefined);
  assert.ok(!Object.keys(api).includes('export'));
});

test('export returns the saved document', () => {
  const { e } = threeRects();
  const api = capture(e, ['export']);
  assert.equal(api.export?.document(), e.files.save());
});

test('documentchange carries the changed ids', () => {
  const { e, a } = threeRects();
  const api = capture(e);
  const seen: unknown[] = [];
  api.on('documentchange', (payload) => seen.push(payload));
  e.commands.dispatch({ type: 'move', payload: { ids: [a], dx: 1, dy: 0 } });
  assert.deepEqual(seen, [{ ids: [a] }]);
});

test('historychange and documentload fire', () => {
  const { e, a } = threeRects();
  const api = capture(e);
  const seen: string[] = [];
  api.on('historychange', ({ canUndo }) => seen.push(`history:${canUndo}`));
  api.on('documentload', ({ name }) => seen.push(`load:${name}`));
  e.commands.dispatch({ type: 'move', payload: { ids: [a], dx: 1, dy: 0 } });
  e.files.load(e.files.save());
  assert.deepEqual(seen, ['history:true', 'history:false', 'load:Untitled']);
});

test('plugins read the selection as ids and run palette commands', () => {
  const { e, a, b } = threeRects();
  const api = capture(e);
  e.selection.set([a, b]);
  assert.deepEqual(api.getSelection(), [a, b]);
  assert.ok(api.listCommands().includes('Group selection'));
  assert.ok(api.runCommand('Group selection'));
  assert.equal(e.selection.ids().length, 1);
});

test('shortcuts() is the v1 table', () => {
  const { e } = threeRects();
  const api = capture(e);
  assert.equal(api.shortcuts(), DEFAULT_KEYMAP);
  assert.equal(api.shortcuts().canvas['Mod+G'], 'group');
  assert.ok(Object.isFrozen(api.shortcuts().canvas));
});

test('unknown events and capabilities are refused', () => {
  const { e } = threeRects();
  const api = capture(e);
  assert.throws(() => api.on('paint' as never, () => {}), /no plugin event/);
  assert.throws(
    () => e.plugins.load({ name: 'x', capabilities: ['network'], main() {} }),
    /unknown plugin capability/
  );
  assert.deepEqual(PLUGIN_EVENTS.slice(0, 3), [
    'documentchange',
    'documentload',
    'historychange',
  ]);
});

test('a throwing plugin is contained and an unloaded one is cut off', () => {
  const { e, a } = threeRects();
  let api!: PluginApiV1;
  e.plugins.load({
    name: 'bad',
    main(x) {
      api = x;
      x.on('documentchange', () => {
        throw new Error('boom');
      });
    },
  });
  e.commands.dispatch({ type: 'move', payload: { ids: [a], dx: 1, dy: 0 } });
  assert.equal(e.plugins.errors()[0]?.message, 'boom');
  assert.ok(e.plugins.unload('bad'));
  assert.throws(() => api.getSelection(), /unloaded/);
  assert.deepEqual(e.plugins.loaded(), []);
});
