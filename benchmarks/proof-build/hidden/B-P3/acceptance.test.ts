import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

/** Files saved by earlier versions of the editor. */
const OLD_FILES: Record<string, string> = {
  v1: '{\n  "version": 1,\n  "name": "Pricing card",\n  "nodes": [\n    {\n      "id": "frame-1",\n      "type": "frame",\n      "name": "Card",\n      "parent": null,\n      "children": ["rect-2", "text-3"],\n      "x": "0px",\n      "y": "0px",\n      "width": "320px",\n      "height": "200px",\n      "fill": "#ffffff"\n    },\n    {\n      "id": "rect-2",\n      "type": "rect",\n      "name": "Badge",\n      "parent": "frame-1",\n      "x": "16px",\n      "y": "16",\n      "width": "48px",\n      "height": "24px",\n      "fill": "#3366ff",\n      "stroke": "#000000",\n      "strokeWidth": "2px"\n    },\n    {\n      "id": "text-3",\n      "type": "text",\n      "name": "Label",\n      "parent": "frame-1",\n      "x": "16px",\n      "y": "56px",\n      "width": "200px",\n      "height": "18px",\n      "fontSize": "14px",\n      "text": "Most popular",\n      "fill": "#111111",\n      "hidden": true\n    }\n  ]\n}\n',
  v4: '{\n  "version": 4,\n  "name": "Rotated",\n  "top": ["frame-1"],\n  "nodes": {\n    "frame-1": {\n      "id": "frame-1",\n      "type": "frame",\n      "name": "Board",\n      "parent": null,\n      "children": ["rect-2"],\n      "x": 0,\n      "y": 0,\n      "width": 400,\n      "height": 300,\n      "rotation": 0,\n      "visible": true,\n      "locked": false,\n      "opacity": 1,\n      "clip": true,\n      "fills": [{ "color": "#FFFFFF" }],\n      "strokes": []\n    },\n    "rect-2": {\n      "id": "rect-2",\n      "type": "rect",\n      "name": "Tilted",\n      "parent": "frame-1",\n      "x": 100,\n      "y": 100,\n      "width": 80,\n      "height": 40,\n      "rotation": 45,\n      "visible": true,\n      "locked": false,\n      "opacity": 1,\n      "fills": [{ "color": "#FF0000" }],\n      "strokes": []\n    }\n  }\n}\n',
  v5: '{\n  "version": 5,\n  "name": "Landing page",\n  "top": ["frame-1", "rect-9"],\n  "nodes": {\n    "frame-1": {\n      "children": ["text-2", "text-3", "group-4", "ellipse-7", "line-8"],\n      "clip": true,\n      "fills": [\n        {\n          "color": "#F4F1EA"\n        }\n      ],\n      "height": 640,\n      "id": "frame-1",\n      "locked": false,\n      "name": "Hero",\n      "opacity": 1,\n      "parent": null,\n      "rotation": 0,\n      "strokes": [],\n      "type": "frame",\n      "visible": true,\n      "width": 1200,\n      "x": 0,\n      "y": 0\n    },\n    "text-2": {\n      "align": "left",\n      "fills": [\n        {\n          "color": "#000000"\n        }\n      ],\n      "fontSize": 48,\n      "height": 60,\n      "id": "text-2",\n      "lineHeight": 1.2,\n      "locked": false,\n      "name": "Headline",\n      "opacity": 1,\n      "parent": "frame-1",\n      "rotation": 0,\n      "strokes": [],\n      "text": "Make something people want",\n      "type": "text",\n      "visible": true,\n      "width": 640,\n      "x": 80,\n      "y": 120\n    },\n    "text-3": {\n      "align": "left",\n      "fills": [\n        {\n          "color": "#000000"\n        }\n      ],\n      "fontSize": 20,\n      "height": 48,\n      "id": "text-3",\n      "lineHeight": 1.25,\n      "locked": false,\n      "name": "Subhead",\n      "opacity": 1,\n      "parent": "frame-1",\n      "rotation": 0,\n      "strokes": [],\n      "text": "A short line under the headline.",\n      "type": "text",\n      "visible": true,\n      "width": 520,\n      "x": 80,\n      "y": 200\n    },\n    "group-4": {\n      "children": ["rect-5", "rect-6"],\n      "height": 48,\n      "id": "group-4",\n      "locked": false,\n      "name": "Buttons",\n      "opacity": 0.9,\n      "parent": "frame-1",\n      "rotation": 0,\n      "type": "group",\n      "visible": true,\n      "width": 340,\n      "x": 80,\n      "y": 300\n    },\n    "rect-5": {\n      "fills": [\n        {\n          "color": "#1F4FFF"\n        }\n      ],\n      "height": 48,\n      "id": "rect-5",\n      "locked": false,\n      "name": "Primary",\n      "opacity": 1,\n      "parent": "group-4",\n      "rotation": 0,\n      "strokes": [],\n      "type": "rect",\n      "visible": true,\n      "width": 160,\n      "x": 80,\n      "y": 300\n    },\n    "rect-6": {\n      "fills": [\n        {\n          "color": "#FFFFFF"\n        }\n      ],\n      "height": 48,\n      "id": "rect-6",\n      "locked": false,\n      "name": "Secondary",\n      "opacity": 1,\n      "parent": "group-4",\n      "rotation": 0,\n      "strokes": [\n        {\n          "color": "#1F4FFF",\n          "width": 2,\n          "align": "inside"\n        }\n      ],\n      "type": "rect",\n      "visible": true,\n      "width": 160,\n      "x": 260,\n      "y": 300\n    },\n    "ellipse-7": {\n      "fills": [\n        {\n          "color": "#FFB340"\n        }\n      ],\n      "height": 300,\n      "id": "ellipse-7",\n      "locked": false,\n      "name": "Blob",\n      "opacity": 0.6,\n      "parent": "frame-1",\n      "rotation": 0.5235987755982988,\n      "strokes": [],\n      "type": "ellipse",\n      "visible": true,\n      "width": 300,\n      "x": 820,\n      "y": 140\n    },\n    "line-8": {\n      "fills": [],\n      "height": 0,\n      "id": "line-8",\n      "locked": true,\n      "name": "Divider",\n      "opacity": 1,\n      "parent": "frame-1",\n      "rotation": 0,\n      "strokes": [\n        {\n          "color": "#000000",\n          "width": 1,\n          "align": "center"\n        }\n      ],\n      "type": "line",\n      "visible": true,\n      "width": 1040,\n      "x": 80,\n      "y": 400\n    },\n    "rect-9": {\n      "fills": [\n        {\n          "color": "#D9D9D9"\n        }\n      ],\n      "height": 80,\n      "id": "rect-9",\n      "locked": false,\n      "name": "Hidden note",\n      "opacity": 1,\n      "parent": null,\n      "rotation": 0,\n      "strokes": [],\n      "type": "rect",\n      "visible": false,\n      "width": 200,\n      "x": 0,\n      "y": 700\n    }\n  }\n}\n',
};

type Editor = ReturnType<typeof createEditor>;
const frames = (e: Editor) =>
  e.doc
    .all()
    .filter((n) => n.type === 'frame')
    .map((n) => n.id);

function oneFrame() {
  const e = createEditor();
  const f = e.create('frame', { name: 'Board', width: 400, height: 300 });
  e.selection.set([f]);
  return { e, f };
}

test('a new frame shows its layout grid as Off', () => {
  const { e } = oneFrame();
  assert.equal(e.panel.value('Layout grid'), 'Off');
});

test('typing a size shows the grid; off or 0 hides it', () => {
  const { e } = oneFrame();
  assert.ok(e.panel.edit('Layout grid', '8').ok);
  assert.equal(e.panel.value('Layout grid'), '8');
  e.panel.edit('Layout grid', 'off');
  assert.equal(e.panel.value('Layout grid'), 'Off');
  e.panel.edit('Layout grid', '12');
  assert.equal(e.panel.value('Layout grid'), '12');
  e.panel.edit('Layout grid', '0');
  assert.equal(e.panel.value('Layout grid'), 'Off');
});

test('undo puts the grid back as it was', () => {
  const { e } = oneFrame();
  e.panel.edit('Layout grid', '8');
  e.panel.edit('Layout grid', '16');
  e.history.undo();
  assert.equal(e.panel.value('Layout grid'), '8');
  e.history.undo();
  assert.equal(e.panel.value('Layout grid'), 'Off');
});

test('only frames have the field', () => {
  const e = createEditor();
  const r = e.create('rect');
  const t = e.create('text');
  const g = e.create('group');
  e.create('rect', {}, { parent: g });
  for (const id of [r, t, g]) {
    e.selection.set([id]);
    assert.equal(e.panel.value('Layout grid'), undefined);
  }
});

test('frames with different grids show Mixed', () => {
  const e = createEditor();
  const a = e.create('frame');
  const b = e.create('frame');
  e.selection.set([a]);
  e.panel.edit('Layout grid', '8');
  e.selection.set([b]);
  e.panel.edit('Layout grid', '12');
  e.selection.set([a, b]);
  assert.equal(e.panel.value('Layout grid'), 'Mixed');
  e.panel.edit('Layout grid', '4');
  assert.equal(e.panel.value('Layout grid'), '4');
});

test('the grid is saved with the document', () => {
  const { e } = oneFrame();
  e.panel.edit('Layout grid', '8');
  const other = createEditor();
  other.files.load(e.files.save());
  other.selection.set(frames(other));
  assert.equal(other.panel.value('Layout grid'), '8');
});

for (const [version, text] of Object.entries(OLD_FILES))
  test(`a ${version} file opens with the grid off, and the grid can then be set`, () => {
    const e = createEditor();
    e.files.load(text);
    const ids = frames(e);
    assert.ok(ids.length > 0);
    e.selection.set(ids);
    assert.equal(e.panel.value('Layout grid'), 'Off');
    assert.ok(e.panel.edit('Layout grid', '10').ok);
    const other = createEditor();
    other.files.load(e.files.save());
    other.selection.set(frames(other));
    assert.equal(other.panel.value('Layout grid'), '10');
  });
