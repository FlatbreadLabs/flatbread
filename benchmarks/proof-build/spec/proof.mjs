// The Tessera Proof graph, as the mutations its authors made, commit by
// commit. gen-bed.mjs replays each commit's events through the real Proof
// writer just before it makes that commit (proof variant only), then adds a
// `Proof: <id>` trailer for each key in `trailers`.
//
// Keys are `<effort>.<key>`; every reference names a qualified key. One extra
// event type exists:
//
//   { type: 'Anchor', effort, key, title, path, symbol, commit, created_by }
//
// writes a Citation with `role: code` whose body is `<path>#<symbol>@<sha>`
// (or `<path>@<sha>` with no symbol), the 12-character hash of `commit` in
// the proof variant.
//
// Records describe past work and standing rules, in the voice their authors
// wrote them in. None of them knows about the benchmark's tasks
// (spec/banned.mjs lists the words they may not use). Five later commits
// change the code under some of them without updating Proof; DRIFTS below
// names them, and gen-bed.mjs checks that each drift is really in the history.

const INES = 'Ines Okafor';
const TOMAS = 'Tomas Lindqvist';
const PRIYA = 'Priya Raman';
const MATEO = 'Mateo Alves';

export const EFFORTS = {
  model: {
    title: 'Document model and geometry',
    body: "Ines Okafor owns this Effort. It covers Tessera core's node tree: the node types, the Document class that writes them, geometry and transforms, styles, and text measuring.",
  },
  units: {
    title: 'Units and precision',
    body: 'Priya Raman owns this Effort. It covers how lengths, angles and percentages are stored, typed and shown: the unit registry, the parser for typed values, and display precision.',
  },
  commands: {
    title: 'Command bus and history',
    body: 'Tomas Lindqvist owns this Effort. It covers commands and their payloads, the bus that runs them, undo and redo, how entries merge, batches, and the palette.',
  },
  panel: {
    title: 'Properties panel',
    body: 'Priya Raman owns this Effort. It covers the properties panel view model: sections, field descriptors, Mixed values and how a typed value is committed.',
  },
  layers: {
    title: 'Selection, layers and shortcuts',
    body: 'Mateo Alves owns this Effort. It covers what a click or a drag on the canvas selects and moves, the layers panel, and keyboard shortcuts with their focus scopes.',
  },
  persist: {
    title: 'Persistence and migrations',
    body: 'Ines Okafor owns this Effort. It covers the saved file format, its schema version, the migrations from older files, loading and validation, and what is saved where.',
  },
  plugin: {
    title: 'Plugin API v1',
    body: 'Mateo Alves owns this Effort. It covers the plugin host, the v1 API object a plugin receives, events, capabilities and the sandbox.',
  },
};

const effort = (key) => ({ type: 'CreateEffort', effort: key });
const accept = (decisionId) => ({ type: 'AcceptDecision', decisionId });
const resolve = (issueId, resolvedBy) => ({
  type: 'ResolveIssue',
  issueId,
  resolution: 'resolved',
  resolvedBy,
});
const retract = (recordId, reason) => ({ type: 'Retract', recordId, reason });
const anchor = (qualified, created_by, title, path, symbol, commit) => {
  const [eff, key] = qualified.split('.');
  return {
    type: 'Anchor',
    effort: eff,
    key,
    title,
    path,
    symbol,
    commit,
    created_by,
  };
};
const rec = (type, qualified, created_by, title, body, extra = {}) => {
  const [eff, key] = qualified.split('.');
  return { type, effort: eff, key, title, body, created_by, ...extra };
};
const issue = (q, kind, by, title, body, x) =>
  rec('WriteIssue', q, by, title, body, { kind, ...x });
const finding = (q, kind, by, title, body, x) =>
  rec('WriteFinding', q, by, title, body, { kind, ...x });
const decision = (q, by, title, body, x) =>
  rec('WriteDecision', q, by, title, body, x);
const constraint = (q, kind, by, title, body, x) =>
  rec('WriteConstraint', q, by, title, body, { kind, ...x });
const risk = (q, likelihood, severity, by, title, body, x) =>
  rec('WriteRisk', q, by, title, body, { likelihood, severity, ...x });
const compaction = (q, by, title, body, derives_from) =>
  rec('WriteCompaction', q, by, title, body, { derives_from });

export const PROOF = {
  // ------------------------------------------------------------ February
  c01: { events: [effort('model')] },

  c02: {
    trailers: [
      'model.dec-abs-coords',
      'model.con-tree-writes',
      'model.dec-group-nostyle',
      'model.dec-rotation-degrees',
    ],
    events: [
      issue(
        'model.iss-coords',
        'question',
        INES,
        'Should node coordinates be relative to the parent or absolute on the page?',
        'Every node needs an x and a y. Parent-relative coordinates make moving a container cheap: only the container changes. Absolute coordinates make every read cheap. Hit testing, selection bounds, alignment and the panel all read positions far more often than containers move.'
      ),
      decision(
        'model.dec-abs-coords',
        INES,
        'Store absolute page coordinates on every node',
        'Every node stores x, y, width and height in page coordinates, whatever it sits in. A read never walks the ancestors. Moving a frame or a group moves its descendants through the move command, which updates each one; that costs one write per descendant, and containers in real files hold tens of layers, not thousands.\n\nRejected: parent-relative coordinates. Hit testing and bounds would compose every ancestor on each read, and a rotated container would turn a simple rectangle test into a chain of transforms.',
        { derives_from: ['model.iss-coords'] }
      ),
      decision(
        'model.dec-rel-coords',
        INES,
        'Store coordinates relative to the parent',
        'Each node stores its position relative to its container. Moving a container changes one node. Reads compose the ancestors.',
        { derives_from: ['model.iss-coords'] }
      ),
      accept('model.dec-abs-coords'),
      resolve('model.iss-coords', ['model.dec-abs-coords']),
      constraint(
        'model.con-tree-writes',
        'hard',
        INES,
        'Only Document insert, remove, place and update write the node tree',
        'These four keep parent links, child lists and group bounds in step, and they emit the change event the plugin host and the panels listen to. Code that edits a node object directly skips all of that and leaves the tree inconsistent. Commands call these methods; nothing else does.'
      ),
      constraint(
        'model.con-paint-order',
        'hard',
        INES,
        'Child lists are stored back to front',
        "A container's children list, and the page's top list, are in paint order: index 0 paints first and the last child paints on top. Reordering is a move within that list."
      ),
      finding(
        'model.fnd-float-noise',
        'measurement',
        INES,
        'Rotations stored in radians did not come back as typed',
        'In 40 files from the prototype editor, which stored radians rounded to 6 digits, a rotation typed as 30° came back as 29.999999° after two save and load cycles, and 45° as 45.000001°. Rotations stored in degrees came back exactly as typed.'
      ),
      decision(
        'model.dec-rotation-degrees',
        INES,
        'Store rotation in degrees',
        "A node's rotation is stored in degrees, clockwise, about its centre. The panel shows degrees, saved files stay readable (45, not 0.7853981633974483), and whole-degree values survive save and load exactly. Trigonometry converts where it is used, in transform.ts.\n\nRejected: radians, for the noise measured in the prototype's files.",
        { derives_from: ['model.fnd-float-noise'] }
      ),
      accept('model.dec-rotation-degrees'),
      decision(
        'model.dec-group-nostyle',
        INES,
        'Groups carry no style of their own',
        "A group keeps layers together; it is not a layer with a look. It has no fills, no strokes and no opacity. Opacity set on a group applies to its children: the panel writes the value to every styled node inside it. What a child's panel shows is what it renders at, and there is one place to look for a layer's opacity.\n\nRejected: an opacity on the group multiplied in at render, because a child showing 100% could render at 50% with nothing in its own panel to say why."
      ),
      accept('model.dec-group-nostyle'),
    ],
  },

  c03: {
    events: [
      anchor(
        'model.cit-document',
        INES,
        'Code: Document, the only writer of the node tree',
        'src/model/document.ts',
        'Document',
        'c02'
      ),
      anchor(
        'model.cit-effective-opacity',
        INES,
        'Code: the opacity a node renders at',
        'src/model/style.ts',
        'effectiveOpacity',
        'c02'
      ),
      anchor(
        'model.cit-rotate',
        INES,
        'Code: rotating points and corners',
        'src/model/transform.ts',
        'rotatePoint',
        'c02'
      ),
    ],
  },

  c04: {
    trailers: ['model.dec-text-measure'],
    events: [
      issue(
        'model.iss-text-metrics',
        'question',
        INES,
        'How should core measure text without a font engine?',
        'Text boxes need a height that fits their lines, and wrapping needs widths. Core has no DOM and no font files.'
      ),
      finding(
        'model.fnd-glyph-advance-v1',
        'measurement',
        INES,
        'Average glyph advance in the test fonts is 0.55 em',
        'Measured on lower-case English text in the four fonts the shell ships: Inter, Source Serif, IBM Plex Mono and Work Sans. The mean advance is 0.55 of the font size.'
      ),
      decision(
        'model.dec-text-measure',
        INES,
        'Measure text with a fixed glyph advance',
        'Core measures a line as its length times the font size times a fixed advance (GLYPH_ADVANCE). It needs no fonts, gives the same answer on every machine, and tests can predict it. The shell can re-measure with real metrics for display; stored heights come from core.\n\nRejected: real font metrics in core, which would need font files and a shaper in a package that has no dependencies.',
        {
          derives_from: [
            'model.iss-text-metrics',
            'model.fnd-glyph-advance-v1',
          ],
        }
      ),
      decision(
        'model.dec-font-metrics',
        INES,
        'Measure text with real font metrics',
        'Load the font files and shape each line to measure it exactly.',
        { derives_from: ['model.iss-text-metrics'] }
      ),
      accept('model.dec-text-measure'),
      resolve('model.iss-text-metrics', ['model.dec-text-measure']),
      risk(
        'model.rsk-text-width',
        'medium',
        'low',
        INES,
        'Fixed-advance widths misjudge wide and narrow scripts',
        'CJK text is close to 1 em per glyph and Thai combines marks with no advance, so boxes wrap too late or too early. It shows only in auto height; nothing else in core depends on text width.'
      ),
    ],
  },

  c05: {
    trailers: [
      'units.dec-store-px',
      'units.con-never-round',
      'units.dec-display-precision',
    ],
    events: [
      effort('units'),
      issue(
        'units.iss-unit-storage',
        'question',
        PRIYA,
        'How should lengths be stored when people type different units?',
        'People type px, points and inches, and sometimes a share of something. Storage has to pick one form.'
      ),
      decision(
        'units.dec-store-px',
        PRIYA,
        'Store every length in px; units convert only at the edges',
        'Every stored length is a px number. The unit registry turns typed units into px when a value comes in and back when one is shown. Geometry, hit testing and files never see a unit.\n\nRejected: storing a value and a unit together, because every geometry function would convert, and one selection could hold the same width in three units.',
        { derives_from: ['units.iss-unit-storage'] }
      ),
      decision(
        'units.dec-store-unit-pairs',
        PRIYA,
        'Store each length as a value and a unit',
        'Keep what the user typed, such as { value: 2, unit: "in" }, and convert when computing.',
        { derives_from: ['units.iss-unit-storage'] }
      ),
      accept('units.dec-store-px'),
      resolve('units.iss-unit-storage', ['units.dec-store-px']),
      issue(
        'units.iss-drift',
        'bug',
        PRIYA,
        'Positions drifted after repeated small moves in the prototype',
        'The prototype rounded stored x and y to two decimals after every command. Ten moves of 0.1 left a layer at 0.9 or 1.1 depending on where it started, and alignment checks failed by a hundredth.'
      ),
      finding(
        'units.fnd-drift-cause',
        'analysis',
        PRIYA,
        'Rounding on store compounds; rounding on display does not',
        'Each stored rounding loses up to half a unit of the last digit, and the next command starts from the rounded value, so the error grows with the number of edits. Rounding only what a field shows loses nothing: the stored value stays exact and every display is rounded once.',
        { derives_from: ['units.iss-drift'] }
      ),
      constraint(
        'units.con-never-round',
        'hard',
        PRIYA,
        'Stored geometry is never rounded; precision applies only to display',
        'No command, migration or panel write rounds a stored number. Display precision (precision.ts) is applied when a value is formatted for a field, and only there.',
        { derives_from: ['units.iss-drift', 'units.fnd-drift-cause'] }
      ),
      resolve('units.iss-drift', ['units.con-never-round']),
      decision(
        'units.dec-display-precision',
        PRIYA,
        'Display precision per unit',
        'Fields show px and pt with 2 decimals, inches with 3, percentages and degrees with 1, and trim trailing zeros. A value that shows the same text counts as the same value on screen.',
        { derives_from: ['units.con-never-round'] }
      ),
      accept('units.dec-display-precision'),
      constraint(
        'units.con-px-in-files',
        'hard',
        PRIYA,
        'Saved files hold px numbers only',
        'A file never stores a unit or a length string. Version 1 files from the prototype did, and the v1→v2 migration reads them; nothing writes them now.'
      ),
    ],
  },

  c06: {
    trailers: ['layers.dec-normalize-selection'],
    events: [
      effort('layers'),
      decision(
        'layers.dec-normalize-selection',
        MATEO,
        'A selection never holds a node and one of its ancestors',
        'When a container and something inside it are both selected, only the container stays. Moving both would move the child twice, since moving a container already moves what is in it.'
      ),
      accept('layers.dec-normalize-selection'),
    ],
  },

  c07: {
    trailers: [
      'commands.dec-inverse',
      'commands.dec-coalesce-window',
      'commands.dec-undo-cap-100',
      'commands.con-selection-restore',
    ],
    events: [
      effort('commands'),
      issue(
        'commands.iss-undo-model',
        'question',
        TOMAS,
        'Should undo keep document snapshots or inverse commands?',
        'History needs to take back any change. Two shapes: a snapshot of the document per entry, or each command producing the command that reverses it.'
      ),
      finding(
        'commands.fnd-snapshot-memory',
        'measurement',
        TOMAS,
        'Whole-document snapshots cost 38 MB for 100 entries',
        'On the 4,000-node test file, structuredClone of the document per entry used 38 MB for 100 entries and took 4 ms per edit. A drag of 60 moves would clone 60 times.',
        { derives_from: ['commands.iss-undo-model'] }
      ),
      decision(
        'commands.dec-inverse',
        TOMAS,
        'Each command returns the command that undoes it',
        'A handler applies its payload and returns the inverse command, built from the state it just replaced. History stores both. Undo runs the inverses last to first; redo runs the commands again and stores fresh inverses.\n\nRejected: snapshots, for the memory measured on the test file.',
        {
          derives_from: [
            'commands.iss-undo-model',
            'commands.fnd-snapshot-memory',
          ],
        }
      ),
      decision(
        'commands.dec-snapshots',
        TOMAS,
        'Keep a document snapshot for each history entry',
        'Clone the document before every entry; undo restores the clone.',
        { derives_from: ['commands.iss-undo-model'] }
      ),
      accept('commands.dec-inverse'),
      resolve('commands.iss-undo-model', ['commands.dec-inverse']),
      constraint(
        'commands.con-selection-restore',
        'hard',
        TOMAS,
        'Undo restores the exact selection from before the change',
        'Every entry records the selection before and after, in order. Undo puts back the one before and redo the one after, so a person can undo, look at what was selected, and redo without losing their place.'
      ),
      issue(
        'commands.iss-coalesce',
        'question',
        TOMAS,
        'How should a drag become a single history entry?',
        'A drag sends a move on every pointer event. Recording each as its own entry would make a drag take 60 presses of Undo.'
      ),
      decision(
        'commands.dec-coalesce-window',
        TOMAS,
        'Merge entries with the same label that arrive within 500 ms',
        'When a new entry has the same label as the newest one and arrives no more than 500 ms after it, history folds it into that entry. Pointer events during a drag are 8 to 16 ms apart, so a drag is one entry.',
        { derives_from: ['commands.iss-coalesce'] }
      ),
      accept('commands.dec-coalesce-window'),
      resolve('commands.iss-coalesce', ['commands.dec-coalesce-window']),
      decision(
        'commands.dec-undo-cap-100',
        TOMAS,
        'Keep the last 100 history entries',
        'Older entries are dropped. 100 is what the prototype kept, and nobody had complained.'
      ),
      accept('commands.dec-undo-cap-100'),
    ],
  },

  c08: {
    trailers: ['commands.dec-plain-payloads', 'commands.con-plain-payloads'],
    events: [
      issue(
        'commands.iss-payload-shape',
        'question',
        TOMAS,
        'What may a command payload hold?',
        'The first reorder draft passed the node object itself. The others pass ids.'
      ),
      issue(
        'commands.iss-replay-stale',
        'bug',
        TOMAS,
        'A recorded macro replayed against stale nodes after a reload',
        "The macro recorder in the test harness records the bus's commands and replays them on another copy of the document. It failed on the first reorder draft, whose payload held the node object: after the document was reloaded, replay moved an object that was no longer in the tree, and nothing on screen changed."
      ),
      decision(
        'commands.dec-plain-payloads',
        TOMAS,
        'Command payloads name nodes by id',
        'A payload refers to nodes by id and carries plain values. The handler looks nodes up in the document it is applied to, so the same command works on any copy of the document.\n\nRejected: commands as class objects holding their target nodes. They cannot be recorded, compared in tests, or sent anywhere else.',
        {
          derives_from: [
            'commands.iss-payload-shape',
            'commands.iss-replay-stale',
          ],
        }
      ),
      decision(
        'commands.dec-command-classes',
        TOMAS,
        'Model commands as class objects that hold their target nodes',
        'Each command is an object with apply and undo methods and references to the nodes it changes.',
        { derives_from: ['commands.iss-payload-shape'] }
      ),
      accept('commands.dec-plain-payloads'),
      constraint(
        'commands.con-plain-payloads',
        'hard',
        TOMAS,
        'Command payloads are plain JSON holding node ids, never node objects',
        'A payload holds only ids, numbers, strings, booleans, null, and arrays and objects of those. Never a node object, a closure, a Map, a Date or a class object. A payload must survive JSON.stringify and JSON.parse and replay to the same result on the same document state, so a command log can be recorded, saved and replayed (macros, test fixtures, a future worker). The bus does not check this; review does.',
        {
          derives_from: [
            'commands.dec-plain-payloads',
            'commands.iss-replay-stale',
          ],
        }
      ),
      resolve('commands.iss-payload-shape', ['commands.dec-plain-payloads']),
      resolve('commands.iss-replay-stale', ['commands.con-plain-payloads']),
      anchor(
        'commands.cit-history',
        TOMAS,
        'Code: History and its entries',
        'src/commands/history.ts',
        'History',
        'c07'
      ),
      anchor(
        'commands.cit-bus',
        TOMAS,
        'Code: the command bus',
        'src/commands/bus.ts',
        'CommandBus',
        'c07'
      ),
      anchor(
        'commands.cit-set-prop',
        TOMAS,
        'Code: the set-prop command',
        'src/commands/builtin/set-prop.ts',
        'setPropHandler',
        'c07'
      ),
    ],
  },

  c10: {
    trailers: ['commands.dec-batch'],
    events: [
      decision(
        'commands.dec-batch',
        TOMAS,
        'batch() records nested dispatches as one entry',
        'Group selection is several commands: insert the group, then move each member into it. batch() collects them into one entry with the selection from before the first and after the last. Batches nest; only the outermost one records.',
        { derives_from: ['commands.con-selection-restore'] }
      ),
      accept('commands.dec-batch'),
      anchor(
        'commands.cit-batch',
        TOMAS,
        'Code: batch()',
        'src/commands/batch.ts',
        'batch',
        'c07'
      ),
    ],
  },

  c11: {
    trailers: ['model.dec-group-bounds'],
    events: [
      decision(
        'model.dec-group-bounds',
        INES,
        'Group bounds follow their children; an empty group keeps its own',
        "A group's x, y, width and height are recomputed from its children on every tree write, in Document. Nothing sets them directly. A group whose last child leaves keeps the bounds it had, so it can still be found and selected in the layers panel.",
        { derives_from: ['model.con-tree-writes'] }
      ),
      accept('model.dec-group-bounds'),
    ],
  },

  c12: {
    trailers: ['layers.dec-group-click'],
    events: [
      issue(
        'layers.iss-click-target',
        'question',
        MATEO,
        'What does a click inside a group select?',
        'A click lands on a leaf layer. It could select that layer, its group, or the outermost group around it.'
      ),
      decision(
        'layers.dec-group-click',
        MATEO,
        'A click selects the outermost group around the hit layer, up to the nearest frame',
        "Groups behave as one object on the canvas: clicking any part of a group selects the group. Frames are containers people work inside, so a frame's children are selected directly. Groups themselves are never hit, only through a child.\n\nRejected: always selecting the leaf under the pointer, which made moving a group a hunt for its edge.",
        { derives_from: ['layers.iss-click-target'] }
      ),
      decision(
        'layers.dec-click-leaf',
        MATEO,
        'A click selects the layer under the pointer, whatever it sits in',
        'No special case for groups: the frontmost leaf under the point is selected.',
        { derives_from: ['layers.iss-click-target'] }
      ),
      accept('layers.dec-group-click'),
      resolve('layers.iss-click-target', ['layers.dec-group-click']),
      finding(
        'layers.fnd-hit-cost-v1',
        'measurement',
        MATEO,
        'hitNode over 5,000 nodes takes 9 ms',
        'One click on the 5,000-node stress file, measured in the test runner.'
      ),
      issue(
        'model.iss-rotated-hit',
        'bug',
        MATEO,
        'Clicks near a rotated rectangle hit the layer behind it',
        'With a rectangle rotated 30°, a click inside its visible edge selected the layer behind, and a click just outside it selected the rectangle.'
      ),
      finding(
        'model.fnd-rotated-hit-cause',
        'analysis',
        INES,
        'The hit test used the unrotated box',
        'pointInNode compared the point with the stored x, y, width and height, which describe the box before rotation. It now turns the point by minus the rotation about the centre first.',
        { derives_from: ['model.iss-rotated-hit'] }
      ),
      resolve('model.iss-rotated-hit', ['model.fnd-rotated-hit-cause']),
    ],
  },

  c13: {
    trailers: [
      'panel.dec-sections',
      'panel.dec-mixed',
      'panel.con-panel-commands',
      'units.dec-parse-length',
    ],
    events: [
      effort('panel'),
      issue(
        'panel.iss-panel-shape',
        'question',
        PRIYA,
        'How should the properties panel be built?',
        'Six node types share most fields and differ in a few.'
      ),
      decision(
        'panel.dec-sections',
        PRIYA,
        'Build the panel from section and field descriptors',
        'Each field says which nodes it applies to, how to read a value and which commands write it. A section shows when any of its fields applies to a selected node. Adding a field is one descriptor.\n\nRejected: one hand-written view per node type, which repeated X, Y, W and H five times and mixed reading values with writing them.',
        { derives_from: ['panel.iss-panel-shape'] }
      ),
      decision(
        'panel.dec-per-type-views',
        PRIYA,
        'Write one panel view per node type',
        'A view for rectangles, one for text, one for frames, and so on, each with its own fields.',
        { derives_from: ['panel.iss-panel-shape'] }
      ),
      accept('panel.dec-sections'),
      resolve('panel.iss-panel-shape', ['panel.dec-sections']),
      decision(
        'panel.dec-mixed',
        PRIYA,
        'A field shows Mixed when the selected nodes disagree',
        'When several nodes are selected, a field shows the shared value of the nodes it applies to, or the word Mixed. Typing into a Mixed field sets every one of them.'
      ),
      accept('panel.dec-mixed'),
      constraint(
        'panel.con-panel-commands',
        'hard',
        PRIYA,
        'The panel changes the document only by dispatching commands',
        'A field write returns commands; the panel dispatches them. It never calls Document methods or edits nodes, so every panel edit is undoable and reaches the plugin host.'
      ),
      issue(
        'panel.iss-commit-timing',
        'question',
        PRIYA,
        'When does a field commit what is typed?',
        'On every keystroke, or when the person is done.'
      ),
      decision(
        'panel.dec-commit-on-enter',
        PRIYA,
        'A field commits on Enter or when it loses focus',
        'Half-typed values never reach the document, and one edit is one commit.\n\nRejected: committing on every keystroke, which wrote 1, then 12, then 120 into the document while someone typed 120.',
        { derives_from: ['panel.iss-commit-timing'] }
      ),
      decision(
        'panel.dec-commit-each-key',
        PRIYA,
        'Commit a field on every keystroke',
        'Each keystroke dispatches the value so far, for live feedback on the canvas.',
        { derives_from: ['panel.iss-commit-timing'] }
      ),
      accept('panel.dec-commit-on-enter'),
      resolve('panel.iss-commit-timing', ['panel.dec-commit-on-enter']),
      decision(
        'units.dec-parse-length',
        PRIYA,
        'Panel fields parse typed lengths with parseLength',
        'units/parse.ts#parseLength is the one parser for what people type into length and number fields: a number with an optional px suffix. The same function reads the length strings that version 1 files stored, so text typed in the panel and the same text in an old file always mean the same thing. panel/fields.ts calls it through toLength.\n\nRejected: a separate expression parser for the panel, which would accept input that files never could.',
        { derives_from: ['units.dec-store-px'] }
      ),
      accept('units.dec-parse-length'),
    ],
  },

  c14: {
    trailers: ['panel.dec-group-opacity-push'],
    events: [
      issue(
        'panel.iss-group-opacity',
        'question',
        PRIYA,
        'What should Opacity do when a group is selected?',
        'Groups carry no style (model Effort), but people select a group and expect an Opacity field.'
      ),
      decision(
        'panel.dec-group-opacity-push',
        PRIYA,
        'Opacity on a group sets the opacity of every styled node inside it',
        "The Opacity field applies to groups. Writing it on a group dispatches set-prop opacity for every non-group descendant, and reading it shows the first descendant's value. The group itself has no opacity to set.",
        { derives_from: ['panel.iss-group-opacity', 'model.dec-group-nostyle'] }
      ),
      accept('panel.dec-group-opacity-push'),
      resolve('panel.iss-group-opacity', ['panel.dec-group-opacity-push']),
      anchor(
        'units.cit-parse-length',
        PRIYA,
        'Code: parseLength, the parser for typed lengths',
        'src/units/parse.ts',
        'parseLength',
        'c05'
      ),
      anchor(
        'units.cit-to-length',
        PRIYA,
        'Code: how panel fields read typed lengths',
        'src/panel/fields.ts',
        'toLength',
        'c13'
      ),
      anchor(
        'panel.cit-properties',
        PRIYA,
        'Code: the properties panel',
        'src/panel/properties.ts',
        'PropertiesPanel',
        'c13'
      ),
    ],
  },

  c15: {
    trailers: ['panel.dec-text-autoheight'],
    events: [
      decision(
        'panel.dec-text-autoheight',
        PRIYA,
        'Editing text resizes the text box height to fit',
        'Changing the text, font size or line height also sets the height from the wrapped line count, in the same field commit. Width stays as the person set it.',
        { derives_from: ['model.dec-text-measure'] }
      ),
      accept('panel.dec-text-autoheight'),
      anchor(
        'panel.cit-appearance',
        PRIYA,
        'Code: the Appearance section and its Opacity field',
        'src/panel/sections/appearance.ts',
        'appearanceSection',
        'c14'
      ),
    ],
  },

  c16: {
    events: [
      finding(
        'model.fnd-glyph-advance',
        'measurement',
        INES,
        'Average glyph advance is 0.6 em once capitals and digits count',
        'Remeasured on mixed text from 30 real files (titles, labels, prices) rather than lower-case prose: 0.6 of the font size. GLYPH_ADVANCE is 0.6.',
        { invalidates: ['model.fnd-glyph-advance-v1'] }
      ),
      finding(
        'model.fnd-emoji-width',
        'measurement',
        INES,
        'Emoji measure as two glyphs',
        'An emoji is two UTF-16 units, so line length counts it twice.'
      ),
      retract(
        'model.fnd-emoji-width',
        'Filed against core by mistake; emoji width is measured by the shell, which owns rendering.'
      ),
      anchor(
        'model.cit-fitgroup',
        INES,
        'Code: group bounds from children',
        'src/model/geometry.ts',
        'fitGroup',
        'c11'
      ),
    ],
  },

  c18: {
    trailers: ['layers.con-hit-filter'],
    events: [
      issue(
        'layers.iss-locked-selected',
        'bug',
        MATEO,
        'Clicks selected the locked background layer',
        'People lock a background image so they can work on top of it. A click on any empty-looking part of the canvas selected and dragged the background.'
      ),
      constraint(
        'layers.con-hit-filter',
        'hard',
        MATEO,
        'Hidden and locked layers are never hit or selected from the canvas',
        'Neither is anything inside a hidden or locked container. Select all follows the same rule. The layers panel can still select them, since that is how people unlock or show a layer.',
        { derives_from: ['layers.iss-locked-selected'] }
      ),
      resolve('layers.iss-locked-selected', ['layers.con-hit-filter']),
    ],
  },

  c19: {
    events: [
      finding(
        'panel.fnd-mixed-noise',
        'analysis',
        PRIYA,
        'Raw comparison showed Mixed for 10 and 10.000001',
        'After a few moves, layers that all show 10 held 10 and 10.000000000000002, and the field said Mixed. Comparing the text each value shows fixes it, and matches what the person sees.',
        { derives_from: ['panel.dec-mixed'] }
      ),
      finding(
        'panel.fnd-view-cost-v1',
        'measurement',
        PRIYA,
        'panel.view() over 1,000 selected rectangles takes 40 ms',
        'Measured on the stress file with all rectangles selected.'
      ),
    ],
  },

  c20: {
    trailers: ['commands.dec-gesture-entry', 'panel.dec-commit-per-field'],
    events: [
      issue(
        'commands.iss-twelve-undos',
        'bug',
        PRIYA,
        'Undo needed 12 presses after a multi-select edit',
        'Setting Y on 12 selected layers made 12 history entries, one per layer, because each set-prop carried its layer name in the label and only entries with the same label merge. People expect one Undo to take back what one edit did.'
      ),
      decision(
        'commands.dec-gesture-entry',
        TOMAS,
        'One user gesture is one history entry, however many nodes it touches',
        'A gesture is what the person did once: a field commit, a drag, a palette command, a key press. Every command a gesture dispatches lands in one entry, so one Undo takes the whole gesture back and the selection returns to what it was. A command that changes several nodes either takes all their ids in one payload, or the caller groups its dispatches so they merge (batch(), or the same merge key on each).\n\nRejected: one entry per changed node, which is what made the 12-press undo.',
        {
          derives_from: [
            'commands.iss-twelve-undos',
            'commands.con-selection-restore',
          ],
        }
      ),
      accept('commands.dec-gesture-entry'),
      resolve('commands.iss-twelve-undos', ['commands.dec-gesture-entry']),
      decision(
        'panel.dec-commit-per-field',
        PRIYA,
        'A field commit writes every selected node it applies to, as one gesture',
        "commitField parses the text once, asks the field for each applicable node's commands, and dispatches them all under one label so they merge into one entry.",
        { derives_from: ['commands.dec-gesture-entry', 'panel.dec-mixed'] }
      ),
      accept('panel.dec-commit-per-field'),
    ],
  },

  // --------------------------------------------------------------- March
  c21: {
    trailers: ['layers.dec-layers-order'],
    events: [
      issue(
        'layers.iss-layers-order',
        'question',
        MATEO,
        'Which way should the layers list run?',
        'The list can follow the child lists as stored, back to front, or show the frontmost layer at the top.'
      ),
      decision(
        'layers.dec-layers-order',
        MATEO,
        'The layers list is back to front: row 0 is the backmost layer',
        "Rows follow the document's child lists index for index, so a row's position among its siblings is its paint-order index and a drop needs no conversion. Keyboard steps and range selection read rows in the same order.\n\nRejected: frontmost first, which every drop and every keyboard step would have to reverse.",
        { derives_from: ['layers.iss-layers-order', 'model.con-paint-order'] }
      ),
      decision(
        'layers.dec-layers-front-first',
        MATEO,
        'List layers frontmost first',
        'Show the layer that paints on top as the first row.',
        { derives_from: ['layers.iss-layers-order'] }
      ),
      accept('layers.dec-layers-order'),
      resolve('layers.iss-layers-order', ['layers.dec-layers-order']),
      anchor(
        'layers.cit-hit',
        MATEO,
        'Code: canvas hit testing',
        'src/selection/hit.ts',
        'hitNode',
        'c18'
      ),
    ],
  },

  c22: {
    trailers: ['layers.dec-drop-positions'],
    events: [
      finding(
        'layers.fnd-drag-index',
        'analysis',
        MATEO,
        'With rows in paint order, a drop above row i lands at index i',
        "Because the layers list is in the same order as the parent's child list, a row dropped above another takes that row's index and one dropped below goes one after it, once the dragged row is taken out of the list.",
        { derives_from: ['layers.dec-layers-order'] }
      ),
      decision(
        'layers.dec-drop-positions',
        MATEO,
        'A dragged row lands above, below or inside another row',
        "Above and below place it among the target's siblings; inside, on a frame or group, puts it last in that container's child list. Dropping a container inside itself or its own descendant is refused.",
        { derives_from: ['layers.fnd-drag-index'] }
      ),
      accept('layers.dec-drop-positions'),
      anchor(
        'layers.cit-tree-view',
        MATEO,
        'Code: the rows of the layers panel',
        'src/layers/tree-view.ts',
        'buildRows',
        'c21'
      ),
    ],
  },

  c23: {
    trailers: [
      'persist.dec-int-version',
      'persist.dec-stable-save',
      'persist.dec-v1-strings',
      'persist.dec-defaults-on-load',
    ],
    events: [
      effort('persist'),
      issue(
        'persist.iss-file-version',
        'question',
        INES,
        'How should a saved file say which format it uses?',
        'The prototype wrote three formats with no marker but their shape. Core needs to read all three and its own.'
      ),
      decision(
        'persist.dec-int-version',
        INES,
        'Files carry an integer schema version; migrations run one step at a time',
        "Every file has a version number. Loading runs the migration from the file's version to the next, then the next, until it reaches the current one. Each step only knows two adjacent versions.\n\nRejected: semver strings, which invite steps that skip versions and leave nobody sure which steps a file went through.",
        { derives_from: ['persist.iss-file-version'] }
      ),
      decision(
        'persist.dec-semver-files',
        INES,
        'Version files with semver strings',
        'Write "1.2.0" style versions and migrate by ranges.',
        { derives_from: ['persist.iss-file-version'] }
      ),
      accept('persist.dec-int-version'),
      resolve('persist.iss-file-version', ['persist.dec-int-version']),
      decision(
        'persist.dec-stable-save',
        INES,
        'The same document always saves the same text',
        'Nodes are written in paint order and each node with its keys sorted, two-space indented. Saving twice gives identical files, so a diff shows only real edits.'
      ),
      accept('persist.dec-stable-save'),
      decision(
        'persist.dec-v1-strings',
        INES,
        'The v1→v2 step reads legacy length strings with parseLength',
        'Version 1 stored lengths as strings like "12px". The step converts them with the same parser the panel uses for typed lengths.',
        { derives_from: ['units.dec-parse-length'] }
      ),
      accept('persist.dec-v1-strings'),
      decision(
        'persist.dec-defaults-on-load',
        INES,
        'Fields an older file leaves out get defaults when it loads',
        'Loading fills in visible, locked, rotation, fills, strokes and text settings that the prototype formats wrote only when they were set, before validation. This covers files from before versions existed; it is not how the format gains a field.'
      ),
      accept('persist.dec-defaults-on-load'),
    ],
  },

  c24: {
    trailers: ['persist.dec-refuse-newer'],
    events: [
      decision(
        'persist.dec-refuse-newer',
        INES,
        'A file from a newer editor is refused, never read in part',
        'If the version is above SCHEMA_VERSION, loading fails with newer-file. Reading what we understand and dropping the rest would lose data on the next save.'
      ),
      accept('persist.dec-refuse-newer'),
      anchor(
        'persist.cit-migrate',
        INES,
        'Code: migrate(), one step at a time',
        'src/persist/migrations/index.ts',
        'migrate',
        'c23'
      ),
      anchor(
        'persist.cit-v2v3',
        INES,
        'Code: the version 2 to 3 step',
        'src/persist/migrations/v2-v3.ts',
        'v2ToV3',
        'c23'
      ),
      anchor(
        'persist.cit-serialize',
        INES,
        'Code: saving a document',
        'src/persist/serialize.ts',
        'serializeDocument',
        'c23'
      ),
    ],
  },

  c25: {
    trailers: ['panel.dec-rotation-field', 'units.dec-angle-display'],
    events: [
      decision(
        'panel.dec-rotation-field',
        PRIYA,
        'The Rotation field stores what the person types, in degrees',
        'Typed degrees go to the node as they are, normalised to (-180, 180], so 270 is stored as -90. There is no conversion, because the model stores degrees.',
        { derives_from: ['model.dec-rotation-degrees'] }
      ),
      accept('panel.dec-rotation-field'),
      decision(
        'units.dec-angle-display',
        PRIYA,
        'Angles show one decimal and a degree sign',
        'A rotation field shows 45° or 12.5°. A trailing ° is accepted when typing.',
        { derives_from: ['units.dec-display-precision'] }
      ),
      accept('units.dec-angle-display'),
      anchor(
        'panel.cit-mixed',
        PRIYA,
        'Code: combining field values, and Mixed',
        'src/panel/mixed.ts',
        'combine',
        'c19'
      ),
      anchor(
        'panel.cit-commit',
        PRIYA,
        'Code: committing a field',
        'src/panel/commit.ts',
        'commitField',
        'c20'
      ),
    ],
  },

  c26: {
    trailers: ['commands.dec-nudge-steps'],
    events: [
      decision(
        'commands.dec-nudge-steps',
        TOMAS,
        'Arrow keys nudge by 1 px, with Shift by 10',
        'Nudge is its own command type with its own label, so a nudge reads as Nudge in history. The steps match what people know from other editors.'
      ),
      accept('commands.dec-nudge-steps'),
    ],
  },

  c27: {
    trailers: [
      'layers.dec-keymap-table',
      'layers.dec-scopes',
      'layers.dec-chord-spelling',
    ],
    events: [
      issue(
        'layers.iss-arrow-in-panel',
        'bug',
        MATEO,
        'Arrow keys nudged layers while typing in the panel',
        'In the early shell every key went to the canvas, so moving the text cursor in a field nudged the selection.'
      ),
      decision(
        'layers.dec-scopes',
        MATEO,
        'Keys go to the focused scope first, then to the global bindings',
        'There are three scopes: canvas, layers and panel. A press runs the binding of the scope with focus; if it has none, the global one (undo and redo). Escape in the panel returns focus to the canvas.',
        { derives_from: ['layers.iss-arrow-in-panel'] }
      ),
      accept('layers.dec-scopes'),
      resolve('layers.iss-arrow-in-panel', ['layers.dec-scopes']),
      decision(
        'layers.dec-keymap-table',
        MATEO,
        'Shortcuts are registered in keys/keymap.ts',
        "DEFAULT_KEYMAP maps each scope's chords to action names, and the dispatcher looks every press up in it. To add a shortcut, add the chord and an action name to DEFAULT_KEYMAP, or call registerBinding at run time, and give the action a handler in the dispatcher's ACTIONS. One table means the dispatcher, the docs and plugins can never disagree about what a key does.",
        { derives_from: ['layers.dec-scopes'] }
      ),
      accept('layers.dec-keymap-table'),
      decision(
        'layers.dec-chord-spelling',
        MATEO,
        'One spelling per chord: Mod, Alt, Shift, then the key',
        'Every chord is normalised before lookup, so cmd+shift+z, Shift+Mod+Z and ctrl+shift+z all find the binding for Mod+Shift+Z. Mod is Cmd on macOS and Ctrl elsewhere.'
      ),
      accept('layers.dec-chord-spelling'),
      constraint(
        'layers.con-one-action',
        'hard',
        MATEO,
        'A key press runs at most one action',
        'A chord has one binding per scope, and the focused scope wins over global. Nothing chains actions on one press.'
      ),
    ],
  },

  c28: {
    events: [
      anchor(
        'layers.cit-default-keymap',
        MATEO,
        'Code: DEFAULT_KEYMAP, the shortcut table',
        'src/keys/keymap.ts',
        'DEFAULT_KEYMAP',
        'c27'
      ),
      anchor(
        'layers.cit-register-binding',
        MATEO,
        'Code: registering a shortcut at run time',
        'src/keys/keymap.ts',
        'registerBinding',
        'c27'
      ),
      anchor(
        'layers.cit-drag',
        MATEO,
        'Code: where a dropped row lands',
        'src/layers/drag.ts',
        'dropPlacement',
        'c22'
      ),
    ],
  },

  c30: {
    trailers: ['plugin.dec-capabilities', 'plugin.dec-shortcuts-table'],
    events: [
      effort('plugin'),
      issue(
        'plugin.iss-plugin-access',
        'question',
        MATEO,
        'What may plugins reach?',
        'Plugins need to read what is selected and run commands. Some authors asked for network access and file access.'
      ),
      decision(
        'plugin.dec-capabilities',
        MATEO,
        'Plugins declare capabilities in their manifest; anything else is refused',
        'A manifest lists the capabilities it needs; loading refuses an unknown one. Without a capability, its part of the API is absent, not failing.\n\nRejected: a network capability, since core has no network and a shell can offer it outside the plugin API.',
        { derives_from: ['plugin.iss-plugin-access'] }
      ),
      decision(
        'plugin.dec-network-capability',
        MATEO,
        'Offer a network capability',
        'Let a plugin with network fetch from any origin.',
        { derives_from: ['plugin.iss-plugin-access'] }
      ),
      accept('plugin.dec-capabilities'),
      resolve('plugin.iss-plugin-access', ['plugin.dec-capabilities']),
      decision(
        'plugin.dec-shortcuts-table',
        MATEO,
        'api.shortcuts() returns DEFAULT_KEYMAP, the table the dispatcher runs',
        'Plugins see exactly the shortcuts the editor uses. A binding added with registerBinding shows up in the next shortcuts() call.',
        { derives_from: ['layers.dec-keymap-table'] }
      ),
      accept('plugin.dec-shortcuts-table'),
    ],
  },

  c31: {
    trailers: ['plugin.dec-sandbox'],
    events: [
      issue(
        'plugin.iss-plugin-throw',
        'bug',
        MATEO,
        'A throwing listener stopped every later listener',
        'A plugin that threw in documentchange stopped the event before the next plugin, and the throw came out of the command that changed the document.'
      ),
      decision(
        'plugin.dec-sandbox',
        MATEO,
        'Every call into a plugin is caught and logged; an unloaded plugin is cut off',
        "main() and every listener run through the sandbox, which records the error and carries on. After unload, every method of that plugin's API throws.",
        { derives_from: ['plugin.iss-plugin-throw'] }
      ),
      accept('plugin.dec-sandbox'),
      resolve('plugin.iss-plugin-throw', ['plugin.dec-sandbox']),
    ],
  },

  c32: {
    trailers: ['layers.dec-drag-moves-selection'],
    events: [
      decision(
        'layers.dec-drag-moves-selection',
        MATEO,
        'Dragging any selected layer moves the whole selection',
        'Pointer down on a selected layer keeps the selection and drags all of it; on an unselected one it selects that layer first. A drag is one move command per pointer event, merged into one entry.',
        { derives_from: ['layers.dec-group-click'] }
      ),
      accept('layers.dec-drag-moves-selection'),
      anchor(
        'plugin.cit-host',
        MATEO,
        'Code: the plugin host',
        'src/plugin/host.ts',
        'PluginHost',
        'c31'
      ),
    ],
  },

  c33: {
    trailers: ['plugin.con-frozen-snapshots', 'plugin.dec-ids-only-events'],
    events: [
      issue(
        'plugin.iss-plugin-mutation',
        'bug',
        MATEO,
        'A plugin mutated nodes and bypassed history',
        'The lint plugin read layers with getNode and renamed the ones it disliked by assigning node.name. The rename skipped the bus: no history entry, no change event, and the layers panel kept the old name until some unrelated change redrew it.'
      ),
      finding(
        'plugin.fnd-mutation-cause',
        'analysis',
        MATEO,
        'getNode handed out the live node object from the document',
        'getNode returned doc.get(id) itself. Any assignment a plugin made went straight into the tree.',
        { derives_from: ['plugin.iss-plugin-mutation'] }
      ),
      constraint(
        'plugin.con-frozen-snapshots',
        'hard',
        MATEO,
        'Plugins receive frozen snapshots, never live nodes',
        'Anything a plugin is handed is a copy made at the moment of the call and deep-frozen with Object.freeze: node data, lists of nodes, event payloads. A plugin changes the document only through runCommand, which goes through the bus and history. getNode is gone; v1 hands out ids.',
        {
          derives_from: [
            'plugin.iss-plugin-mutation',
            'plugin.fnd-mutation-cause',
          ],
        }
      ),
      decision(
        'plugin.dec-ids-only-events',
        MATEO,
        'Plugin events and the selection carry ids and plain values, never nodes',
        'documentchange carries the changed ids, getSelection returns ids. Anything more a plugin is handed is plain data copied out of the document, never a node, and frozen like the rest.',
        { derives_from: ['plugin.con-frozen-snapshots'] }
      ),
      accept('plugin.dec-ids-only-events'),
      resolve('plugin.iss-plugin-mutation', [
        'plugin.con-frozen-snapshots',
        'plugin.dec-ids-only-events',
      ]),
    ],
  },

  c34: {
    trailers: ['plugin.dec-export-capability'],
    events: [
      decision(
        'plugin.dec-export-capability',
        MATEO,
        'export is the first capability: the document as a saved file string',
        'api.export.document() returns what files.save() writes. A string is a copy by nature, so it needs no freezing.',
        {
          derives_from: [
            'plugin.dec-capabilities',
            'plugin.con-frozen-snapshots',
          ],
        }
      ),
      accept('plugin.dec-export-capability'),
      anchor(
        'plugin.cit-events',
        MATEO,
        'Code: the plugin events',
        'src/plugin/events.ts',
        'PLUGIN_EVENTS',
        'c30'
      ),
    ],
  },

  c35: {
    trailers: ['plugin.dec-api-frozen', 'plugin.con-v1-surface'],
    events: [
      finding(
        'plugin.fnd-survey-v1',
        'measurement',
        MATEO,
        'Of 9 plugins in the wild, 6 only read the selection',
        'Counted from the plugins people shared in the beta channel.'
      ),
      decision(
        'plugin.dec-api-frozen',
        MATEO,
        'Freeze plugin API v1',
        'v1 is what plugins in the wild are written against. Its members, their names and what they return stay as they are; test/plugin.test.ts checks the surface.',
        { derives_from: ['plugin.fnd-survey-v1'] }
      ),
      accept('plugin.dec-api-frozen'),
      constraint(
        'plugin.con-v1-surface',
        'hard',
        MATEO,
        'No member of PluginApiV1 is added, removed or renamed',
        'New abilities go in a v2 API that a plugin asks for. Events may be added to v1, since an unknown event is simply never fired for an old plugin.',
        { derives_from: ['plugin.dec-api-frozen'] }
      ),
      risk(
        'plugin.rsk-v2-pressure',
        'medium',
        'medium',
        MATEO,
        'Plugin authors will push for v1 changes before v2 exists',
        'Each request is small, and each is a reason to add one member to v1. If v2 takes too long, v1 stops being frozen in practice.'
      ),
    ],
  },

  c37: {
    events: [
      finding(
        'units.fnd-precision-cost',
        'measurement',
        PRIYA,
        'displayNumber costs 4 µs a call',
        'For a 1,000-layer selection the panel formats about 30,000 values, 120 ms in all.'
      ),
    ],
  },

  c38: {
    trailers: ['persist.con-validate-on-load'],
    events: [
      constraint(
        'persist.con-validate-on-load',
        'hard',
        INES,
        'A file whose tree is inconsistent is refused, never repaired',
        'Loading checks every parent link, child list and number after migrating. A broken file fails with bad-file. Guessing a repair would save a document the author never made.'
      ),
    ],
  },

  c39: {
    trailers: ['layers.dec-shift-click'],
    events: [
      decision(
        'layers.dec-shift-click',
        MATEO,
        'Shift-click adds or removes a layer; Shift on empty canvas keeps the selection',
        'Shift toggles the clicked target in the selection and starts no drag.',
        { derives_from: ['layers.dec-group-click'] }
      ),
      accept('layers.dec-shift-click'),
    ],
  },

  c40: {
    events: [
      anchor(
        'units.cit-precision',
        PRIYA,
        'Code: display precision',
        'src/units/precision.ts',
        'displayNumber',
        'c05'
      ),
      risk(
        'units.rsk-locale-comma',
        'medium',
        'low',
        PRIYA,
        'A decimal comma is not read',
        'People with German or French locales type 12,5. The parser rejects it and the field keeps its old value.'
      ),
    ],
  },

  // --------------------------------------------------------------- April
  c41: {
    events: [
      anchor(
        'persist.cit-schema',
        INES,
        'Code: validating a loaded document',
        'src/persist/schema.ts',
        'validateDocument',
        'c38'
      ),
    ],
  },

  c42: {
    trailers: ['commands.dec-align-one-command'],
    events: [
      decision(
        'commands.dec-align-one-command',
        TOMAS,
        'Align and distribute write one resize command for all the layers they move',
        'One command with an item per layer, so the action is one entry and its inverse puts every layer back at once.',
        { derives_from: ['commands.dec-gesture-entry'] }
      ),
      accept('commands.dec-align-one-command'),
    ],
  },

  c44: {
    events: [
      issue(
        'persist.iss-diverged-files',
        'bug',
        INES,
        'Files diverged after the version 2 migration was edited',
        'On 12 March the v2→v3 step was changed to upper-case colours. Version 2 files opened before that had already been saved as version 4 with lower-case colours; the same files opened after it came out upper case. Two people on one project ended up with different documents from one source file, and a diff showed every colour changed.'
      ),
      finding(
        'persist.fnd-diverged-cause',
        'analysis',
        INES,
        'The colour change went into an existing step instead of a new one',
        "A migration step's output is part of the file format once it has shipped. Changing it changes what old files become, depending on when they were opened.",
        { derives_from: ['persist.iss-diverged-files'] }
      ),
      constraint(
        'persist.con-migrations-frozen',
        'hard',
        INES,
        'A shipped migration is never edited; a schema change adds a new step',
        'Once a step has been released, its output for any input is fixed. A fix or a new field goes in a new step from the current version to the next, even for a one-line change, so a file migrates the same way whenever it is opened. We kept the edited v2→v3 step rather than revert it, since reverting would split files a second time.',
        {
          derives_from: [
            'persist.iss-diverged-files',
            'persist.fnd-diverged-cause',
            'persist.dec-int-version',
          ],
        }
      ),
      resolve('persist.iss-diverged-files', ['persist.con-migrations-frozen']),
    ],
  },

  c45: {
    trailers: ['panel.dec-text-bounds'],
    events: [
      decision(
        'panel.dec-text-bounds',
        PRIYA,
        'Font size runs from 1 to 1,000 and line height from 0.5 to 5',
        'Values outside are clamped by the field, not refused, so typing 2000 gives 1,000.'
      ),
      accept('panel.dec-text-bounds'),
    ],
  },

  c46: {
    trailers: ['commands.dec-entry-labels'],
    events: [
      decision(
        'commands.dec-entry-labels',
        TOMAS,
        'History entries are labelled after what the person ran',
        'Hide, Show, Lock and Unlock label their entries with their palette titles instead of the command type, so the history list reads like the menu.'
      ),
      accept('commands.dec-entry-labels'),
    ],
  },

  c47: {
    trailers: ['persist.dec-viewstate-sidecar'],
    events: [
      issue(
        'persist.iss-dirty-on-open',
        'bug',
        INES,
        'Opening a file and closing it marked it changed',
        'Since 1 April zoom was saved in the document. Zooming in to look at a file, or two people viewing one file at different zooms, changed the file: the shell asked to save on close, and version control showed a diff with no edit in it.'
      ),
      issue(
        'persist.iss-view-state-home',
        'question',
        INES,
        'Where does view state live?',
        'Zoom and collapsed panel sections need to survive closing a file.'
      ),
      decision(
        'persist.dec-viewstate-sidecar',
        INES,
        'View state never goes into the document file; it goes in the sidecar',
        'View state is anything about how someone is looking at a document rather than what is in it: zoom, pan, collapsed panel sections, scroll positions. files.saveViewState() writes it to a sidecar next to the document, and files.load(text, viewState) reads it back. The document file changes only when the document does.\n\nRejected: a view key inside the document file, which keeps every problem in the issue.',
        {
          derives_from: [
            'persist.iss-dirty-on-open',
            'persist.iss-view-state-home',
          ],
        }
      ),
      decision(
        'persist.dec-viewstate-in-file',
        INES,
        'Keep view state in the document file under a view key',
        'One file to move around; the view key is ignored when diffing.',
        { derives_from: ['persist.iss-view-state-home'] }
      ),
      accept('persist.dec-viewstate-sidecar'),
      resolve('persist.iss-dirty-on-open', ['persist.dec-viewstate-sidecar']),
      resolve('persist.iss-view-state-home', ['persist.dec-viewstate-sidecar']),
    ],
  },

  c48: {
    trailers: ['layers.dec-reveal'],
    events: [
      decision(
        'layers.dec-reveal',
        MATEO,
        'Revealing a layer expands every container above it',
        'reveal(id) expands its ancestors so the row is listed; it collapses nothing.'
      ),
      accept('layers.dec-reveal'),
      finding(
        'layers.fnd-hit-cost',
        'measurement',
        MATEO,
        'hitNode over 5,000 nodes takes 1.2 ms',
        'Remeasured on the stress file with logging off, 100 clicks, median.'
      ),
      retract(
        'layers.fnd-hit-cost-v1',
        'Measured with debug logging on; see the remeasurement at 1.2 ms.'
      ),
    ],
  },

  c49: {
    events: [
      anchor(
        'persist.cit-viewstate',
        INES,
        'Code: the view state and its sidecar format',
        'src/persist/viewstate.ts',
        'ViewState',
        'c47'
      ),
    ],
  },

  c50: {
    events: [
      risk(
        'commands.rsk-history-memory',
        'low',
        'medium',
        TOMAS,
        'Large resize entries may use a lot of memory',
        'A resize of a group stores an item per descendant, twice (command and inverse). A full history of large group resizes could reach tens of MB.'
      ),
    ],
  },

  c51: {
    trailers: ['units.dec-relative-reference'],
    events: [
      decision(
        'units.dec-relative-reference',
        PRIYA,
        'Relative units take their reference from the caller',
        'toPx and fromPx return null for a relative unit unless the caller passes the length it is relative to. The registry never guesses one.',
        { derives_from: ['units.dec-store-px'] }
      ),
      accept('units.dec-relative-reference'),
    ],
  },

  c52: {
    events: [
      anchor(
        'plugin.cit-api',
        MATEO,
        'Code: the v1 API surface',
        'src/plugin/api.ts',
        'PluginApiV1',
        'c35'
      ),
      anchor(
        'plugin.cit-docs',
        MATEO,
        'Docs: the plugin reference',
        'docs/plugins.md',
        null,
        'c35'
      ),
    ],
  },

  c53: {
    events: [
      finding(
        'persist.fnd-save-time-v1',
        'measurement',
        INES,
        'Saving a 50,000-node document takes 1.9 s',
        'Measured on the generated stress document.'
      ),
    ],
  },

  c54: {
    events: [
      compaction(
        'units.cmp',
        PRIYA,
        'Units and precision: where things stand in April',
        'Every length is stored as px; units convert only when a value comes in or is shown. Stored numbers are never rounded; fields round for display only, with 2 decimals for px and pt, 3 for inches and 1 for percentages and degrees. Typed lengths and numbers go through units/parse.ts#parseLength, the same parser that reads version 1 length strings. Relative units need a reference from the caller. Open: decimal commas are not read, and formatting costs about 4 µs a value, which adds up on big selections.',
        [
          'units.dec-store-px',
          'units.con-never-round',
          'units.dec-display-precision',
          'units.dec-parse-length',
          'units.dec-relative-reference',
          'units.fnd-precision-cost',
          'units.rsk-locale-comma',
        ]
      ),
    ],
  },

  c55: {
    events: [
      finding(
        'plugin.fnd-plugin-survey',
        'measurement',
        MATEO,
        'Of 14 plugins in the wild, 11 only read the selection and run commands',
        'Recounted across the beta channel and the two public repositories. The other three export the document.',
        { invalidates: ['plugin.fnd-survey-v1'] }
      ),
    ],
  },

  c56: {
    events: [
      compaction(
        'commands.cmp',
        TOMAS,
        'Command bus and history: where things stand in April',
        'Every change is a command with a plain JSON payload that names nodes by id; each handler returns its inverse. One gesture is one history entry: group uses batch(), field commits share one label, align and distribute write one command. Entries with the same label less than 500 ms apart merge, which is how a drag becomes one entry. History keeps 100 entries. Undo and redo restore the exact selection.',
        [
          'commands.dec-plain-payloads',
          'commands.con-plain-payloads',
          'commands.dec-inverse',
          'commands.dec-gesture-entry',
          'commands.dec-batch',
          'commands.dec-coalesce-window',
          'commands.dec-undo-cap-100',
          'commands.con-selection-restore',
        ]
      ),
    ],
  },

  c57: {
    events: [
      risk(
        'layers.rsk-keyboard-layouts',
        'medium',
        'low',
        MATEO,
        'Bracket shortcuts are hard to reach on some keyboard layouts',
        'On German and Nordic layouts [ and ] need Alt, so Mod+] arrives as a different chord.'
      ),
    ],
  },

  c58: {
    events: [
      anchor(
        'model.cit-text',
        INES,
        'Code: wrapping text',
        'src/model/text.ts',
        'wrapLines',
        'c16'
      ),
      finding(
        'persist.fnd-save-time',
        'measurement',
        INES,
        'Saving a 50,000-node document takes 400 ms',
        'Release build, median of 10 saves of the generated stress document. Two thirds of it is JSON.stringify.'
      ),
      retract(
        'persist.fnd-save-time-v1',
        'Measured the debug build; the release build takes 400 ms.'
      ),
      risk(
        'persist.rsk-large-files',
        'low',
        'medium',
        INES,
        'Saving very large documents blocks the shell',
        'At 400 ms for 50,000 nodes, autosave on a huge document would stall typing. No real file is near that size yet.'
      ),
    ],
  },

  // ----------------------------------------------------------------- May
  c60: {
    trailers: ['commands.dec-coalesce-gesture', 'commands.con-gesture-only'],
    events: [
      issue(
        'commands.iss-merge-wrong',
        'bug',
        MATEO,
        'Separate nudges merged and slow drags split',
        'Two separate nudges less than 500 ms apart became one entry, so one Undo took back both. A drag that paused for more than half a second became two or three entries. Both follow from merging by time.'
      ),
      finding(
        'commands.fnd-merge-cases',
        'analysis',
        TOMAS,
        'Time cannot tell one gesture from two',
        'A quick double nudge and a slow drag overlap in timing: no window length merges every drag and keeps every separate press apart. Only the code that starts a gesture knows where it ends.',
        { derives_from: ['commands.iss-merge-wrong'] }
      ),
      decision(
        'commands.dec-coalesce-gesture',
        TOMAS,
        'Coalesce by gesture id, never by a time window',
        'Whatever starts a gesture takes a gesture id from newGesture() and passes it with every command it dispatches; history merges entries only when their ids match. A drag gets one id at pointer down, a field commit across a selection gets one, an arrange command gets one. Commands without an id are never merged, so separate key presses stay separate entries.\n\nRejected: any other window length, for the reason in {{id:commands.fnd-merge-cases}}.',
        {
          derives_from: [
            'commands.iss-merge-wrong',
            'commands.fnd-merge-cases',
          ],
          supersedes: ['commands.dec-coalesce-window'],
        }
      ),
      accept('commands.dec-coalesce-gesture'),
      constraint(
        'commands.con-gesture-only',
        'hard',
        TOMAS,
        'History never merges entries by time',
        'No timer, clock or debounce decides what is one entry. A caller that wants several commands in one entry gives them one gesture id or runs them in batch().',
        { derives_from: ['commands.dec-coalesce-gesture'] }
      ),
      resolve('commands.iss-merge-wrong', ['commands.dec-coalesce-gesture']),
    ],
  },

  c61: {
    trailers: ['commands.dec-undo-cap-200'],
    events: [
      finding(
        'commands.fnd-cap-complaints',
        'feedback',
        TOMAS,
        'Designers ran out of undo in long sessions',
        'In the April usability sessions, 5 of 8 designers hit the 100-entry limit within an hour and lost steps they meant to undo.'
      ),
      decision(
        'commands.dec-undo-cap-200',
        TOMAS,
        'Keep the last 200 history entries',
        'Twice the old limit. At the sizes in {{id:commands.rsk-history-memory}} this stays well under 20 MB.',
        {
          derives_from: ['commands.fnd-cap-complaints'],
          supersedes: ['commands.dec-undo-cap-100'],
        }
      ),
      accept('commands.dec-undo-cap-200'),
      anchor(
        'commands.cit-coalesce',
        TOMAS,
        'Code: when two entries merge',
        'src/commands/coalesce.ts',
        'shouldMerge',
        'c60'
      ),
    ],
  },

  c66: {
    events: [
      compaction(
        'plugin.cmp',
        MATEO,
        'Plugin API v1: where things stand in May',
        'Plugin API v1 is frozen: no member is added, removed or renamed. Plugins get ids and frozen copies, never live nodes, and change the document only through runCommand. Capabilities are declared in the manifest; export is the only one. shortcuts() returns DEFAULT_KEYMAP, the table the dispatcher runs. Every call into a plugin is sandboxed. Open: pressure to grow v1 before a v2 exists.',
        [
          'plugin.dec-api-frozen',
          'plugin.con-v1-surface',
          'plugin.con-frozen-snapshots',
          'plugin.dec-ids-only-events',
          'plugin.dec-capabilities',
          'plugin.dec-export-capability',
          'plugin.dec-shortcuts-table',
          'plugin.dec-sandbox',
          'plugin.rsk-v2-pressure',
          'plugin.fnd-plugin-survey',
        ]
      ),
    ],
  },

  c67: {
    events: [
      finding(
        'panel.fnd-view-cost',
        'measurement',
        PRIYA,
        'panel.view() over 1,000 selected rectangles takes 6 ms',
        'The 40 ms run recomputed selection bounds once per field; view() now reads each node once.',
        { invalidates: ['panel.fnd-view-cost-v1'] }
      ),
      risk(
        'panel.rsk-many-nodes',
        'low',
        'medium',
        PRIYA,
        'The panel slows down above a few thousand selected layers',
        'view() is linear in selected nodes times fields. At 5,000 layers it would pass the 16 ms frame budget.'
      ),
      compaction(
        'panel.cmp',
        PRIYA,
        'Properties panel: where things stand in May',
        'The panel is built from section and field descriptors and writes only through commands. A field shows the shared value or Mixed, compared by displayed text. A commit writes every applicable selected node as one gesture on Enter or blur. Opacity on a group is written to every styled node inside it. Rotation is typed and stored in degrees. Editing text refits the box height.',
        [
          'panel.dec-sections',
          'panel.con-panel-commands',
          'panel.dec-mixed',
          'panel.dec-commit-per-field',
          'panel.dec-commit-on-enter',
          'panel.dec-group-opacity-push',
          'panel.dec-rotation-field',
          'panel.dec-text-autoheight',
          'panel.fnd-view-cost',
          'panel.rsk-many-nodes',
        ]
      ),
    ],
  },

  c68: {
    events: [
      compaction(
        'model.cmp',
        INES,
        'Document model and geometry: where things stand in May',
        'Nodes store absolute page coordinates and only Document writes the tree. Child lists are back to front. Groups carry no style: no fills, strokes or opacity of their own, and opacity set on a group goes to its children. Group bounds follow the children. Rotation is stored in degrees. Text is measured with a fixed advance of 0.6 em. Open: wide and narrow scripts measure badly.',
        [
          'model.dec-abs-coords',
          'model.con-tree-writes',
          'model.con-paint-order',
          'model.dec-group-nostyle',
          'model.dec-group-bounds',
          'model.dec-rotation-degrees',
          'model.dec-text-measure',
          'model.fnd-glyph-advance',
          'model.rsk-text-width',
        ]
      ),
    ],
  },

  c71: {
    events: [
      finding(
        'units.fnd-precision-cost-v2',
        'measurement',
        PRIYA,
        'displayNumber costs 0.3 µs a call',
        'The 4 µs run had the inspector attached. Without it, 30,000 calls take 9 ms.',
        { invalidates: ['units.fnd-precision-cost'] }
      ),
    ],
  },

  c72: {
    events: [
      compaction(
        'layers.cmp',
        MATEO,
        'Selection, layers and shortcuts: where things stand in May',
        'A click selects the outermost group around the hit layer, up to the nearest frame; hidden and locked layers are never hit. Dragging any selected layer moves the selection. The layers list is back to front, row 0 the backmost layer, so drop indexes are paint-order indexes. Shortcuts are registered in keys/keymap.ts DEFAULT_KEYMAP, by scope, and the dispatcher reads that table. Open: bracket shortcuts on some keyboard layouts.',
        [
          'layers.dec-group-click',
          'layers.con-hit-filter',
          'layers.dec-drag-moves-selection',
          'layers.dec-layers-order',
          'layers.fnd-drag-index',
          'layers.dec-keymap-table',
          'layers.dec-scopes',
          'layers.dec-chord-spelling',
          'layers.rsk-keyboard-layouts',
        ]
      ),
    ],
  },

  c73: {
    events: [
      compaction(
        'persist.cmp',
        INES,
        'Persistence and migrations: where things stand in May',
        'Files carry an integer schema version and migrate one step at a time. A shipped step is never edited; changes add a step. Saving is stable; loading fills defaults, then refuses inconsistent trees and files from newer editors. View state lives in a sidecar, never in the document file. Open: very large saves block for hundreds of ms.',
        [
          'persist.dec-int-version',
          'persist.con-migrations-frozen',
          'persist.dec-stable-save',
          'persist.dec-defaults-on-load',
          'persist.con-validate-on-load',
          'persist.dec-refuse-newer',
          'persist.dec-viewstate-sidecar',
          'persist.rsk-large-files',
        ]
      ),
    ],
  },
};

// Product decisions about work that was not built yet: requests deferred
// with their agreed behaviour, Decisions accepted for planned work, and
// Constraints from customers. They sit beside the events above at the
// commits their authors were working on when they wrote them. Nothing in the
// code, tests, docs or commit messages says any of it (the proof-only-hard
// tasks, DESIGN.md §3). Only c34, which made export the one way for a plugin
// to read the document, implements one of them and carries a trailer.
const defer = (issueId, resolvedBy) => ({
  type: 'ResolveIssue',
  issueId,
  resolution: 'deferred',
  resolvedBy,
});

const PLANNED = {
  c11: {
    events: [
      finding(
        'model.fnd-wrap-hid-layers',
        'feedback',
        INES,
        'Wrapping layers in a white frame made people think layers were gone',
        "From the 12 February usability sessions (five people: two agencies, three in-house teams), on the prototype editor's Wrap in frame. The new frame took the default white fill and clipping. It goes where the frontmost wrapped layer was, so its white fill painted over every layer behind it in that area; four of five said the layers they had not wrapped were deleted. Two then moved a wrapped layer past the frame's edge, lost half of it to clipping, and reported it as a bug."
      ),
      decision(
        'model.dec-wrap-plain-frame',
        INES,
        'A frame made around existing layers starts with no fill and no clipping',
        'When core gains a way to put existing layers into a new frame, that frame is created with an empty fills list and clip off, so the canvas looks exactly as it did before. People add a fill or turn clipping on when they want them. A frame drawn on an empty canvas keeps the white fill and clipping that createFrame gives, since nothing is under it yet.\n\nRejected: the createFrame defaults, for the finding; a fill matching the page, since the page colour belongs to the shell and any fill still hides the layers behind.',
        { derives_from: ['model.fnd-wrap-hid-layers'] }
      ),
      accept('model.dec-wrap-plain-frame'),
    ],
  },

  c34: {
    trailers: ['plugin.con-content-export'],
    events: [
      constraint(
        'plugin.con-content-export',
        'hard',
        MATEO,
        'Layer names and text reach only plugins granted export',
        "Northwind's security review of plugin API v1 (they run Tessera for bank clients) counts layer names and the words in text layers as document content: their designers name layers after client projects and draft copy in text layers. A plugin they have not cleared for export must not read either, by any route. So anything that hands a plugin a layer name or text, an event payload or a return value, carries it only to plugins whose manifest has export; every other plugin gets the ids alone, in the same event. The same holds for anything else people write in a document later. documentload's document name was reviewed and stays for every plugin, since the shell already shows it in the window title. Agreed with Northwind on 19 March; their next review is in September.",
        { derives_from: ['plugin.dec-capabilities'] }
      ),
    ],
  },

  c39: {
    events: [
      finding(
        'layers.fnd-offscreen-picks',
        'feedback',
        MATEO,
        'People did not see what a page-wide pick added on other screens',
        "Six sessions on 25 March with people who keep a whole app in one file, one top-level frame per screen (40 to 120 screens). The prototype's pick-similar commands, which start from one selected layer and add the layers that resemble it, searched the whole page. The layers they added on other screens were off-screen at the time; four of six went on to edit the selection and changed screens they never looked at."
      ),
      decision(
        'layers.dec-likeness-scope',
        MATEO,
        'Picking similar layers stays inside the top-level frame of the starting layer',
        "Commands that grow a selection from one layer to the layers that resemble it (the same fill colour, font, size or anything else; none in core yet) look only inside the top-level frame that holds the starting layer, at any depth. A starting layer that sits on the page outside every frame looks only at the other layers outside frames.\n\nRejected: the whole page, for the finding; the starting layer's own parent, which is too narrow, since one screen's buttons sit in different groups.",
        { derives_from: ['layers.fnd-offscreen-picks'] }
      ),
      accept('layers.dec-likeness-scope'),
    ],
  },

  c45: {
    events: [
      issue(
        'panel.iss-size-steps',
        'request',
        PRIYA,
        'Halden wants text sizes to step up and down without typing',
        "Halden's design-system team asked on the February call for a quick way to make text one step bigger or smaller. In the prototype a step was one pixel, and their token check flagged 340 text layers at sizes such as 15 and 17 that came from people stepping past the sizes they use."
      ),
      decision(
        'panel.dec-size-steps',
        PRIYA,
        'A text size step moves to the next size on the type scale',
        'When we add stepping, one step up or down goes to the next size on this scale: 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96. A size between two scale sizes goes to the next one in the direction of the step, so 13 goes up to 14 and down to 12. Below 8 a step is 1 pixel and above 96 it is 8 pixels, within the 1 to 1,000 bounds. The text box height follows, as for a typed size.\n\nRejected: one pixel per step (the prototype, and the issue); a percentage per step, which leaves the scale at once.',
        { derives_from: ['panel.iss-size-steps'] }
      ),
      accept('panel.dec-size-steps'),
      defer('panel.iss-size-steps', ['panel.dec-size-steps']),
    ],
  },

  c46: {
    events: [
      issue(
        'commands.iss-recolour-request',
        'request',
        TOMAS,
        'Teams want to replace one colour across a document at once',
        "Brightline and Halden both asked for it in April: a brand colour changes and every layer that uses it has to follow. In Brightline's trial of the prototype's recolour command it rewrote their locked, legal-approved logo, and a second pass that skipped hidden layers left the hover states of 30 buttons in the old colour."
      ),
      decision(
        'commands.dec-sweeping-edits',
        TOMAS,
        'Edits that sweep the whole document leave locked layers alone and include hidden ones',
        'Agreed with Brightline and Halden before any of it is built: a command that changes layers all over the document rather than in the selection (changing one colour everywhere is the first) skips locked layers and everything inside a locked group or frame. Their teams lock what has been signed off: logos, brand marks, approved screens. Hidden layers are changed like any other, since they are states that will be shown again.\n\nRejected: changing everything, which rewrote the locked logo; skipping hidden and locked alike, as the canvas does for clicks, which left the hover states stale.',
        { derives_from: ['commands.iss-recolour-request'] }
      ),
      accept('commands.dec-sweeping-edits'),
      defer('commands.iss-recolour-request', ['commands.dec-sweeping-edits']),
    ],
  },

  c47: {
    events: [
      constraint(
        'persist.con-discussion-outside',
        'hard',
        INES,
        'What people write about a design never travels inside the document file',
        "Agencies deliver the document file itself to their clients. In January a prototype file reached a Halden client with its layer notes still inside, one of them reading 'do not show legal yet', and Halden's contract now says working notes are not deliverables. So notes, comments, review threads and approvals are kept apart from the document, in a store of their own keyed by the document, and files.save() never writes them. The file changes only when the design does, as with view state.",
        { derives_from: ['persist.dec-viewstate-sidecar'] }
      ),
    ],
  },

  c48: {
    events: [
      finding(
        'layers.fnd-notes-lost',
        'feedback',
        MATEO,
        'Deleting a layer took its review notes with it',
        'In the prototype, notes hung off layers and went when the layer went. Designers often delete a layer and draw it again; in the March review sessions, reviewers lost the threads on 11 of 40 layers that way, answers included.'
      ),
      decision(
        'layers.dec-notes-outlive',
        MATEO,
        'A note pinned to a layer outlives the layer',
        'When review notes come to core, a note pinned to a layer stores the layer id and the point where it sits. Deleting the layer never deletes the note: it stays at its last point on the canvas, marked detached, until someone resolves or deletes it. Undoing the delete pins it back to the layer.',
        { derives_from: ['layers.fnd-notes-lost'] }
      ),
      accept('layers.dec-notes-outlive'),
    ],
  },

  c52: {
    events: [
      decision(
        'plugin.dec-exporters',
        MATEO,
        'Formats other than our own are written by exporter plugins',
        'Core reads and writes Tessera files and nothing else. SVG, PNG, PDF and any other format are produced by exporter plugins that take api.export.document() and convert it, ours included, so a format ships on its own schedule and a broken exporter cannot break saving.\n\nRejected: an export module in core, as in the prototype, where three formats lived in core and most model changes broke one of them.',
        { derives_from: ['plugin.dec-export-capability'] }
      ),
      accept('plugin.dec-exporters'),
      constraint(
        'plugin.con-exports-no-names',
        'hard',
        MATEO,
        'Exported artwork carries no layer names and no hidden layers',
        'Exports leave Tessera for developers, client sites and app bundles, where nobody reviews them. Layer names are working names (for Northwind, client project names), so an exporter writes no layer name into its output: no element id, class, title or comment made from one. An element that needs an id gets a generated one (l1, l2 and so on). Hidden layers are left out, with everything inside them. Halden found both in a prototype SVG export that a client put on their site.',
        {
          derives_from: ['plugin.con-content-export', 'plugin.dec-exporters'],
        }
      ),
    ],
  },

  c61: {
    events: [
      decision(
        'commands.dec-history-design-only',
        TOMAS,
        'Undo covers the design, not what people say about it',
        "History holds edits to the document only. Writing, answering, resolving or deleting a comment, note or review thread is never a history entry, and Undo never removes one: in the April sessions, an Undo after a reply in the prototype's notes panel took back a colleague's note that had arrived in between, and the colleague never knew. Those actions are undone by their own delete, by the person who wrote them.",
        { derives_from: ['persist.con-discussion-outside'] }
      ),
      accept('commands.dec-history-design-only'),
    ],
  },

  c75: {
    events: [
      issue(
        'units.iss-whole-pixels',
        'request',
        PRIYA,
        'Put layers on whole pixels when asked',
        "Brightline's icon team asks for a command that moves and sizes layers onto whole pixels before they hand icons off, since fractional edges blur when the icons are drawn at 1x."
      ),
      finding(
        'units.fnd-pixel-fit-seams',
        'analysis',
        PRIYA,
        "The prototype's pixel fit opened seams between shapes that touched",
        "The prototype rounded x, y, width and height each on its own. In Brightline's 212 icons built from abutting shapes, 61 came out with a 1 px gap or a 1 px overlap: where two shapes met at 10.5, the left one (x 0.4, width 10.1) ended at 10 and the right one started at 11.",
        { derives_from: ['units.iss-whole-pixels'] }
      ),
      decision(
        'units.dec-round-edges',
        PRIYA,
        'A whole-pixel fit rounds edges, not sizes',
        "When core gets this command, it rounds each layer's left, top, right and bottom edge to the nearest whole pixel (halves up, as Math.round does) and takes width and height from the rounded edges, so shapes that touched still touch and the right edge of one stays the left edge of the next. A layer that would end up narrower or shorter than 1 px gets 1 px; a line keeps its zero height. Stored geometry is otherwise never rounded ({{id:units.con-never-round}}); this is an edit the person asks for, and it goes through resize like any other.",
        { derives_from: ['units.fnd-pixel-fit-seams'] }
      ),
      accept('units.dec-round-edges'),
      defer('units.iss-whole-pixels', ['units.dec-round-edges']),
    ],
  },
};

for (const [key, { trailers = [], events }] of Object.entries(PLANNED)) {
  const at = (PROOF[key] ??= { events: [] });
  if (trailers.length) at.trailers = [...(at.trailers ?? []), ...trailers];
  at.events.push(...events);
}

// The rules the benchmark tasks lean on (DESIGN.md §2), by the records that
// hold them. R rules live only in Proof; V rules are also visible in code;
// U rules are product decisions for work not built yet, which neither the
// code nor its history hints at.
export const RULES = {
  R1: {
    rule: 'One user gesture is one history entry, however many nodes it touches.',
    visible: false,
    records: [
      'commands.dec-gesture-entry',
      'commands.iss-twelve-undos',
      'panel.dec-commit-per-field',
      'commands.dec-align-one-command',
    ],
  },
  R2: {
    rule: 'Command payloads are plain JSON holding node ids, never node objects.',
    visible: false,
    records: [
      'commands.con-plain-payloads',
      'commands.dec-plain-payloads',
      'commands.iss-replay-stale',
    ],
  },
  R3: {
    rule: 'A shipped migration is never edited; a schema change adds a new step.',
    visible: false,
    records: [
      'persist.con-migrations-frozen',
      'persist.iss-diverged-files',
      'persist.fnd-diverged-cause',
    ],
  },
  R4: {
    rule: 'Coalesce by gesture id, never by a time window.',
    visible: 'partly',
    records: [
      'commands.dec-coalesce-gesture',
      'commands.con-gesture-only',
      'commands.iss-merge-wrong',
    ],
  },
  R5: {
    rule: 'Plugins receive frozen snapshots, never live nodes.',
    visible: false,
    records: [
      'plugin.con-frozen-snapshots',
      'plugin.iss-plugin-mutation',
      'plugin.fnd-mutation-cause',
    ],
  },
  R6: {
    rule: 'View state never goes into the document file; it goes in the sidecar.',
    visible: false,
    records: ['persist.dec-viewstate-sidecar', 'persist.iss-dirty-on-open'],
  },
  V1: {
    rule: 'Hidden and locked nodes are never hit or selected from the canvas.',
    visible: true,
    records: ['layers.con-hit-filter'],
  },
  V2: {
    rule: 'Stored geometry is never rounded; precision applies only to display.',
    visible: true,
    records: ['units.con-never-round'],
  },
  V3: {
    rule: 'Undo restores the exact selection from before the change.',
    visible: true,
    records: ['commands.con-selection-restore'],
  },
  V4: {
    rule: 'Plugin API v1 is frozen.',
    visible: true,
    records: ['plugin.dec-api-frozen', 'plugin.con-v1-surface'],
  },
  U1: {
    rule: 'Layer names and text reach only plugins with the export capability; other plugins get ids alone.',
    visible: false,
    records: ['plugin.con-content-export'],
  },
  U2: {
    rule: 'A text size step goes to the next size on the type scale, not one pixel.',
    visible: false,
    records: ['panel.iss-size-steps', 'panel.dec-size-steps'],
  },
  U3: {
    rule: 'A frame made around existing layers has no fill and does not clip.',
    visible: false,
    records: ['model.fnd-wrap-hid-layers', 'model.dec-wrap-plain-frame'],
  },
  U4: {
    rule: 'Document-wide edits skip locked layers (and their contents) and include hidden ones.',
    visible: false,
    records: ['commands.iss-recolour-request', 'commands.dec-sweeping-edits'],
  },
  U5: {
    rule: "Picking similar layers stays inside the starting layer's top-level frame.",
    visible: false,
    records: ['layers.fnd-offscreen-picks', 'layers.dec-likeness-scope'],
  },
  U6: {
    rule: 'A whole-pixel fit rounds edges, not sizes, so touching shapes still touch.',
    visible: false,
    records: [
      'units.iss-whole-pixels',
      'units.fnd-pixel-fit-seams',
      'units.dec-round-edges',
    ],
  },
  U7: {
    rule: 'Comments live outside the document file, are never history entries, and outlive the layers they are pinned to.',
    visible: false,
    records: [
      'persist.con-discussion-outside',
      'commands.dec-history-design-only',
      'layers.fnd-notes-lost',
      'layers.dec-notes-outlive',
    ],
  },
  U8: {
    rule: 'Other formats are written by exporter plugins; exports carry no layer names and no hidden layers.',
    visible: false,
    records: ['plugin.dec-exporters', 'plugin.con-exports-no-names'],
  },
};

// Proper supersessions: Proof recorded the change.
export const SUPERSESSIONS = {
  S1: {
    head: 'commands.dec-coalesce-gesture',
    target: 'commands.dec-coalesce-window',
    commit: 'c60',
  },
  S2: {
    head: 'commands.dec-undo-cap-200',
    target: 'commands.dec-undo-cap-100',
    commit: 'c61',
  },
};

// Drifts: the code changed and Proof did not. `records` are the records that
// still say the old thing; `anchors` says whether each code Citation's
// path#symbol still resolves at the tip ('holds') or not ('stale').
export const DRIFTS = {
  D1: {
    kind: 'unrecorded supersession',
    commit: 'c76',
    proofSays:
      'Groups carry no style; opacity on a group applies to its children.',
    codeNow:
      'Groups have their own opacity, multiplied into their children when they render.',
    records: [
      'model.dec-group-nostyle',
      'panel.dec-group-opacity-push',
      'model.cmp',
      'panel.cmp',
    ],
    anchors: {
      'model.cit-effective-opacity': 'holds',
      'panel.cit-appearance': 'holds',
    },
    code: [
      {
        path: 'src/model/types.ts',
        after: '  children: string[];\n  opacity: number;\n}',
      },
      {
        path: 'src/model/style.ts',
        before: "if (node.type !== 'group') opacity *= node.opacity;",
      },
      { path: 'src/panel/sections/appearance.ts', before: 'opacityTargets' },
    ],
  },
  D2: {
    kind: 'unrecorded supersession',
    commit: 'c77',
    proofSays: 'Rotation is stored in degrees.',
    codeNow:
      'Rotation is stored in radians; the panel shows and takes degrees; the v4→v5 migration converts files.',
    records: [
      'model.dec-rotation-degrees',
      'model.fnd-float-noise',
      'panel.dec-rotation-field',
      'model.cmp',
      'panel.cmp',
    ],
    anchors: { 'model.cit-rotate': 'holds' },
    code: [
      {
        path: 'src/model/transform.ts',
        before: 'Maps any angle in degrees',
        after: 'Maps any angle in radians',
      },
      {
        path: 'src/persist/schema.ts',
        before: 'SCHEMA_VERSION = 4',
        after: 'SCHEMA_VERSION = 5',
      },
    ],
  },
  D3: {
    kind: 'unrecorded supersession',
    commit: 'c78',
    proofSays: 'The layers list is back to front: row 0 is the backmost layer.',
    codeNow:
      'The layers list is frontmost first; drop positions are reversed into paint order.',
    records: ['layers.dec-layers-order', 'layers.fnd-drag-index', 'layers.cmp'],
    anchors: { 'layers.cit-tree-view': 'holds', 'layers.cit-drag': 'holds' },
    code: [
      {
        path: 'src/layers/tree-view.ts',
        before: 'const ids = doc.children(parent);',
        after: '[...doc.children(parent)].reverse()',
      },
      {
        path: 'src/layers/drag.ts',
        before: "position === 'above' ? at : at + 1",
        after: "position === 'above' ? at + 1 : at",
      },
    ],
  },
  D4: {
    kind: 'refactor drift',
    commit: 'c79',
    proofSays:
      'Shortcuts are registered in keys/keymap.ts (DEFAULT_KEYMAP, registerBinding); the dispatcher reads that table, and api.shortcuts() shows it live.',
    codeNow:
      'Live bindings are in keys/bindings/*.ts; DEFAULT_KEYMAP is a frozen table that only plugins read; registerBinding is in keys/dispatcher.ts.',
    records: [
      'layers.dec-keymap-table',
      'plugin.dec-shortcuts-table',
      'layers.cit-default-keymap',
      'layers.cit-register-binding',
      'layers.cmp',
      'plugin.cmp',
    ],
    anchors: {
      'layers.cit-default-keymap': 'holds',
      'layers.cit-register-binding': 'stale',
    },
    code: [
      {
        path: 'src/keys/dispatcher.ts',
        before: 'DEFAULT_KEYMAP, lookup',
        after: 'registerBinding',
      },
      {
        path: 'src/keys/keymap.ts',
        before: 'export function registerBinding(',
      },
    ],
  },
  D5: {
    kind: 'refactor drift',
    commit: 'c80',
    proofSays:
      'Panel input is parsed by units/parse.ts#parseLength, through panel/fields.ts#toLength.',
    codeNow:
      'The panel parses input with units/expr.ts#parseExpression; parseLength only reads version 1 file strings; toLength is gone.',
    records: [
      'units.dec-parse-length',
      'units.cit-parse-length',
      'units.cit-to-length',
      'units.cmp',
    ],
    anchors: {
      'units.cit-parse-length': 'holds',
      'units.cit-to-length': 'stale',
    },
    code: [
      {
        path: 'src/panel/fields.ts',
        before: 'parseLength',
        after: 'parseExpression',
      },
      {
        path: 'src/units/parse.ts',
        before: 'Panel fields read what the user types',
      },
    ],
  },
};
