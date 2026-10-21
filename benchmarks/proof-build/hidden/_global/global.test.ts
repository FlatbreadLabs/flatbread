// Invariants every task keeps, whatever it builds, and that the code itself
// states: saving is stable, and plugin API v1 is frozen. They run with each
// task's constraint tests. Written against the editor as it was before any
// task; the expected values below were computed from that tree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

/** The version 5 fixture document as it shipped. */
const DOC_V5 =
  '{\n  "version": 5,\n  "name": "Landing page",\n  "top": ["frame-1", "rect-9"],\n  "nodes": {\n    "frame-1": {\n      "children": ["text-2", "text-3", "group-4", "ellipse-7", "line-8"],\n      "clip": true,\n      "fills": [\n        {\n          "color": "#F4F1EA"\n        }\n      ],\n      "height": 640,\n      "id": "frame-1",\n      "locked": false,\n      "name": "Hero",\n      "opacity": 1,\n      "parent": null,\n      "rotation": 0,\n      "strokes": [],\n      "type": "frame",\n      "visible": true,\n      "width": 1200,\n      "x": 0,\n      "y": 0\n    },\n    "text-2": {\n      "align": "left",\n      "fills": [\n        {\n          "color": "#000000"\n        }\n      ],\n      "fontSize": 48,\n      "height": 60,\n      "id": "text-2",\n      "lineHeight": 1.2,\n      "locked": false,\n      "name": "Headline",\n      "opacity": 1,\n      "parent": "frame-1",\n      "rotation": 0,\n      "strokes": [],\n      "text": "Make something people want",\n      "type": "text",\n      "visible": true,\n      "width": 640,\n      "x": 80,\n      "y": 120\n    },\n    "text-3": {\n      "align": "left",\n      "fills": [\n        {\n          "color": "#000000"\n        }\n      ],\n      "fontSize": 20,\n      "height": 48,\n      "id": "text-3",\n      "lineHeight": 1.25,\n      "locked": false,\n      "name": "Subhead",\n      "opacity": 1,\n      "parent": "frame-1",\n      "rotation": 0,\n      "strokes": [],\n      "text": "A short line under the headline.",\n      "type": "text",\n      "visible": true,\n      "width": 520,\n      "x": 80,\n      "y": 200\n    },\n    "group-4": {\n      "children": ["rect-5", "rect-6"],\n      "height": 48,\n      "id": "group-4",\n      "locked": false,\n      "name": "Buttons",\n      "opacity": 0.9,\n      "parent": "frame-1",\n      "rotation": 0,\n      "type": "group",\n      "visible": true,\n      "width": 340,\n      "x": 80,\n      "y": 300\n    },\n    "rect-5": {\n      "fills": [\n        {\n          "color": "#1F4FFF"\n        }\n      ],\n      "height": 48,\n      "id": "rect-5",\n      "locked": false,\n      "name": "Primary",\n      "opacity": 1,\n      "parent": "group-4",\n      "rotation": 0,\n      "strokes": [],\n      "type": "rect",\n      "visible": true,\n      "width": 160,\n      "x": 80,\n      "y": 300\n    },\n    "rect-6": {\n      "fills": [\n        {\n          "color": "#FFFFFF"\n        }\n      ],\n      "height": 48,\n      "id": "rect-6",\n      "locked": false,\n      "name": "Secondary",\n      "opacity": 1,\n      "parent": "group-4",\n      "rotation": 0,\n      "strokes": [\n        {\n          "color": "#1F4FFF",\n          "width": 2,\n          "align": "inside"\n        }\n      ],\n      "type": "rect",\n      "visible": true,\n      "width": 160,\n      "x": 260,\n      "y": 300\n    },\n    "ellipse-7": {\n      "fills": [\n        {\n          "color": "#FFB340"\n        }\n      ],\n      "height": 300,\n      "id": "ellipse-7",\n      "locked": false,\n      "name": "Blob",\n      "opacity": 0.6,\n      "parent": "frame-1",\n      "rotation": 0.5235987755982988,\n      "strokes": [],\n      "type": "ellipse",\n      "visible": true,\n      "width": 300,\n      "x": 820,\n      "y": 140\n    },\n    "line-8": {\n      "fills": [],\n      "height": 0,\n      "id": "line-8",\n      "locked": true,\n      "name": "Divider",\n      "opacity": 1,\n      "parent": "frame-1",\n      "rotation": 0,\n      "strokes": [\n        {\n          "color": "#000000",\n          "width": 1,\n          "align": "center"\n        }\n      ],\n      "type": "line",\n      "visible": true,\n      "width": 1040,\n      "x": 80,\n      "y": 400\n    },\n    "rect-9": {\n      "fills": [\n        {\n          "color": "#D9D9D9"\n        }\n      ],\n      "height": 80,\n      "id": "rect-9",\n      "locked": false,\n      "name": "Hidden note",\n      "opacity": 1,\n      "parent": null,\n      "rotation": 0,\n      "strokes": [],\n      "type": "rect",\n      "visible": false,\n      "width": 200,\n      "x": 0,\n      "y": 700\n    }\n  }\n}\n';

/** What api.shortcuts() returned in plugin API v1. */
const V1_SHORTCUTS = {
  global: { 'Mod+Z': 'undo', 'Mod+Shift+Z': 'redo' },
  canvas: {
    Delete: 'delete',
    Backspace: 'delete',
    Escape: 'deselect-all',
    'Mod+A': 'select-all',
    'Mod+G': 'group',
    'Mod+]': 'bring-forward',
    'Mod+[': 'send-backward',
    'Mod+Shift+]': 'bring-to-front',
    'Mod+Shift+[': 'send-to-back',
    'Mod+Shift+L': 'toggle-lock',
    ArrowLeft: 'nudge-left',
    ArrowRight: 'nudge-right',
    ArrowUp: 'nudge-up',
    ArrowDown: 'nudge-down',
    'Shift+ArrowLeft': 'nudge-left-large',
    'Shift+ArrowRight': 'nudge-right-large',
    'Shift+ArrowUp': 'nudge-up-large',
    'Shift+ArrowDown': 'nudge-down-large',
  },
  layers: {
    ArrowUp: 'select-previous',
    ArrowDown: 'select-next',
    ArrowRight: 'expand',
    ArrowLeft: 'collapse',
    Delete: 'delete',
    'Mod+G': 'group',
  },
  panel: { Escape: 'focus-canvas' },
};

const V1_SURFACE = [
  'export',
  'getSelection',
  'listCommands',
  'name',
  'off',
  'on',
  'runCommand',
  'shortcuts',
  'version',
];

function sampleEditor() {
  const e = createEditor();
  const frame = e.create('frame', {
    name: 'Card',
    x: 0,
    y: 0,
    width: 400,
    height: 300,
  });
  e.create(
    'rect',
    { name: 'Back', x: 10, y: 10, width: 50, height: 40 },
    { parent: frame }
  );
  const group = e.create('group', { name: 'Icons' }, { parent: frame });
  e.create(
    'ellipse',
    { name: 'Dot', x: 100, y: 100, width: 20, height: 20 },
    { parent: group }
  );
  e.create(
    'rect',
    { name: 'Bar', x: 140, y: 100, width: 60, height: 20, rotation: 0.5 },
    { parent: group }
  );
  e.create(
    'text',
    { name: 'Title', text: 'Hello there', x: 20, y: 200 },
    { parent: frame }
  );
  e.create('line', { name: 'Rule', x: 0, y: 320, width: 400 });
  const loose = e.create('rect', {
    name: 'Loose',
    x: 500,
    y: 0,
    width: 80,
    height: 80,
    opacity: 0.5,
  });
  return { e, frame, group, loose };
}

test('a document saves, loads and saves the same text', () => {
  const { e } = sampleEditor();
  const saved = e.files.save();
  const other = createEditor();
  other.files.load(saved);
  assert.equal(other.files.save(), saved);
  const fixture = createEditor();
  fixture.files.load(DOC_V5);
  const once = fixture.files.save();
  const again = createEditor();
  again.files.load(once);
  assert.equal(again.files.save(), once);
});

test('plugin API v1 keeps its members and its shortcut table', () => {
  const { e } = sampleEditor();
  let api: any;
  e.plugins.load({
    name: 'probe',
    capabilities: ['export'],
    main: (a) => (api = a),
  });
  assert.deepEqual(Object.keys(api).sort(), V1_SURFACE);
  assert.deepEqual(JSON.parse(JSON.stringify(api.shortcuts())), V1_SHORTCUTS);
});
