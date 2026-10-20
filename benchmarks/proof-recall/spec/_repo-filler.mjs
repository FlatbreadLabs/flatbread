// Filler for the scaled git test bed. `build-repo.mjs --scale N` (N above
// 1) adds it to spec/repo.mjs, on top of the N-times graph from
// `build.mjs --scale N`:
//
// - about 1.2 x (N - 1) filler source files for every real one, and at
//   least two for each filler subsystem in _filler.mjs. Each subsystem has
//   its own folder beside the real ones (engine/kestrel/kites/,
//   platform/rumble/, tools/texview/), with short modules named for what
//   they do (cache.rs, queue.py). Each module kind has its own code, and a
//   new engine folder is added to its crate's lib.rs, as the real ones are;
// - filler commits on main that add and edit those files, some with
//   `Proof:` trailers naming filler Decisions about the same subsystem that
//   were accepted by the commit's date;
// - one commit per Effort after the graph moves in. It supersedes a few
//   filler Decisions that earlier trailers name, as real Decisions are, and
//   writes code anchors (Citations with `role: code`) on filler files, the
//   implementation notes that cite them, and a few Risks, defects and hard
//   Constraints that name a filler path in their body;
// - six filler branches with draft PRs, two pairs of which conflict with
//   each other: one filler Decision superseded twice, and one filler
//   question with two accepted answers.
//
// Filler never touches a real file except the two crate lib.rs files,
// which only the first real commit writes and no question names. It never
// names a real path or symbol and never links to a real record. Records and
// commits keep to the limits the code and branch questions need (see
// GUARDED_ON_BRANCHES and the branch notes below), so every question keeps
// its answer. Filler adds nothing to the file-level routes the code
// questions use: `git log` on a real file and the records that name it are
// the same as at 1x. A seeded generator makes the output the same on every
// build.
//
// The leading underscore keeps `loadSpecs` from reading this file as a spec.
import { fillerTerms, random } from './_filler.mjs';

// Filler record keys start with this, so testbed.mjs can tell filler code
// anchors from the ones spec/repo.mjs declares.
const KEY_PREFIX = 'bed-';

/** True for a `<effort>.<key>` key of a record this file writes. */
export function isFillerKey(key) {
  return key.split('.')[1]?.startsWith(KEY_PREFIX) ?? false;
}

// People in spec/repo.mjs who work in each Effort, and the folder its
// filler subsystems go under.
const EFFORTS = {
  render: {
    people: ['ines', 'tomasz', 'yusuf', 'dara'],
    root: 'engine/lantern',
  },
  world: { people: ['rhea', 'kenji', 'marta', 'dara'], root: 'engine/kestrel' },
  ports: { people: ['priya', 'dara', 'tomasz'], root: 'platform' },
  tools: { people: ['liam', 'dara', 'kenji'], root: 'tools' },
  netcode: { people: ['sofia', 'dara', 'marta'], root: 'net' },
};

// Each filler subsystem's folder under its Effort's root, and the noun its
// type and constant names use.
const HOMES = {
  'font atlas': ['fonts', 'glyph'],
  'menu blur': ['blur', 'blur'],
  'decal pool': ['decals', 'decal'],
  'minimap renderer': ['minimap', 'minimap'],
  'photo mode': ['photo', 'photo'],
  'title card': ['title_card', 'card'],
  'subtitle renderer': ['subtitles', 'subtitle'],
  'crowd impostors': ['impostors', 'impostor'],
  'lens flare': ['flare', 'flare'],
  'credits roll': ['credits', 'credit'],
  'map fog': ['fog', 'fog'],
  'damage numbers': ['damage_numbers', 'damage_number'],
  'tooltip renderer': ['tooltips', 'tooltip'],
  'splash video': ['splash', 'splash'],
  'item preview': ['preview', 'preview'],
  'quest log': ['quests', 'quest'],
  'fishing minigame': ['fishing', 'fish'],
  'bird flocks': ['flocks', 'bird'],
  'lighthouse scheduler': ['lighthouse', 'beam'],
  'market stalls': ['market', 'stall'],
  'weather vane props': ['vanes', 'vane'],
  'ambient chatter': ['chatter', 'chatter'],
  'dock cranes': ['cranes', 'crane'],
  'bell tower clock': ['bell_tower', 'chime'],
  'kite physics': ['kites', 'kite'],
  'lantern festival': ['festival', 'festival'],
  'shell collection': ['shells', 'shell'],
  'tavern doors': ['doors', 'door'],
  'rope bridges': ['bridges', 'bridge'],
  'merchant carts': ['carts', 'cart'],
  'controller rumble': ['rumble', 'rumble'],
  'achievement service': ['achievements', 'achievement'],
  'cloud save sync': ['cloud_save', 'upload'],
  'suspend and resume': ['suspend', 'suspend'],
  'user switching': ['users', 'user'],
  'parental controls': ['parental', 'rating'],
  'store overlay': ['store', 'offer'],
  'screenshot button': ['screenshots', 'screenshot'],
  'trophy icons': ['trophies', 'trophy'],
  'keyboard prompts': ['prompts', 'prompt'],
  'battery indicator': ['battery', 'battery'],
  'region settings': ['region', 'region'],
  'capture gallery': ['gallery', 'capture'],
  'friend invites': ['invites', 'invite'],
  'sleep mode': ['sleep', 'sleep'],
  'level editor autosave': ['autosave', 'autosave'],
  'localization import': ['loc_import', 'string'],
  'audio bank packer': ['bank_packer', 'bank'],
  'texture viewer': ['texview', 'texture'],
  'crash symbol server': ['symserver', 'symbol'],
  'build dashboard': ['dashboard', 'build'],
  'test runner': ['test_runner', 'suite'],
  'nightly installer': ['installer', 'package'],
  'asset search': ['asset_search', 'hit'],
  'changelog bot': ['changelog', 'entry'],
  'license scanner': ['licenses', 'license'],
  'artist sandbox': ['sandbox', 'sandbox'],
  'patch differ': ['patchdiff', 'patch'],
  'doc site': ['docsite', 'page'],
  'review bot': ['review_bot', 'review'],
  'lobby browser': ['lobby', 'lobby'],
  'text chat': ['chat', 'message'],
  'friend presence': ['presence', 'presence'],
  'party invites': ['party', 'party'],
  'NAT probe': ['nat', 'probe'],
  'chat filter': ['chat_filter', 'filter'],
  'emote wheel': ['emotes', 'emote'],
  'ping display': ['ping', 'ping'],
  'matchmaking queue': ['matchmaking', 'ticket'],
  'region picker': ['regions', 'region'],
  'spectator list': ['spectators', 'spectator'],
  'kick vote': ['kick_vote', 'vote'],
  'host migration banner': ['host_banner', 'banner'],
  'join codes': ['join_codes', 'join_code'],
  'session timeout': ['session', 'idle'],
};

// The crate files that list engine folders. Only the first real commit
// writes them, so filler can add its folders to them.
const CRATE_LIBS = {
  'engine/lantern': 'engine/lantern/lib.rs',
  'engine/kestrel': 'engine/kestrel/lib.rs',
};

// Folders a code question reads as a whole on some branch (`changedPaths`
// under a folder): no filler branch may change a file in them.
// engine/kestrel/tides/ also has a folder `trailer` question on main.
// Filler has its own folders, so it never goes in any of them.
const GUARDED_ON_BRANCHES = [
  'engine/lantern/shadows/',
  'engine/kestrel/streaming/',
  'engine/kestrel/tides/',
  'tools/shadercache/',
];

const capitalize = (text) => text[0].toUpperCase() + text.slice(1);
const pascalOf = (snake) =>
  snake
    .split('_')
    .map((w) => capitalize(w))
    .join('');
const fill = (text, sub) => text.replaceAll('{sub}', sub);
/** Drops a word repeated right after itself: "decal pool pool size". */
const dedupe = (text) => text.replace(/\b(\w+) \1\b/gi, '$1');

// One module kind per entry. `word` names it in commit subjects and
// titles; `constant` (after the noun) is what the kind limits, and `value`
// its range; `first` is in the file from the start, `second` arrives in a
// later edit, and `helper` is a small extra some files start with and a
// later edit removes. `{n}` in a name is the subsystem's noun. `rs` and
// `py` write the code (see `render`); the rest is text for commits and
// records.
const PARTS = {
  cache: {
    word: 'cache',
    does: 'keeps built {sub} data between frames so it is built once',
    constant: 'CACHE_CAPACITY',
    value: [32, 512],
    first: 'evict',
    second: 'flush',
    helper: { rs: 'len', py: '__len__' },
    edit: 'Flush the {sub} cache when a level unloads',
    setting: 'the {sub} cache size',
    titles: [
      'The {sub} cache evicts the entry used longest ago',
      'The {sub} cache is flushed when a level unloads',
    ],
    note: (c) =>
      `${c.first} removes the entries used longest ago until fewer than ${c.C} remain, so a full cache never grows.`,
    lateNote: (c) =>
      `${c.second} empties the cache. The level loader calls it on unload, and nothing else does.`,
    risk: [
      'The {sub} cache may thrash in crowded scenes',
      (c) =>
        `${c.path} keeps at most ${c.C} entries. A scene that needs more rebuilds the ones it lost on every frame.`,
    ],
    defect: [
      'The {sub} cache never counts a miss',
      (c) =>
        `${c.path} rebuilds a missing entry without counting it, so a cache that is too small looks like slow ${c.sub} code in captures.`,
    ],
    rs: (c) => [
      'use std::collections::HashMap;',
      '',
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      `pub struct ${c.N}Cache {`,
      `    built: HashMap<u64, (${c.N}Mesh, u64)>,`,
      '    frame: u64,',
      '}',
      '',
      `impl ${c.N}Cache {`,
      `    /// Keeps at most ${c.C} entries; the one used longest ago goes first.`,
      `    pub fn ${c.first}(&mut self) {`,
      `        while self.built.len() >= ${c.C} {`,
      '            let oldest = self',
      '                .built',
      '                .iter()',
      '                .min_by_key(|(_, (_, used))| *used)',
      '                .map(|(id, _)| *id);',
      '            match oldest {',
      '                Some(id) => self.built.remove(&id),',
      '                None => break,',
      '            };',
      '        }',
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> usize {`,
            '        self.built.len()',
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    pub fn ${c.second}(&mut self) {`,
            '        self.built.clear();',
            '        self.frame = 0;',
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      'from collections import OrderedDict',
      '',
      `${c.C} = ${c.v}`,
      '',
      '',
      `class ${c.N}Cache:`,
      '    def __init__(self):',
      '        self._built = OrderedDict()',
      '',
      `    def ${c.first}(self):`,
      '        """Drop the entries used longest ago until there is room."""',
      `        while len(self._built) >= ${c.C}:`,
      '            self._built.popitem(last=False)',
      ...(c.h
        ? ['', `    def ${c.helper}(self):`, '        return len(self._built)']
        : []),
      ...(c.s
        ? ['', `    def ${c.second}(self):`, '        self._built.clear()']
        : []),
    ],
  },
  pool: {
    word: 'pool',
    does: 'hands out {sub} slots from a fixed pool',
    constant: 'POOL_SLOTS',
    value: [16, 256],
    first: 'acquire',
    second: 'release',
    helper: { rs: 'live', py: 'free_count' },
    edit: 'Return {sub} pool slots at the end of the frame',
    setting: 'the {sub} pool size',
    unit: ' slots',
    titles: [
      'The {sub} pool hands out slots until its free list is empty',
      'Released {sub} slots go back on the free list',
    ],
    note: (c) =>
      `${c.first} returns no slot once all ${c.C} are out, and callers skip the ${c.sub} for that frame.`,
    lateNote: (c) =>
      `${c.second} puts a slot back on the free list. Nothing checks that a slot is released only once.`,
    risk: [
      'The {sub} pool may run dry when many are needed at once',
      (c) =>
        `${c.path} has ${c.C} slots. When more are asked for, the extras are not drawn that frame.`,
    ],
    defect: [
      'A {sub} that gets no pool slot leaves no trace',
      (c) =>
        `${c.path} returns no slot when the pool is empty and logs nothing, so a missing ${c.sub} element is hard to trace.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      `pub struct ${c.N}Pool {`,
      '    free: Vec<u16>,',
      '    live: usize,',
      '}',
      '',
      `impl ${c.N}Pool {`,
      '    pub fn new() -> Self {',
      '        Self {',
      `            free: (0..${c.C} as u16).rev().collect(),`,
      '            live: 0,',
      '        }',
      '    }',
      '',
      `    /// None once all ${c.C} slots are out.`,
      `    pub fn ${c.first}(&mut self) -> Option<u16> {`,
      '        let slot = self.free.pop()?;',
      '        self.live += 1;',
      '        Some(slot)',
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> usize {`,
            '        self.live',
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    pub fn ${c.second}(&mut self, slot: u16) {`,
            `        debug_assert!((slot as usize) < ${c.C});`,
            '        self.free.push(slot);',
            '        self.live -= 1;',
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      `${c.C} = ${c.v}`,
      '',
      '',
      `class ${c.N}Pool:`,
      '    def __init__(self):',
      `        self._free = list(range(${c.C}))`,
      '',
      `    def ${c.first}(self):`,
      `        """Return a free slot, or None when all ${c.C} are taken."""`,
      '        return self._free.pop() if self._free else None',
      ...(c.h
        ? ['', `    def ${c.helper}(self):`, '        return len(self._free)']
        : []),
      ...(c.s
        ? [
            '',
            `    def ${c.second}(self, slot):`,
            `        assert 0 <= slot < ${c.C}`,
            '        self._free.append(slot)',
          ]
        : []),
    ],
  },
  budget: {
    word: 'budget',
    does: 'keeps {sub} work inside its per-frame budget',
    constant: 'BUDGET_US',
    value: [50, 900],
    first: 'charge',
    second: 'refund',
    helper: { rs: 'spent_us', py: 'spent_us' },
    edit: 'Hand unused {sub} budget back at the end of the frame',
    setting: 'the {sub} frame budget',
    unit: ' µs',
    titles: [
      'The {sub} stops work once its frame budget is spent',
      'Unspent {sub} budget is handed back each frame',
    ],
    note: (c) =>
      `${c.first} refuses work that would take the frame past ${c.C} microseconds, and refused work waits for the next frame.`,
    lateNote: (c) =>
      `${c.second} returns what is left of the budget and starts the next frame at zero.`,
    risk: [
      'The {sub} budget may be too small on slow hardware',
      (c) =>
        `${c.path} allows ${c.C} microseconds a frame. On the slowest Skiff units the ${c.sub} work alone can take longer, so some of it never runs.`,
    ],
    defect: [
      'Work the {sub} refuses over budget is lost',
      (c) =>
        `${c.path} refuses work over budget, but its callers do not retry, so some ${c.sub} updates never happen.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: u32 = ${c.v};`,
      '',
      '#[derive(Default)]',
      `pub struct ${c.N}Budget {`,
      '    spent_us: u32,',
      '}',
      '',
      `impl ${c.N}Budget {`,
      `    /// False when the work would push this frame past ${c.C} microseconds.`,
      `    pub fn ${c.first}(&mut self, cost_us: u32) -> bool {`,
      `        if self.spent_us + cost_us > ${c.C} {`,
      '            return false;',
      '        }',
      '        self.spent_us += cost_us;',
      '        true',
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> u32 {`,
            '        self.spent_us',
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    pub fn ${c.second}(&mut self) -> u32 {`,
            `        let left = ${c.C}.saturating_sub(self.spent_us);`,
            '        self.spent_us = 0;',
            '        left',
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      `${c.C} = ${c.v}`,
      '',
      '',
      `class ${c.N}Budget:`,
      '    def __init__(self):',
      '        self._spent_us = 0',
      '',
      `    def ${c.first}(self, cost_us):`,
      `        """Return False if the work would go past ${c.C} microseconds."""`,
      `        if self._spent_us + cost_us > ${c.C}:`,
      '            return False',
      '        self._spent_us += cost_us',
      '        return True',
      ...(c.h
        ? ['', `    def ${c.helper}(self):`, '        return self._spent_us']
        : []),
      ...(c.s
        ? [
            '',
            `    def ${c.second}(self):`,
            `        left = max(0, ${c.C} - self._spent_us)`,
            '        self._spent_us = 0',
            '        return left',
          ]
        : []),
    ],
  },
  layout: {
    word: 'layout',
    does: 'places {sub} elements on screen before they are drawn',
    constant: 'MAX_COLUMNS',
    value: [2, 12],
    first: 'arrange',
    second: 'measure',
    helper: { rs: 'columns', py: 'column_width' },
    edit: 'Measure {sub} elements before laying them out',
    setting: 'the {sub} column count',
    titles: [
      'The {sub} layout fills rows left to right',
      'The {sub} layout reports its size before drawing',
    ],
    note: (c) =>
      `${c.first} places elements in rows of ${c.C} columns, left to right, with a fixed gap.`,
    lateNote: (c) =>
      `${c.second} returns the size of the laid-out block, so callers can center it.`,
    risk: [
      'The {sub} layout may overflow on narrow screens',
      (c) =>
        `${c.path} always uses ${c.C} columns. On a handheld screen the last column can fall off the edge.`,
    ],
    defect: [
      'The {sub} layout ignores right-to-left languages',
      (c) =>
        `${c.path} fills rows left to right in every language, so Arabic and Hebrew builds show ${c.sub} elements in the wrong order.`,
    ],
    rs: (c) => [
      'use glam::Vec2;',
      '',
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      `pub struct ${c.N}Layout {`,
      '    pub cell: Vec2,',
      '    pub gap: f32,',
      '}',
      '',
      `impl ${c.N}Layout {`,
      `    pub fn ${c.first}(&self, count: usize) -> Vec<Vec2> {`,
      '        (0..count)',
      '            .map(|i| {',
      `                let (row, col) = (i / ${c.C}, i % ${c.C});`,
      '                Vec2::new(',
      '                    col as f32 * (self.cell.x + self.gap),',
      '                    row as f32 * (self.cell.y + self.gap),',
      '                )',
      '            })',
      '            .collect()',
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> usize {`,
            `        ${c.C}`,
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    pub fn ${c.second}(&self, count: usize) -> Vec2 {`,
            `        let cols = count.min(${c.C}) as f32;`,
            `        let rows = count.div_ceil(${c.C}) as f32;`,
            '        Vec2::new(cols * self.cell.x, rows * self.cell.y)',
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      `${c.C} = ${c.v}`,
      '',
      '',
      `def ${c.first}(items):`,
      `    """Split items into rows of at most ${c.C} columns."""`,
      `    return [items[i : i + ${c.C}] for i in range(0, len(items), ${c.C})]`,
      ...(c.h
        ? ['', '', `def ${c.helper}(width):`, `    return width // ${c.C}`]
        : []),
      ...(c.s
        ? [
            '',
            '',
            `def ${c.second}(items, cell_width, cell_height):`,
            `    rows = -(-len(items) // ${c.C})`,
            `    return min(len(items), ${c.C}) * cell_width, rows * cell_height`,
          ]
        : []),
    ],
  },
  queue: {
    word: 'queue',
    does: 'orders pending {sub} requests',
    constant: 'QUEUE_DEPTH',
    value: [8, 128],
    first: 'enqueue',
    second: 'drain',
    helper: { rs: 'is_empty', py: '__bool__' },
    edit: 'Drain the {sub} queue on a level change',
    setting: 'the {sub} queue depth',
    titles: [
      'The {sub} queue hands requests back when it is full',
      'The {sub} queue can be drained in one call',
    ],
    note: (c) =>
      `${c.first} hands the request back to the caller once ${c.C} are waiting.`,
    lateNote: (c) =>
      `${c.second} takes every waiting request at once. The level loader uses it on a level change.`,
    risk: [
      'The {sub} queue may fill during loading screens',
      (c) =>
        `${c.path} holds ${c.C} requests. Loading a level queues many at once, and the rest are handed back.`,
    ],
    defect: [
      'Most callers drop the {sub} requests the queue hands back',
      (c) =>
        `${c.path} returns a refused request to its caller, but most callers ignore it, so the ${c.sub} request is lost.`,
    ],
    rs: (c) => [
      'use std::collections::VecDeque;',
      '',
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      `pub struct ${c.N}Queue {`,
      `    pending: VecDeque<${c.N}Request>,`,
      '}',
      '',
      `impl ${c.N}Queue {`,
      `    /// Hands the request back when ${c.C} requests are already waiting.`,
      `    pub fn ${c.first}(&mut self, request: ${c.N}Request) -> Result<(), ${c.N}Request> {`,
      `        if self.pending.len() >= ${c.C} {`,
      '            return Err(request);',
      '        }',
      '        self.pending.push_back(request);',
      '        Ok(())',
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> bool {`,
            '        self.pending.is_empty()',
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    pub fn ${c.second}(&mut self) -> impl Iterator<Item = ${c.N}Request> + '_ {`,
            '        self.pending.drain(..)',
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      'from collections import deque',
      '',
      `${c.C} = ${c.v}`,
      '',
      '',
      `class ${c.N}Queue:`,
      '    def __init__(self):',
      '        self._pending = deque()',
      '',
      `    def ${c.first}(self, job):`,
      `        """Return False when ${c.C} jobs are already waiting."""`,
      `        if len(self._pending) >= ${c.C}:`,
      '            return False',
      '        self._pending.append(job)',
      '        return True',
      ...(c.h
        ? [
            '',
            `    def ${c.helper}(self):`,
            '        return bool(self._pending)',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    def ${c.second}(self):`,
            '        while self._pending:',
            '            yield self._pending.popleft()',
          ]
        : []),
    ],
  },
  state: {
    word: 'state',
    does: 'holds {sub} state that lasts for a session',
    constant: 'STATE_VERSION',
    value: [1, 9],
    first: 'apply',
    second: 'snapshot',
    helper: { rs: 'is_fresh', py: 'is_empty' },
    edit: 'Snapshot {sub} state for the crash reporter',
    setting: 'the {sub} state version',
    titles: [
      'The {sub} ignores saved state from another version',
      'The {sub} state can be copied for crash reports',
    ],
    note: (c) =>
      `${c.first} keeps saved state only when its version is ${c.C}. Older state is dropped, not upgraded.`,
    lateNote: (c) =>
      `${c.second} copies the state with its version, for the crash reporter.`,
    risk: [
      "Bumping the {sub} state version resets players' progress",
      (c) =>
        `${c.path} drops saved state from any other version, so raising ${c.C} resets the ${c.sub} for every player.`,
    ],
    defect: [
      'The {sub} drops old saved state without telling the player',
      (c) =>
        `${c.path} ignores state saved under an older version and shows nothing, so players see their ${c.sub} progress vanish after a patch.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: u8 = ${c.v};`,
      '',
      '#[derive(Clone, Default)]',
      `pub struct ${c.N}State {`,
      '    pub unlocked: Vec<u32>,',
      '    pub flags: u32,',
      '}',
      '',
      `impl ${c.N}State {`,
      '    /// Saved state from another version is dropped, not upgraded.',
      `    pub fn ${c.first}(&mut self, version: u8, saved: ${c.N}State) -> bool {`,
      `        if version != ${c.C} {`,
      '            return false;',
      '        }',
      '        *self = saved;',
      '        true',
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> bool {`,
            '        self.flags == 0 && self.unlocked.is_empty()',
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    pub fn ${c.second}(&self) -> (u8, ${c.N}State) {`,
            `        (${c.C}, self.clone())`,
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      'import json',
      '',
      `${c.C} = ${c.v}`,
      '',
      '',
      `class ${c.N}State:`,
      '    def __init__(self):',
      '        self.data = {}',
      '',
      `    def ${c.first}(self, text):`,
      '        """Load saved state; state from another version is ignored."""',
      '        saved = json.loads(text)',
      `        if saved.get("version") != ${c.C}:`,
      '            return False',
      '        self.data = saved["data"]',
      '        return True',
      ...(c.h
        ? ['', `    def ${c.helper}(self):`, '        return not self.data']
        : []),
      ...(c.s
        ? [
            '',
            `    def ${c.second}(self):`,
            `        return json.dumps({"version": ${c.C}, "data": self.data}, sort_keys=True)`,
          ]
        : []),
    ],
  },
  config: {
    word: 'settings',
    does: 'reads {sub} settings from the tuning file',
    constant: 'DEFAULT_LEVEL',
    value: [1, 5],
    first: 'load_{n}_config',
    second: 'validate_{n}_config',
    helper: { rs: 'Default', py: 'default_{n}_config' },
    edit: 'Validate {sub} settings when the tuning file loads',
    setting: 'the default {sub} level',
    titles: [
      'The {sub} falls back to a default level',
      '{Sub} settings are checked when the tuning file loads',
    ],
    note: (c) =>
      `${c.first} reads the level from the tuning file and uses ${c.C} when the file has none.`,
    lateNote: (c) =>
      `${c.second} rejects a level outside 1 to 5 instead of clamping it.`,
    risk: [
      'A mistyped {sub} tuning key goes unnoticed',
      (c) =>
        `${c.path} uses ${c.C} whenever the tuning file has no level, so a typo in the key looks like the default.`,
    ],
    defect: [
      'The {sub} reads its tuning file only at startup',
      (c) =>
        `${c.path} reads the ${c.sub} settings once, so a tuning change needs a restart to show.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: u8 = ${c.v};`,
      '',
      `pub struct ${c.N}Config {`,
      '    pub level: u8,',
      '    pub enabled: bool,',
      '}',
      ...(c.h
        ? [
            '',
            `impl Default for ${c.N}Config {`,
            '    fn default() -> Self {',
            `        Self { level: ${c.C}, enabled: true }`,
            '    }',
            '}',
          ]
        : []),
      '',
      `pub fn ${c.first}(tuning: &Tuning) -> ${c.N}Config {`,
      `    ${c.N}Config {`,
      `        level: tuning.get_u8("${c.n}.level").unwrap_or(${c.C}),`,
      `        enabled: tuning.get_bool("${c.n}.enabled").unwrap_or(true),`,
      '    }',
      '}',
      ...(c.s
        ? [
            '',
            `pub fn ${c.second}(config: &${c.N}Config) -> Result<(), String> {`,
            '    if !(1..=5).contains(&config.level) {',
            `        return Err(format!("${c.n} level {} is out of range", config.level));`,
            '    }',
            '    Ok(())',
            '}',
          ]
        : []),
    ],
    py: (c) => [
      'import tomllib',
      '',
      `${c.C} = ${c.v}`,
      '',
      '',
      `def ${c.first}(path):`,
      '    with open(path, "rb") as f:',
      `        tuning = tomllib.load(f).get("${c.n}", {})`,
      `    return {"level": tuning.get("level", ${c.C}), "enabled": tuning.get("enabled", True)}`,
      ...(c.h
        ? [
            '',
            '',
            `def ${c.helper}():`,
            `    return {"level": ${c.C}, "enabled": True}`,
          ]
        : []),
      ...(c.s
        ? [
            '',
            '',
            `def ${c.second}(config):`,
            '    if not 1 <= config["level"] <= 5:',
            `        raise ValueError(f"${c.n} level {config['level']} is out of range")`,
          ]
        : []),
    ],
  },
  stats: {
    word: 'stats',
    does: 'counts {sub} work for the profiler overlay',
    constant: 'STATS_WINDOW',
    value: [30, 600],
    first: 'record',
    second: 'summarize',
    helper: { rs: 'last', py: 'last' },
    edit: 'Summarize {sub} counters once per second',
    setting: 'the {sub} stats window',
    unit: ' frames',
    titles: [
      'The {sub} stats keep a rolling window of frames',
      'The {sub} stats report a mean over the window',
    ],
    note: (c) =>
      `${c.first} keeps the counts of the last ${c.C} frames and overwrites the oldest.`,
    lateNote: (c) =>
      `${c.second} returns the mean over the window, which the profiler overlay shows.`,
    risk: [
      'The {sub} stats window may hide short spikes',
      (c) =>
        `${c.path} averages over ${c.C} frames, so a spike of a few frames barely moves the number.`,
    ],
    defect: [
      'The {sub} stats count paused frames',
      (c) =>
        `${c.path} records a count on every frame, also while paused, so the overlay's mean drops in the pause menu.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      `pub struct ${c.N}Stats {`,
      '    counts: Vec<u32>,',
      '    next: usize,',
      '}',
      '',
      `impl ${c.N}Stats {`,
      `    pub fn ${c.first}(&mut self, count: u32) {`,
      `        if self.counts.len() < ${c.C} {`,
      '            self.counts.push(count);',
      '        } else {',
      '            self.counts[self.next] = count;',
      '        }',
      `        self.next = (self.next + 1) % ${c.C};`,
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> Option<u32> {`,
            '        self.counts.last().copied()',
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    /// Mean over the last ${c.C} frames.`,
            `    pub fn ${c.second}(&self) -> f32 {`,
            '        if self.counts.is_empty() {',
            '            return 0.0;',
            '        }',
            '        self.counts.iter().sum::<u32>() as f32 / self.counts.len() as f32',
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      'from collections import deque',
      '',
      `${c.C} = ${c.v}`,
      '',
      '',
      `class ${c.N}Stats:`,
      '    def __init__(self):',
      `        self._counts = deque(maxlen=${c.C})`,
      '',
      `    def ${c.first}(self, count):`,
      '        self._counts.append(count)',
      ...(c.h
        ? [
            '',
            `    def ${c.helper}(self):`,
            '        return self._counts[-1] if self._counts else None',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    def ${c.second}(self):`,
            `        """Mean of the last ${c.C} samples."""`,
            '        return sum(self._counts) / len(self._counts) if self._counts else 0.0',
          ]
        : []),
    ],
  },
  loader: {
    word: 'loader',
    does: 'loads {sub} assets on demand',
    constant: 'MAX_IN_FLIGHT',
    value: [2, 24],
    first: 'request',
    second: 'cancel',
    helper: { rs: 'waiting', py: 'pending' },
    edit: 'Cancel {sub} loads the player has walked away from',
    setting: 'the {sub} read limit',
    titles: [
      'The {sub} loader limits how many reads are in flight',
      'Pending {sub} loads can be cancelled',
    ],
    note: (c) =>
      `${c.first} starts at most ${c.C} reads at once, and the rest wait in order.`,
    lateNote: (c) =>
      `${c.second} drops a waiting load or cancels the read in flight.`,
    risk: [
      'The {sub} loader may fall behind after fast travel',
      (c) =>
        `${c.path} keeps ${c.C} reads in flight. After fast travel the loads behind them can take seconds to clear.`,
    ],
    defect: [
      'Waiting {sub} loads are never started',
      (c) =>
        `${c.path} puts loads past ${c.C} on a waiting list, but nothing moves them into flight when a read finishes.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      `pub struct ${c.N}Loader {`,
      '    in_flight: Vec<(AssetId, ReadHandle)>,',
      '    waiting: Vec<AssetId>,',
      '}',
      '',
      `impl ${c.N}Loader {`,
      `    pub fn ${c.first}(&mut self, io: &mut Io, asset: AssetId) {`,
      `        if self.in_flight.len() < ${c.C} {`,
      '            self.in_flight.push((asset, io.read(asset)));',
      '        } else {',
      '            self.waiting.push(asset);',
      '        }',
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> usize {`,
            '        self.waiting.len()',
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    pub fn ${c.second}(&mut self, io: &mut Io, asset: AssetId) {`,
            '        self.waiting.retain(|a| *a != asset);',
            '        if let Some(i) = self.in_flight.iter().position(|(a, _)| *a == asset) {',
            '            io.cancel(self.in_flight.swap_remove(i).1);',
            '        }',
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      'from concurrent.futures import ThreadPoolExecutor',
      '',
      `${c.C} = ${c.v}`,
      '',
      `_executor = ThreadPoolExecutor(max_workers=${c.C})`,
      '',
      '',
      `class ${c.N}Loader:`,
      '    def __init__(self, fetch):',
      '        self._fetch = fetch',
      '        self._futures = {}',
      '',
      `    def ${c.first}(self, name):`,
      '        if name not in self._futures:',
      '            self._futures[name] = _executor.submit(self._fetch, name)',
      '        return self._futures[name]',
      ...(c.h
        ? [
            '',
            `    def ${c.helper}(self):`,
            '        return [n for n, f in self._futures.items() if not f.done()]',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    def ${c.second}(self, name):`,
            '        future = self._futures.pop(name, None)',
            '        return future.cancel() if future else False',
          ]
        : []),
    ],
  },
  update: {
    word: 'update',
    does: 'steps {sub} logic on the game tick',
    constant: 'STEP_TICKS',
    value: [1, 8],
    first: 'step_{n}',
    second: 'skip_{n}',
    helper: { rs: 'is_step_tick', py: 'is_step_tick' },
    edit: 'Skip {sub} updates while the pause menu is open',
    setting: 'the {sub} step interval',
    unit: ' ticks',
    titles: [
      'The {sub} does not step on every tick',
      'The {sub} stops stepping while the game is paused',
    ],
    note: (c) =>
      `${c.first} runs once every ${c.C} ticks and scales its time step to match.`,
    lateNote: (c) =>
      `${c.second} tells the tick loop to leave the ${c.sub} alone while the pause menu is open or a level loads.`,
    risk: [
      'Stepping the {sub} less often may look like stutter',
      (c) =>
        `${c.path} steps every ${c.C} ticks. Above 2, the motion can look uneven at 60 Hz.`,
    ],
    defect: [
      'The {sub} keeps stepping during loading screens',
      (c) =>
        `${c.path} steps on the tick count alone, so the ${c.sub} keeps running while a level loads.`,
    ],
    rs: (c) => [
      'use crate::world::World;',
      '',
      `pub const ${c.C}: u64 = ${c.v};`,
      '',
      `/// Steps every ${c.n} once per ${c.C} ticks.`,
      `pub fn ${c.first}(world: &mut World, tick: u64) {`,
      `    if tick % ${c.C} != 0 {`,
      '        return;',
      '    }',
      `    let dt = ${c.C} as f32 * world.tick_seconds();`,
      `    for ${c.n} in world.query_mut::<${c.N}>() {`,
      `        ${c.n}.advance(dt);`,
      '    }',
      '}',
      ...(c.h
        ? [
            '',
            `fn ${c.helper}(tick: u64) -> bool {`,
            `    tick % ${c.C} == 0`,
            '}',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `pub fn ${c.second}(world: &World) -> bool {`,
            '    world.pause_menu_open() || world.loading()',
            '}',
          ]
        : []),
    ],
    py: (c) => [
      'import time',
      '',
      `${c.C} = ${c.v}`,
      '',
      '',
      `def ${c.first}(state, tick):`,
      `    """Run one update every ${c.C} ticks."""`,
      `    if tick % ${c.C}:`,
      '        return False',
      '    state["updated_at"] = time.time()',
      '    return True',
      ...(c.h
        ? ['', '', `def ${c.helper}(tick):`, `    return tick % ${c.C} == 0`]
        : []),
      ...(c.s
        ? [
            '',
            '',
            `def ${c.second}(state):`,
            '    return state.get("paused", False)',
          ]
        : []),
    ],
  },
  events: {
    word: 'events',
    does: 'sends {sub} events to listeners',
    constant: 'MAX_LISTENERS',
    value: [4, 64],
    first: 'emit',
    second: 'subscribe',
    helper: { rs: 'listener_count', py: 'names' },
    edit: 'Let systems subscribe to {sub} events',
    setting: 'the {sub} listener limit',
    titles: [
      '{Sub} events go to every listener in order',
      'The {sub} caps how many listeners it takes',
    ],
    note: (c) =>
      `${c.first} calls every listener in the order they subscribed, on the caller's thread.`,
    lateNote: (c) =>
      `${c.second} refuses a listener once ${c.C} are registered.`,
    risk: [
      'A slow {sub} listener holds up the others',
      (c) =>
        `${c.path} calls listeners one after another, so one slow listener delays every ${c.sub} event after it.`,
    ],
    defect: [
      '{Sub} listeners are never removed',
      (c) =>
        `${c.path} has no way to unsubscribe, so a listener from an unloaded level stays registered.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      `pub enum ${c.N}Event {`,
      '    Started(u32),',
      '    Finished(u32),',
      '}',
      '',
      `pub struct ${c.N}Events {`,
      `    listeners: Vec<Box<dyn Fn(&${c.N}Event)>>,`,
      '}',
      '',
      `impl ${c.N}Events {`,
      `    pub fn ${c.first}(&self, event: &${c.N}Event) {`,
      '        for listener in &self.listeners {',
      '            listener(event);',
      '        }',
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> usize {`,
            '        self.listeners.len()',
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    /// False once ${c.C} listeners are registered.`,
            `    pub fn ${c.second}(&mut self, listener: Box<dyn Fn(&${c.N}Event)>) -> bool {`,
            `        if self.listeners.len() >= ${c.C} {`,
            '            return false;',
            '        }',
            '        self.listeners.push(listener);',
            '        true',
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      `${c.C} = ${c.v}`,
      '',
      '',
      `class ${c.N}Events:`,
      '    def __init__(self):',
      '        self._listeners = {}',
      '',
      `    def ${c.first}(self, name, payload=None):`,
      '        for listener in self._listeners.get(name, []):',
      '            listener(payload)',
      ...(c.h
        ? [
            '',
            `    def ${c.helper}(self):`,
            '        return sorted(self._listeners)',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    def ${c.second}(self, name, listener):`,
            '        listeners = self._listeners.setdefault(name, [])',
            `        if len(listeners) >= ${c.C}:`,
            '            raise RuntimeError(f"too many listeners for {name}")',
            '        listeners.append(listener)',
          ]
        : []),
    ],
  },
  table: {
    word: 'table',
    does: 'looks up {sub} entries by id',
    constant: 'INITIAL_ROWS',
    value: [64, 4096],
    first: 'insert',
    second: 'lookup',
    helper: { rs: 'rows', py: 'row_count' },
    edit: 'Look up {sub} rows by id without a scan',
    setting: 'the starting size of the {sub} table',
    titles: [
      'The {sub} table starts with room for a fixed number of rows',
      'The {sub} table finds rows through an index',
    ],
    note: (c) =>
      `${c.first} adds a row and records its index. The table starts with room for ${c.C} rows.`,
    lateNote: (c) =>
      `${c.second} finds a row through the index instead of scanning.`,
    risk: [
      'The {sub} table may grow in the middle of a frame',
      (c) =>
        `${c.path} starts with room for ${c.C} rows. A level with more makes it reallocate while the game runs.`,
    ],
    defect: [
      'Reloading a {sub} adds a second row for it',
      (c) =>
        `${c.path} appends on every insert, even for an id it already holds, so the table grows each time a ${c.sub} entry is reloaded.`,
    ],
    rs: (c) => [
      'use std::collections::HashMap;',
      '',
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      `pub struct ${c.N}Table {`,
      `    rows: Vec<${c.N}Row>,`,
      '    by_id: HashMap<u32, usize>,',
      '}',
      '',
      `impl ${c.N}Table {`,
      '    pub fn new() -> Self {',
      '        Self {',
      `            rows: Vec::with_capacity(${c.C}),`,
      `            by_id: HashMap::with_capacity(${c.C}),`,
      '        }',
      '    }',
      '',
      `    pub fn ${c.first}(&mut self, id: u32, row: ${c.N}Row) {`,
      '        self.by_id.insert(id, self.rows.len());',
      '        self.rows.push(row);',
      '    }',
      ...(c.h
        ? [
            '',
            `    pub fn ${c.helper}(&self) -> &[${c.N}Row] {`,
            '        &self.rows',
            '    }',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `    pub fn ${c.second}(&self, id: u32) -> Option<&${c.N}Row> {`,
            '        self.by_id.get(&id).map(|&i| &self.rows[i])',
            '    }',
          ]
        : []),
      '}',
    ],
    py: (c) => [
      `${c.C} = ${c.v}`,
      '',
      '',
      `class ${c.N}Table:`,
      '    def __init__(self):',
      `        self._rows = [None] * ${c.C}`,
      '        self._index = {}',
      '',
      `    def ${c.first}(self, row_id, row):`,
      '        if len(self._index) == len(self._rows):',
      '            self._rows.extend([None] * len(self._rows))',
      '        self._index[row_id] = len(self._index)',
      '        self._rows[self._index[row_id]] = row',
      ...(c.h
        ? ['', `    def ${c.helper}(self):`, '        return len(self._index)']
        : []),
      ...(c.s
        ? [
            '',
            `    def ${c.second}(self, row_id):`,
            '        i = self._index.get(row_id)',
            '        return None if i is None else self._rows[i]',
          ]
        : []),
    ],
  },
  debug: {
    word: 'debug drawing',
    does: 'draws {sub} debug output in development builds',
    constant: 'MAX_DEBUG_LINES',
    value: [16, 400],
    first: 'draw_{n}_debug',
    second: 'clear_{n}_debug',
    helper: { rs: '{n}_debug_enabled', py: '{n}_debug_enabled' },
    edit: 'Clear {sub} debug lines between captures',
    setting: 'the {sub} debug line limit',
    titles: [
      '{Sub} debug drawing stops at a line limit',
      '{Sub} debug lines can be cleared between captures',
    ],
    note: (c) =>
      `${c.first} draws at most ${c.C} lines and says how many it skipped. Release builds leave it out.`,
    lateNote: (c) =>
      `${c.second} clears the ${c.sub} debug layer so captures start empty.`,
    risk: [
      'The {sub} debug line limit may hide the line that matters',
      (c) =>
        `${c.path} draws only the first ${c.C} lines, in the order they were added, so the one being debugged can be cut.`,
    ],
    defect: [
      '{Sub} debug lines stay on screen after the overlay closes',
      (c) =>
        `${c.path} draws into a layer that nothing clears when the debug overlay closes, so old ${c.sub} lines linger.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      '#[cfg(debug_assertions)]',
      `pub fn ${c.first}(gizmos: &mut Gizmos, lines: &[(Vec3, Vec3)]) {`,
      `    for (from, to) in lines.iter().take(${c.C}) {`,
      '        gizmos.line(*from, *to, Color::YELLOW);',
      '    }',
      `    if lines.len() > ${c.C} {`,
      `        gizmos.text(Vec3::ZERO, &format!("{} more", lines.len() - ${c.C}));`,
      '    }',
      '}',
      ...(c.h
        ? [
            '',
            '#[cfg(debug_assertions)]',
            `pub fn ${c.helper}() -> bool {`,
            `    std::env::var_os("${c.n.toUpperCase()}_DEBUG").is_some()`,
            '}',
          ]
        : []),
      ...(c.s
        ? [
            '',
            '#[cfg(debug_assertions)]',
            `pub fn ${c.second}(gizmos: &mut Gizmos) {`,
            `    gizmos.clear_layer(GizmoLayer::${c.N});`,
            '}',
          ]
        : []),
    ],
    py: (c) => [
      'import logging',
      '',
      `${c.C} = ${c.v}`,
      '',
      `log = logging.getLogger("${c.n}")`,
      '',
      '',
      `def ${c.first}(lines):`,
      `    for line in lines[:${c.C}]:`,
      '        log.debug(line)',
      `    if len(lines) > ${c.C}:`,
      `        log.debug("%d more lines", len(lines) - ${c.C})`,
      ...(c.h
        ? [
            '',
            '',
            `def ${c.helper}():`,
            '    return log.isEnabledFor(logging.DEBUG)',
          ]
        : []),
      ...(c.s
        ? [
            '',
            '',
            `def ${c.second}():`,
            '    for handler in log.handlers:',
            '        handler.flush()',
          ]
        : []),
    ],
  },
  schedule: {
    word: 'scheduler',
    does: 'decides when {sub} work runs',
    constant: 'SLICE_US',
    value: [100, 2000],
    first: 'plan_{n}_work',
    second: 'defer_{n}_work',
    helper: { rs: 'total_cost_us', py: 'total_cost_us' },
    edit: 'Defer {sub} work to frames with spare time',
    setting: 'the {sub} time slice',
    unit: ' µs',
    titles: [
      '{Sub} work runs in a fixed time slice',
      'Leftover {sub} work moves to the next frame, cheapest first',
    ],
    note: (c) =>
      `${c.first} takes jobs from the front until the slice is full, and never more than ${c.C} microseconds.`,
    lateNote: (c) =>
      `${c.second} drops the jobs that ran and sorts the rest by cost, so cheap jobs go first next frame.`,
    risk: [
      'An expensive {sub} job may never run',
      (c) =>
        `${c.path} picks jobs from the front within ${c.C} microseconds, so a job that costs more than the slice is never picked.`,
    ],
    defect: [
      '{Sub} jobs can run out of order',
      (c) =>
        `${c.path} sorts deferred jobs by cost, so a later cheap job can run before an earlier one it depends on.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: u32 = ${c.v};`,
      '',
      `pub struct ${c.N}Job {`,
      '    pub cost_us: u32,',
      '}',
      '',
      `/// How many jobs fit in this frame's slice, at most ${c.C} microseconds.`,
      `pub fn ${c.first}(jobs: &[${c.N}Job], spare_us: u32) -> usize {`,
      `    let slice = spare_us.min(${c.C});`,
      '    let mut used = 0;',
      '    jobs.iter()',
      '        .take_while(|job| {',
      '            used += job.cost_us;',
      '            used <= slice',
      '        })',
      '        .count()',
      '}',
      ...(c.h
        ? [
            '',
            `pub fn ${c.helper}(jobs: &[${c.N}Job]) -> u32 {`,
            '    jobs.iter().map(|job| job.cost_us).sum()',
            '}',
          ]
        : []),
      ...(c.s
        ? [
            '',
            `pub fn ${c.second}(jobs: &mut Vec<${c.N}Job>, ran: usize) {`,
            '    jobs.drain(..ran);',
            '    jobs.sort_by_key(|job| job.cost_us);',
            '}',
          ]
        : []),
    ],
    py: (c) => [
      `${c.C} = ${c.v}`,
      '',
      '',
      `def ${c.first}(jobs, spare_us):`,
      `    """Take jobs from the front until the slice, at most ${c.C} us, is full."""`,
      `    slice_us, used, picked = min(spare_us, ${c.C}), 0, []`,
      '    for job in jobs:',
      '        if used + job.cost_us > slice_us:',
      '            break',
      '        used += job.cost_us',
      '        picked.append(job)',
      '    return picked',
      ...(c.h
        ? [
            '',
            '',
            `def ${c.helper}(jobs):`,
            '    return sum(job.cost_us for job in jobs)',
          ]
        : []),
      ...(c.s
        ? [
            '',
            '',
            `def ${c.second}(jobs, ran):`,
            '    return sorted(jobs[len(ran) :], key=lambda job: job.cost_us)',
          ]
        : []),
    ],
  },
  assets: {
    word: 'asset list',
    does: 'lists the assets the {sub} needs',
    constant: 'MAX_ASSETS',
    value: [8, 300],
    first: 'collect_{n}_assets',
    second: 'prune_{n}_assets',
    helper: { rs: '{n}_asset_budget', py: '{n}_asset_budget' },
    edit: 'Prune {sub} assets no level references',
    setting: 'the {sub} asset limit',
    titles: [
      'A level may use only so many {sub} assets',
      'Unreferenced {sub} assets are pruned from the package',
    ],
    note: (c) =>
      `${c.first} lists each asset once and stops the build when a level needs more than ${c.C}.`,
    lateNote: (c) =>
      `${c.second} keeps only the assets some level still references.`,
    risk: [
      'The {sub} asset limit may block content late in production',
      (c) =>
        `${c.path} stops the build when a level uses more than ${c.C} ${c.sub} assets, and artists find out only when the build fails.`,
    ],
    defect: [
      'Shared {sub} assets are packed once per level',
      (c) =>
        `${c.path} removes duplicates within one level only, so ${c.sub} assets that several levels use are packed again for each.`,
    ],
    rs: (c) => [
      `pub const ${c.C}: usize = ${c.v};`,
      '',
      `pub fn ${c.first}(level: &Level) -> Vec<AssetId> {`,
      `    let mut ids: Vec<AssetId> = level.placed::<${c.N}>().map(|${c.n}| ${c.n}.asset).collect();`,
      '    ids.sort();',
      '    ids.dedup();',
      `    assert!(ids.len() <= ${c.C}, "a level may use at most {} ${c.n} assets", ${c.C});`,
      '    ids',
      '}',
      ...(c.h
        ? ['', `pub fn ${c.helper}() -> usize {`, `    ${c.C}`, '}']
        : []),
      ...(c.s
        ? [
            '',
            `pub fn ${c.second}(ids: &mut Vec<AssetId>, levels: &[Level]) {`,
            '    ids.retain(|id| levels.iter().any(|level| level.references(*id)));',
            '}',
          ]
        : []),
    ],
    py: (c) => [
      'import pathlib',
      '',
      `${c.C} = ${c.v}`,
      '',
      '',
      `def ${c.first}(root):`,
      '    paths = sorted(pathlib.Path(root).rglob("*.asset"))',
      `    if len(paths) > ${c.C}:`,
      `        raise ValueError(f"{len(paths)} assets, more than {${c.C}}")`,
      '    return paths',
      ...(c.h ? ['', '', `def ${c.helper}():`, `    return ${c.C}`] : []),
      ...(c.s
        ? [
            '',
            '',
            `def ${c.second}(paths, referenced):`,
            '    return [p for p in paths if p.stem in referenced]',
          ]
        : []),
    ],
  },
};

// Kinds whose constant is a limit a branch can lower.
const LIMITS = new Set([
  'cache',
  'pool',
  'queue',
  'loader',
  'events',
  'debug',
  'assets',
  'stats',
]);

// Netcode filler subsystems that show a list the player browses, for the
// filler question about how often to refresh it.
const LIST_SUBSYSTEMS = [
  'lobby browser',
  'friend presence',
  'spectator list',
  'party invites',
];

// Hard Constraints anchored filler code can carry. `{sub}` is the
// subsystem and `{path}` the file.
const CONSTRAINTS = [
  [
    'The {sub} {word} stays off the render thread',
    '{path} must only run on the game thread. The {sub} shares no locks with rendering, and taking one there would stall a frame.',
  ],
  [
    'The {sub} {word} must not allocate once a level is loaded',
    '{path} sizes everything it needs while the level loads. An allocation during play shows up as a hitch on Skiff.',
  ],
  [
    'The {sub} {word} must give the same result on every peer',
    '{path} runs on every co-op peer, so it must not read the clock or a random seed of its own.',
  ],
  [
    'The {sub} {word} must not block on file reads',
    '{path} runs inside the frame. Any read has to go through the streaming queue and arrive in a later frame.',
  ],
];

// Reasons a filler commit body gives for a change.
const REASONS = [
  'The old number came from the prototype and nobody had measured it since.',
  'Found while profiling the {sub} on Skiff.',
  'This matches what the {sub} does on the other platforms.',
  'Playtesters ran into it in the harbour district.',
  'QA hit this twice in the last soak test.',
];

const DAY = 86_400e3;
const HOUR = 3600e3;
const iso = (ms) =>
  new Date(Math.floor(ms / HOUR) * HOUR).toISOString().replace('.000Z', 'Z');
const ms = (text) => new Date(text).getTime();
/** The next working hour (09:00-17:00 UTC) at or after `t`. */
function nextWorkHour(t) {
  const at = Math.ceil(t / HOUR) * HOUR;
  const hour = new Date(at).getUTCHours();
  if (hour < 9) return at + (9 - hour) * HOUR;
  if (hour > 17) return at + (24 - hour + 9) * HOUR;
  return at;
}

/** The constant's value after the file's edits so far. */
const valueOf = (file, edits = file.edits) =>
  edits.findLast((e) => e.value !== undefined)?.value ?? file.value;
const has = (file, flag, edits = file.edits) => edits.some((e) => e[flag]);
const loOf = (file) => PARTS[file.part].value[0];
const hiOf = (file) => PARTS[file.part].value[1];

/** The named symbols of one filler file, so anchors can point at them. */
function symbols(file) {
  const part = PARTS[file.part];
  const name = (text) => text.replaceAll('{n}', file.noun);
  return {
    constant: `${file.noun}_${part.constant}`.toUpperCase(),
    first: name(part.first),
    second: name(part.second),
    helper: name(part.helper[file.lang]),
  };
}

/** What text templates for `file` fill in. */
function context(file) {
  const sym = symbols(file);
  return {
    sub: file.sub,
    path: file.path,
    C: sym.constant,
    first: sym.first,
    second: sym.second,
    helper: sym.helper,
  };
}

/** `{sub}`, `{Sub}` and `{word}` filled for `file`. */
function phrase(text, file) {
  return dedupe(
    text
      .replaceAll('{Sub}', capitalize(file.sub))
      .replaceAll('{sub}', file.sub)
      .replaceAll('{word}', PARTS[file.part].word)
      .replaceAll('{path}', file.path)
  );
}

/**
 * A filler file's text after `edits`, oldest first. An edit sets the
 * constant (`{ value }`), adds the second function (`{ second: true }`), or
 * removes the helper the file started with (`{ trim: true }`).
 */
function render(file, edits) {
  const part = PARTS[file.part];
  const sym = symbols(file);
  const c = {
    ...sym,
    C: sym.constant,
    N: pascalOf(file.noun),
    n: file.noun,
    v: valueOf(file, edits),
    s: has(file, 'second', edits),
    h: file.helper && !has(file, 'trim', edits),
  };
  const does = fill(part.does, file.sub);
  const head = file.longDoc
    ? `The ${file.sub} ${part.word}: ${does}.`
    : `${capitalize(does)}.`;
  const lines =
    file.lang === 'py'
      ? [`"""${dedupe(head)}"""`, ...part.py(c)]
      : [`//! ${dedupe(head)}`, ...part.rs(c)];
  return `${lines.join('\n')}\n`;
}

/** A Rust folder's mod.rs, listing the modules added so far. */
function modRs(sub, parts) {
  return `//! The ${sub}.\n${[...parts]
    .sort()
    .map((p) => `pub mod ${p};`)
    .join('\n')}\n`;
}

/**
 * The filler to add at `scale`. `graph` is the scaled graph as
 * graph.mjs's readGraph returns it, for the filler records trailers name;
 * `spec` is spec/repo.mjs's default export plus PEOPLE. Returns `{ main,
 * branches, files, shared }`: commits to merge into main by time, branches
 * in spec/repo.mjs's shape, every filler path, and the real files filler
 * also writes (the crate lib.rs files).
 */
export function repoFiller({ scale, graph, spec }) {
  if (!(scale > 1)) return { main: [], branches: [], files: [], shared: [] };
  const rand = random(`repo-filler:${scale}`);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const between = (lo, hi) => lo + rand() * (hi - lo);
  /** A whole hour from `lo` to `hi`, in working hours (09:00-17:00 UTC). */
  const workTime = (lo, hi) => {
    const day = Math.floor(between(lo, hi) / DAY) * DAY;
    const t = day + Math.floor(between(9, 18)) * HOUR;
    return Math.min(hi, Math.max(lo, t));
  };
  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  // Filler Decisions in the scaled graph, by subsystem, with the time each
  // was accepted (an hour after it was written; see _filler.mjs) and, once
  // filler here supersedes one, the time it stopped being in force.
  const decisionsBySub = new Map();
  for (const [key, id] of Object.entries(graph.keymap)) {
    const [effort, local] = key.split('.');
    if (!local.startsWith('fill-dec-')) continue;
    const rec = graph.records.get(id);
    const title = String(rec.frontmatter.title).toLowerCase();
    const sub = fillerTerms(effort)
      .filter((s) => title.startsWith(`${s.toLowerCase()}:`))
      .sort((a, b) => b.length - a.length)[0];
    if (!sub || rec.frontmatter.state !== 'accepted') continue;
    const at = `${effort}:${sub}`;
    decisionsBySub.set(at, [
      ...(decisionsBySub.get(at) ?? []),
      { key, sub, from: ms(rec.frontmatter.created_at) + HOUR },
    ]);
  }
  /** Keys of the subsystem's Decisions in force at time `t`. */
  const decisionsAt = (file, t) =>
    (decisionsBySub.get(`${file.effort}:${file.sub}`) ?? [])
      .filter((d) => d.from <= t && !(d.until <= t))
      .map((d) => d.key);
  /** A trailer for a commit at `t` on `file`'s subsystem, by `chance`. */
  const trailers = (file, t, chance) => {
    const decisions = decisionsAt(file, t);
    return decisions.length && rand() < chance ? [pick(decisions)] : [];
  };

  // ------------------------------------------------------------ files ----
  const realCommits = [
    ...spec.main,
    ...spec.branches.flatMap((b) => b.commits),
  ];
  const realFiles = new Set(
    realCommits.flatMap((c) => Object.keys(c.files ?? {}))
  );
  for (const lib of Object.values(CRATE_LIBS)) {
    const writers = realCommits.filter((c) => c.files?.[lib] !== undefined);
    if (writers.length !== 1 || writers[0] !== spec.main[0])
      throw new Error(`${lib}: only the first real commit may write it`);
  }
  const libs = Object.fromEntries(
    Object.values(CRATE_LIBS).map((lib) => {
      const lines = spec.main[0].files[lib].trim().split('\n');
      return [
        lib,
        {
          head: lines.filter((l) => !l.startsWith('pub mod ')),
          mods: new Set(
            lines
              .filter((l) => l.startsWith('pub mod '))
              .map((l) => l.slice(8, -1))
          ),
        },
      ];
    })
  );
  const target = Math.round(realFiles.size * (scale - 1) * 1.2);
  const subs = Object.keys(EFFORTS).flatMap((effort) =>
    fillerTerms(effort).map((sub) => {
      if (!HOMES[sub]) throw new Error(`no folder for filler subsystem ${sub}`);
      const [folder, noun] = HOMES[sub];
      const root = EFFORTS[effort].root;
      const lang = effort === 'tools' ? 'py' : 'rs';
      const dir = `${root}/${folder}`;
      return {
        effort,
        sub,
        noun,
        dir,
        lang,
        lib: CRATE_LIBS[root],
        folder,
        // Python packages always have __init__.py, as the real tool does;
        // some Rust folders have a mod.rs, as engine/kestrel/tides/ does.
        modFile:
          lang === 'py'
            ? `${dir}/__init__.py`
            : rand() < 0.35
            ? `${dir}/mod.rs`
            : null,
        readme: lang === 'py' && rand() < 0.5 ? `${dir}/README.md` : null,
      };
    })
  );
  const files = [];
  subs.forEach((s, i) => {
    const count = Math.max(
      2,
      Math.floor(target / subs.length) + (i < target % subs.length ? 1 : 0)
    );
    s.files = shuffle(Object.keys(PARTS))
      .slice(0, count)
      .map((part) => {
        const [lo, hi] = PARTS[part].value;
        const file = {
          ...s,
          part,
          path: `${s.dir}/${part}.${s.lang}`,
          value: Math.round(between(lo, hi)),
          helper: rand() < 0.45,
          longDoc: rand() < 0.4,
          edits: [],
          subFiles: null,
        };
        files.push(file);
        return file;
      });
    for (const file of s.files) file.subFiles = s.files;
  });
  for (const file of files)
    if (GUARDED_ON_BRANCHES.some((dir) => file.path.startsWith(dir)))
      throw new Error(`filler path ${file.path} is in a guarded folder`);

  // ----------------------------------------------------------- main ----
  const at = (key) => ms(spec.main.find((c) => c.key === key).at);
  const firstDay = at('m01') + DAY;
  const lastEdit = at('m26') - DAY; // 2026-09-25
  const commits = [];
  const subjects = new Set(realCommits.map((c) => c.subject));
  /** The first of `options` no commit has used yet. */
  const unique = (options) => {
    const subject = options.map(dedupe).find((s) => !subjects.has(s));
    if (!subject) throw new Error(`no unused subject among ${options}`);
    subjects.add(subject);
    return subject;
  };
  let n = 0;
  const nextKey = () => `f${String(++n).padStart(3, '0')}`;
  const author = (file) => pick(EFFORTS[file.effort].people);
  const touch = (file, edit) => {
    if (edit) file.edits.push(edit);
    return { [file.path]: render(file, file.edits) };
  };
  const listOf = (names) =>
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

  /** An edit that changes `file`, chosen from what it can still take. */
  const chooseEdit = (file, edits = file.edits) => {
    const options = [];
    if (!has(file, 'second', edits)) options.push(['second', 0.45]);
    if (file.helper && !has(file, 'trim', edits)) options.push(['trim', 0.2]);
    const value = valueOf(file, edits);
    if (file.part !== 'state' || value < hiOf(file))
      options.push(['value', 0.35]);
    let roll = rand() * options.reduce((sum, [, w]) => sum + w, 0);
    const [kind] = options.find(([, w]) => (roll -= w) < 0) ?? options.at(-1);
    if (kind !== 'value') return { [kind]: true };
    const [lo, hi] = PARTS[file.part].value;
    if (file.part === 'state') return { value: value + 1 };
    let next = Math.round(between(lo, hi));
    if (next === value) next = value === hi ? lo : value + 1;
    return { value: next };
  };
  /** Subjects for one edit to `file`, best first. */
  const editSubjects = (file, edit, edits = file.edits) => {
    const part = PARTS[file.part];
    const sym = symbols(file);
    if (edit.second)
      return [
        fill(part.edit, file.sub),
        `Add ${sym.second} to the ${file.sub} ${part.word}`,
      ];
    if (edit.trim)
      return [
        `Remove the unused ${sym.helper} from the ${file.sub} ${part.word}`,
        `Drop ${sym.helper} from the ${file.sub} ${part.word}; nothing calls it`,
      ];
    const old = valueOf(file, edits);
    const setting = fill(part.setting, file.sub);
    const unit = part.unit ?? '';
    if (file.part === 'state')
      return [
        `Bump ${setting} to ${edit.value}`,
        `Bump ${setting} from ${old} to ${edit.value}`,
      ];
    const verb = edit.value > old ? 'Raise' : 'Lower';
    const forms = [
      `${verb} ${setting} from ${old} to ${edit.value}${unit}`,
      `${verb} ${setting} to ${edit.value}${unit}`,
    ];
    return rand() < 0.5 ? forms : forms.reverse();
  };
  const bodyFor = (file, edit) =>
    !edit.second && rand() < 0.15 ? fill(pick(REASONS), file.sub) : undefined;

  for (const s of subs) {
    // One commit adds the files, or two when there are four or more.
    const split = s.files.length >= 4 ? Math.ceil(s.files.length / 2) : 99;
    const groups = [s.files.slice(0, split), s.files.slice(split)].filter(
      (g) => g.length
    );
    const added = [];
    let time = workTime(firstDay, lastEdit - 40 * DAY);
    groups.forEach((group, g) => {
      const listed = listOf(group.map((f) => PARTS[f.part].word));
      const kind = group.length === 1 ? 'module' : 'modules';
      const options =
        g === 0
          ? [
              `Add the ${s.sub} ${listed} ${kind}`,
              `Start on the ${s.sub}: ${listed}`,
              `First pass at the ${s.sub}`,
              `Bring up the ${s.sub} ${listed}`,
            ]
          : [
              `Add ${listed} to the ${s.sub}`,
              `Give the ${s.sub} its own ${listed}`,
              `Split the ${s.sub} ${listed} out of the main module`,
            ];
      const changed = Object.assign({}, ...group.map((f) => touch(f)));
      added.push(...group.map((f) => f.part));
      if (s.modFile)
        changed[s.modFile] =
          s.lang === 'py' ? `"""The ${s.sub}."""\n` : modRs(s.sub, added);
      if (g === 0 && s.readme)
        changed[s.readme] = `# ${capitalize(s.sub)}\n\n${group
          .map((f) => `\`${f.part}.py\` ${fill(PARTS[f.part].does, s.sub)}.`)
          .join('\n')}\n`;
      const commit = {
        key: nextKey(),
        at: iso(time),
        author: author(group[0]),
        subject: unique(shuffle(options)),
        proof: trailers(group[0], time, 0.5),
        files: changed,
        // Engine folders go in their crate's lib.rs; see the pass below.
        newMod: g === 0 && s.lib ? s.folder : undefined,
        lib: s.lib,
      };
      for (const f of group) {
        f.added = commit.key;
        f.addedAt = time;
      }
      commits.push(commit);
      time = workTime(time + 2 * DAY, time + 30 * DAY);
    });
    // About two in five files get one or two later edits: the second
    // function, a new value for the constant, or the helper removed. Some
    // commits edit two files of the subsystem at once.
    const planned = [];
    for (const file of s.files) {
      const count = rand() < 0.4 ? (rand() < 0.25 ? 2 : 1) : 0;
      let after = file.addedAt;
      for (let i = 0; i < count; i++) {
        const t = workTime(after + DAY, lastEdit);
        if (t <= after) break;
        planned.push({ file, t });
        after = t;
      }
    }
    planned.sort((a, b) => a.t - b.t);
    for (let i = 0; i < planned.length; i++) {
      const { file, t } = planned[i];
      const edit = chooseEdit(file);
      const subject = unique(editSubjects(file, edit));
      const body = bodyFor(file, edit);
      const changed = touch(file, edit);
      const key = nextKey();
      if (edit.second) file.secondAt = key;
      const other = planned[i + 1];
      if (
        other &&
        other.file !== file &&
        other.file.addedAt < t &&
        rand() < 0.3
      ) {
        const otherEdit = chooseEdit(other.file);
        Object.assign(changed, touch(other.file, otherEdit));
        if (otherEdit.second) other.file.secondAt = key;
        i++;
      }
      commits.push({
        key,
        at: iso(t),
        author: author(file),
        subject,
        body,
        proof: trailers(file, t, 0.4),
        files: changed,
      });
    }
  }

  // Code anchors and the records that rest on them, one commit per Effort,
  // between the commit that brings the graph in and the real anchors.
  const anchorDay = at('m26') + 23 * HOUR; // 2026-09-27 09:00
  const efforts = Object.keys(EFFORTS);
  const perEffort = Math.max(2, Math.round(scale * 0.8));
  const anchored = new Map(); // effort -> [{ file, cit, fnd, symbol }]
  let questionFile = null;
  let r = 0;
  const rkey = (kind) => `${KEY_PREFIX}${kind}-${String(++r).padStart(3, '0')}`;
  const named = new Set(commits.flatMap((c) => c.proof ?? []));
  efforts.forEach((effort, i) => {
    const anchorAt = anchorDay + i * 2 * HOUR;
    const events = [];
    // A few Decisions that earlier trailers name are superseded here, so
    // some filler trailers name an old version, as real ones do.
    const supersedeCount = Math.max(1, Math.round(scale * 0.4));
    const candidates = shuffle(
      [...decisionsBySub.values()]
        .flat()
        .filter((d) => d.key.startsWith(`${effort}.`) && named.has(d.key))
    ).slice(0, supersedeCount);
    for (const old of candidates) {
      const dec = rkey('dec');
      const person = spec.PEOPLE[pick(EFFORTS[effort].people)].name;
      const [title, body] = pick([
        [
          `${capitalize(old.sub)}: make the change, but behind a tuning flag`,
          `This replaces the earlier ${old.sub} Decision. The change ships, but off by default until the next content drop, so QA can compare both.`,
        ],
        [
          `${capitalize(old.sub)}: make the change on every platform`,
          `This replaces the earlier ${old.sub} Decision, which covered one platform. Captures on the others show the same cost, so the change goes everywhere.`,
        ],
        [
          `${capitalize(old.sub)}: keep the current behaviour for this release`,
          `This replaces the earlier ${old.sub} Decision. The change is still wanted, but it waits until after the release branch is cut.`,
        ],
      ]);
      events.push(
        {
          type: 'WriteDecision',
          effort,
          key: dec,
          title,
          created_by: person,
          supersedes: [old.key],
          body,
        },
        { type: 'AcceptDecision', decisionId: `${effort}.${dec}` }
      );
      old.until = anchorAt;
      decisionsBySub
        .get(`${effort}:${old.sub}`)
        .push({ key: `${effort}.${dec}`, sub: old.sub, from: anchorAt + HOUR });
    }
    const chosen = shuffle(files.filter((f) => f.effort === effort)).slice(
      0,
      perEffort
    );
    anchored.set(effort, []);
    for (const file of chosen) {
      const sym = symbols(file);
      const late = file.secondAt && rand() < 0.5;
      const symbol = late ? sym.second : sym.first;
      const part = PARTS[file.part];
      const person = author(file);
      const name = spec.PEOPLE[person].name;
      const c = context(file);
      const cit = rkey('cit');
      const fnd = rkey('fnd');
      const decisions = decisionsAt(file, anchorAt + HOUR);
      const governing = decisions.length ? [pick(decisions)] : [];
      const does = fill(part.does, `the ${file.sub}`);
      const body = late
        ? pick([
            `${file.path} ${does}. ${part.lateNote(c)}`,
            `${part.lateNote(c)} It lives in ${file.path}, which ${does}.`,
          ])
        : pick([
            `${file.path} ${does}. ${part.note(c)}`,
            `${part.note(c)} The code is in ${file.path}.`,
            `In ${file.path}, ${part.note(c)}`,
          ]);
      events.push(
        {
          type: 'Anchor',
          effort,
          key: cit,
          title: phrase(
            pick([
              'Code: {sub} {word}',
              `Code: ${symbol} in the {sub} {word}`,
              `Code: ${file.path}`,
            ]),
            file
          ),
          path: file.path,
          symbol,
          commit: late ? file.secondAt : file.added,
          created_by: name,
        },
        {
          type: 'WriteFinding',
          effort,
          key: fnd,
          kind: 'implementation',
          title: phrase(part.titles[late ? 1 : 0], file),
          created_by: name,
          derives_from: governing.length ? governing : undefined,
          cites: [`${effort}.${cit}`],
          body: dedupe(body),
        }
      );
      anchored.get(effort).push({ file, cit, fnd, symbol });
      const roll = rand();
      if (roll < 0.25)
        events.push({
          type: 'WriteRisk',
          effort,
          key: rkey('rsk'),
          likelihood: pick(['low', 'medium']),
          severity: 'low',
          title: phrase(part.risk[0], file),
          created_by: name,
          derives_from: governing.length ? governing : undefined,
          cites: [`${effort}.${cit}`],
          body: dedupe(part.risk[1](c)),
        });
      else if (roll < 0.5)
        events.push({
          type: 'WriteIssue',
          effort,
          key: rkey('iss'),
          kind: 'defect',
          title: phrase(part.defect[0], file),
          created_by: name,
          body: dedupe(
            `${part.defect[1](c)}${
              rand() < 0.5
                ? ` ${name} wants a counter on the profiler overlay.`
                : ''
            }`
          ),
        });
      else if (roll < 0.62) {
        const [title, body] = pick(CONSTRAINTS);
        events.push({
          type: 'WriteConstraint',
          effort,
          key: rkey('con'),
          kind: 'hard',
          title: phrase(title, file),
          created_by: name,
          body: phrase(body, file),
        });
      }
    }
    if (effort === 'netcode') {
      // An open question with one proposed answer. Two filler branches
      // settle it differently (see `branches` below).
      const file = pick(
        files.filter(
          (f) => f.effort === effort && LIST_SUBSYSTEMS.includes(f.sub)
        )
      );
      events.push(
        {
          type: 'WriteIssue',
          effort,
          key: `${KEY_PREFIX}iss-refresh-q`,
          kind: 'question',
          title: `When should the ${file.sub} refresh its list?`,
          created_by: spec.PEOPLE.sofia.name,
          body: `${file.path} rebuilds the ${file.sub} list on every frame the menu is open. It costs little, but it sends one request a frame to the backend.`,
        },
        {
          type: 'WriteDecision',
          effort,
          key: `${KEY_PREFIX}dec-refresh-timer`,
          title: `Refresh the ${file.sub} list every 30 seconds`,
          created_by: spec.PEOPLE.sofia.name,
          derives_from: [`${effort}.${KEY_PREFIX}iss-refresh-q`],
          body: `The ${file.sub} list refreshes on a 30-second timer while the menu is open, and once when it opens.`,
        }
      );
      questionFile = file;
    }
    const subjectNames = {
      render: 'Lantern interface',
      world: 'Kestrel gameplay',
      ports: 'console platform',
      tools: 'pipeline tool',
      netcode: 'co-op session',
    };
    commits.push({
      key: nextKey(),
      at: iso(anchorAt),
      author: pick(EFFORTS[effort].people),
      subject: unique([
        `Anchor Proof notes to the ${subjectNames[effort]} code`,
      ]),
      events,
    });
  });

  // A few edits after the real anchors, so some anchored filler files have
  // a newer commit than the one their anchor names.
  let late = at('m27'); // 2026-09-28 10:00, one hour before the first
  const lateFiles = shuffle(
    [...anchored.values()].flat().map((a) => a.file)
  ).slice(0, Math.max(1, Math.round(scale / 2)));
  for (const file of lateFiles) {
    late = nextWorkHour(late + HOUR);
    const edit = chooseEdit(file);
    const commit = {
      key: nextKey(),
      at: iso(late),
      author: author(file),
      subject: unique(editSubjects(file, edit)),
      body: bodyFor(file, edit),
      proof: trailers(file, late, 0.5),
      files: touch(file, edit),
    };
    if (edit.second) file.secondAt = commit.key;
    commits.push(commit);
  }

  // Main in time order, then each new engine folder goes into its crate's
  // lib.rs in the commit that adds the folder.
  commits.sort((a, b) => ms(a.at) - ms(b.at));
  for (const commit of commits) {
    if (commit.newMod) {
      const lib = libs[commit.lib];
      lib.mods.add(commit.newMod);
      commit.files[commit.lib] = `${[
        ...lib.head,
        ...[...lib.mods].sort().map((m) => `pub mod ${m};`),
      ].join('\n')}\n`;
    }
    delete commit.newMod;
    delete commit.lib;
  }

  // -------------------------------------------------------- branches ----
  // Every filler branch keeps to what the branch questions need: it
  // changes no file under GUARDED_ON_BRANCHES, adds no compaction, retracts
  // nothing, adds or changes no `tools` record, and changes the standing
  // of at most two records on main (the most any real branch has is 5).
  // Commits fall in working hours from 2026-09-29 12:00, after main's tip.
  const branchStart = at('m29') + 2 * HOUR;
  if (ms(commits.at(-1).at) >= branchStart)
    throw new Error('filler on main must end before the branches start');
  /** Commit times for one branch, each a few working hours after the last. */
  const clock = () => {
    let t = nextWorkHour(branchStart + Math.floor(between(0, 30)) * HOUR);
    return () => {
      const out = iso(t);
      t = nextWorkHour(t + Math.floor(between(1, 6)) * HOUR);
      return out;
    };
  };
  /** A branch edit that lowers `file`'s constant, about halfway to its
   * lowest value. */
  const lowerTo = (file) => {
    const now = valueOf(file);
    const value = Math.max(loOf(file), Math.round((loOf(file) + now) / 2));
    if (value >= now) throw new Error(`${file.path}: cannot lower ${now}`);
    return { value };
  };
  const branchTouch = (file, edit) => ({
    [file.path]: render(file, [...file.edits, edit]),
  });
  const branchSubject = (file, edit) =>
    unique(editSubjects(file, edit, file.edits));
  const dashed = (file) => file.sub.toLowerCase().replace(/\W+/g, '-');
  const branches = [];
  const atBranch = branchStart + DAY;

  // yusuf and dara supersede the same accepted filler Decision two ways.
  const renderSubs = subs.filter(
    (s) =>
      s.effort === 'render' &&
      decisionsAt(s, atBranch).length &&
      s.files.some((f) => LIMITS.has(f.part))
  );
  const shared = pick(renderSubs);
  const sharedFile = shared.files.find((f) => LIMITS.has(f.part));
  const superseded = pick(decisionsAt(shared, atBranch));
  {
    const time = clock();
    const fnd = rkey('fnd');
    const dec = rkey('dec');
    const cap = lowerTo(sharedFile);
    const lo = cap.value;
    const setting = fill(PARTS[sharedFile.part].setting, shared.sub);
    branches.push({
      name: `yusuf/${dashed(sharedFile)}-cap`,
      pr: 42,
      author: 'yusuf',
      title: dedupe(`Cap ${setting} per platform`),
      commits: [
        {
          key: `fy1`,
          at: time(),
          author: 'yusuf',
          subject: unique([`Lower ${setting} to ${lo} on Skiff`]),
          proof: [`render.${dec}`],
          files: branchTouch(sharedFile, cap),
          events: [
            {
              type: 'WriteFinding',
              effort: 'render',
              key: fnd,
              kind: 'measurement',
              title: dedupe(
                `On Skiff the ${shared.sub} never needs more than ${lo} at once`
              ),
              created_by: spec.PEOPLE.yusuf.name,
              derives_from: [superseded],
              body: `Yusuf Demir watched ${sharedFile.path} on Skiff over a ten-minute capture: no frame used more than ${lo}, and the rest sat in memory.`,
            },
            {
              type: 'WriteDecision',
              effort: 'render',
              key: dec,
              title: dedupe(
                `${capitalize(shared.sub)}: lower ${setting} to ${lo} on Skiff`
              ),
              created_by: spec.PEOPLE.yusuf.name,
              supersedes: [superseded],
              derives_from: [`render.${fnd}`],
              body: dedupe(
                `The earlier ${shared.sub} Decision stands, except that on Skiff ${setting} is ${lo}. Other platforms keep the current value.`
              ),
            },
            { type: 'AcceptDecision', decisionId: `render.${dec}` },
          ],
        },
      ],
    });
  }
  {
    const time = clock();
    const dec = rkey('dec');
    const other = pick(
      subs.filter((s) => s.effort === 'render' && s !== shared)
    );
    const otherFile = other.files[0];
    const otherEdit = chooseEdit(otherFile);
    const sharedEdit = chooseEdit(sharedFile);
    const word = PARTS[sharedFile.part].word;
    const otherDecisions = decisionsAt(other, atBranch);
    branches.push({
      name: `dara/${dashed(sharedFile)}-worker`,
      pr: 45,
      author: 'dara',
      title: dedupe(`Build the ${shared.sub} ${word} on a worker thread`),
      commits: [
        {
          key: 'fd1',
          at: time(),
          author: 'dara',
          subject: unique([
            `Build the ${shared.sub} ${word} off the main thread`,
          ]),
          proof: [`render.${dec}`],
          files: branchTouch(sharedFile, sharedEdit),
          events: [
            {
              type: 'WriteDecision',
              effort: 'render',
              key: dec,
              title: dedupe(
                `${capitalize(
                  shared.sub
                )}: build the ${word} on a worker thread`
              ),
              created_by: spec.PEOPLE.dara.name,
              supersedes: [superseded],
              body: dedupe(
                `The earlier ${shared.sub} Decision stands, except that the ${word} is built on a worker thread and handed to the main thread once a frame. Dara Whitlock wants this before the next Skiff capture.`
              ),
            },
          ],
        },
        {
          key: 'fd2',
          at: time(),
          author: 'dara',
          subject: branchSubject(otherFile, otherEdit),
          proof: otherDecisions.length ? [pick(otherDecisions)] : [],
          files: branchTouch(otherFile, otherEdit),
        },
      ],
    });
  }

  // sofia accepts the proposed answer to the filler question; marta
  // accepts a rival one.
  const qFile = questionFile;
  const martaFile = qFile.subFiles.find((f) => f !== qFile) ?? qFile;
  const q = `netcode.${KEY_PREFIX}iss-refresh-q`;
  const timer = `netcode.${KEY_PREFIX}dec-refresh-timer`;
  {
    const time = clock();
    branches.push({
      name: `sofia/${dashed(qFile)}-refresh-timer`,
      pr: 47,
      author: 'sofia',
      title: `Refresh the ${qFile.sub} list on a timer`,
      commits: [
        {
          key: 'fs1',
          at: time(),
          author: 'sofia',
          subject: unique([`Refresh the ${qFile.sub} list every 30 seconds`]),
          proof: [timer],
          files: branchTouch(qFile, chooseEdit(qFile)),
          events: [
            { type: 'AcceptDecision', decisionId: timer },
            {
              type: 'ResolveIssue',
              issueId: q,
              resolution: 'resolved',
              resolvedBy: [timer],
            },
          ],
        },
      ],
    });
  }
  {
    const time = clock();
    const dec = `${KEY_PREFIX}dec-refresh-open`;
    branches.push({
      name: `marta/${dashed(qFile)}-refresh-on-open`,
      pr: 49,
      author: 'marta',
      title: `Refresh the ${qFile.sub} list on demand`,
      commits: [
        {
          key: 'fm1',
          at: time(),
          author: 'marta',
          subject: unique([
            `Refresh the ${qFile.sub} list only when the menu opens`,
          ]),
          proof: [`netcode.${dec}`],
          files: branchTouch(martaFile, chooseEdit(martaFile)),
          events: [
            {
              type: 'WriteDecision',
              effort: 'netcode',
              key: dec,
              title: `Refresh the ${qFile.sub} list once each time the menu opens`,
              created_by: spec.PEOPLE.marta.name,
              derives_from: [q],
              body: `The ${qFile.sub} list refreshes once when the menu opens and when the player asks. A timer keeps sending requests from players who left the menu open, which Marta Lindqvist saw in the backend logs.`,
            },
            { type: 'AcceptDecision', decisionId: `netcode.${dec}` },
            {
              type: 'ResolveIssue',
              issueId: q,
              resolution: 'resolved',
              resolvedBy: [`netcode.${dec}`],
            },
          ],
        },
      ],
    });
  }

  // liam: tools code only, with a trailer to a filler tools Decision. A
  // tools record on a branch would change a branch question's answer.
  {
    const time = clock();
    const tool = pick(
      subs.filter(
        (s) => s.effort === 'tools' && decisionsAt(s, atBranch).length
      )
    );
    const [a, c] = tool.files;
    const aEdit = chooseEdit(a);
    const cEdit = chooseEdit(c);
    branches.push({
      name: `liam/${dashed(a)}-cleanup`,
      pr: 50,
      author: 'liam',
      title: `Tidy the ${tool.sub}`,
      commits: [
        {
          key: 'fl1',
          at: time(),
          author: 'liam',
          subject: branchSubject(a, aEdit),
          proof: [pick(decisionsAt(tool, atBranch))],
          files: branchTouch(a, aEdit),
        },
        {
          key: 'fl2',
          at: time(),
          author: 'liam',
          subject: branchSubject(c, cEdit),
          files: branchTouch(c, cEdit),
        },
      ],
    });
  }

  // rhea: a world filler file changes, its anchor is renewed, and the new
  // implementation note supersedes the old one, as main does for the pool.
  {
    const time = clock();
    const world = anchored.get('world');
    const old = pick(
      world.some((a) => LIMITS.has(a.file.part))
        ? world.filter((a) => LIMITS.has(a.file.part))
        : world
    );
    const file = old.file;
    const cit = rkey('cit');
    const fnd = rkey('fnd');
    const limit = lowerTo(file);
    const lo = limit.value;
    const sym = symbols(file);
    const setting = fill(PARTS[file.part].setting, file.sub);
    branches.push({
      name: `rhea/${dashed(file)}-limit`,
      pr: 51,
      author: 'rhea',
      title: dedupe(`Lower ${setting}`),
      commits: [
        {
          key: 'fr1',
          at: time(),
          author: 'rhea',
          subject: unique([
            `Lower ${setting} to ${lo}${PARTS[file.part].unit ?? ''}`,
            `Lower ${setting} to ${lo} again`,
          ]),
          files: branchTouch(file, limit),
        },
        {
          key: 'fr2',
          at: time(),
          author: 'rhea',
          subject: unique([
            dedupe(`Record the new ${setting.replace(/^the /, '')} in Proof`),
          ]),
          events: [
            {
              type: 'Anchor',
              effort: 'world',
              key: cit,
              title: phrase(
                `Code: {sub} {word}, ${sym.constant} at ${lo}`,
                file
              ),
              path: file.path,
              symbol: sym.constant,
              commit: 'fr1',
              created_by: spec.PEOPLE.rhea.name,
            },
            {
              type: 'WriteFinding',
              effort: 'world',
              key: fnd,
              kind: 'implementation',
              title: dedupe(`${capitalize(setting)} is now ${lo}`),
              created_by: spec.PEOPLE.rhea.name,
              supersedes: [`world.${old.fnd}`],
              cites: [`world.${cit}`],
              body: dedupe(
                `${file.path} now sets ${sym.constant} to ${lo}. The old value kept entries that no system read after the first minute.`
              ),
            },
          ],
        },
      ],
    });
  }

  const paths = new Set(files.map((f) => f.path));
  for (const s of subs) {
    if (s.modFile) paths.add(s.modFile);
    if (s.readme) paths.add(s.readme);
  }
  return {
    main: commits,
    branches,
    files: [...paths],
    shared: Object.values(CRATE_LIBS),
  };
}
