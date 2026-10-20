// The refactor layer for the git test bed: `build-repo.mjs --refactor`
// adds these commits to main after everything else main has, and after the
// branches are cut, so every branch keeps its content and its base.
//
// They are the commits of one engineer tidying the tree: folders moved,
// files and functions renamed, one module split and two merged, and one
// behaviour change. None of them has a `Proof:` trailer and none touches
// .flatbread-proof/, so Proof is left naming paths and symbols that main
// no longer has. build-repo.mjs writes a map of what moved where to
// <out>.refactor.json, outside the repository; no agent session sees it.
//
// A commit has `key`, `at`, `author`, `subject` and an optional `body`, as
// in spec/repo.mjs, plus `kinds` (what it does, for the map) and these
// operations, applied in this order:
//
//   moves      [from, to] pairs for `git mv`; a folder moves with all its
//              files
//   merge      { from: [a, b], into, head }: `into` gets `head` and then
//              each file's text after its `//!` doc lines; a and b go
//   transform  { path: (text) => text }, on paths after the moves
//   write      { path: text }
//   symbols    { path, symbol, newPath?, newSymbol? }: a function or
//              constant that is renamed in place (`newSymbol`) or moves to
//              another file (`newPath`). A rename is applied here, word by
//              word, to `path` after the moves; a move is done by
//              `transform` and `write`. build-repo.mjs checks both ways.
//   behaviour  { path, symbol, before, after, decision }: what the commit
//              changes that a governing Decision describes
//
// The filler move (scale above 1) puts two filler world folders beside the
// ocean, so engine/kestrel/world/ holds more than the tides, as it would.

export const REFACTOR_AUTHOR = 'dara';

const at = (text) => `${text.replace(' ', 'T')}:00Z`;

/** `text` with the `pub mod` lines of a crate or folder file replaced. */
function mods(text, remove, add) {
  const lines = text.trimEnd().split('\n');
  const head = lines.filter((l) => !l.startsWith('pub mod '));
  const have = lines
    .filter((l) => l.startsWith('pub mod '))
    .map((l) => l.slice(8, -1));
  for (const name of remove)
    if (!have.includes(name)) throw new Error(`no pub mod ${name}`);
  const next = [...have.filter((m) => !remove.includes(m)), ...add].sort();
  return `${[...head, ...next.map((m) => `pub mod ${m};`)].join('\n')}\n`;
}

/** Replaces `from` with `to` once, and fails if `from` is not there. */
function replaceOnce(text, from, to) {
  if (!text.includes(from)) throw new Error(`text not found: ${from}`);
  return text.replace(from, to);
}

/**
 * Cuts the function `name`, with its `///` doc lines and the blank line
 * after it, out of Rust `text`. Returns [rest, the function].
 */
export function cutFunction(text, name) {
  const lines = text.split('\n');
  let start = lines.findIndex((l) => l.startsWith(`pub fn ${name}(`));
  if (start < 0) throw new Error(`no pub fn ${name}`);
  while (start > 0 && lines[start - 1].startsWith('///')) start--;
  let end = lines.findIndex((l, i) => i > start && l === '}');
  if (end < 0) throw new Error(`pub fn ${name} has no end`);
  const block = lines.slice(start, end + 1);
  if (lines[end + 1] === '') end++;
  const rest = [...lines.slice(0, start), ...lines.slice(end + 1)];
  return [rest.join('\n'), `${block.join('\n')}\n`];
}

/**
 * The refactor commits at `scale`. `fillerFiles` are the filler paths on
 * main, for the filler move.
 */
export function refactorCommits({ scale, fillerFiles = [] }) {
  const commits = [
    {
      key: 'r01',
      at: at('2026-10-06 10:00'),
      subject: 'Move tides into world/ocean',
      body: 'The tide simulation is the first part of the world simulation to get a folder under engine/kestrel/world/. Only paths change.',
      kinds: ['move'],
      moves: [['engine/kestrel/tides', 'engine/kestrel/world/ocean']],
      transform: {
        'engine/kestrel/lib.rs': (text) => mods(text, ['tides'], ['world']),
      },
      write: {
        'engine/kestrel/world/mod.rs':
          '//! The world simulation.\npub mod ocean;\n',
      },
    },
  ];
  if (scale > 1) {
    // Two filler world subsystems that step with the simulation.
    const folders = ['flocks', 'kites'];
    for (const folder of folders)
      if (!fillerFiles.some((p) => p.startsWith(`engine/kestrel/${folder}/`)))
        throw new Error(`no filler folder engine/kestrel/${folder}`);
    commits.push({
      key: 'r02',
      at: at('2026-10-06 11:00'),
      subject: 'Move flocks and kites into world/ as well',
      body: 'Both step with the world simulation, so they sit beside the ocean now.',
      kinds: ['move'],
      moves: folders.map((f) => [
        `engine/kestrel/${f}`,
        `engine/kestrel/world/${f}`,
      ]),
      transform: {
        'engine/kestrel/lib.rs': (text) => mods(text, folders, []),
        'engine/kestrel/world/mod.rs': (text) => mods(text, [], folders),
      },
    });
  }
  commits.push(
    {
      key: 'r03',
      at: at('2026-10-06 14:00'),
      subject: 'Move the shader cache package to tools/shaders/cache',
      body: 'Makes room for the shader tools that are not part of the cache. Imports inside the package are relative, so no code changes.',
      kinds: ['move'],
      moves: [['tools/shadercache', 'tools/shaders/cache']],
      write: {
        'tools/shaders/__init__.py': '"""Shader tools for the build farm."""\n',
      },
      transform: {
        'README.md': (text) =>
          replaceOnce(
            text,
            '| `tools/shadercache/`                  |',
            '| `tools/shaders/cache/`                |'
          ),
      },
    },
    {
      key: 'r04',
      at: at('2026-10-07 10:00'),
      subject: 'Rename evict_pages to reclaim_pages',
      kinds: ['rename'],
      symbols: [
        {
          path: 'engine/lantern/shadows/vsm_pool.rs',
          symbol: 'evict_pages',
          newSymbol: 'reclaim_pages',
        },
      ],
    },
    {
      key: 'r05',
      at: at('2026-10-07 11:00'),
      subject: 'Rename vsm_pool.rs to page_pool.rs',
      body: 'The file is named after the type it holds, like the other pools.',
      kinds: ['rename'],
      moves: [
        [
          'engine/lantern/shadows/vsm_pool.rs',
          'engine/lantern/shadows/page_pool.rs',
        ],
      ],
    },
    {
      key: 'r06',
      at: at('2026-10-07 15:00'),
      subject:
        'Rename pso_cache.rs to pipeline_cache.rs and warm_district to prewarm_district',
      kinds: ['rename'],
      moves: [
        ['platform/skiff/pso_cache.rs', 'platform/skiff/pipeline_cache.rs'],
      ],
      symbols: [
        {
          path: 'platform/skiff/pipeline_cache.rs',
          symbol: 'warm_district',
          newSymbol: 'prewarm_district',
        },
      ],
    },
    {
      key: 'r07',
      at: at('2026-10-08 10:00'),
      subject: 'Rename save upgrades to migrations',
      body: 'upgrade.rs becomes migrate.rs and upgrade_steps becomes migration_steps, to match the tooling that writes them.',
      kinds: ['rename'],
      moves: [
        ['engine/kestrel/save/upgrade.rs', 'engine/kestrel/save/migrate.rs'],
      ],
      transform: {
        'engine/kestrel/save/migrate.rs': (text) =>
          replaceOnce(text, '//! Save upgrades:', '//! Save migrations:'),
      },
      symbols: [
        {
          path: 'engine/kestrel/save/migrate.rs',
          symbol: 'upgrade_steps',
          newSymbol: 'migration_steps',
        },
      ],
    },
    {
      key: 'r08',
      at: at('2026-10-08 13:00'),
      subject: 'Split the reactive mask out of the Tern history module',
      body: 'history.rs keeps the history clamp. The mask gets its own file.',
      kinds: ['split'],
      symbols: [
        {
          path: 'engine/lantern/tern/history.rs',
          symbol: 'apply_reactive_mask',
          newPath: 'engine/lantern/tern/reactive.rs',
        },
      ],
      // Filled in by build-repo.mjs from history.rs as it is; see split().
      split: {
        from: 'engine/lantern/tern/history.rs',
        symbol: 'apply_reactive_mask',
        into: 'engine/lantern/tern/reactive.rs',
        head: '//! The reactive mask: where it is set, Tern trusts the current frame.\nuse super::history::HistoryBuffer;\n\n',
      },
    },
    {
      key: 'r09',
      at: at('2026-10-08 16:00'),
      subject:
        'Merge the Skiff frame modes and dynamic resolution into display.rs',
      body: 'Both files were a screen long and every change touched both.',
      kinds: ['merge'],
      merge: {
        from: ['platform/skiff/frame_modes.rs', 'platform/skiff/dynres.rs'],
        into: 'platform/skiff/display.rs',
        head: '//! Display modes and dynamic resolution on Skiff. Tern upscales to 720p.\n',
      },
    },
    {
      key: 'r10',
      at: at('2026-10-09 10:00'),
      subject:
        'Rename checksum.rs to desync.rs and hash_blocks to hash_state_blocks',
      kinds: ['rename'],
      moves: [['net/coop/checksum.rs', 'net/coop/desync.rs']],
      symbols: [
        {
          path: 'net/coop/desync.rs',
          symbol: 'hash_blocks',
          newSymbol: 'hash_state_blocks',
        },
      ],
    },
    {
      key: 'r11',
      at: at('2026-10-09 15:00'),
      subject: 'Hash co-op state blocks every 60 frames',
      body: 'Halves the checksum traffic from the host. A desync now shows up within two seconds instead of one.',
      kinds: ['behaviour'],
      transform: {
        'net/coop/desync.rs': (text) =>
          replaceOnce(
            text,
            'pub const HASH_INTERVAL_FRAMES: u64 = 30;',
            'pub const HASH_INTERVAL_FRAMES: u64 = 60;'
          ),
      },
      behaviour: [
        {
          path: 'net/coop/desync.rs',
          symbol: 'HASH_INTERVAL_FRAMES',
          before: '30',
          after: '60',
          decision: 'netcode.dec-checksum',
        },
      ],
    }
  );
  return commits.map((c) => ({ author: REFACTOR_AUTHOR, ...c }));
}
