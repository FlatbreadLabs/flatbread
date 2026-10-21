// The Tessera history, commit by commit. Generated from the authoring
// notes; gen-bed.mjs walks it back from the tip tree in spec/app/.
//
// Each commit has a fixed author, time (UTC) and message. `add` lists the
// files that first appear in it; `change` maps a path to its edits as
// [earlier text, later text] pairs, applied in order, or to
// { before: <file in spec/versions> } when the whole earlier file is given.
// A file's content when it is added is its tip content with every later
// change undone.

export const EMAIL_DOMAIN = 'tessera.example';

export const PEOPLE = {
  ines: { name: 'Ines Okafor', login: 'ines.okafor' },
  tomas: { name: 'Tomas Lindqvist', login: 'tomas.lindqvist' },
  priya: { name: 'Priya Raman', login: 'priya.raman' },
  mateo: { name: 'Mateo Alves', login: 'mateo.alves' },
  ren: { name: 'Ren Ito', login: 'ren.ito' },
};

export const COMMITS = [
  {
    key: 'c01',
    at: '2026-02-02T09:30:00Z',
    author: 'ines',
    subject: 'Start Tessera core with small utilities',
    body: 'Ids, a typed emitter, assertions and a few numeric helpers. Tessera core has no dependencies and runs on Node 22 with type stripping.',
    add: [
      '.gitignore',
      'AGENTS.md',
      'README.md',
      'src/util/assert.ts',
      'src/util/emitter.ts',
      'src/util/ids.ts',
      'src/util/math.ts',
    ],
  },
  {
    key: 'c02',
    at: '2026-02-03T10:15:00Z',
    author: 'ines',
    subject: 'Add the document model and node factory',
    body: 'Frames, rectangles, ellipses, lines, text and groups in one tree. Document is the only thing that writes nodes.',
    add: [
      'src/model/types.ts',
      'src/model/document.ts',
      'src/model/geometry.ts',
      'src/model/transform.ts',
      'src/model/factory.ts',
      'src/model/style.ts',
      'src/model/tree.ts',
      'test/model.test.ts',
    ],
  },
  {
    key: 'c03',
    at: '2026-02-04T11:00:00Z',
    author: 'ines',
    subject: 'Add node queries',
    add: ['src/model/query.ts'],
    change: {
      'test/model.test.ts': [
        [
          '  assert.equal(commonParent(doc, [r1, frame]), null);\n});\n\n',
          "  assert.equal(commonParent(doc, [r1, frame]), null);\n});\n\ntest('queries walk in paint order and skip hidden subtrees', () => {\n  const { doc, frame, r1 } = setup();\n  assert.equal(byType(doc, 'rect').length, 2);\n  assert.equal(findByName(doc, doc.require(r1).name)?.id, r1);\n  doc.update(frame, { visible: false });\n  assert.equal(visibleNodes(doc).length, 0);\n});\n\n",
        ],
        [
          "} from '../src/model/tree.ts';\n",
          "} from '../src/model/tree.ts';\nimport { byType, findByName, visibleNodes } from '../src/model/query.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c04',
    at: '2026-02-05T14:00:00Z',
    author: 'ines',
    subject: 'Measure and wrap text with a fixed glyph advance',
    add: ['src/model/text.ts', 'test/style.test.ts'],
  },
  {
    key: 'c05',
    at: '2026-02-06T10:00:00Z',
    author: 'priya',
    subject: 'Add units, legacy length parsing and display precision',
    body: 'Lengths are px numbers everywhere. The registry converts typed units; precision.ts decides how many digits a field shows.',
    add: [
      'src/units/registry.ts',
      'src/units/parse.ts',
      'src/units/precision.ts',
      'src/units/format.ts',
      'test/units.test.ts',
      'test/precision.test.ts',
    ],
  },
  {
    key: 'c06',
    at: '2026-02-09T09:45:00Z',
    author: 'mateo',
    subject: 'Add the selection set and selection rules',
    add: ['src/selection/selection.ts', 'src/selection/rules.ts'],
  },
  {
    key: 'c07',
    at: '2026-02-10T10:30:00Z',
    author: 'tomas',
    subject: 'Add the command bus with undo and redo',
    body: 'Every change to the document is a command. The bus applies it, keeps the inverse, and records an entry in history.',
    add: [
      'src/commands/types.ts',
      'src/commands/registry.ts',
      'src/commands/bus.ts',
      'src/commands/history.ts',
      'src/commands/coalesce.ts',
      'src/commands/batch.ts',
      'src/commands/builtin/delete.ts',
      'src/commands/builtin/move.ts',
      'src/commands/builtin/set-prop.ts',
      'src/editor.ts',
      'test/helpers.ts',
      'test/history.test.ts',
    ],
    change: {
      'AGENTS.md': [
        [
          '- Run the tests with `node --experimental-strip-types --test`.\n',
          '- Run the tests with `node --experimental-strip-types --test`.\n- Every change to the document goes through a command on the bus\n  (`src/commands/`), so it can be undone.\n',
        ],
      ],
    },
  },
  {
    key: 'c08',
    at: '2026-02-11T15:00:00Z',
    author: 'tomas',
    subject: 'Add reorder, rename, visibility and lock commands',
    add: [
      'src/commands/builtin/reorder.ts',
      'src/commands/builtin/rename.ts',
      'src/commands/builtin/visibility.ts',
      'src/commands/builtin/lock.ts',
    ],
    change: {
      'src/commands/registry.ts': [
        ['    setPropHandler,\n', '    setPropHandler,\n    lockHandler,\n'],
        [
          '    setPropHandler,\n',
          '    setPropHandler,\n    visibilityHandler,\n',
        ],
        ['    setPropHandler,\n', '    setPropHandler,\n    renameHandler,\n'],
        ['    setPropHandler,\n', '    setPropHandler,\n    reorderHandler,\n'],
        [
          "import { setPropHandler } from './builtin/set-prop.ts';\n",
          "import { setPropHandler } from './builtin/set-prop.ts';\nimport { lockHandler } from './builtin/lock.ts';\n",
        ],
        [
          "import { setPropHandler } from './builtin/set-prop.ts';\n",
          "import { setPropHandler } from './builtin/set-prop.ts';\nimport { visibilityHandler } from './builtin/visibility.ts';\n",
        ],
        [
          "import { setPropHandler } from './builtin/set-prop.ts';\n",
          "import { setPropHandler } from './builtin/set-prop.ts';\nimport { renameHandler } from './builtin/rename.ts';\n",
        ],
        [
          "import { setPropHandler } from './builtin/set-prop.ts';\n",
          "import { setPropHandler } from './builtin/set-prop.ts';\nimport { reorderHandler } from './builtin/reorder.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c09',
    at: '2026-02-12T11:20:00Z',
    author: 'tomas',
    subject: 'Add the command palette',
    add: [
      'src/commands/palette.ts',
      'test/commands.test.ts',
      'test/palette.test.ts',
    ],
    change: {
      'src/editor.ts': [
        [
          '      on: bus.events.on.bind(bus.events),\n    },\n',
          '      on: bus.events.on.bind(bus.events),\n    },\n    palette: {\n      run: (title: string, input?: string) => palette.run(title, input),\n      list: () => palette.list(),\n      has: (title: string) => palette.has(title),\n    },\n',
        ],
        [
          '  const bus = new CommandBus(doc, selection, registry, history, options.clock);\n\n',
          '  const bus = new CommandBus(doc, selection, registry, history, options.clock);\n\n  const ctx: EditorContext = {\n    doc,\n    selection,\n    ids,\n    dispatch: (c: Command, o?: DispatchOptions) => bus.dispatch(c, o),\n    batch: (label: string, run: () => void) => batch(bus, label, run),\n    undo: () => bus.undo(),\n    redo: () => bus.redo(),\n  };\n\n  const palette = createPalette(ctx);\n',
        ],
        [
          "import type { Command, DispatchOptions } from './commands/types.ts';\n",
          "import type {\n  Command,\n  DispatchOptions,\n  EditorContext,\n} from './commands/types.ts';\n",
        ],
        [
          "import { batch } from './commands/batch.ts';\n",
          "import { batch } from './commands/batch.ts';\nimport { createPalette } from './commands/palette.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c10',
    at: '2026-02-13T16:00:00Z',
    author: 'tomas',
    subject: 'Add Group selection',
    add: ['src/commands/builtin/group.ts', 'test/group.test.ts'],
    change: {
      'src/commands/palette.ts': [
        [
          '        select: [],\n      });\n    },\n  },\n',
          "        select: [],\n      });\n    },\n  },\n  {\n    title: 'Group selection',\n    hint: 'Mod+G',\n    enabled: hasSelection,\n    run: (ctx) => void groupNodes(ctx, ctx.selection.ids()),\n  },\n",
        ],
        [
          "import { command } from './types.ts';\n",
          "import { command } from './types.ts';\nimport { groupNodes } from './builtin/group.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c11',
    at: '2026-02-16T10:00:00Z',
    author: 'ines',
    subject: "Keep an empty group's bounds when its last child leaves",
    body: 'An empty group used to jump to 0,0 with no size, which made it impossible to find in the layers panel. Adds geometry tests.',
    add: ['test/geometry.test.ts'],
    change: {
      'src/model/geometry.ts': [
        [
          '/** The bounds a group takes from its children. */\nexport function fitGroup(children: readonly SceneNode[], group: Rect): Rect {\n  if (!children.length) return { ...EMPTY_RECT };\n',
          '/** The bounds a group takes from its children; an empty group keeps its own. */\nexport function fitGroup(children: readonly SceneNode[], group: Rect): Rect {\n  if (!children.length) return rectOf(group);\n',
        ],
      ],
    },
  },
  {
    key: 'c12',
    at: '2026-02-17T13:30:00Z',
    author: 'mateo',
    subject: 'Add hit testing and selection bounds',
    add: [
      'src/selection/hit.ts',
      'src/selection/bounds.ts',
      'test/selection.test.ts',
    ],
  },
  {
    key: 'c13',
    at: '2026-02-18T10:00:00Z',
    author: 'priya',
    subject: 'Add the properties panel with position and size fields',
    body: 'X, Y, W and H for the selection, built from field descriptors so each section stays small.',
    add: [
      'src/panel/schema.ts',
      'src/panel/mixed.ts',
      'src/panel/fields.ts',
      'src/panel/commit.ts',
      'src/panel/properties.ts',
      'src/panel/sections/layout.ts',
      'src/commands/builtin/resize.ts',
      'test/panel.test.ts',
    ],
    change: {
      'src/commands/registry.ts': [
        ['    moveHandler,\n', '    moveHandler,\n    resizeHandler,\n'],
        [
          "import { moveHandler } from './builtin/move.ts';\n",
          "import { moveHandler } from './builtin/move.ts';\nimport { resizeHandler } from './builtin/resize.ts';\n",
        ],
      ],
      'src/editor.ts': [
        [
          '      on: bus.events.on.bind(bus.events),\n    },\n',
          '      on: bus.events.on.bind(bus.events),\n    },\n    panel,\n',
        ],
        [
          '  const palette = createPalette(ctx);\n',
          '  const palette = createPalette(ctx);\n  const panel = new PropertiesPanel(ctx);\n',
        ],
        [
          "import { createPalette } from './commands/palette.ts';\n",
          "import { createPalette } from './commands/palette.ts';\nimport { PropertiesPanel } from './panel/properties.ts';\n",
        ],
      ],
      'test/precision.test.ts': [
        [
          '});\n',
          "});\n\ntest('stored geometry is never rounded: ten moves of 0.1 add up to 1', () => {\n  const e = editor();\n  const id = e.create('rect', { x: 0 });\n  e.selection.set([id]);\n  for (let i = 0; i < 10; i++)\n    e.commands.dispatch({\n      type: 'move',\n      payload: { ids: [id], dx: 0.1, dy: 0 },\n    });\n  assert.ok(Math.abs(e.doc.require(id).x - 1) < 1e-9);\n  assert.equal(e.panel.value('X'), '1');\n});\n\ntest('typing a value with more digits than the field shows keeps them', () => {\n  const e = editor();\n  const id = e.create('rect', { x: 0 });\n  e.selection.set([id]);\n  e.panel.edit('X', '10.123456');\n  assert.equal(e.doc.require(id).x, 10.123456);\n  assert.equal(e.panel.value('X'), '10.12');\n});\n",
        ],
        [
          "import { displayNumber } from '../src/units/precision.ts';\n",
          "import { displayNumber } from '../src/units/precision.ts';\nimport { editor } from './helpers.ts';\n",
        ],
      ],
      'test/group.test.ts': [
        [
          "  assert.equal(e.palette.run('Group selection'), false);\n});\n",
          "  assert.equal(e.palette.run('Group selection'), false);\n});\n\ntest('moving a group moves its children', () => {\n  const { e, a, b } = threeRects();\n  e.selection.set([a, b]);\n  e.palette.run('Group selection');\n  e.panel.edit('X', '10');\n  assert.equal(e.doc.require(a).x, 10);\n  assert.equal(e.doc.require(b).x, 110);\n});\n",
        ],
      ],
    },
  },
  {
    key: 'c14',
    at: '2026-02-19T11:30:00Z',
    author: 'priya',
    subject: 'Add fill, stroke and appearance sections',
    add: [
      'src/panel/sections/fill.ts',
      'src/panel/sections/stroke.ts',
      'src/panel/sections/appearance.ts',
    ],
    change: {
      'src/panel/properties.ts': [
        [
          'export const DEFAULT_SECTIONS: readonly SectionDescriptor[] = [layoutSection];\n',
          'export const DEFAULT_SECTIONS: readonly SectionDescriptor[] = [\n  layoutSection,\n  appearanceSection,\n  fillSection,\n  strokeSection,\n];\n',
        ],
        [
          "import { layoutSection } from './sections/layout.ts';\n",
          "import { layoutSection } from './sections/layout.ts';\nimport { appearanceSection } from './sections/appearance.ts';\n",
        ],
        [
          "import { layoutSection } from './sections/layout.ts';\n",
          "import { layoutSection } from './sections/layout.ts';\nimport { strokeSection } from './sections/stroke.ts';\n",
        ],
        [
          "import { layoutSection } from './sections/layout.ts';\n",
          "import { layoutSection } from './sections/layout.ts';\nimport { fillSection } from './sections/fill.ts';\n",
        ],
      ],
      'test/panel.test.ts': [
        [
          '  assert.equal(e.history.size, 0);\n});\n\n',
          "  assert.equal(e.history.size, 0);\n});\n\ntest('fill takes #rrggbb and shows upper case', () => {\n  const { e, a } = threeRects();\n  e.selection.set([a]);\n  e.panel.edit('Fill', '#ff8800');\n  assert.equal(e.panel.value('Fill'), '#FF8800');\n  assert.equal(e.panel.edit('Fill', 'orange').ok, false);\n});\n\n",
        ],
        [
          '  assert.equal(e.history.size, 0);\n});\n\n',
          "  assert.equal(e.history.size, 0);\n});\n\ntest('opacity on a group sets it on the group’s children', () => {\n  const e = editor();\n  const g = e.create('group');\n  const r1 = e.create('rect', { opacity: 0.5 }, { parent: g });\n  const r2 = e.create('ellipse', {}, { parent: g });\n  e.selection.set([g]);\n  e.panel.edit('Opacity', '30%');\n  assert.equal(e.doc.require(r1).opacity, 0.3);\n  assert.equal(e.doc.require(r2).opacity, 0.3);\n  assert.equal(e.panel.value('Opacity'), '30%');\n});\n\n",
        ],
        [
          '  assert.equal(e.history.size, 0);\n});\n\n',
          "  assert.equal(e.history.size, 0);\n});\n\ntest('opacity is a percentage, clamped', () => {\n  const { e, a } = threeRects();\n  e.selection.set([a]);\n  e.panel.edit('Opacity', '40%');\n  assert.equal(e.doc.require(a).opacity, 0.4);\n  e.panel.edit('Opacity', '150');\n  assert.equal(e.panel.value('Opacity'), '100%');\n});\n\n",
        ],
      ],
      'test/style.test.ts': [
        [
          "  assert.deepEqual(withFillColor([], '#FF0000'), [{ color: '#FF0000' }]);\n});\n\n",
          "  assert.deepEqual(withFillColor([], '#FF0000'), [{ color: '#FF0000' }]);\n});\n\ntest('frames multiply into their children too', () => {\n  const e = editor();\n  const f = e.create('frame', { opacity: 0.8 });\n  const r = e.create('rect', {}, { parent: f });\n  assert.ok(Math.abs(effectiveOpacity(e.doc, r) - 0.8) < 1e-12);\n});\n\n",
        ],
        [
          "  assert.deepEqual(withFillColor([], '#FF0000'), [{ color: '#FF0000' }]);\n});\n\n",
          "  assert.deepEqual(withFillColor([], '#FF0000'), [{ color: '#FF0000' }]);\n});\n\ntest('groups carry no opacity; frames multiply into their children', () => {\n  const e = editor();\n  const g = e.create('group');\n  const r = e.create('rect', { opacity: 0.5 }, { parent: g });\n  assert.equal(effectiveOpacity(e.doc, r), 0.5);\n  assert.ok(!('opacity' in e.doc.require(g)));\n});\n\n",
        ],
        [
          "import { parseColor, withFillColor, withStroke } from '../src/model/style.ts';\n",
          "import {\n  effectiveOpacity,\n  parseColor,\n  withFillColor,\n  withStroke,\n} from '../src/model/style.ts';\n",
        ],
        [
          "import { autoHeight, lineCount, wrapLines } from '../src/model/text.ts';\n",
          "import { autoHeight, lineCount, wrapLines } from '../src/model/text.ts';\nimport { editor } from './helpers.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c15',
    at: '2026-02-20T15:00:00Z',
    author: 'priya',
    subject: 'Add the text section',
    add: ['src/panel/sections/text.ts'],
    change: {
      'src/panel/properties.ts': [
        ['  strokeSection,\n', '  strokeSection,\n  textSection,\n'],
        [
          "import { strokeSection } from './sections/stroke.ts';\n",
          "import { strokeSection } from './sections/stroke.ts';\nimport { textSection } from './sections/text.ts';\n",
        ],
      ],
      'test/panel.test.ts': [
        [
          "  assert.equal(e.panel.edit('Fill', 'orange').ok, false);\n});\n\n",
          "  assert.equal(e.panel.edit('Fill', 'orange').ok, false);\n});\n\ntest('editing text resizes the box to fit', () => {\n  const e = editor();\n  const t = e.create('text', {\n    text: 'a',\n    width: 9.6 * 5,\n    fontSize: 16,\n    lineHeight: 1,\n  });\n  e.selection.set([t]);\n  e.panel.edit('Text', 'aaaa bbbb cccc');\n  assert.equal(e.doc.require(t).height, 48);\n  e.panel.edit('Font size', '8');\n  assert.equal(e.doc.require(t).height, 16);\n});\n\n",
        ],
        [
          '  assert.deepEqual(e.panel.view(), { count: 0, sections: [] });\n});\n\n',
          "  assert.deepEqual(e.panel.view(), { count: 0, sections: [] });\n});\n\ntest('sections follow the selected node types', () => {\n  const e = editor();\n  const t = e.create('text', { text: 'Hello' });\n  e.selection.set([t]);\n  const names = e.panel.view().sections.map((s) => s.name);\n  assert.deepEqual(names, ['layout', 'appearance', 'fill', 'stroke', 'text']);\n  const g = e.create('group');\n  e.create('rect', {}, { parent: g });\n  e.selection.set([g]);\n  assert.deepEqual(\n    e.panel.view().sections.map((s) => s.name),\n    ['layout', 'appearance']\n  );\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c16',
    at: '2026-02-23T10:30:00Z',
    author: 'ines',
    subject: 'Break wrapped text at newlines',
    change: {
      'src/model/text.ts': [
        [
          "  const out: string[] = [];\n  let line = '';\n  for (const word of text.split(' ')) {\n    let rest = word;\n    while (rest.length > perLine) {\n      if (line) {\n        out.push(line);\n        line = '';\n      }\n      out.push(rest.slice(0, perLine));\n      rest = rest.slice(perLine);\n    }\n    const candidate = line ? `${line} ${rest}` : rest;\n    if (candidate.length > perLine) {\n      out.push(line);\n      line = rest;\n    } else line = candidate;\n  }\n  out.push(line);\n  return out;",
          "  const out: string[] = [];\n  for (const paragraph of text.split('\\n')) {\n    let line = '';\n    for (const word of paragraph.split(' ')) {\n      let rest = word;\n      while (rest.length > perLine) {\n        if (line) {\n          out.push(line);\n          line = '';\n        }\n        out.push(rest.slice(0, perLine));\n        rest = rest.slice(perLine);\n      }\n      const candidate = line ? `${line} ${rest}` : rest;\n      if (candidate.length > perLine) {\n        out.push(line);\n        line = rest;\n      } else line = candidate;\n    }\n    out.push(line);\n  }\n  return out;",
        ],
        [
          '/**\n * Breaks `text` into lines no wider than `width`, at spaces where it can and\n * inside a word when one word is wider than the box.\n */',
          '/**\n * Breaks `text` into lines no wider than `width`, at spaces where it can and\n * inside a word when one word is wider than the box. Newlines always break.\n */',
        ],
      ],
      'test/style.test.ts': [
        [
          '  ]);\n',
          "  ]);\n  assert.deepEqual(wrapLines('one\\ntwo', 1000, 16), ['one', 'two']);\n",
        ],
      ],
    },
  },
  {
    key: 'c17',
    at: '2026-02-24T14:00:00Z',
    author: 'tomas',
    subject: 'Return copies from history entries()',
    body: 'A test that trimmed an entry it had read changed what undo would do.',
    change: {
      'src/commands/history.ts': [
        [
          '  /** Every undoable entry, oldest first. */\n  entries(): HistoryEntry[] {\n    return [...this.done];\n  }',
          '  /** Every undoable entry, oldest first, as copies. */\n  entries(): HistoryEntry[] {\n    return this.done.map((entry) => structuredClone(entry));\n  }',
        ],
      ],
      'test/history.test.ts': [
        [
          '  assert.equal(e.doc.require(id).x, 25);\n});\n\n',
          "  assert.equal(e.doc.require(id).x, 25);\n});\n\ntest('entries are copies', () => {\n  const { e, a } = threeRects();\n  e.commands.dispatch(move(a, 3));\n  const [entry] = e.history.entries();\n  assert.equal(entry.label, 'Move');\n  entry.commands.length = 0;\n  assert.equal(e.history.entries()[0].commands.length, 1);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c18',
    at: '2026-02-25T11:00:00Z',
    author: 'mateo',
    subject: 'Skip hidden and locked layers when hit testing',
    change: {
      'src/selection/hit.ts': [
        [
          "    if (node.type === 'group') continue;\n",
          "    if (node.type === 'group') continue;\n    if (!isInteractive(doc, id)) continue;\n",
        ],
        [
          "import { selectableTarget } from './rules.ts';\n\n/**\n * The frontmost node under `point`. Groups are never hit themselves, only\n * through a child.\n */",
          "import { isInteractive, selectableTarget } from './rules.ts';\n\n/**\n * The frontmost node under `point`. Hidden and locked nodes are never hit\n * or selected from the canvas, and neither is anything inside a hidden or\n * locked container. Groups are never hit themselves, only through a child.\n */",
        ],
      ],
      'src/selection/rules.ts': [
        [
          "import { ancestors, topmostOnly } from '../model/tree.ts';\n\n",
          "import { ancestors, topmostOnly } from '../model/tree.ts';\n\n/** A node can be hit or selected on the canvas when it and every ancestor are visible and unlocked. */\nexport function isInteractive(doc: Document, id: string): boolean {\n  const node = doc.require(id);\n  if (!node.visible || node.locked) return false;\n  return ancestors(doc, id).every((a) => a.visible && !a.locked);\n}\n\n",
        ],
      ],
      'src/commands/palette.ts': [
        [
          '        if (node.parent === null) ids.push(node.id);',
          '        if (node.parent === null && isInteractive(ctx.doc, node.id))\n          ids.push(node.id);',
        ],
        [
          "import { walk } from '../model/query.ts';\n",
          "import { walk } from '../model/query.ts';\nimport { isInteractive } from '../selection/rules.ts';\n",
        ],
      ],
      'test/selection.test.ts': [
        [
          '  assert.equal(hitNode(e.doc, { x: 500, y: 500 }), null);\n});\n\n',
          "  assert.equal(hitNode(e.doc, { x: 500, y: 500 }), null);\n});\n\ntest('hidden and locked nodes are never hit', () => {\n  const e = editor();\n  const back = e.create('rect', { x: 0, y: 0, width: 100, height: 100 });\n  const hidden = e.create('rect', {\n    x: 0,\n    y: 0,\n    width: 100,\n    height: 100,\n    visible: false,\n  });\n  assert.equal(hitNode(e.doc, { x: 10, y: 10 }), back);\n  e.doc.update(hidden, { visible: true, locked: true });\n  assert.equal(hitNode(e.doc, { x: 10, y: 10 }), back);\n});\n\ntest('nothing inside a hidden or locked container is hit', () => {\n  const e = editor();\n  const frame = e.create('frame', {\n    x: 0,\n    y: 0,\n    width: 200,\n    height: 200,\n    locked: true,\n  });\n  e.create('rect', { x: 10, y: 10, width: 20, height: 20 }, { parent: frame });\n  assert.equal(hitNode(e.doc, { x: 15, y: 15 }), null);\n});\n\n",
        ],
      ],
      'test/palette.test.ts': [
        [
          "  assert.ok(e.palette.has('Undo'));\n});\n\n",
          "  assert.ok(e.palette.has('Undo'));\n});\n\ntest('Select all skips locked and hidden layers', () => {\n  const { e, a, b, c } = threeRects();\n  e.doc.update(b, { locked: true });\n  e.doc.update(c, { visible: false });\n  e.palette.run('Select all');\n  assert.deepEqual(e.selection.ids(), [a]);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c19',
    at: '2026-02-26T16:30:00Z',
    author: 'priya',
    subject: 'Compare panel values by the text they show',
    change: {
      'src/panel/mixed.ts': [
        [
          '/** One value for many nodes, or mixed when any two differ. */\nexport function combine(\n  values: readonly FieldValue[],\n  format: (value: FieldValue) => string\n): Combined | null {\n  if (!values.length) return null;\n  return values.every((value) => value === values[0])\n    ? { mixed: false, value: values[0], text: format(values[0]) }\n    : { mixed: true, text: MIXED };\n}',
          '/**\n * One value for many nodes, or mixed. Values count as equal when they show\n * the same text, so 10 and 10.000001 are not mixed.\n */\nexport function combine(\n  values: readonly FieldValue[],\n  format: (value: FieldValue) => string\n): Combined | null {\n  if (!values.length) return null;\n  const texts = values.map(format);\n  return texts.every((text) => text === texts[0])\n    ? { mixed: false, value: values[0], text: texts[0] }\n    : { mixed: true, text: MIXED };\n}',
        ],
      ],
    },
  },
  {
    key: 'c20',
    at: '2026-02-27T10:00:00Z',
    author: 'priya',
    subject: 'Use one label for multi-layer field commits',
    change: {
      'src/panel/commit.ts': [
        [
          '      ctx.dispatch(c, { label: `Set ${field.label} on ${node.name}` });\n',
          '      ctx.dispatch(c, { label: `Set ${field.label}` });\n',
        ],
      ],
    },
  },
  {
    key: 'c21',
    at: '2026-03-02T10:00:00Z',
    author: 'mateo',
    subject: 'Add the layers panel',
    add: [
      'src/layers/tree-view.ts',
      'src/layers/layers.ts',
      'test/layers.test.ts',
    ],
    change: {
      'src/editor.ts': [
        ['    panel,\n', '    panel,\n    layers,\n'],
        [
          '  const panel = new PropertiesPanel(ctx);\n',
          '  const panel = new PropertiesPanel(ctx);\n  const layers = new LayersPanel(ctx);\n',
        ],
        [
          "import { PropertiesPanel } from './panel/properties.ts';\n",
          "import { PropertiesPanel } from './panel/properties.ts';\nimport { LayersPanel } from './layers/layers.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c22',
    at: '2026-03-03T14:00:00Z',
    author: 'mateo',
    subject: 'Drag and rename layers',
    add: ['src/layers/drag.ts', 'src/layers/rename.ts'],
    change: {
      'src/layers/layers.ts': [
        [
          '    this.anchor = id;\n  }\n',
          "    this.anchor = id;\n  }\n\n  rename(id: string, name: string): boolean {\n    const clean = normalizeLayerName(name);\n    if (clean === null || clean === this.ctx.doc.require(id).name) return false;\n    this.ctx.dispatch(command('rename', { id, name: clean }), {\n      label: 'Rename layer',\n    });\n    return true;\n  }\n\n  /** Drops `id` above, below or inside the row `target`. Returns false when it cannot. */\n  drag(id: string, target: string, position: DropPosition): boolean {\n    const placement = dropPlacement(this.ctx.doc, id, target, position);\n    if (!placement) return false;\n    this.ctx.dispatch(\n      command('reorder', {\n        id,\n        parent: placement.parent,\n        index: placement.index,\n      }),\n      {\n        label: 'Move layer',\n      }\n    );\n    if (position === 'inside') this.expanded.add(target);\n    return true;\n  }\n",
        ],
        [
          '/** The layers panel: rows, expand and collapse, selection. */',
          '/** The layers panel: rows, expand and collapse, selection, rename, drag. */',
        ],
        [
          "import { buildRows, rowIndex } from './tree-view.ts';\n",
          "import { buildRows, rowIndex } from './tree-view.ts';\nimport type { DropPosition } from './drag.ts';\nimport { dropPlacement } from './drag.ts';\nimport { normalizeLayerName } from './rename.ts';\n",
        ],
        [
          "import type { EditorContext } from '../commands/types.ts';\n",
          "import type { EditorContext } from '../commands/types.ts';\nimport { command } from '../commands/types.ts';\n",
        ],
      ],
      'test/layers.test.ts': [
        [
          '  assert.deepEqual(e.selection.ids(), [a, c]);\n});\n',
          "  assert.deepEqual(e.selection.ids(), [a, c]);\n});\n\ntest('rename trims and refuses blank names', () => {\n  const { e, a } = threeRects();\n  assert.ok(e.layers.rename(a, '  Hero   image '));\n  assert.equal(e.doc.require(a).name, 'Hero image');\n  assert.equal(e.layers.rename(a, '   '), false);\n  assert.equal(e.history.entries().at(-1)?.label, 'Rename layer');\n});\n\ntest('name helpers', () => {\n  assert.equal(normalizeLayerName('x'.repeat(80))?.length, 64);\n});\n",
        ],
        [
          "  assert.deepEqual(names(e), ['G']);\n});\n\n",
          "  assert.deepEqual(names(e), ['G']);\n});\n\ntest('dragging a row above another puts it behind', () => {\n  const { e, a, c } = threeRects();\n  assert.ok(e.layers.drag(c, a, 'above'));\n  assert.deepEqual(names(e), ['C', 'A', 'B']);\n  assert.equal(e.doc.children(null)[0], c);\n});\n\ntest('dragging a row below another puts it in front', () => {\n  const { e, a, b } = threeRects();\n  e.layers.drag(a, b, 'below');\n  assert.deepEqual(names(e), ['B', 'A', 'C']);\n});\n\ntest('dropping inside a container puts the row at its bottom', () => {\n  const e = editor();\n  const f = e.create('frame', { name: 'F' });\n  e.create('rect', { name: 'In' }, { parent: f });\n  const out = e.create('rect', { name: 'Out' });\n  e.layers.drag(out, f, 'inside');\n  assert.deepEqual(names(e), ['F', '  In', '  Out']);\n  e.history.undo();\n  assert.deepEqual(names(e), ['F', '  In', 'Out']);\n});\n\ntest('a container cannot be dropped inside itself', () => {\n  const e = editor();\n  const f = e.create('frame');\n  const inner = e.create('frame', {}, { parent: f });\n  assert.equal(e.layers.drag(f, inner, 'inside'), false);\n  assert.equal(e.history.size, 0);\n});\n\n",
        ],
        [
          "import assert from 'node:assert/strict';\n",
          "import assert from 'node:assert/strict';\nimport { normalizeLayerName } from '../src/layers/rename.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c23',
    at: '2026-03-04T10:00:00Z',
    author: 'ines',
    subject: "Save and load documents, migrating the prototype's formats",
    body: 'The prototype editor wrote versions 1 to 3. Tessera core writes version 4 and reads all four.',
    add: [
      'src/persist/schema.ts',
      'src/persist/serialize.ts',
      'src/persist/deserialize.ts',
      'src/persist/migrations/index.ts',
      'src/persist/migrations/v1-v2.ts',
      'src/persist/migrations/v2-v3.ts',
      'src/persist/migrations/v3-v4.ts',
      'test/persist.test.ts',
      'test/migrations.test.ts',
      'test/fixtures/v1.json',
    ],
    change: {
      'src/editor.ts': [
        [
          '      has: (title: string) => palette.has(title),\n    },\n',
          '      has: (title: string) => palette.has(title),\n    },\n    files,\n',
        ],
        [
          '  const layers = new LayersPanel(ctx);\n\n',
          '  const layers = new LayersPanel(ctx);\n\n  const files = {\n    /** The document as a file string. */\n    save: (): string => serializeDocument(doc),\n    load(text: string): void {\n      const data = parseFile(text);\n      selection.clear();\n      history.clear();\n      doc.replace(data);\n    },\n  };\n\n',
        ],
        [
          "import { LayersPanel } from './layers/layers.ts';\n",
          "import { LayersPanel } from './layers/layers.ts';\nimport { serializeDocument } from './persist/serialize.ts';\nimport { parseFile } from './persist/deserialize.ts';\n",
        ],
      ],
      'test/helpers.ts': [
        [
          '  return { e, a, b, c };\n}\n',
          "  return { e, a, b, c };\n}\n\nexport function fixture(name: string): string {\n  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');\n}\n",
        ],
        [
          "import type { Editor } from '../src/editor.ts';\n",
          "import type { Editor } from '../src/editor.ts';\nimport { readFileSync } from 'node:fs';\n",
        ],
      ],
    },
  },
  {
    key: 'c24',
    at: '2026-03-05T11:00:00Z',
    author: 'ines',
    subject: 'Refuse files written by a newer editor',
    change: {
      'src/persist/deserialize.ts': [
        [
          "import { withDefaults } from './schema.ts';\n",
          "import { SCHEMA_VERSION, withDefaults } from './schema.ts';\n",
        ],
        [
          "    fail('bad-file', 'the file has no schema version');\n",
          "    fail('bad-file', 'the file has no schema version');\n  if ((version as number) > SCHEMA_VERSION)\n    fail(\n      'newer-file',\n      `the file is version ${version}; this editor reads up to ${SCHEMA_VERSION}`\n    );\n",
        ],
      ],
      'test/persist.test.ts': [
        [
          '  assert.equal(e.history.size, 0);\n});\n',
          "  assert.equal(e.history.size, 0);\n});\n\ntest('a file from a newer editor is refused', () => {\n  assert.throws(\n    () =>\n      parseFile(\n        JSON.stringify({\n          version: SCHEMA_VERSION + 1,\n          name: 'x',\n          top: [],\n          nodes: {},\n        })\n      ),\n    /reads up to/\n  );\n  assert.throws(() => parseFile('{nope'), /not JSON/);\n  assert.throws(() => parseFile('{\"name\":\"x\"}'), /schema version/);\n});\n",
        ],
      ],
    },
  },
  {
    key: 'c25',
    at: '2026-03-06T15:30:00Z',
    author: 'priya',
    subject: 'Add the Rotation field',
    change: {
      'src/panel/sections/layout.ts': [
        [
          '            height: value as number,\n          }) as unknown as Json[],\n        }),\n      ],\n    }),\n',
          "            height: value as number,\n          }) as unknown as Json[],\n        }),\n      ],\n    }),\n    field({\n      label: 'Rotation',\n      kind: 'angle',\n      appliesTo: (node) => node.type !== 'group',\n      read: (node) => node.rotation,\n      write: (node, value) => [\n        command('set-prop', {\n          id: node.id,\n          key: 'rotation',\n          value: normalizeAngle(value as number),\n        }),\n      ],\n    }),\n",
        ],
        [
          "import type { SceneNode } from '../../model/types.ts';\n",
          "import type { SceneNode } from '../../model/types.ts';\nimport { normalizeAngle } from '../../model/transform.ts';\n",
        ],
      ],
      'src/panel/fields.ts': [
        [
          '      return displayNumber(value as number);\n',
          "      return displayNumber(value as number);\n    case 'angle':\n      return formatAngle(value as number);\n",
        ],
        [
          '      return toLength(text);\n',
          "      return toLength(text);\n    case 'angle':\n      return toLength(text.replace(/°\\s*$/, ''));\n",
        ],
        [
          "import { formatLength, formatPercent } from '../units/format.ts';\n",
          "import { formatAngle, formatLength, formatPercent } from '../units/format.ts';\n",
        ],
      ],
      'src/panel/schema.ts': [
        ["  | 'length'\n", "  | 'length'\n  | 'angle'\n"],
        [
          ' * - `length`: px, typed as digits with an optional px\n',
          ' * - `length`: px, typed as digits with an optional px\n * - `angle`: stored and typed in degrees, shown with a degree sign\n',
        ],
      ],
      'test/panel.test.ts': [
        [
          '  assert.equal(e.history.size, 0);\n});\n\n',
          "  assert.equal(e.history.size, 0);\n});\n\ntest('rotation is typed and shown in degrees', () => {\n  const { e, a } = threeRects();\n  e.selection.set([a]);\n  e.panel.edit('Rotation', '90');\n  assert.equal(e.doc.require(a).rotation, 90);\n  assert.equal(e.panel.value('Rotation'), '90°');\n  e.panel.edit('Rotation', '270°');\n  assert.equal(e.panel.value('Rotation'), '-90°');\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c26',
    at: '2026-03-09T10:00:00Z',
    author: 'tomas',
    subject: 'Add the nudge command',
    add: ['src/commands/builtin/nudge.ts'],
    change: {
      'src/commands/registry.ts': [
        ['    moveHandler,\n', '    moveHandler,\n    nudgeHandler,\n'],
        [
          "import { moveHandler } from './builtin/move.ts';\n",
          "import { moveHandler } from './builtin/move.ts';\nimport { nudgeHandler } from './builtin/nudge.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c27',
    at: '2026-03-10T11:00:00Z',
    author: 'mateo',
    subject: 'Add keyboard shortcuts with focus scopes',
    body: 'The canvas, the layers panel and the properties panel each get their own shortcuts; undo and redo work everywhere.',
    add: [
      'src/keys/chords.ts',
      'src/keys/scopes.ts',
      'src/keys/keymap.ts',
      'src/keys/dispatcher.ts',
      'test/keys.test.ts',
    ],
    change: {
      'src/editor.ts': [
        [
          '    layers,\n',
          '    layers,\n    keys: {\n      press: (chord: string) => keys.press(chord),\n      down: (chord: string, o?: { repeat?: boolean }) => keys.down(chord, o),\n      up: (chord: string) => keys.up(chord),\n      focus: (scope: Scope) => keys.focus.focus(scope),\n      get scope(): Scope {\n        return keys.focus.current;\n      },\n    },\n',
        ],
        [
          '  const layers = new LayersPanel(ctx);\n',
          '  const layers = new LayersPanel(ctx);\n  const keys = createDispatcher({ ...ctx, palette, layers });\n',
        ],
        [
          "import { LayersPanel } from './layers/layers.ts';\n",
          "import { LayersPanel } from './layers/layers.ts';\nimport { createDispatcher } from './keys/dispatcher.ts';\nimport type { Scope } from './keys/scopes.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c28',
    at: '2026-03-11T14:00:00Z',
    author: 'mateo',
    subject: 'Toggle lock with Mod+Shift+L',
    change: {
      'src/keys/keymap.ts': [
        [
          "    'Mod+A': 'select-all',\n    'Mod+G': 'group',\n",
          "    'Mod+A': 'select-all',\n    'Mod+G': 'group',\n    'Mod+Shift+L': 'toggle-lock',\n",
        ],
      ],
      'src/keys/dispatcher.ts': [
        [
          "  group: (ctx) => void ctx.palette.run('Group selection'),\n",
          "  group: (ctx) => void ctx.palette.run('Group selection'),\n  'toggle-lock': (ctx) => {\n    const ids = ctx.selection.ids();\n    if (!ids.length) return;\n    const lock = !ids.every((id) => ctx.doc.require(id).locked);\n    ctx.dispatch(command('set-lock', { items: lockItems(ids, lock) }), {\n      label: lock ? 'Lock' : 'Unlock',\n    });\n  },\n",
        ],
        [
          "import { nudgeDelta } from '../commands/builtin/nudge.ts';\n",
          "import { nudgeDelta } from '../commands/builtin/nudge.ts';\nimport { lockItems } from '../commands/builtin/lock.ts';\n",
        ],
      ],
      'test/keys.test.ts': [
        [
          '  assert.deepEqual(e.selection.ids(), []);\n});\n\n',
          "  assert.deepEqual(e.selection.ids(), []);\n});\n\ntest('Mod+Shift+L toggles lock', () => {\n  const { e, a } = threeRects();\n  e.selection.set([a]);\n  e.keys.press('Mod+Shift+L');\n  assert.equal(e.doc.require(a).locked, true);\n  e.keys.press('Mod+Shift+L');\n  assert.equal(e.doc.require(a).locked, false);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c29',
    at: '2026-03-12T10:30:00Z',
    author: 'ines',
    subject: 'Upper-case colours in the version 2 migration',
    body: 'Version 2 files from the prototype mix #ffffff and #FFFFFF. Everything else in core stores upper case.',
    change: {
      'src/persist/migrations/v2-v3.ts': [
        [
          '                color: String(stroke),\n',
          '                color: String(stroke).toUpperCase(),\n',
        ],
        [
          "      fills: typeof fill === 'string' ? [{ color: String(fill) }] : [],",
          "      fills:\n        typeof fill === 'string' ? [{ color: String(fill).toUpperCase() }] : [],",
        ],
      ],
      'test/migrations.test.ts': [
        [
          "  assert.deepEqual(rect.fills, [{ color: '#3366ff' }]);\n",
          "  assert.deepEqual(rect.fills, [{ color: '#3366FF' }]);\n",
        ],
      ],
    },
  },
  {
    key: 'c30',
    at: '2026-03-13T10:00:00Z',
    author: 'mateo',
    subject: 'Add the plugin host',
    add: [
      'src/plugin/api.ts',
      'src/plugin/host.ts',
      'src/plugin/events.ts',
      'src/plugin/capabilities.ts',
      'src/plugin/sandbox.ts',
      'docs/plugins.md',
      'test/plugin.test.ts',
    ],
    change: {
      'src/editor.ts': [
        [
          '      has: (title: string) => palette.has(title),\n    },\n',
          '      has: (title: string) => palette.has(title),\n    },\n    plugins: {\n      load: (manifest: PluginManifest) => plugins.load(manifest),\n      unload: (name: string) => plugins.unload(name),\n      loaded: () => plugins.loaded(),\n    },\n',
        ],
        [
          '  const keys = createDispatcher({ ...ctx, palette, layers });\n\n',
          "  const keys = createDispatcher({ ...ctx, palette, layers });\n\n  const plugins = new PluginHost({\n    selection: () => selection.ids(),\n    runCommand: (title) => palette.run(title),\n    listCommands: () => palette.list(),\n    shortcuts: () => DEFAULT_KEYMAP,\n    node: (id) => doc.get(id),\n  });\n  doc.events.on('change', ({ ids: changed }) =>\n    plugins.emit('documentchange', { ids: changed })\n  );\n  doc.events.on('load', ({ name }) => plugins.emit('documentload', { name }));\n  history.events.on('change', ({ canUndo, canRedo }) =>\n    plugins.emit('historychange', { canUndo, canRedo })\n  );\n\n",
        ],
        [
          "import { parseFile } from './persist/deserialize.ts';\n",
          "import { parseFile } from './persist/deserialize.ts';\nimport { PluginHost } from './plugin/host.ts';\nimport type { PluginManifest } from './plugin/api.ts';\n",
        ],
        [
          "import type { Scope } from './keys/scopes.ts';\n",
          "import type { Scope } from './keys/scopes.ts';\nimport { DEFAULT_KEYMAP } from './keys/keymap.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c31',
    at: '2026-03-16T11:00:00Z',
    author: 'mateo',
    subject: 'Catch errors thrown by plugin listeners',
    change: {
      'src/plugin/host.ts': [
        [
          '    for (const plugin of this.plugins.values())\n',
          '    for (const [name, plugin] of this.plugins)\n',
        ],
        [
          '      for (const listener of [...(plugin.listeners.get(event) ?? [])])\n        (listener as (p: PluginEvents[K]) => void)(payload);',
          '      for (const listener of [...(plugin.listeners.get(event) ?? [])])\n        this.sandbox.call(name, event, () =>\n          (listener as (p: PluginEvents[K]) => void)(payload)\n        );',
        ],
      ],
      'test/plugin.test.ts': [
        [
          '  ]);\n});\n',
          "  ]);\n});\n\ntest('a throwing plugin is contained and an unloaded one is cut off', () => {\n  const { e, a } = threeRects();\n  let api!: PluginApiV1;\n  e.plugins.load({\n    name: 'bad',\n    main(x) {\n      api = x;\n      x.on('documentchange', () => {\n        throw new Error('boom');\n      });\n    },\n  });\n  e.commands.dispatch({ type: 'move', payload: { ids: [a], dx: 1, dy: 0 } });\n  assert.ok(e.plugins.unload('bad'));\n  assert.throws(() => api.getSelection(), /unloaded/);\n  assert.deepEqual(e.plugins.loaded(), []);\n});\n",
        ],
      ],
    },
  },
  {
    key: 'c32',
    at: '2026-03-17T10:00:00Z',
    author: 'mateo',
    subject: 'Add canvas pointer gestures',
    body: 'Click to select, drag to move, the corner handles to resize and the handle above the selection to rotate.',
    add: [
      'src/canvas/viewport.ts',
      'src/canvas/handles.ts',
      'src/canvas/gestures.ts',
      'test/canvas.test.ts',
    ],
    change: {
      'src/model/geometry.ts': [
        [
          '  return unionRects(children.map(nodeBounds));\n}\n',
          '  return unionRects(children.map(nodeBounds));\n}\n\nexport function distance(a: Point, b: Point): number {\n  return Math.hypot(b.x - a.x, b.y - a.y);\n}\n',
        ],
      ],
      'src/editor.ts': [
        [
          '    files,\n',
          '    files,\n    canvas: {\n      down: (p: Point, m?: Modifiers) => canvas.down(p, m),\n      move: (p: Point, m?: Modifiers) => canvas.move(p, m),\n      up: (p: Point, m?: Modifiers) => canvas.up(p, m),\n      click: (p: Point, m?: Modifiers) => canvas.click(p, m),\n      drag: (from: Point, to: Point, m?: Modifiers) =>\n        canvas.dragPath(from, to, m),\n      get zoom() {\n        return viewport.zoom;\n      },\n      setZoom: (zoom: number) => viewport.setZoom(zoom),\n    },\n',
        ],
        [
          '  const keys = createDispatcher({ ...ctx, palette, layers });\n',
          '  const keys = createDispatcher({ ...ctx, palette, layers });\n  const viewport = new Viewport();\n  const canvas = new CanvasGestures(ctx, viewport);\n',
        ],
        [
          "import type { PluginManifest } from './plugin/api.ts';\n",
          "import type { PluginManifest } from './plugin/api.ts';\nimport { Viewport } from './canvas/viewport.ts';\nimport { CanvasGestures } from './canvas/gestures.ts';\nimport type { Modifiers } from './canvas/gestures.ts';\nimport type { Point } from './model/geometry.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c33',
    at: '2026-03-18T15:00:00Z',
    author: 'mateo',
    subject: 'Remove getNode from the plugin API',
    body: 'Events already carry ids, and getSelection() returns ids. Event payloads are now frozen as well.',
    change: {
      'src/plugin/api.ts': [
        [
          '  /** Ids of the selected layers. */\n  getSelection(): string[];\n  /** A layer by id. */\n  getNode(id: string): SceneNode | undefined;\n',
          '  /** Ids of the selected layers. */\n  getSelection(): string[];\n',
        ],
        [
          "import type { Keymap } from '../keys/keymap.ts';\nimport type { SceneNode } from '../model/types.ts';\nimport type { PluginEventName, PluginEvents } from './events.ts';\n",
          "import type { Keymap } from '../keys/keymap.ts';\nimport type { PluginEventName, PluginEvents } from './events.ts';\n",
        ],
      ],
      'src/plugin/host.ts': [
        [
          '      getSelection: guard(() => services.selection()),\n      getNode: guard((id: string) => services.node(id)),\n',
          '      getSelection: guard(() => services.selection()),\n',
        ],
        [
          '  shortcuts(): Keymap;\n  node(id: string): SceneNode | undefined;\n',
          '  shortcuts(): Keymap;\n',
        ],
        [
          "import type { Keymap } from '../keys/keymap.ts';\nimport type { SceneNode } from '../model/types.ts';\n",
          "import type { Keymap } from '../keys/keymap.ts';\n",
        ],
      ],
      'src/editor.ts': [
        [
          '    shortcuts: () => DEFAULT_KEYMAP,\n    node: (id) => doc.get(id),\n',
          '    shortcuts: () => DEFAULT_KEYMAP,\n',
        ],
        [
          "  doc.events.on('change', ({ ids: changed }) =>\n    plugins.emit('documentchange', { ids: changed })\n  );\n  doc.events.on('load', ({ name }) => plugins.emit('documentload', { name }));\n  history.events.on('change', ({ canUndo, canRedo }) =>\n    plugins.emit('historychange', { canUndo, canRedo })\n  );\n",
          "  doc.events.on('change', ({ ids: changed }) =>\n    plugins.emit(\n      'documentchange',\n      Object.freeze({ ids: Object.freeze([...changed]) })\n    )\n  );\n  doc.events.on('load', ({ name }) =>\n    plugins.emit('documentload', Object.freeze({ name }))\n  );\n  history.events.on('change', ({ canUndo, canRedo }) =>\n    plugins.emit('historychange', Object.freeze({ canUndo, canRedo }))\n  );\n",
        ],
      ],
      'docs/plugins.md': [
        [
          '| `getSelection()`    | the selected layer ids                                      |\n| `getNode(id)`       | the layer with that id                                      |\n',
          '| `getSelection()`    | the selected layer ids                                      |\n',
        ],
      ],
      'test/plugin.test.ts': [
        [
          "test('plugins read the selection and run palette commands', () => {\n  const { e, a, b } = threeRects();\n  const api = capture(e);\n  e.selection.set([a, b]);\n  assert.deepEqual(api.getSelection(), [a, b]);\n  assert.equal(api.getNode(a)?.name, 'A');\n",
          "test('plugins read the selection as ids and run palette commands', () => {\n  const { e, a, b } = threeRects();\n  const api = capture(e);\n  e.selection.set([a, b]);\n  assert.deepEqual(api.getSelection(), [a, b]);\n",
        ],
      ],
    },
  },
  {
    key: 'c34',
    at: '2026-03-19T11:00:00Z',
    author: 'mateo',
    subject: 'Add the export capability for plugins',
    change: {
      'src/plugin/capabilities.ts': [
        [
          '/** No capabilities exist yet; a manifest that asks for one is refused. */\nexport type Capability = never;\n\nexport const CAPABILITIES: readonly Capability[] = [];',
          "/** `export`: read the whole document as a saved file string. */\nexport type Capability = 'export';\n\nexport const CAPABILITIES: readonly Capability[] = ['export'];",
        ],
      ],
      'src/plugin/api.ts': [
        [
          '  shortcuts(): Keymap;\n',
          '  shortcuts(): Keymap;\n  /** Present only with the `export` capability. */\n  readonly export?: ExportCapability;\n',
        ],
        [
          "import type { PluginEventName, PluginEvents } from './events.ts';\n\n",
          "import type { PluginEventName, PluginEvents } from './events.ts';\n\nexport interface ExportCapability {\n  /** The document as `files.save()` writes it. */\n  document(): string;\n}\n\n",
        ],
      ],
      'src/plugin/host.ts': [
        [
          '      shortcuts: guard(() => services.shortcuts()),\n',
          '      shortcuts: guard(() => services.shortcuts()),\n      ...(exporter ? { export: exporter } : {}),\n',
        ],
        [
          '    const services = this.services;\n',
          '    const services = this.services;\n    const exporter: ExportCapability | undefined = canExport\n      ? Object.freeze({ document: guard(() => services.saveDocument()) })\n      : undefined;\n',
        ],
        [
          '  private createApi(plugin: Loaded): PluginApiV1 {\n',
          '  private createApi(plugin: Loaded, canExport: boolean): PluginApiV1 {\n',
        ],
        [
          '    const api = this.createApi(loaded);\n',
          "    const api = this.createApi(loaded, capabilities.includes('export'));\n",
        ],
        [
          '    checkCapabilities(manifest.capabilities);\n',
          '    const capabilities = checkCapabilities(manifest.capabilities);\n',
        ],
        [
          '  shortcuts(): Keymap;\n',
          '  shortcuts(): Keymap;\n  saveDocument(): string;\n',
        ],
        [
          "import type { PluginApiV1, PluginManifest } from './api.ts';\n",
          "import type { ExportCapability, PluginApiV1, PluginManifest } from './api.ts';\n",
        ],
      ],
      'src/editor.ts': [
        [
          '    shortcuts: () => DEFAULT_KEYMAP,\n',
          '    shortcuts: () => DEFAULT_KEYMAP,\n    saveDocument: () => serializeDocument(doc),\n',
        ],
      ],
      'docs/plugins.md': [
        [
          '## Capabilities\n\nNone yet. A manifest that asks for an unknown capability is refused.\n',
          '## Capabilities\n\n| Capability | Grants       |\n| ---------- | ------------ |\n| `export`   | `api.export` |\n',
        ],
        [
          '| `shortcuts()`       | the default shortcut table                                  |\n',
          '| `shortcuts()`       | the default shortcut table                                  |\n| `export.document()` | the document as a saved file (with the `export` capability) |\n',
        ],
        [
          "  name: 'counter',\n",
          "  name: 'counter',\n  capabilities: ['export'],\n",
        ],
      ],
      'test/plugin.test.ts': [
        [
          '}\n\n',
          "}\n\ntest('without the export capability there is no export', () => {\n  const { e } = threeRects();\n  const api = capture(e);\n  assert.equal(api.export, undefined);\n  assert.ok(!Object.keys(api).includes('export'));\n});\n\ntest('export returns the saved document', () => {\n  const { e } = threeRects();\n  const api = capture(e, ['export']);\n  assert.equal(api.export?.document(), e.files.save());\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c35',
    at: '2026-03-20T10:00:00Z',
    author: 'mateo',
    subject: 'Freeze plugin API v1',
    change: {
      'src/plugin/api.ts': [
        [
          '  readonly export?: ExportCapability;\n}\n\n',
          "  readonly export?: ExportCapability;\n}\n\nexport const PLUGIN_API_V1_SURFACE: readonly string[] = [\n  'export',\n  'getSelection',\n  'listCommands',\n  'name',\n  'off',\n  'on',\n  'runCommand',\n  'shortcuts',\n  'version',\n];\n\n",
        ],
        [
          "import type { Keymap } from '../keys/keymap.ts';",
          "// Plugin API v1. FROZEN: plugins in the wild depend on this exact surface.\n// Do not add, remove or rename members of PluginApiV1 or change what they\n// return; test/plugin.test.ts checks the surface. New abilities go in a v2.\n\nimport type { Keymap } from '../keys/keymap.ts';",
        ],
      ],
      'test/plugin.test.ts': [
        [
          '}\n\n',
          "}\n\ntest('plugin API v1 surface is frozen', () => {\n  const { e } = threeRects();\n  const api = capture(e, ['export']);\n  assert.deepEqual(Object.keys(api).sort(), [...PLUGIN_API_V1_SURFACE]);\n  assert.deepEqual(PLUGIN_API_V1_SURFACE, [\n    'export',\n    'getSelection',\n    'listCommands',\n    'name',\n    'off',\n    'on',\n    'runCommand',\n    'shortcuts',\n    'version',\n  ]);\n  assert.equal(api.version, 1);\n  assert.ok(Object.isFrozen(api));\n});\n\n",
        ],
        [
          "import assert from 'node:assert/strict';\n",
          "import assert from 'node:assert/strict';\nimport { PLUGIN_API_V1_SURFACE } from '../src/plugin/api.ts';\n",
        ],
      ],
      'docs/plugins.md': [
        ['## API v1\n\n', '## API v1\n\nPlugin API v1 is frozen.\n\n'],
      ],
    },
  },
  {
    key: 'c36',
    at: '2026-03-23T10:00:00Z',
    author: 'tomas',
    subject: 'Add bring forward, send backward, to front and to back',
    change: {
      'src/commands/palette.ts': [
        [
          '    run: (ctx) => void groupNodes(ctx, ctx.selection.ids()),\n  },\n',
          "    run: (ctx) => void groupNodes(ctx, ctx.selection.ids()),\n  },\n  arrange('Bring forward', 'forward', 'Mod+]'),\n  arrange('Send backward', 'backward', 'Mod+['),\n  arrange('Bring to front', 'front', 'Mod+Shift+]'),\n  arrange('Send to back', 'back', 'Mod+Shift+['),\n",
        ],
        [
          'const hasSelection = (ctx: EditorContext) => !ctx.selection.isEmpty();\n\n',
          'const hasSelection = (ctx: EditorContext) => !ctx.selection.isEmpty();\n\nfunction arrange(title: string, how: Arrange, hint: string): PaletteEntry {\n  return {\n    title,\n    hint,\n    enabled: hasSelection,\n    run(ctx) {\n      for (const c of arrangeCommands(ctx.doc, ctx.selection.ids(), how))\n        ctx.dispatch(c, { label: title });\n    },\n  };\n}\n\n',
        ],
        [
          "import { groupNodes } from './builtin/group.ts';\n",
          "import { groupNodes } from './builtin/group.ts';\nimport { arrangeCommands } from './builtin/reorder.ts';\nimport type { Arrange } from './builtin/reorder.ts';\n",
        ],
      ],
      'src/keys/keymap.ts': [
        [
          "    'Mod+A': 'select-all',\n    'Mod+G': 'group',\n",
          "    'Mod+A': 'select-all',\n    'Mod+G': 'group',\n    'Mod+]': 'bring-forward',\n    'Mod+[': 'send-backward',\n    'Mod+Shift+]': 'bring-to-front',\n    'Mod+Shift+[': 'send-to-back',\n",
        ],
      ],
      'src/keys/dispatcher.ts': [
        [
          "  group: (ctx) => void ctx.palette.run('Group selection'),\n",
          "  group: (ctx) => void ctx.palette.run('Group selection'),\n  'bring-forward': (ctx) => void ctx.palette.run('Bring forward'),\n  'send-backward': (ctx) => void ctx.palette.run('Send backward'),\n  'bring-to-front': (ctx) => void ctx.palette.run('Bring to front'),\n  'send-to-back': (ctx) => void ctx.palette.run('Send to back'),\n",
        ],
      ],
      'test/commands.test.ts': [
        [
          '  assert.deepEqual([...e.doc.children(null)], [a, b, c]);\n});\n\n',
          "  assert.deepEqual([...e.doc.children(null)], [a, b, c]);\n});\n\ntest('bring forward and send to back keep sibling order', () => {\n  const { e, a, b, c } = threeRects();\n  e.selection.set([a, b]);\n  e.palette.run('Bring forward');\n  assert.deepEqual([...e.doc.children(null)], [c, a, b]);\n  e.selection.set([b]);\n  e.palette.run('Send to back');\n  assert.deepEqual([...e.doc.children(null)], [b, c, a]);\n  e.selection.set([c]);\n  e.palette.run('Bring to front');\n  assert.deepEqual([...e.doc.children(null)], [b, a, c]);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c37',
    at: '2026-03-24T14:00:00Z',
    author: 'priya',
    subject: 'Clamp opacity when it is written',
    change: {
      'src/model/style.ts': [
        [
          '  );\n}\n\n',
          '  );\n}\n\nexport function clampOpacity(value: number): number {\n  return clamp(value, 0, 1);\n}\n\n',
        ],
        [
          "import { isStyled } from './types.ts';\n",
          "import { isStyled } from './types.ts';\nimport { clamp } from '../util/math.ts';\n",
        ],
      ],
      'src/panel/sections/appearance.ts': [
        [
          '            value: value as number,\n',
          '            value: clampOpacity(value as number),\n',
        ],
        [
          "import { command } from '../../commands/types.ts';\n",
          "import { command } from '../../commands/types.ts';\nimport { clampOpacity } from '../../model/style.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c38',
    at: '2026-03-25T11:00:00Z',
    author: 'ines',
    subject: 'Validate the document tree when loading',
    change: {
      'src/persist/schema.ts': [
        [
          '  return out as unknown as SceneNode;\n}\n',
          "  return out as unknown as SceneNode;\n}\n\n/** Throws a `bad-file` error unless the tree in `data` is consistent. */\nexport function validateDocument(data: DocumentData): void {\n  const bad = (message: string): never => fail('bad-file', message);\n  if (typeof data.name !== 'string') bad('the document has no name');\n  if (!Array.isArray(data.top)) bad('the document has no top-level list');\n  const seen = new Set<string>();\n  const visit = (id: string, parent: string | null) => {\n    const node = data.nodes[id];\n    if (!node) bad(`missing node ${id}`);\n    if (seen.has(id)) bad(`node ${id} appears twice`);\n    seen.add(id);\n    if (node.id !== id) bad(`node ${id} is stored as ${node.id}`);\n    if (!NODE_TYPES.includes(node.type))\n      bad(`node ${id} has unknown type ${String(node.type)}`);\n    if (node.parent !== parent) bad(`node ${id} names the wrong parent`);\n    for (const key of ['x', 'y', 'width', 'height', 'rotation'] as const)\n      if (typeof node[key] !== 'number' || !Number.isFinite(node[key]))\n        bad(`node ${id} has a bad ${key}`);\n    if (isContainer(node)) for (const child of node.children) visit(child, id);\n  };\n  for (const id of data.top) visit(id, null);\n  for (const id of Object.keys(data.nodes))\n    if (!seen.has(id)) bad(`node ${id} is not in the tree`);\n}\n",
        ],
        [
          "import type { DocumentData, SceneNode } from '../model/types.ts';\n",
          "import type { DocumentData, SceneNode } from '../model/types.ts';\nimport { NODE_TYPES, isContainer } from '../model/types.ts';\nimport { fail } from '../util/assert.ts';\n",
        ],
      ],
      'src/persist/deserialize.ts': [
        ['  };\n', '  };\n  validateDocument(data);\n'],
        [
          "import { SCHEMA_VERSION, withDefaults } from './schema.ts';\n",
          "import { SCHEMA_VERSION, validateDocument, withDefaults } from './schema.ts';\n",
        ],
      ],
      'test/persist.test.ts': [
        [
          '  assert.throws(() => parseFile(\'{"name":"x"}\'), /schema version/);\n});\n',
          "  assert.throws(() => parseFile('{\"name\":\"x\"}'), /schema version/);\n});\n\ntest('a broken tree is refused', () => {\n  const data = {\n    version: SCHEMA_VERSION,\n    name: 'x',\n    top: ['rect-1'],\n    nodes: {},\n  };\n  assert.throws(() => parseFile(JSON.stringify(data)), /missing node/);\n});\n",
        ],
      ],
    },
  },
  {
    key: 'c39',
    at: '2026-03-26T15:00:00Z',
    author: 'mateo',
    subject: 'Shift-click to add and remove layers on the canvas',
    change: {
      'src/canvas/gestures.ts': [
        [
          '  down(screen: Point, _mods: Modifiers = {}): void {\n',
          '  down(screen: Point, mods: Modifiers = {}): void {\n',
        ],
        [
          "    if (target === null) {\n      selection.clear();\n      this.drag = { kind: 'none' };\n      return;\n    }\n",
          "    if (target === null) {\n      if (!mods.shift) selection.clear();\n      this.drag = { kind: 'none' };\n      return;\n    }\n    if (mods.shift) {\n      selection.toggle(target);\n      this.drag = { kind: 'none' };\n      return;\n    }\n",
        ],
      ],
      'test/canvas.test.ts': [
        [
          '  e.canvas.click({ x: 500, y: 500 });\n  assert.deepEqual(e.selection.ids(), []);\n});\n\n',
          "  e.canvas.click({ x: 500, y: 500 });\n  assert.deepEqual(e.selection.ids(), []);\n});\n\ntest('shift-click adds and removes', () => {\n  const { e, a, c } = threeRects();\n  e.canvas.click({ x: 10, y: 10 });\n  e.canvas.click({ x: 210, y: 10 }, { shift: true });\n  assert.deepEqual(e.selection.ids(), [a, c]);\n  e.canvas.click({ x: 10, y: 10 }, { shift: true });\n  assert.deepEqual(e.selection.ids(), [c]);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c40',
    at: '2026-03-30T10:00:00Z',
    author: 'priya',
    subject: 'Add a stroke when Stroke width is set on a layer without one',
    change: {
      'src/model/style.ts': [
        [
          '  return strokes.map',
          "  if (!strokes.length)\n    return [{ color: '#000000', width: 1, align: 'inside', ...patch }];\n  return strokes.map",
        ],
      ],
      'test/style.test.ts': [
        [
          "  assert.deepEqual(withFillColor([], '#FF0000'), [{ color: '#FF0000' }]);\n});\n\n",
          "  assert.deepEqual(withFillColor([], '#FF0000'), [{ color: '#FF0000' }]);\n});\n\ntest('withStroke adds a default stroke when there is none', () => {\n  assert.deepEqual(withStroke([], { width: 3 }), [\n    { color: '#000000', width: 3, align: 'inside' },\n  ]);\n});\n\n",
        ],
      ],
      'test/panel.test.ts': [
        [
          "  assert.equal(e.panel.edit('Fill', 'orange').ok, false);\n});\n\n",
          "  assert.equal(e.panel.edit('Fill', 'orange').ok, false);\n});\n\ntest('stroke width adds a stroke when there is none', () => {\n  const { e, a } = threeRects();\n  e.selection.set([a]);\n  e.panel.edit('Stroke width', '2');\n  const node = e.doc.require(a);\n  assert.ok(node.type === 'rect');\n  assert.deepEqual(node.strokes, [\n    { color: '#000000', width: 2, align: 'inside' },\n  ]);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c41',
    at: '2026-04-01T10:00:00Z',
    author: 'ines',
    subject: 'Save zoom with the document',
    change: {
      'src/persist/serialize.ts': [
        [
          '    { version: SCHEMA_VERSION, name: data.name, top: data.top, nodes },\n',
          '    { version: SCHEMA_VERSION, name: data.name, zoom, top: data.top, nodes },\n',
        ],
        [
          '/** The document as a file: version, name, top-level ids and nodes in paint order. */\nexport function serializeDocument(doc: Document): string {',
          '/** The document as a file: version, name, zoom, top-level ids and nodes in paint order. */\nexport function serializeDocument(doc: Document, zoom = 1): string {',
        ],
      ],
      'src/editor.ts': [
        [
          '      doc.replace(data);\n',
          "      doc.replace(data);\n      const zoom = (JSON.parse(text) as { zoom?: unknown }).zoom;\n      viewport.setZoom(typeof zoom === 'number' ? zoom : 1);\n",
        ],
        [
          '    save: (): string => serializeDocument(doc),\n',
          '    save: (): string => serializeDocument(doc, viewport.zoom),\n',
        ],
      ],
    },
  },
  {
    key: 'c42',
    at: '2026-04-02T11:00:00Z',
    author: 'tomas',
    subject: 'Add align and distribute',
    add: ['src/commands/builtin/align.ts'],
    change: {
      'src/commands/palette.ts': [
        [
          "  arrange('Send to back', 'back', 'Mod+Shift+['),\n",
          "  arrange('Send to back', 'back', 'Mod+Shift+['),\n  align('Align left', 'left'),\n  align('Align horizontal centers', 'center'),\n  align('Align right', 'right'),\n  align('Align top', 'top'),\n  align('Align vertical centers', 'middle'),\n  align('Align bottom', 'bottom'),\n  distribute('Distribute horizontally', 'horizontal'),\n  distribute('Distribute vertically', 'vertical'),\n",
        ],
        [
          'const hasSelection = (ctx: EditorContext) => !ctx.selection.isEmpty();\n\n',
          'const hasSelection = (ctx: EditorContext) => !ctx.selection.isEmpty();\n\nfunction align(title: string, how: Alignment): PaletteEntry {\n  return {\n    title,\n    enabled: hasSelection,\n    run(ctx) {\n      const c = alignCommand(ctx.doc, ctx.selection.ids(), how);\n      if (c) ctx.dispatch(c, { label: title });\n    },\n  };\n}\n\nfunction distribute(title: string, axis: Axis): PaletteEntry {\n  return {\n    title,\n    enabled: (ctx) => ctx.selection.size >= 3,\n    run(ctx) {\n      const c = distributeCommand(ctx.doc, ctx.selection.ids(), axis);\n      if (c) ctx.dispatch(c, { label: title });\n    },\n  };\n}\n\n',
        ],
        [
          "import { lockItems } from './builtin/lock.ts';\n",
          "import { lockItems } from './builtin/lock.ts';\nimport { alignCommand, distributeCommand } from './builtin/align.ts';\nimport type { Alignment, Axis } from './builtin/align.ts';\n",
        ],
      ],
      'test/commands.test.ts': [
        [
          "  assert.deepEqual([back.name, back.visible, back.locked], ['A', true, false]);\n});\n\n",
          "  assert.deepEqual([back.name, back.visible, back.locked], ['A', true, false]);\n});\n\ntest('align left lines the selection up on its left edge', () => {\n  const { e, a, b, c } = threeRects();\n  e.doc.update(b, { y: 80, x: 130 });\n  e.selection.set([b, c]);\n  e.palette.run('Align left');\n  assert.equal(e.doc.require(b).x, 130);\n  assert.equal(e.doc.require(c).x, 130);\n  assert.equal(e.doc.require(a).x, 0);\n});\n\ntest('distribute spaces the middle nodes evenly', () => {\n  const { e, a, b, c } = threeRects();\n  e.doc.update(b, { x: 20 });\n  e.selection.set([a, b, c]);\n  e.palette.run('Distribute horizontally');\n  assert.equal(e.doc.require(b).x, 100);\n});\n\n",
        ],
      ],
      'test/palette.test.ts': [
        [
          "  assert.ok(busy.includes('Rename layer'));\n",
          "  assert.ok(busy.includes('Rename layer'));\n  assert.ok(!busy.includes('Distribute horizontally'));\n",
        ],
      ],
    },
  },
  {
    key: 'c43',
    at: '2026-04-03T14:30:00Z',
    author: 'mateo',
    subject: 'Expand and collapse layers with the arrow keys',
    change: {
      'src/keys/keymap.ts': [
        [
          "    ArrowDown: 'select-next',\n",
          "    ArrowDown: 'select-next',\n    ArrowRight: 'expand',\n    ArrowLeft: 'collapse',\n",
        ],
      ],
      'src/keys/dispatcher.ts': [
        [
          "  'select-next': (ctx) => step(ctx, 1),\n",
          "  'select-next': (ctx) => step(ctx, 1),\n  expand: (ctx) => {\n    for (const id of ctx.selection.ids()) ctx.layers.expand(id);\n  },\n  collapse: (ctx) => {\n    for (const id of ctx.selection.ids()) ctx.layers.collapse(id);\n  },\n",
        ],
      ],
    },
  },
  {
    key: 'c44',
    at: '2026-04-06T10:00:00Z',
    author: 'ines',
    subject: 'Reserve ids from loaded documents',
    body: 'A rectangle drawn after opening a file could take the id of one already in it.',
    change: {
      'src/editor.ts': [
        [
          '      doc.replace(data);\n',
          '      doc.replace(data);\n      ids.reserve(doc.ids());\n',
        ],
      ],
      'test/persist.test.ts': [
        [
          '  assert.equal(e.history.size, 0);\n});\n\n',
          "  assert.equal(e.history.size, 0);\n});\n\ntest('ids minted after a load never repeat loaded ones', () => {\n  const e = sample();\n  const other = editor();\n  other.files.load(e.files.save());\n  const id = other.create('rect');\n  assert.ok(!e.doc.has(id));\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c45',
    at: '2026-04-07T11:00:00Z',
    author: 'priya',
    subject: 'Bound font size and line height',
    change: {
      'src/panel/sections/text.ts': [
        [
          "      label: 'Line height',\n      kind: 'number',\n",
          "      label: 'Line height',\n      kind: 'number',\n      min: 0.5,\n      max: 5,\n",
        ],
        [
          "      label: 'Font size',\n      kind: 'number',\n",
          "      label: 'Font size',\n      kind: 'number',\n      min: 1,\n      max: 1000,\n",
        ],
      ],
    },
  },
  {
    key: 'c46',
    at: '2026-04-08T16:00:00Z',
    author: 'tomas',
    subject: 'Label hide, show, lock and unlock entries after their commands',
    change: {
      'src/commands/palette.ts': [
        [
          "        command('set-lock', { items: lockItems(ctx.selection.ids(), false) })\n      );",
          "        command('set-lock', { items: lockItems(ctx.selection.ids(), false) }),\n        { label: 'Unlock' }\n      );",
        ],
        [
          "        command('set-lock', { items: lockItems(ctx.selection.ids(), true) })\n      );",
          "        command('set-lock', { items: lockItems(ctx.selection.ids(), true) }),\n        { label: 'Lock' }\n      );",
        ],
        [
          '          items: visibilityItems(ctx.selection.ids(), true),\n        })\n      );',
          "          items: visibilityItems(ctx.selection.ids(), true),\n        }),\n        {\n          label: 'Show',\n        }\n      );",
        ],
        [
          '          items: visibilityItems(ctx.selection.ids(), false),\n        })\n      );',
          "          items: visibilityItems(ctx.selection.ids(), false),\n        }),\n        {\n          label: 'Hide',\n        }\n      );",
        ],
      ],
    },
  },
  {
    key: 'c47',
    at: '2026-04-09T10:00:00Z',
    author: 'ines',
    subject: 'Add a view-state file for zoom and collapsed sections',
    add: ['src/persist/viewstate.ts'],
    change: {
      'src/editor.ts': [
        [
          "    save: (): string => serializeDocument(doc, viewport.zoom),\n    load(text: string): void {\n      const data = parseFile(text);\n      selection.clear();\n      history.clear();\n      doc.replace(data);\n      ids.reserve(doc.ids());\n      const zoom = (JSON.parse(text) as { zoom?: unknown }).zoom;\n      viewport.setZoom(typeof zoom === 'number' ? zoom : 1);\n    },\n",
          '    save: (): string => serializeDocument(doc),\n    load(text: string, savedViewState?: string | ViewState): void {\n      const data = parseFile(text);\n      selection.clear();\n      history.clear();\n      doc.replace(data);\n      ids.reserve(doc.ids());\n      viewState = parseViewState(savedViewState ?? null);\n    },\n    viewState: (): ViewState => structuredClone(viewState),\n    saveViewState: (): string => serializeViewState(viewState),\n',
        ],
        [
          '  const viewport = new Viewport();\n',
          '  const viewport = new Viewport(() => viewState);\n',
        ],
        [
          '  const panel = new PropertiesPanel(ctx);\n',
          '  const panel = new PropertiesPanel(ctx, () => viewState);\n',
        ],
        [
          '  const bus = new CommandBus(doc, selection, registry, history, options.clock);\n',
          '  const bus = new CommandBus(doc, selection, registry, history, options.clock);\n  let viewState: ViewState = defaultViewState();\n',
        ],
        [
          "import { DEFAULT_KEYMAP } from './keys/keymap.ts';\n",
          "import { DEFAULT_KEYMAP } from './keys/keymap.ts';\nimport type { ViewState } from './persist/viewstate.ts';\nimport {\n  defaultViewState,\n  parseViewState,\n  serializeViewState,\n} from './persist/viewstate.ts';\n",
        ],
      ],
      'src/persist/serialize.ts': [
        [
          '    { version: SCHEMA_VERSION, name: data.name, zoom, top: data.top, nodes },\n',
          '    { version: SCHEMA_VERSION, name: data.name, top: data.top, nodes },\n',
        ],
        [
          '/** The document as a file: version, name, zoom, top-level ids and nodes in paint order. */\nexport function serializeDocument(doc: Document, zoom = 1): string {',
          '/** The document as a file: version, name, top-level ids and nodes in paint order. */\nexport function serializeDocument(doc: Document): string {',
        ],
      ],
      'src/panel/properties.ts': [
        [
          '  toggleSection(name: string): void {\n    if (this.collapsed.has(name)) this.collapsed.delete(name);\n    else this.collapsed.add(name);\n  }',
          '  toggleSection(name: string): void {\n    const state = this.viewState();\n    const set = new Set(state.collapsedSections);\n    if (set.has(name)) set.delete(name);\n    else set.add(name);\n    state.collapsedSections = [...set].sort();\n  }',
        ],
        [
          '    const collapsed = this.collapsed;\n',
          '    const collapsed = new Set(this.viewState().collapsedSections);\n',
        ],
        [
          '  private sections: SectionDescriptor[];\n  private collapsed = new Set<string>();\n\n  constructor(\n    ctx: EditorContext,\n    sections: readonly SectionDescriptor[] = DEFAULT_SECTIONS\n  ) {\n    this.ctx = ctx;\n    this.sections = [...sections];\n  }',
          '  private sections: SectionDescriptor[];\n  private viewState: () => ViewState;\n\n  constructor(\n    ctx: EditorContext,\n    viewState: () => ViewState,\n    sections: readonly SectionDescriptor[] = DEFAULT_SECTIONS\n  ) {\n    this.ctx = ctx;\n    this.viewState = viewState;\n    this.sections = [...sections];\n  }',
        ],
        [
          "import type { EditorContext } from '../commands/types.ts';\n",
          "import type { EditorContext } from '../commands/types.ts';\nimport type { ViewState } from '../persist/viewstate.ts';\n",
        ],
      ],
      'src/canvas/viewport.ts': [
        [
          '/** Screen to document coordinates. */\nexport class Viewport {\n  pan: Point = { x: 0, y: 0 };\n  zoom = 1;\n\n  setZoom(zoom: number, about: Point = { x: 0, y: 0 }): void {\n    const next = clamp(zoom, 0.02, 64);\n    const before = this.toDocument(about);\n    this.zoom = next;\n',
          '/** Screen to document coordinates. Zoom lives in the view state; pan does not persist. */\nexport class Viewport {\n  pan: Point = { x: 0, y: 0 };\n  private state: () => ViewState;\n\n  constructor(state: () => ViewState) {\n    this.state = state;\n  }\n\n  get zoom(): number {\n    return this.state().zoom;\n  }\n\n  setZoom(zoom: number, about: Point = { x: 0, y: 0 }): void {\n    const next = clamp(zoom, MIN_ZOOM, MAX_ZOOM);\n    const before = this.toDocument(about);\n    this.state().zoom = next;\n',
        ],
        [
          "import type { Point } from '../model/geometry.ts';\n",
          "import type { Point } from '../model/geometry.ts';\nimport type { ViewState } from '../persist/viewstate.ts';\nimport { MAX_ZOOM, MIN_ZOOM } from '../persist/viewstate.ts';\n",
        ],
      ],
      'test/panel.test.ts': [
        [
          '  assert.equal(e.doc.require(t).height, 16);\n});\n\n',
          "  assert.equal(e.doc.require(t).height, 16);\n});\n\ntest('collapsed sections are remembered', () => {\n  const { e, a } = threeRects();\n  e.selection.set([a]);\n  e.panel.toggleSection('fill');\n  const fill = e.panel.view().sections.find((s) => s.name === 'fill');\n  assert.equal(fill?.collapsed, true);\n  assert.deepEqual(e.files.viewState().collapsedSections, ['fill']);\n  e.panel.toggleSection('fill');\n  assert.deepEqual(e.files.viewState().collapsedSections, []);\n});\n\n",
        ],
      ],
      'test/persist.test.ts': [
        [
          '  assert.throws(() => parseFile(JSON.stringify(data)), /missing node/);\n});\n',
          "  assert.throws(() => parseFile(JSON.stringify(data)), /missing node/);\n});\n\ntest('zoom and collapsed sections come back through saveViewState', () => {\n  const e = sample();\n  e.canvas.setZoom(2);\n  e.panel.toggleSection('stroke');\n  const view = e.files.saveViewState();\n  const other = editor();\n  other.files.load(e.files.save(), view);\n  const restored = other.files.viewState();\n  assert.equal(restored.zoom, 2);\n  assert.deepEqual(restored.collapsedSections, ['stroke']);\n  other.files.load(e.files.save());\n  assert.equal(other.files.viewState().zoom, 1);\n});\n",
        ],
        [
          "import { SCHEMA_VERSION } from '../src/persist/schema.ts';\n",
          "import { SCHEMA_VERSION } from '../src/persist/schema.ts';\nimport { parseViewState } from '../src/persist/viewstate.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c48',
    at: '2026-04-13T10:00:00Z',
    author: 'mateo',
    subject: 'Reveal a layer by expanding its ancestors',
    change: {
      'src/layers/layers.ts': [
        [
          '    else this.expand(id);\n  }\n\n',
          '    else this.expand(id);\n  }\n\n  /** Expands every ancestor of `id`, so its row is listed. */\n  reveal(id: string): void {\n    for (const a of ancestors(this.ctx.doc, id)) this.expanded.add(a.id);\n  }\n\n',
        ],
        [
          "import { command } from '../commands/types.ts';\n",
          "import { command } from '../commands/types.ts';\nimport { ancestors } from '../model/tree.ts';\n",
        ],
      ],
      'test/layers.test.ts': [
        [
          "  assert.deepEqual(names(e), ['G']);\n});\n\n",
          "  assert.deepEqual(names(e), ['G']);\n});\n\ntest('reveal expands every ancestor', () => {\n  const e = editor();\n  const f = e.create('frame', { name: 'F' });\n  const g = e.create('group', { name: 'G' }, { parent: f });\n  const r = e.create('rect', { name: 'R' }, { parent: g });\n  e.layers.reveal(r);\n  assert.deepEqual(names(e), ['F', '  G', '    R']);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c49',
    at: '2026-04-14T11:00:00Z',
    author: 'ines',
    subject: 'Add isTesseraError',
    change: {
      'src/util/assert.ts': [
        [
          '  throw new TesseraError(code, message);\n}\n',
          '  throw new TesseraError(code, message);\n}\n\nexport function isTesseraError(\n  error: unknown,\n  code?: string\n): error is TesseraError {\n  return (\n    error instanceof TesseraError && (code === undefined || error.code === code)\n  );\n}\n',
        ],
      ],
    },
  },
  {
    key: 'c50',
    at: '2026-04-15T14:00:00Z',
    author: 'tomas',
    subject: 'Add peek() and inBatch for inspecting history',
    change: {
      'src/commands/history.ts': [
        [
          '    return this.done.map((entry) => structuredClone(entry));\n  }\n\n',
          '    return this.done.map((entry) => structuredClone(entry));\n  }\n\n  peek(): HistoryEntry | undefined {\n    return this.done.at(-1);\n  }\n\n',
        ],
      ],
      'src/commands/bus.ts': [
        [
          '      selectionBefore: open.selectionBefore,\n      selectionAfter: this.selection.ids(),\n      at: this.clock(),\n    });\n  }\n\n',
          '      selectionBefore: open.selectionBefore,\n      selectionAfter: this.selection.ids(),\n      at: this.clock(),\n    });\n  }\n\n  get inBatch(): boolean {\n    return this.open !== null;\n  }\n\n',
        ],
      ],
    },
  },
  {
    key: 'c51',
    at: '2026-04-16T10:00:00Z',
    author: 'priya',
    subject: 'Add fromPx to the unit registry',
    change: {
      'src/units/registry.ts': [
        [
          '  return (value / 100) * context.reference;\n}\n',
          '  return (value / 100) * context.reference;\n}\n\nexport function fromPx(\n  px: number,\n  unit: UnitId,\n  context: UnitContext = {}\n): number | null {\n  const u = UNITS[unit];\n  if (u.perUnit !== null) return px / u.perUnit;\n  if (!context.reference) return null;\n  return (px / context.reference) * 100;\n}\n',
        ],
      ],
      'test/units.test.ts': [
        [
          "test('the unit registry converts to px', () => {",
          "test('the unit registry converts to and from px', () => {",
        ],
        [
          "  assert.equal(toPx(50, '%'), null);\n",
          "  assert.equal(toPx(50, '%'), null);\n  assert.equal(fromPx(96, 'in'), 1);\n  assert.equal(fromPx(150, '%', { reference: 300 }), 50);\n",
        ],
        [
          "import { toPx, unitFor } from '../src/units/registry.ts';\n",
          "import { fromPx, toPx, unitFor } from '../src/units/registry.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c52',
    at: '2026-04-20T11:00:00Z',
    author: 'mateo',
    subject: 'Add listenerCount to the plugin host',
    change: {
      'src/plugin/host.ts': [
        [
          '        );\n  }\n\n',
          '        );\n  }\n\n  listenerCount(event: PluginEventName): number {\n    let n = 0;\n    for (const plugin of this.plugins.values())\n      n += plugin.listeners.get(event)?.size ?? 0;\n    return n;\n  }\n\n',
        ],
      ],
    },
  },
  {
    key: 'c53',
    at: '2026-04-21T15:00:00Z',
    author: 'ines',
    subject: 'Count nodes by type',
    change: {
      'src/model/query.ts': [
        [
          '    out.push(node);\n  });\n  return out;\n}\n',
          '    out.push(node);\n  });\n  return out;\n}\n\nexport function countByType(doc: Document): Record<NodeType, number> {\n  const counts = { frame: 0, rect: 0, ellipse: 0, line: 0, text: 0, group: 0 };\n  walk(doc, (node) => {\n    counts[node.type] += 1;\n  });\n  return counts;\n}\n',
        ],
      ],
    },
  },
  {
    key: 'c54',
    at: '2026-04-22T10:00:00Z',
    author: 'priya',
    subject: 'Add formatCount',
    change: {
      'src/units/format.ts': [
        [
          "  return `${displayNumber(share * 100, '%')}%`;\n}\n",
          "  return `${displayNumber(share * 100, '%')}%`;\n}\n\nexport function formatCount(n: number, one: string, many = `${one}s`): string {\n  return `${n} ${n === 1 ? one : many}`;\n}\n",
        ],
      ],
      'test/units.test.ts': [
        [
          "  assert.equal(formatPercent(0.555), '55.5%');\n",
          "  assert.equal(formatPercent(0.555), '55.5%');\n  assert.equal(formatCount(1, 'layer'), '1 layer');\n  assert.equal(formatCount(3, 'layer'), '3 layers');\n",
        ],
        ['  formatAngle,\n', '  formatAngle,\n  formatCount,\n'],
      ],
    },
  },
  {
    key: 'c55',
    at: '2026-04-23T11:00:00Z',
    author: 'mateo',
    subject: 'Add uniqueName for layer names',
    change: {
      'src/layers/rename.ts': [
        [
          '}\n',
          '}\n\n/** `base`, or `base 2`, `base 3`… so that it is not in `taken`. */\nexport function uniqueName(base: string, taken: Iterable<string>): string {\n  const used = new Set(taken);\n  if (!used.has(base)) return base;\n  for (let n = 2; ; n++) if (!used.has(`${base} ${n}`)) return `${base} ${n}`;\n}\n',
        ],
      ],
      'test/layers.test.ts': [
        [
          "  assert.equal(normalizeLayerName('x'.repeat(80))?.length, 64);\n",
          "  assert.equal(normalizeLayerName('x'.repeat(80))?.length, 64);\n  assert.equal(uniqueName('Frame', ['Frame', 'Frame 2']), 'Frame 3');\n  assert.equal(uniqueName('Card', []), 'Card');\n",
        ],
        [
          "import { normalizeLayerName } from '../src/layers/rename.ts';\n",
          "import { normalizeLayerName, uniqueName } from '../src/layers/rename.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c56',
    at: '2026-04-27T10:00:00Z',
    author: 'tomas',
    subject: 'Add once() to the emitter',
    change: {
      'src/util/emitter.ts': [
        [
          '    return () => this.off(event, listener);\n  }\n\n',
          '    return () => this.off(event, listener);\n  }\n\n  once<K extends keyof Events>(\n    event: K,\n    listener: Listener<Events[K]>\n  ): () => void {\n    const off = this.on(event, (payload) => {\n      off();\n      listener(payload);\n    });\n    return off;\n  }\n\n',
        ],
      ],
    },
  },
  {
    key: 'c57',
    at: '2026-04-28T14:00:00Z',
    author: 'mateo',
    subject: 'Add zoom in and zoom out steps',
    change: {
      'src/canvas/viewport.ts': [
        [
          '      y: this.pan.y + (after.y - before.y) * next,\n    };\n  }\n\n',
          '      y: this.pan.y + (after.y - before.y) * next,\n    };\n  }\n\n  zoomIn(): void {\n    this.setZoom(ZOOM_STEPS.find((z) => z > this.zoom) ?? this.zoom * 2);\n  }\n\n  zoomOut(): void {\n    this.setZoom(\n      [...ZOOM_STEPS].reverse().find((z) => z < this.zoom) ?? this.zoom / 2\n    );\n  }\n\n',
        ],
        [
          "import { clamp } from '../util/math.ts';\n\n",
          "import { clamp } from '../util/math.ts';\n\nexport const ZOOM_STEPS = [0.25, 0.5, 1, 2, 4, 8];\n\n",
        ],
      ],
    },
  },
  {
    key: 'c58',
    at: '2026-04-29T10:00:00Z',
    author: 'ines',
    subject: 'Add a depth helper to the tree',
    change: {
      'src/model/tree.ts': [
        [
          '  return ancestors(doc, id).some((node) => node.id === maybeAncestor);\n}\n\n',
          '  return ancestors(doc, id).some((node) => node.id === maybeAncestor);\n}\n\nexport function depth(doc: Document, id: string): number {\n  return ancestors(doc, id).length;\n}\n\n',
        ],
      ],
    },
  },
  {
    key: 'c59',
    at: '2026-04-30T16:00:00Z',
    author: 'priya',
    subject: 'Clamp zoom when reading view state',
    change: {
      'src/persist/viewstate.ts': [
        [
          "  const zoom =\n    typeof raw.zoom === 'number' && Number.isFinite(raw.zoom) ? raw.zoom : 1;",
          "  const zoom =\n    typeof raw.zoom === 'number' && Number.isFinite(raw.zoom)\n      ? clamp(raw.zoom, MIN_ZOOM, MAX_ZOOM)\n      : 1;",
        ],
        [
          'export interface ViewState {',
          "import { clamp } from '../util/math.ts';\n\nexport interface ViewState {",
        ],
      ],
      'test/persist.test.ts': [
        [
          '  assert.equal(other.files.viewState().zoom, 1);\n});\n',
          "  assert.equal(other.files.viewState().zoom, 1);\n});\n\ntest('a malformed view state falls back to the default', () => {\n  const bad = parseViewState('{bad');\n  assert.equal(bad.zoom, 1);\n  assert.deepEqual(bad.collapsedSections, []);\n  const odd = parseViewState({\n    zoom: 1000,\n    collapsedSections: ['a', 3] as never,\n  });\n  assert.equal(odd.zoom, 64);\n  assert.deepEqual(odd.collapsedSections, ['a']);\n});\n",
        ],
      ],
    },
  },
  {
    key: 'c60',
    at: '2026-05-04T10:00:00Z',
    author: 'tomas',
    subject: 'Coalesce history by gesture id',
    body: 'A drag, a panel commit and an arrange command each take a gesture id from newGesture() and pass it with every command they dispatch.',
    change: {
      'src/commands/coalesce.ts': [
        [
          '  };\n}\n',
          '  };\n}\n\nexport interface GestureSource {\n  next(): string;\n}\n\nexport function createGestureSource(): GestureSource {\n  let n = 0;\n  return { next: () => `g${++n}` };\n}\n',
        ],
        [
          "import type { HistoryEntry } from './history.ts';\n\n/** Entries closer together than this, with the same label, merge. */\nexport const COALESCE_WINDOW_MS = 500;\n\n/**\n * Whether `next` folds into `previous` instead of becoming an entry of its\n * own: the same label, no more than COALESCE_WINDOW_MS after it. A drag\n * sends a move on every pointer event, well inside the window.\n */\nexport function shouldMerge(\n  previous: HistoryEntry | undefined,\n  next: HistoryEntry\n): boolean {\n  return (\n    previous !== undefined &&\n    previous.label === next.label &&\n    next.at - previous.at <= COALESCE_WINDOW_MS\n  );\n}\n",
          "import type { HistoryEntry } from './history.ts';\n\n/**\n * Whether `next` folds into `previous` instead of becoming an entry of its\n * own: both carry the same gesture id. A drag passes one gesture id to\n * every command it dispatches.\n */\nexport function shouldMerge(\n  previous: HistoryEntry | undefined,\n  next: HistoryEntry\n): boolean {\n  return (\n    previous !== undefined &&\n    previous.gesture !== null &&\n    next.gesture !== null &&\n    previous.gesture === next.gesture\n  );\n}\n",
        ],
      ],
      'src/commands/history.ts': [
        [
          '  selectionAfter: string[];\n',
          '  selectionAfter: string[];\n  gesture: string | null;\n',
        ],
      ],
      'src/commands/bus.ts': [
        [
          '      selectionBefore: open.selectionBefore,\n      selectionAfter: this.selection.ids(),\n',
          '      selectionBefore: open.selectionBefore,\n      selectionAfter: this.selection.ids(),\n      gesture: null,\n',
        ],
        [
          '      selectionBefore,\n      selectionAfter: this.selection.ids(),\n',
          '      selectionBefore,\n      selectionAfter: this.selection.ids(),\n      gesture: options.gesture ?? null,\n',
        ],
      ],
      'src/commands/types.ts': [
        [
          '  batch(label: string, run: () => void): void;\n',
          '  batch(label: string, run: () => void): void;\n  newGesture(): string;\n',
        ],
        [
          '  label?: string;\n',
          '  label?: string;\n  /** Entries that share a gesture id are merged. */\n  gesture?: string | null;\n',
        ],
      ],
      'src/editor.ts': [
        [
          '    batch: (label: string, run: () => void) => batch(bus, label, run),\n',
          '    batch: (label: string, run: () => void) => batch(bus, label, run),\n    newGesture: () => gestures.next(),\n',
        ],
        [
          '  const bus = new CommandBus(doc, selection, registry, history, options.clock);\n',
          '  const bus = new CommandBus(doc, selection, registry, history, options.clock);\n  const gestures = createGestureSource();\n',
        ],
        [
          "import { batch } from './commands/batch.ts';\n",
          "import { batch } from './commands/batch.ts';\nimport { createGestureSource } from './commands/coalesce.ts';\n",
        ],
      ],
      'src/panel/commit.ts': [
        [
          '      ctx.dispatch(c, { label: `Set ${field.label}` });\n',
          '      ctx.dispatch(c, { label: `Set ${field.label}`, gesture });\n',
        ],
        ['    };\n', '    };\n  const gesture = ctx.newGesture();\n'],
      ],
      'src/commands/palette.ts': [
        [
          '      for (const c of arrangeCommands(ctx.doc, ctx.selection.ids(), how))\n        ctx.dispatch(c, { label: title });',
          '      const gesture = ctx.newGesture();\n      for (const c of arrangeCommands(ctx.doc, ctx.selection.ids(), how))\n        ctx.dispatch(c, { label: title, gesture });',
        ],
      ],
      'src/canvas/gestures.ts': [
        [
          "          {\n            label: 'Rotate',\n          }",
          "          {\n            label: 'Rotate',\n            gesture: drag.gesture,\n          }",
        ],
        [
          "      this.ctx.dispatch(\n        command('resize', { items: items as unknown as Json[] })\n      );",
          "      this.ctx.dispatch(\n        command('resize', { items: items as unknown as Json[] }),\n        { gesture: drag.gesture }\n      );",
        ],
        [
          "      this.ctx.dispatch(\n        command('move', { ids: this.ctx.selection.ids(), dx, dy })\n      );",
          "      this.ctx.dispatch(\n        command('move', { ids: this.ctx.selection.ids(), dx, dy }),\n        { gesture: drag.gesture }\n      );",
        ],
        [
          "    this.drag = { kind: 'move', last: p };\n",
          "    this.drag = { kind: 'move', gesture: this.ctx.newGesture(), last: p };\n",
        ],
        [
          "        kind: 'resize',\n        id,",
          "        kind: 'resize',\n        gesture: this.ctx.newGesture(),\n        id,",
        ],
        [
          "        kind: 'rotate',\n        centre: c,",
          "        kind: 'rotate',\n        gesture: this.ctx.newGesture(),\n        centre: c,",
        ],
        [
          "      kind: 'rotate';\n      centre: Point;",
          "      kind: 'rotate';\n      gesture: string;\n      centre: Point;",
        ],
        [
          "  | { kind: 'move'; last: Point }\n  | {\n      kind: 'resize';\n      id: string;",
          "  | { kind: 'move'; gesture: string; last: Point }\n  | {\n      kind: 'resize';\n      gesture: string;\n      id: string;",
        ],
      ],
      'test/history.test.ts': [
        [
          "  h.record({ ...entry, label: 'a' });\n  h.record({ ...entry, label: 'b' });\n  h.record({ ...entry, label: 'c' });\n",
          '  h.record(entry);\n  h.record(entry);\n  h.record(entry);\n',
        ],
        [
          '    selectionAfter: [],\n',
          '    selectionAfter: [],\n    gesture: null,\n',
        ],
        [
          '  for (let i = 0; i < UNDO_LIMIT + 25; i++)\n    e.commands.dispatch(move(id, 1), { label: `Move ${i}` });\n',
          '  for (let i = 0; i < UNDO_LIMIT + 25; i++) e.commands.dispatch(move(id, 1));\n',
        ],
        [
          "test('entries with one label inside the window become one', () => {\n  const { e, a } = threeRects();\n  for (let i = 0; i < 5; i++) e.commands.dispatch(move(a, 2));\n  assert.equal(e.history.size, 1);\n  assert.equal(e.doc.require(a).x, 10);\n  e.history.undo();\n  assert.equal(e.doc.require(a).x, 0);\n});\n\ntest('entries further apart than the window stay apart', () => {\n  let now = 0;\n  const e = createEditor({ clock: () => (now += 600) });\n  const a = e.create('rect');\n  e.commands.dispatch(move(a, 1));\n  e.commands.dispatch(move(a, 1));\n  assert.equal(e.history.size, 2);\n});\n\ntest('different labels do not merge', () => {\n  const { e, a } = threeRects();\n  e.commands.dispatch(move(a, 1));\n  e.commands.dispatch(move(a, 1), { label: 'Other' });\n  assert.equal(e.history.size, 2);\n});",
          "test('commands that share a gesture id become one entry', () => {\n  const { e, a } = threeRects();\n  for (let i = 0; i < 5; i++)\n    e.commands.dispatch(move(a, 2), { gesture: 'g-drag' });\n  assert.equal(e.history.size, 1);\n  assert.equal(e.doc.require(a).x, 10);\n  e.history.undo();\n  assert.equal(e.doc.require(a).x, 0);\n});\n\ntest('commands without a gesture id stay apart however close in time', () => {\n  const { e, a } = threeRects();\n  e.commands.dispatch(move(a, 1));\n  e.commands.dispatch(move(a, 1));\n  assert.equal(e.history.size, 2);\n});\n\ntest('different gestures do not merge', () => {\n  const { e, a } = threeRects();\n  e.commands.dispatch(move(a, 1), { gesture: 'g1' });\n  e.commands.dispatch(move(a, 1), { gesture: 'g2' });\n  assert.equal(e.history.size, 2);\n});",
        ],
        [
          "  e.commands.dispatch(move(a, 10), { label: 'First' });\n  e.commands.dispatch(move(a, 10), { label: 'Second' });\n  assert.equal(e.doc.require(a).x, 20);\n  assert.ok(e.history.undo());",
          '  e.commands.dispatch(move(a, 10));\n  e.commands.dispatch(move(a, 10));\n  assert.equal(e.doc.require(a).x, 20);\n  assert.ok(e.history.undo());',
        ],
        [
          "import { History, UNDO_LIMIT } from '../src/commands/history.ts';\nimport { createEditor } from '../src/editor.ts';\nimport { editor, threeRects } from './helpers.ts';\n",
          "import { History, UNDO_LIMIT } from '../src/commands/history.ts';\nimport { editor, threeRects } from './helpers.ts';\n",
        ],
      ],
      'test/keys.test.ts': [
        [
          '  assert.deepEqual([e.doc.require(a).x, e.doc.require(a).y], [1, 10]);\n',
          '  assert.deepEqual([e.doc.require(a).x, e.doc.require(a).y], [1, 10]);\n  assert.equal(e.history.size, 2);\n',
        ],
      ],
    },
  },
  {
    key: 'c61',
    at: '2026-05-05T11:00:00Z',
    author: 'tomas',
    subject: 'Raise the undo limit to 200',
    change: {
      'src/commands/history.ts': [
        [
          'export const UNDO_LIMIT = 100;\n',
          'export const UNDO_LIMIT = 200;\n',
        ],
      ],
    },
  },
  {
    key: 'c62',
    at: '2026-05-06T10:00:00Z',
    author: 'ren',
    subject: 'Add withoutShift for chord matching',
    change: {
      'src/keys/chords.ts': [
        [
          '  return formatChord(parseChord(text));\n}\n',
          '  return formatChord(parseChord(text));\n}\n\nexport function withoutShift(chord: string): string {\n  const parsed = parseChord(chord);\n  return formatChord({ ...parsed, shift: false });\n}\n',
        ],
      ],
    },
  },
  {
    key: 'c63',
    at: '2026-05-07T14:00:00Z',
    author: 'ren',
    subject: 'Add idPrefix',
    change: {
      'src/util/ids.ts': [
        [
          '  };\n}\n',
          "  };\n}\n\nexport function idPrefix(id: string): string {\n  const match = ID_PATTERN.exec(id);\n  return match ? match[1] : '';\n}\n",
        ],
      ],
    },
  },
  {
    key: 'c64',
    at: '2026-05-11T10:00:00Z',
    author: 'ren',
    subject: 'Add prune() to the selection',
    change: {
      'src/selection/selection.ts': [
        [
          '    this.set([]);\n  }\n',
          '    this.set([]);\n  }\n\n  /** Drops ids that `keep` rejects, such as ones no longer in the document. */\n  prune(keep: (id: string) => boolean): void {\n    const next = this.current.filter(keep);\n    if (next.length !== this.current.length) this.set(next);\n  }\n',
        ],
      ],
    },
  },
  {
    key: 'c65',
    at: '2026-05-12T11:00:00Z',
    author: 'ren',
    subject: 'Accept esc, del and option as key names',
    change: {
      'src/keys/chords.ts': [
        [
          "  shift: 'Shift',\n",
          "  shift: 'Shift',\n  esc: 'Escape',\n  del: 'Delete',\n",
        ],
        ["  mod: 'Mod',\n", "  mod: 'Mod',\n  option: 'Alt',\n"],
      ],
      'test/keys.test.ts': [
        [
          "  assert.equal(normalizeChord('Ctrl+Alt+left'), 'Mod+Alt+ArrowLeft');\n",
          "  assert.equal(normalizeChord('Ctrl+Alt+left'), 'Mod+Alt+ArrowLeft');\n  assert.equal(normalizeChord('esc'), 'Escape');\n",
        ],
      ],
    },
  },
  {
    key: 'c66',
    at: '2026-05-13T15:00:00Z',
    author: 'mateo',
    subject: 'Let a plugin load again after it was unloaded',
    change: {
      'src/plugin/sandbox.ts': [
        [
          '    this.revoked.add(plugin);\n  }\n\n',
          '    this.revoked.add(plugin);\n  }\n\n  restore(plugin: string): void {\n    this.revoked.delete(plugin);\n  }\n\n  isRevoked(plugin: string): boolean {\n    return this.revoked.has(plugin);\n  }\n\n',
        ],
      ],
      'src/plugin/host.ts': [
        [
          '    this.plugins.set(manifest.name, loaded);\n',
          '    this.plugins.set(manifest.name, loaded);\n    this.sandbox.restore(manifest.name);\n',
        ],
      ],
    },
  },
  {
    key: 'c67',
    at: '2026-05-14T10:00:00Z',
    author: 'priya',
    subject: 'Add isBlank for empty text',
    change: {
      'src/model/text.ts': [
        [
          '  return lineCount(node) * node.fontSize * node.lineHeight;\n}\n',
          '  return lineCount(node) * node.fontSize * node.lineHeight;\n}\n\nexport function isBlank(text: string): boolean {\n  return text.trim().length === 0;\n}\n',
        ],
      ],
    },
  },
  {
    key: 'c68',
    at: '2026-05-18T10:00:00Z',
    author: 'ines',
    subject: 'Add translateRect',
    change: {
      'src/model/transform.ts': [
        [
          '  return { x, y, width, height };\n}\n',
          '  return { x, y, width, height };\n}\n\nexport function translateRect(rect: Rect, dx: number, dy: number): Rect {\n  return { ...rect, x: rect.x + dx, y: rect.y + dy };\n}\n',
        ],
      ],
    },
  },
  {
    key: 'c69',
    at: '2026-05-19T11:00:00Z',
    author: 'tomas',
    subject: 'Add lerp, sum and uniq',
    change: {
      'src/util/math.ts': [
        [
          '  return (radians * 180) / Math.PI;\n}\n',
          '  return (radians * 180) / Math.PI;\n}\n\nexport function sum(values: Iterable<number>): number {\n  let total = 0;\n  for (const value of values) total += value;\n  return total;\n}\n\nexport function uniq<T>(values: Iterable<T>): T[] {\n  return [...new Set(values)];\n}\n',
        ],
        [
          '  return (radians * 180) / Math.PI;\n}\n\n',
          '  return (radians * 180) / Math.PI;\n}\n\nexport function lerp(a: number, b: number, t: number): number {\n  return a + (b - a) * t;\n}\n\n',
        ],
      ],
    },
  },
  {
    key: 'c70',
    at: '2026-05-20T14:00:00Z',
    author: 'ren',
    subject: 'Expose selection, command and plugin helpers on the editor',
    change: {
      'src/editor.ts': [
        [
          '      loaded: () => plugins.loaded(),\n',
          '      loaded: () => plugins.loaded(),\n      errors: () => [...plugins.sandbox.errors],\n',
        ],
        [
          '      replay: (list: readonly Command[]) => bus.replay(list),\n',
          '      replay: (list: readonly Command[]) => bus.replay(list),\n      types: () => registry.types(),\n',
        ],
        [
          '      clear: () => selection.clear(),\n',
          '      clear: () => selection.clear(),\n      has: (id: string) => selection.has(id),\n',
        ],
      ],
      'test/commands.test.ts': [
        [
          '  ]);\n',
          "  ]);\n  assert.ok(e.commands.types().includes('set-prop'));\n",
        ],
      ],
      'test/plugin.test.ts': [
        [
          "  });\n  e.commands.dispatch({ type: 'move', payload: { ids: [a], dx: 1, dy: 0 } });\n",
          "  });\n  e.commands.dispatch({ type: 'move', payload: { ids: [a], dx: 1, dy: 0 } });\n  assert.equal(e.plugins.errors()[0]?.message, 'boom');\n",
        ],
      ],
    },
  },
  {
    key: 'c71',
    at: '2026-05-21T10:00:00Z',
    author: 'priya',
    subject: 'Add sameOnScreen',
    change: {
      'src/units/precision.ts': [
        [
          '}\n',
          "}\n\n/** True when two stored values would show the same text. */\nexport function sameOnScreen(\n  a: number,\n  b: number,\n  unit: DisplayUnit = 'px'\n): boolean {\n  return displayNumber(a, unit) === displayNumber(b, unit);\n}\n",
        ],
      ],
      'test/precision.test.ts': [
        [
          "  assert.equal(e.panel.value('X'), '10.12');\n});\n",
          "  assert.equal(e.panel.value('X'), '10.12');\n});\n\ntest('values that look the same are the same on screen', () => {\n  assert.ok(sameOnScreen(10, 10.000001));\n  assert.ok(!sameOnScreen(10, 10.01));\n});\n",
        ],
        [
          "import { displayNumber } from '../src/units/precision.ts';\n",
          "import { displayNumber, sameOnScreen } from '../src/units/precision.ts';\n",
        ],
      ],
    },
  },
  {
    key: 'c72',
    at: '2026-05-25T10:00:00Z',
    author: 'mateo',
    subject: 'Add selectionCentre',
    change: {
      'src/selection/bounds.ts': [
        [
          '}\n',
          '}\n\nexport function selectionCentre(\n  doc: Document,\n  ids: readonly string[]\n): Point | null {\n  const bounds = selectionBounds(doc, ids);\n  return bounds ? centre(bounds) : null;\n}\n',
        ],
        [
          "import type { Rect } from '../model/geometry.ts';\nimport { nodeBounds, unionRects } from '../model/geometry.ts';",
          "import type { Point, Rect } from '../model/geometry.ts';\nimport { centre, nodeBounds, unionRects } from '../model/geometry.ts';",
        ],
      ],
    },
  },
  {
    key: 'c73',
    at: '2026-05-26T11:00:00Z',
    author: 'ines',
    subject: 'Add isId',
    change: {
      'src/util/ids.ts': [
        [
          '  };\n}\n',
          "  };\n}\n\nexport function isId(value: unknown): value is string {\n  return typeof value === 'string' && ID_PATTERN.test(value);\n}\n",
        ],
      ],
    },
  },
  {
    key: 'c74',
    at: '2026-05-27T14:00:00Z',
    author: 'tomas',
    subject: 'Add isFiniteNumber',
    change: {
      'src/util/math.ts': [
        [
          '  return a + (b - a) * t;\n}\n',
          "  return a + (b - a) * t;\n}\n\nexport function isFiniteNumber(value: unknown): value is number {\n  return typeof value === 'number' && Number.isFinite(value);\n}\n",
        ],
      ],
    },
  },
  {
    key: 'c75',
    at: '2026-05-28T10:00:00Z',
    author: 'priya',
    subject: 'Freeze the display precision table',
    change: {
      'src/units/precision.ts': [
        [
          "export const DISPLAY_PRECISION: Readonly<Record<DisplayUnit, number>> = {\n  px: 2,\n  pt: 2,\n  in: 3,\n  '%': 1,\n  deg: 1,\n};",
          "export const DISPLAY_PRECISION: Readonly<Record<DisplayUnit, number>> =\n  Object.freeze({\n    px: 2,\n    pt: 2,\n    in: 3,\n    '%': 1,\n    deg: 1,\n  });",
        ],
      ],
    },
  },
  {
    key: 'c76',
    at: '2026-06-01T10:00:00Z',
    author: 'ren',
    subject: 'Give groups their own opacity',
    body: 'The group opacity multiplies into its children when they render. Setting Opacity on a group no longer rewrites every child.',
    change: {
      'src/model/types.ts': [
        [
          "export interface GroupNode extends BaseNode {\n  type: 'group';\n  children: string[];\n}",
          "export interface GroupNode extends BaseNode {\n  type: 'group';\n  children: string[];\n  opacity: number;\n}",
        ],
      ],
      'src/model/factory.ts': [
        [
          "    ...base(ids, 'group'),\n    children: [],\n",
          "    ...base(ids, 'group'),\n    children: [],\n    opacity: 1,\n",
        ],
      ],
      'src/model/style.ts': [
        [
          "/**\n * The opacity a node renders at: its own, times that of every frame above\n * it. Groups have no opacity of their own.\n */\nexport function effectiveOpacity(doc: Document, id: string): number {\n  let node: SceneNode | undefined = doc.require(id);\n  let opacity = 1;\n  while (node) {\n    if (node.type !== 'group') opacity *= node.opacity;",
          '/**\n * The opacity a node renders at: its own, times that of every group and\n * frame above it.\n */\nexport function effectiveOpacity(doc: Document, id: string): number {\n  let node: SceneNode | undefined = doc.require(id);\n  let opacity = 1;\n  while (node) {\n    opacity *= node.opacity;',
        ],
      ],
      'src/persist/schema.ts': [
        [
          "    for (const key of ['x', 'y', 'width', 'height', 'rotation'] as const)",
          "    for (const key of [\n      'x',\n      'y',\n      'width',\n      'height',\n      'rotation',\n      'opacity',\n    ] as const)",
        ],
        [
          '  locked: false,\n};\n\nconst STYLED_DEFAULTS: Record<string, unknown> = {\n  fills: [],\n  strokes: [],\n  opacity: 1,\n};',
          '  locked: false,\n  opacity: 1,\n};\n\nconst STYLED_DEFAULTS: Record<string, unknown> = { fills: [], strokes: [] };',
        ],
      ],
      'src/panel/sections/appearance.ts': [
        [
          "import type { SectionDescriptor } from '../schema.ts';\nimport { field } from '../schema.ts';\nimport { command } from '../../commands/types.ts';\nimport { clampOpacity } from '../../model/style.ts';\nimport type { Document } from '../../model/document.ts';\nimport type { SceneNode } from '../../model/types.ts';\nimport { descendants } from '../../model/tree.ts';\n\n/**\n * The nodes an Opacity edit lands on: the node itself, or for a group,\n * every styled node inside it.\n */\nfunction opacityTargets(doc: Document, node: SceneNode): SceneNode[] {\n  if (node.type !== 'group') return [node];\n  return descendants(doc, node.id).filter((inner) => inner.type !== 'group');\n}\n\nexport const appearanceSection: SectionDescriptor = {\n  name: 'appearance',\n  title: 'Appearance',\n  fields: [\n    field({\n      label: 'Opacity',\n      kind: 'percent',\n      min: 0,\n      max: 1,\n      appliesTo: () => true,\n      read: (node, doc) =>\n        (opacityTargets(doc, node)[0] as { opacity?: number })?.opacity ?? 1,\n      write: (node, value, doc) =>\n        opacityTargets(doc, node).map((target) =>\n          command('set-prop', {\n            id: target.id,\n            key: 'opacity',\n            value: clampOpacity(value as number),\n          })\n        ),\n    }),\n  ],\n};\n",
          "import type { SectionDescriptor } from '../schema.ts';\nimport { field } from '../schema.ts';\nimport { command } from '../../commands/types.ts';\nimport { clampOpacity } from '../../model/style.ts';\n\nexport const appearanceSection: SectionDescriptor = {\n  name: 'appearance',\n  title: 'Appearance',\n  fields: [\n    field({\n      label: 'Opacity',\n      kind: 'percent',\n      min: 0,\n      max: 1,\n      appliesTo: () => true,\n      read: (node) => node.opacity,\n      write: (node, value) => [\n        command('set-prop', {\n          id: node.id,\n          key: 'opacity',\n          value: clampOpacity(value as number),\n        }),\n      ],\n    }),\n  ],\n};\n",
        ],
      ],
      'test/style.test.ts': [
        [
          "test('groups carry no opacity; frames multiply into their children', () => {\n  const e = editor();\n  const g = e.create('group');\n  const r = e.create('rect', { opacity: 0.5 }, { parent: g });\n  assert.equal(effectiveOpacity(e.doc, r), 0.5);\n  assert.ok(!('opacity' in e.doc.require(g)));\n});",
          "test('a group has its own opacity, multiplied into its children', () => {\n  const e = editor();\n  const g = e.create('group');\n  const r = e.create('rect', { opacity: 0.5 }, { parent: g });\n  assert.equal(effectiveOpacity(e.doc, r), 0.5);\n  e.doc.update(g, { opacity: 0.5 });\n  assert.equal(effectiveOpacity(e.doc, r), 0.25);\n  assert.equal(e.doc.require(r).opacity, 0.5);\n});",
        ],
      ],
      'test/panel.test.ts': [
        [
          "test('opacity on a group sets it on the group’s children', () => {\n  const e = editor();\n  const g = e.create('group');\n  const r1 = e.create('rect', { opacity: 0.5 }, { parent: g });\n  const r2 = e.create('ellipse', {}, { parent: g });\n  e.selection.set([g]);\n  e.panel.edit('Opacity', '30%');\n  assert.equal(e.doc.require(r1).opacity, 0.3);\n  assert.equal(e.doc.require(r2).opacity, 0.3);\n  assert.equal(e.panel.value('Opacity'), '30%');\n});",
          "test('opacity on a group is the group’s own', () => {\n  const e = editor();\n  const g = e.create('group');\n  const r = e.create('rect', { opacity: 0.5 }, { parent: g });\n  e.selection.set([g]);\n  e.panel.edit('Opacity', '50%');\n  assert.equal(e.doc.require(g).opacity, 0.5);\n  assert.equal(e.doc.require(r).opacity, 0.5);\n  assert.equal(e.panel.value('Opacity'), '50%');\n});",
        ],
      ],
    },
  },
  {
    key: 'c77',
    at: '2026-06-02T11:00:00Z',
    author: 'ren',
    subject: 'Store rotation in radians',
    body: 'Adds the version 4 to 5 migration, which converts stored rotations. The panel still shows and takes degrees.',
    add: ['src/persist/migrations/v4-v5.ts', 'test/fixtures/v4.json'],
    change: {
      'src/model/types.ts': [
        [
          "  /** Degrees, clockwise, about the node's centre. */\n",
          "  /** Radians, clockwise, about the node's centre. */\n",
        ],
      ],
      'src/model/transform.ts': [
        [
          '/** The angle of `point` around `about`, in degrees, 0 pointing right. */\nexport function angleAround(about: Point, point: Point): number {\n  return radToDeg(Math.atan2(point.y - about.y, point.x - about.x));\n}',
          '/** The angle of `point` around `about`, in radians, 0 pointing right. */\nexport function angleAround(about: Point, point: Point): number {\n  return Math.atan2(point.y - about.y, point.x - about.x);\n}',
        ],
        [
          "import type { Point, Rect } from './geometry.ts';\nimport { degToRad, radToDeg } from '../util/math.ts';\n\n/** Maps any angle in degrees into (-180, 180]. */\nexport function normalizeAngle(degrees: number): number {\n  let a = degrees % 360;\n  if (a <= -180) a += 360;\n  if (a > 180) a -= 360;\n  return Object.is(a, -0) ? 0 : a;\n}\n\nexport function rotatePoint(\n  point: Point,\n  about: Point,\n  degrees: number\n): Point {\n  const cos = Math.cos(degToRad(degrees));\n  const sin = Math.sin(degToRad(degrees));",
          "import type { Point, Rect } from './geometry.ts';\n\nconst TAU = Math.PI * 2;\n\n/** Maps any angle in radians into (-π, π]. */\nexport function normalizeAngle(radians: number): number {\n  let a = radians % TAU;\n  if (a <= -Math.PI) a += TAU;\n  if (a > Math.PI) a -= TAU;\n  return Object.is(a, -0) ? 0 : a;\n}\n\nexport function rotatePoint(\n  point: Point,\n  about: Point,\n  radians: number\n): Point {\n  const cos = Math.cos(radians);\n  const sin = Math.sin(radians);",
        ],
      ],
      'src/model/geometry.ts': [
        [
          '  const cos = Math.cos(degToRad(-node.rotation));\n  const sin = Math.sin(degToRad(-node.rotation));',
          '  const cos = Math.cos(-node.rotation);\n  const sin = Math.sin(-node.rotation);',
        ],
        [
          "import { rotatedCorners } from './transform.ts';\nimport { degToRad } from '../util/math.ts';\n",
          "import { rotatedCorners } from './transform.ts';\n",
        ],
      ],
      'src/units/format.ts': [
        [
          "/** An angle in degrees, shown with a ° sign. */\nexport function formatAngle(degrees: number): string {\n  return `${displayNumber(degrees, 'deg')}°`;\n}",
          "/** An angle stored in radians, shown in degrees with a ° sign. */\nexport function formatAngle(radians: number): string {\n  return `${displayNumber(radToDeg(radians), 'deg')}°`;\n}",
        ],
        [
          "import { displayNumber } from './precision.ts';\n",
          "import { displayNumber } from './precision.ts';\nimport { radToDeg } from '../util/math.ts';\n",
        ],
      ],
      'src/panel/fields.ts': [
        [
          "    case 'angle':\n      return toLength(text.replace(/°\\s*$/, ''));\n",
          "    case 'angle': {\n      const degrees = toLength(text.replace(/°\\s*$/, ''));\n      return degrees === null ? null : degToRad(degrees);\n    }\n",
        ],
        [
          "import { clamp } from '../util/math.ts';\n",
          "import { clamp, degToRad } from '../util/math.ts';\n",
        ],
      ],
      'src/panel/schema.ts': [
        [
          ' * - `angle`: stored and typed in degrees, shown with a degree sign\n',
          ' * - `angle`: stored in radians, shown and typed in degrees\n',
        ],
      ],
      'src/persist/schema.ts': [
        [
          'export const SCHEMA_VERSION = 4;\n',
          'export const SCHEMA_VERSION = 5;\n',
        ],
      ],
      'src/persist/migrations/index.ts': [
        [
          '  { from: 3, to: 4, run: v3ToV4 },\n',
          '  { from: 3, to: 4, run: v3ToV4 },\n  { from: 4, to: 5, run: v4ToV5 },\n',
        ],
        [
          "import { v3ToV4 } from './v3-v4.ts';\n",
          "import { v3ToV4 } from './v3-v4.ts';\nimport { v4ToV5 } from './v4-v5.ts';\n",
        ],
      ],
      'test/geometry.test.ts': [
        [
          "test('normalizeAngle maps into (-180, 180]', () => {\n  assert.equal(normalizeAngle(540), 180);\n  assert.equal(normalizeAngle(-450), -90);\n  assert.equal(normalizeAngle(0), 0);\n});",
          "test('normalizeAngle maps into (-π, π]', () => {\n  assert.ok(close(normalizeAngle(3 * Math.PI), Math.PI));\n  assert.ok(close(normalizeAngle(-Math.PI / 2 - 2 * Math.PI), -Math.PI / 2));\n  assert.equal(normalizeAngle(0), 0);\n});",
        ],
        [
          '    height: 10,\n    rotation: 90,\n  });',
          '    height: 10,\n    rotation: Math.PI / 2,\n  });',
        ],
        [
          '    height: 40,\n    rotation: 45,\n  });',
          '    height: 40,\n    rotation: Math.PI / 4,\n  });',
        ],
        [
          '  const p = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);\n',
          '  const p = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);\n',
        ],
        [
          "test('rotation is stored in degrees', () => {\n  const node = createRect(ids, {\n    x: 0,\n    y: 0,\n    width: 100,\n    height: 20,\n    rotation: 90,\n  });",
          "test('rotation is stored in radians', () => {\n  const node = createRect(ids, {\n    x: 0,\n    y: 0,\n    width: 100,\n    height: 20,\n    rotation: Math.PI / 2,\n  });",
        ],
      ],
      'test/panel.test.ts': [
        [
          "  e.panel.edit('Rotation', '90');\n  assert.equal(e.doc.require(a).rotation, 90);",
          "  e.panel.edit('Rotation', '90');\n  assert.ok(Math.abs(e.doc.require(a).rotation - Math.PI / 2) < 1e-12);",
        ],
      ],
      'test/canvas.test.ts': [
        [
          '    close(e.doc.require(id).rotation, 90),\n',
          '    close(e.doc.require(id).rotation, Math.PI / 2),\n',
        ],
      ],
      'test/units.test.ts': [
        [
          "  assert.equal(formatAngle(45), '45°');\n",
          "  assert.equal(formatAngle(Math.PI / 4), '45°');\n",
        ],
      ],
      'test/migrations.test.ts': [
        [
          '  ]);\n});\n\n',
          "  ]);\n});\n\ntest('a version 4 file opens with its rotation in radians', () => {\n  const data = parseFile(fixture('v4.json'));\n  assert.ok(Math.abs(data.nodes['rect-2'].rotation - Math.PI / 4) < 1e-12);\n  assert.equal(data.nodes['frame-1'].rotation, 0);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c78',
    at: '2026-06-03T14:00:00Z',
    author: 'ren',
    subject: 'List layers frontmost first',
    body: 'The top row is now the layer that paints on top, as in other design tools. Drops map back to paint order.',
    change: {
      'src/layers/tree-view.ts': [
        [
          '    const ids = doc.children(parent);\n',
          '    const ids = [...doc.children(parent)].reverse();\n',
        ],
        [
          "/**\n * The rows the layers panel lists, back to front: index 0 is the backmost\n * layer, as in the document's child lists, and a container's children\n * follow it when it is expanded.\n */",
          "/**\n * The rows the layers panel lists, frontmost first: the last child in\n * paint order is the first row, and a container's children follow it when\n * it is expanded.\n */",
        ],
      ],
      'src/layers/drag.ts': [
        [
          "  return { parent, index: position === 'above' ? at : at + 1 };\n",
          "  return { parent, index: position === 'above' ? at + 1 : at };\n",
        ],
        [
          '/**\n * Turns a drop on the layers list into a place in the tree. Rows are in\n * paint order, so a row dropped above another takes its index and one\n * dropped below goes one after it. Returns null for a drop that would put\n * a node inside itself.\n */',
          '/**\n * Turns a drop on the layers list into a place in the tree. The list shows\n * siblings frontmost first, so a row dropped above another goes in front of\n * it, which is the next index up in paint order. Returns null for a drop\n * that would put a node inside itself.\n */',
        ],
      ],
      'test/layers.test.ts': [
        [
          '  e.layers.click(a, { shift: true });\n  assert.deepEqual(e.selection.ids(), [a, b, c]);\n  e.layers.click(b, { mod: true });\n  assert.deepEqual(e.selection.ids(), [a, c]);',
          '  e.layers.click(a, { shift: true });\n  assert.deepEqual(e.selection.ids(), [c, b, a]);\n  e.layers.click(b, { mod: true });\n  assert.deepEqual(e.selection.ids(), [c, a]);',
        ],
        [
          "test('dragging a row above another puts it behind', () => {\n  const { e, a, c } = threeRects();\n  assert.ok(e.layers.drag(c, a, 'above'));\n  assert.deepEqual(names(e), ['C', 'A', 'B']);\n  assert.equal(e.doc.children(null)[0], c);\n});\n\ntest('dragging a row below another puts it in front', () => {\n  const { e, a, b } = threeRects();\n  e.layers.drag(a, b, 'below');\n  assert.deepEqual(names(e), ['B', 'A', 'C']);\n});\n\ntest('dropping inside a container puts the row at its bottom', () => {\n  const e = editor();\n  const f = e.create('frame', { name: 'F' });\n  e.create('rect', { name: 'In' }, { parent: f });\n  const out = e.create('rect', { name: 'Out' });\n  e.layers.drag(out, f, 'inside');\n  assert.deepEqual(names(e), ['F', '  In', '  Out']);\n  e.history.undo();\n  assert.deepEqual(names(e), ['F', '  In', 'Out']);\n});",
          "test('dragging a row above another puts it in front', () => {\n  const { e, a, c } = threeRects();\n  assert.ok(e.layers.drag(a, c, 'above'));\n  assert.deepEqual(names(e), ['A', 'C', 'B']);\n  assert.equal(e.doc.children(null).at(-1), a);\n});\n\ntest('dragging a row below another puts it behind', () => {\n  const { e, b, c } = threeRects();\n  e.layers.drag(c, b, 'below');\n  assert.deepEqual(names(e), ['B', 'C', 'A']);\n});\n\ntest('dropping inside a container puts the row at its top', () => {\n  const e = editor();\n  const f = e.create('frame', { name: 'F' });\n  e.create('rect', { name: 'In' }, { parent: f });\n  const out = e.create('rect', { name: 'Out' });\n  e.layers.drag(out, f, 'inside');\n  assert.deepEqual(names(e), ['F', '  Out', '  In']);\n  e.history.undo();\n  assert.deepEqual(names(e), ['Out', 'F', '  In']);\n});",
        ],
        [
          "  assert.deepEqual(names(e), ['G', '  R1', '  R2']);\n",
          "  assert.deepEqual(names(e), ['G', '  R2', '  R1']);\n",
        ],
        [
          "test('rows list layers back to front', () => {\n  const { e } = threeRects();\n  assert.deepEqual(names(e), ['A', 'B', 'C']);\n});",
          "test('rows list the frontmost layer first', () => {\n  const { e } = threeRects();\n  assert.deepEqual(names(e), ['C', 'B', 'A']);\n});",
        ],
      ],
      'test/keys.test.ts': [
        [
          "  e.keys.focus('layers');\n  e.keys.press('ArrowDown');\n  assert.deepEqual(e.selection.ids(), [b]);",
          "  e.keys.focus('layers');\n  e.keys.press('ArrowUp');\n  assert.deepEqual(e.selection.ids(), [b]);",
        ],
      ],
    },
  },
  {
    key: 'c79',
    at: '2026-06-08T10:00:00Z',
    author: 'ren',
    subject: 'Split key bindings by scope',
    body: 'Each scope has its own bindings file with the handler next to the chord. The old table stays as it was for plugins.',
    add: [
      'src/keys/bindings/canvas.ts',
      'src/keys/bindings/layers.ts',
      'src/keys/bindings/panel.ts',
    ],
    change: {
      'src/keys/keymap.ts': { before: 'd4/src/keys/keymap.ts' },
      'src/keys/dispatcher.ts': { before: 'd4/src/keys/dispatcher.ts' },
      'test/plugin.test.ts': [
        [
          "  assert.equal(api.shortcuts().canvas['Mod+G'], 'group');\n",
          "  assert.equal(api.shortcuts().canvas['Mod+G'], 'group');\n  assert.ok(Object.isFrozen(api.shortcuts().canvas));\n",
        ],
      ],
    },
  },
  {
    key: 'c80',
    at: '2026-06-09T11:00:00Z',
    author: 'ren',
    subject: 'Parse panel input as expressions',
    body: 'Number fields take arithmetic such as 100 / 3 or (8 + 4) * 2.',
    add: ['src/units/expr.ts'],
    change: {
      'src/panel/fields.ts': [
        [
          "      const percent = toLength(text.replace(/%\\s*$/, ''));\n",
          "      const percent = parseExpression(text.replace(/%\\s*$/, ''));\n",
        ],
        [
          "      const degrees = toLength(text.replace(/°\\s*$/, ''));\n",
          "      const degrees = parseExpression(text.replace(/°\\s*$/, ''));\n",
        ],
        [
          '      return toLength(text);\n',
          '      return parseExpression(text);\n',
        ],
        [
          "import { clamp, degToRad } from '../util/math.ts';\n\n/** Reads a typed length or number: digits with an optional px suffix. */\nfunction toLength(text: string): number | null {\n  return parseLength(text);\n}\n\n/** Reads what the user typed into a field. Returns null when it cannot. */",
          "import { clamp, degToRad } from '../util/math.ts';\n\n/** Reads what the user typed into a field. Returns null when it cannot. */",
        ],
        [
          "import { parseLength } from '../units/parse.ts';\n",
          "import { parseExpression } from '../units/expr.ts';\n",
        ],
      ],
      'src/units/parse.ts': [
        [
          '// Reads a length written as a string, such as `12`, `12px` or ` 4.5 px `.\n// Panel fields read what the user types through here, and so does the\n// v1→v2 migration for the lengths version 1 files stored as strings.',
          '// Reads a length written as a string, such as `12`, `12px` or ` 4.5 px `.\n// Version 1 files stored lengths this way; the v1→v2 migration reads them\n// through here.',
        ],
      ],
      'src/panel/schema.ts': [
        [
          ' * - `number`: a plain number\n',
          ' * - `number`: a plain number, typed as an expression\n',
        ],
        [
          ' * - `length`: px, typed as digits with an optional px\n',
          ' * - `length`: px, typed as an expression\n',
        ],
      ],
      'test/units.test.ts': [
        [
          "} from '../src/units/format.ts';\n\n",
          "} from '../src/units/format.ts';\n\ntest('parseExpression reads numbers and arithmetic', () => {\n  assert.equal(parseExpression('12'), 12);\n  assert.equal(parseExpression(' 12px '), 12);\n  assert.equal(parseExpression('10 + 5'), 15);\n  assert.equal(parseExpression('100 / 4'), 25);\n  assert.equal(parseExpression('(8 + 4) * 2'), 24);\n  assert.equal(parseExpression('-5 + 2'), -3);\n  assert.equal(parseExpression('.5'), 0.5);\n});\n\ntest('parseExpression rejects what it cannot read', () => {\n  for (const bad of ['', 'abc', '1 +', '(1', '1 / 0', '2in', '5 5'])\n    assert.equal(parseExpression(bad), null, bad);\n});\n\n",
        ],
        [
          "import assert from 'node:assert/strict';\n",
          "import assert from 'node:assert/strict';\nimport { parseExpression } from '../src/units/expr.ts';\n",
        ],
      ],
      'test/panel.test.ts': [
        [
          "  assert.equal(e.panel.value('Y'), '40');\n});\n\n",
          "  assert.equal(e.panel.value('Y'), '40');\n});\n\ntest('length fields take arithmetic', () => {\n  const { e, a } = threeRects();\n  e.selection.set([a]);\n  e.panel.edit('W', '50 * 2 + 10');\n  assert.equal(e.doc.require(a).width, 110);\n  e.panel.edit('H', '100px / 4');\n  assert.equal(e.doc.require(a).height, 25);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c81',
    at: '2026-06-10T10:00:00Z',
    author: 'ines',
    subject: 'Add a fixture document for round-trip tests',
    add: ['test/fixtures/doc-v5.json'],
    change: {
      'test/persist.test.ts': [
        [
          '  assert.ok(!e.doc.has(id));\n});\n\n',
          "  assert.ok(!e.doc.has(id));\n});\n\ntest('the fixture document round-trips', () => {\n  const text = fixture('doc-v5.json');\n  const e = editor();\n  e.files.load(text);\n  const saved = JSON.parse(e.files.save());\n  const original = JSON.parse(text);\n  assert.equal(saved.name, original.name);\n  assert.deepEqual(saved.top, original.top);\n  assert.deepEqual(Object.keys(saved.nodes), Object.keys(original.nodes));\n  for (const [id, node] of Object.entries(original.nodes))\n    for (const [key, value] of Object.entries(node as object))\n      assert.deepEqual(saved.nodes[id][key], value, `${id}.${key}`);\n});\n\n",
        ],
      ],
    },
  },
  {
    key: 'c82',
    at: '2026-06-10T15:00:00Z',
    author: 'mateo',
    subject: 'Add listenerCount to the emitter',
    change: {
      'src/util/emitter.ts': [
        [
          '    for (const listener of [...set]) (listener as Listener<Events[K]>)(payload);\n  }\n\n',
          '    for (const listener of [...set]) (listener as Listener<Events[K]>)(payload);\n  }\n\n  listenerCount(event: keyof Events): number {\n    return this.listeners.get(event)?.size ?? 0;\n  }\n\n',
        ],
      ],
    },
  },
  {
    key: 'c83',
    at: '2026-06-11T10:00:00Z',
    author: 'tomas',
    subject: 'Add assertNever',
    change: {
      'src/util/assert.ts': [
        [
          '  if (!condition) throw new TesseraError(code, message);\n}\n\n',
          "  if (!condition) throw new TesseraError(code, message);\n}\n\nexport function assertNever(value: never, message = 'unexpected value'): never {\n  throw new TesseraError('never', `${message}: ${JSON.stringify(value)}`);\n}\n\n",
        ],
      ],
    },
  },
  {
    key: 'c84',
    at: '2026-06-12T10:00:00Z',
    author: 'ines',
    subject: 'Expand the README',
    change: {
      'README.md': { before: 'c84/README.md' },
    },
  },
];
