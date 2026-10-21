// Phrases that must not appear where agents can read them.
//
// BANNED_IN_PROOF: feature words of the benchmark's build and plan tasks
// (DESIGN.md §3). No record title or body and no commit message may hold
// one, so Proof never anticipates a task. Area words such as "properties
// panel", "undo" or "layers" are allowed. Matching is case-insensitive and
// by substring, so keep entries specific.
//
// The proof-only-hard tasks are the exception: their rules are product
// decisions recorded before the feature existed, so their records name the
// feature's area on purpose. What Proof may not hold for them is the
// prompt's own product names (palette titles, the event name), listed
// after the older tasks' words; gate.mjs also checks that no prompt echoes
// its rule's records.
//
// BANNED_IN_CODE: the wording of the proof-only rules (R1 to R6) and of the
// proof-only-hard rules (U1 to U8). The code, tests and docs of both variants
// must not state a rule or its reason; the commit messages are covered by
// BANNED_IN_PROOF's scan as well, since gen-bed.mjs scans them with both
// lists.
export const BANNED_IN_PROOF = [
  'corner radius',
  'radius',
  'radii',
  'duplicat',
  'layout grid',
  'grid',
  'marquee',
  'box select',
  'drag-select',
  'rubber band',
  'scale selection',
  'scale about',
  'ungroup',
  'snapping',
  'snaps to',
  'snap to',
  '15°',
  'mod+shift+h',
  'hide shortcut',
  '2in',
  '18pt',
  'character count',
  'word count',
  '#abc',
  'rgba',
  'rgb(',
  'shorthand hex',
  'eight-digit',
  'filter box',
  'search box',
  'layer filter',
  'selectionchange',
  'selection change event',
  'component',
  'instances',
  'override',
  'version history',
  'restore an earlier',
  'auto layout',
  'auto-layout',
  'padding',
  'mask',
  'clips the layers',
  'rebind',
  'preferences',
  'custom shortcut',
  'ruler',
  'tick mark',
  'ticks',
  'swatch',
  'colours in use',
  'colors in use',
  'copy style',
  'paste style',
  'colour name',
  'named colour',
  'fuchsia',
  'maroon',
  'navy',
  // proof-only-hard: the prompts' product names
  'layerrename',
  'increase font size',
  'decrease font size',
  'frame selection',
  'replace colour',
  'replace color',
  'select same fill',
  'round to pixels',
  'review comments',
  'hand to developers',
];

export const BANNED_IN_CODE = [
  // R1: one gesture, one history entry
  'one history entry',
  'one undo step',
  'single undo',
  'one entry per gesture',
  'undo needed',
  // R2: plain-data payloads
  'plain json',
  'plain data',
  'node objects',
  'macro',
  // R3: shipped migrations are never edited
  'never edit',
  'shipped migration',
  'add a new step',
  'diverge',
  // R4: no time windows
  'time window',
  // R5: frozen copies for plugins
  'frozen snapshot',
  'frozen copies',
  'live node',
  'bypass',
  // R6: view state stays out of the file
  'out of the document file',
  'never goes into',
  'dirty',
  'marked it changed',
  // U1: names and text only for plugins with export
  'northwind',
  'security review',
  'document content',
  'granted export',
  'cleared for export',
  // U2: text size steps follow the type scale
  'type scale',
  'halden',
  'token check',
  'next size on',
  // U3: a frame made around layers has no fill and no clipping
  'wrap in frame',
  'empty fills list',
  'clip off',
  'white fill',
  'no clipping',
  // U4: document-wide edits skip locked layers, include hidden ones
  'brightline',
  'signed off',
  'legal-approved',
  'hover states',
  'sweep the whole document',
  // U5: picking similar layers stays in the top-level frame
  'pick-similar',
  'top-level frame that holds',
  'outside every frame',
  'off-screen',
  'starting layer',
  // U6: a whole-pixel fit rounds edges, not sizes
  'abutting',
  'pixel fit',
  'seams',
  'rounds edges',
  'whole-pixel',
  // U7: comments outside the file, out of history, outliving layers
  'not deliverables',
  'working notes',
  'keyed by the document',
  'detached',
  'outlives',
  'review notes',
  // U8: exporter plugins; no layer names or hidden layers in exports
  'exporter plugin',
  'export module',
  'working names',
  'client sites',
];
