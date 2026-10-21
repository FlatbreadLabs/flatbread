// Phrases that must not appear where agents can read them.
//
// BANNED_IN_PROOF: feature words of the benchmark's build and plan tasks
// (DESIGN.md §3). No record title or body and no commit message may hold
// one, so Proof never anticipates a task. Area words such as "properties
// panel", "undo" or "layers" are allowed. Matching is case-insensitive and
// by substring, so keep entries specific.
//
// BANNED_IN_CODE: the wording of the six proof-only rules (R1 to R6). The
// code, tests and docs of both variants must not state a rule or its reason;
// the commit messages are covered by BANNED_IN_PROOF's scan as well, since
// gen-bed.mjs scans them with both lists.
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
];
