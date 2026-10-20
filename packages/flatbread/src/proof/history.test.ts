import test from 'ava';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  anchorNote,
  CodeHistory,
  fateText,
  filesAddingWord,
  folderOf,
  movesText,
  parseFollow,
  renamedIdentifier,
  targetAliases,
} from './history.js';

test('parseFollow walks renames and copies back from the current name', (t) => {
  const out = [
    '\x1eccc3333\x1fRename b.ts to c.ts\n\nR100\tsrc/b.ts\tsrc/c.ts\n',
    '\x1ebbb2222\x1fSplit b.ts out of a.ts\n\nC050\tsrc/a.ts\tsrc/b.ts\n',
    // A rename of some other file in the same log is not this file's.
    '\x1eaaa1111\x1fRename x.ts\n\nR100\tsrc/w.ts\tsrc/x.ts\n',
  ].join('');
  t.deepEqual(parseFollow(out, 'src/c.ts'), [
    {
      from: 'src/b.ts',
      to: 'src/c.ts',
      sha: 'ccc3333',
      subject: 'Rename b.ts to c.ts',
    },
    {
      from: 'src/a.ts',
      to: 'src/b.ts',
      sha: 'bbb2222',
      subject: 'Split b.ts out of a.ts',
      copy: true,
    },
  ]);
  t.deepEqual(parseFollow('', 'src/c.ts'), []);
});

test('folderOf strips the common tail of a file move', (t) => {
  t.deepEqual(folderOf('lib/parser/lexer.py', 'lib/lang/lexer.py'), {
    from: 'lib/parser',
    to: 'lib/lang',
  });
  // Every common segment goes, so a folder kept by name moves with its parent.
  t.deepEqual(folderOf('lib/parser/lexer.py', 'lib/lang/parser/lexer.py'), {
    from: 'lib',
    to: 'lib/lang',
  });
  t.deepEqual(folderOf('a/b/c/x.rs', 'a/d/c/x.rs'), {
    from: 'a/b',
    to: 'a/d',
  });
  // Only the file name changed: no folder moved.
  t.is(folderOf('src/queue.ts', 'src/job_queue.ts'), undefined);
});

test('renamedIdentifier finds the word that replaced a symbol', (t) => {
  const diff = [
    'diff --git a/db/scan.rs b/db/scan.rs',
    '--- a/db/scan.rs',
    '+++ b/db/scan.rs',
    '@@ -4 +4 @@',
    '-pub fn scan_rows(table: u64) -> u32 {',
    '+pub fn scan_table_rows(table: u64) -> u32 {',
    '@@ -9 +9 @@',
    '-    let h = scan_rows(table);',
    '+    let h = scan_table_rows(table);',
  ].join('\n');
  t.is(renamedIdentifier(diff, 'scan_rows'), 'scan_table_rows');
  t.is(renamedIdentifier(diff, 'scan_table_rows', true), 'scan_rows');
  // A line that changed more than the name is no rename.
  t.is(
    renamedIdentifier(
      '-fn scan_rows(table: u64) {\n+fn scan_rows_v2(table: u32) {',
      'scan_rows'
    ),
    undefined
  );
  // The symbol only as part of a longer word does not count.
  t.is(
    renamedIdentifier('-x = scan_rows_all;\n+x = y;', 'scan_rows'),
    undefined
  );
  // Removed with nothing in its place.
  t.is(renamedIdentifier('-fn drain() {}\n', 'drain'), undefined);
});

test('movesText and fateText say where a path went', (t) => {
  const moves = [
    { from: 'a.ts', to: 'b.ts', sha: '1111111aaaa', subject: 'First' },
    { from: 'b.ts', to: 'c.ts', sha: '2222222bbbb', subject: 'Second' },
  ];
  t.is(
    movesText(moves),
    'renamed to b.ts in 1111111 "First", then renamed to c.ts in 2222222 "Second"'
  );
  t.is(
    movesText([
      { from: 'x', to: 'y/z', sha: '3333333', subject: 'Move', dir: true },
    ]),
    'moved to y/z/ in 3333333 "Move"'
  );
  t.is(
    fateText({
      path: 'old.ts',
      moves: [],
      deleted: { sha: '4444444cccc', subject: 'Drop it' },
    }),
    'deleted in 4444444 "Drop it"'
  );
});

test('anchorNote says nothing for an anchor that holds', (t) => {
  const anchor = { path: 'src/a.ts', symbol: 'run', sha: 'abcdef1234' };
  t.is(anchorNote({ anchor }), undefined);
  t.is(
    anchorNote(
      { anchor, since: { count: 1, commits: [] } },
      'cit-a'
    )?.startsWith('anchor cit-a src/a.ts#run@abcdef1 changed since'),
    true
  );
  t.is(
    anchorNote({
      anchor,
      path: {
        path: 'src/a.ts',
        moves: [
          {
            from: 'src/a.ts',
            to: 'src/b.ts',
            sha: '5555555',
            subject: 'Rename',
          },
        ],
        now: 'src/b.ts',
      },
      symbol: {
        symbol: 'run',
        sha: '6666666',
        subject: 'Rename run',
        renamed: 'start',
      },
      since: {
        count: 4,
        commits: [
          { sha: '7777777', subject: 'Retry 5 times' },
          { sha: '6666666', subject: 'Rename run' },
          { sha: '5555555', subject: 'Rename' },
        ],
      },
    }),
    'anchor src/a.ts#run@abcdef1 is stale: file renamed to src/b.ts in 5555555 "Rename"; #run renamed to start in 6666666 "Rename run"; 4 commits touched it since abcdef1: 7777777 "Retry 5 times", 6666666 (above), 5555555 (above), +1 more'
  );
});

test('parseFollow stops where the name was added and skips a name it has again', (t) => {
  const out = [
    '\x1eddd4444\x1fRename b.ts back to a.ts\n\nR100\tsrc/b.ts\tsrc/a.ts\n',
    '\x1eccc3333\x1fRename a.ts to b.ts\n\nR100\tsrc/a.ts\tsrc/b.ts\n',
    '\x1ebbb2222\x1fAdd a.ts\n\nA\tsrc/a.ts\n',
    // Before the add, the name belonged to a file that moved away.
    '\x1eaaa1111\x1fRename z.ts to a.ts\n\nR100\tsrc/z.ts\tsrc/a.ts\n',
  ].join('');
  t.deepEqual(
    parseFollow(out, 'src/a.ts').map((move) => move.from),
    ['src/b.ts']
  );
});

test('filesAddingWord lists the files a diff adds a word to', (t) => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '-export function run() {}',
    'diff --git a/src/b.ts b/src/b.ts',
    '--- /dev/null',
    '+++ b/src/b.ts',
    '+export function run() {}',
    'diff --git a/src/c.ts b/src/c.ts',
    '+++ b/src/c.ts',
    '+export function runner() {}',
  ].join('\n');
  t.deepEqual(filesAddingWord(diff, 'run'), ['src/b.ts']);
});

test('anchorNote says when the sha is not in HEAD history', (t) => {
  t.is(
    anchorNote({
      anchor: { path: 'src/a.ts', sha: 'abcdef1234' },
      since: { count: 0, commits: [], offHistory: true },
    }),
    "anchor src/a.ts@abcdef1 changed: the file at HEAD differs from abcdef1, which is not in HEAD's history (rebased or squashed)"
  );
});

// CodeHistory against small repositories built in a temp folder.

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
};

function repository(t: { teardown(fn: () => void): void }) {
  const top = mkdtempSync(join(tmpdir(), 'flatbread-history-'));
  t.teardown(() => rmSync(top, { recursive: true, force: true }));
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
      cwd: top,
      env: GIT_ENV,
      encoding: 'utf8',
    }).trim();
  const put = (path: string, text: string) => {
    mkdirSync(dirname(join(top, path)), { recursive: true });
    writeFileSync(join(top, path), text);
  };
  const commit = (message: string) => {
    git('add', '-A');
    git('commit', '-q', '-m', message);
    return git('rev-parse', '--short', 'HEAD');
  };
  git('init', '-q', '-b', 'main');
  return { top, git, put, commit };
}

const note = async (
  top: string,
  anchor: Parameters<typeof anchorNote>[0]['anchor']
) =>
  anchorNote(
    (await new CodeHistory(top).anchorStatuses([anchor])).values().next()
      .value as Parameters<typeof anchorNote>[0]
  );

test('code in the working tree but not committed is not stale', async (t) => {
  const { top, put, commit } = repository(t);
  put('src/a.ts', 'export function one() {}\n');
  const sha = commit('Add a');
  put('src/a.ts', 'export function one() {}\nexport function added() {}\n');
  put('src/new.ts', 'export function fresh() {}\n');
  t.is(await note(top, { path: 'src/new.ts', symbol: 'fresh' }), undefined);
  t.is(await note(top, { path: 'src/a.ts', symbol: 'added', sha }), undefined);
  const found = await targetAliases(
    {
      path: 'src/new.ts',
      symbol: 'fresh',
      dir: false,
      file: true,
      label: 'src/new.ts#fresh',
    },
    new CodeHistory(top)
  );
  t.deepEqual(found.notes, []);
});

test('a path reused after a move keeps none of the moved file history', async (t) => {
  const { top, git, put, commit } = repository(t);
  put('src/z.ts', 'export function pool() {}\n// one\n// two\n');
  commit('Add z');
  git('mv', 'src/z.ts', 'src/a.ts');
  commit('Rename z to a');
  git('mv', 'src/a.ts', 'src/b.ts');
  commit('Rename a to b');
  put('src/a.ts', 'export function unrelated() {}\n');
  commit('A new a');
  const history = new CodeHistory(top);
  t.deepEqual(await history.formerNames('src/a.ts', false), []);
  t.deepEqual(
    (await history.formerNames('src/b.ts', false)).map((move) => move.from),
    ['src/a.ts', 'src/z.ts']
  );
});

test('a gone path goes where the first deletion after the anchor took it', async (t) => {
  const { top, git, put, commit } = repository(t);
  put('src/a.ts', 'export function cacheKey() {}\n// one\n// two\n');
  const sha = commit('Add a');
  git('mv', 'src/a.ts', 'src/b.ts');
  const moved = commit('Move a to b');
  put('src/a.ts', 'scratch\n');
  commit('Scratch a');
  git('rm', '-q', 'src/a.ts');
  commit('Drop scratch a');
  t.is(
    await note(top, { path: 'src/a.ts', symbol: 'cacheKey', sha }),
    `anchor src/a.ts#cacheKey@${sha} is stale: file renamed to src/b.ts in ${moved} "Move a to b"`
  );
});

test('a call that swaps one function for another renames nothing', async (t) => {
  const { top, put, commit } = repository(t);
  const body = (call: string, fast: boolean) =>
    `function slowSort(xs) {\n  return xs;\n}\n${
      fast ? 'function fastSort(xs) {\n  return xs.sort();\n}\n' : ''
    }export function main(xs) {\n  return ${call}(xs);\n}\n`;
  put('a.ts', body('slowSort', false));
  commit('Add a');
  put('a.ts', body('fastSort', true));
  commit('Use the fast sort');
  const found = await targetAliases(
    {
      path: 'a.ts',
      symbol: 'fastSort',
      dir: false,
      file: true,
      label: 'a.ts#fastSort',
    },
    new CodeHistory(top)
  );
  t.deepEqual(found, { aliases: [], notes: [] });
});

test('a folder move needs most of the old folder, and chains back', async (t) => {
  const { top, git, put, commit } = repository(t);
  for (const name of ['util', 'one', 'two', 'three'])
    put(`lib/${name}.ts`, `export const ${name} = 1;\n// ${name}\n`);
  for (const name of ['f1', 'f2', 'f3'])
    put(`x/${name}.ts`, `export const ${name} = 1;\n// ${name}\n`);
  commit('Add');
  put('src/main.ts', 'export {};\n');
  git('mv', 'lib/util.ts', 'src/util.ts');
  commit('Move util into src');
  git('rm', '-q', '-r', 'lib');
  commit('Drop the rest of lib');
  git('mv', 'x', 'y');
  commit('Move x to y');
  git('mv', 'y', 'z');
  commit('Move y to z');
  const history = new CodeHistory(top);
  t.deepEqual(
    (await history.formerNames('src', true)).map((move) => [
      move.from,
      Boolean(move.dir),
    ]),
    [['lib/util.ts', false]]
  );
  const z = await history.formerNames('z', true);
  t.deepEqual(
    z
      .filter((move) => move.dir)
      .map((move) => [move.from, move.after?.map((m) => m.to)]),
    [
      ['y', undefined],
      ['x', ['z']],
    ]
  );
});

test('a squashed anchor whose file did not change says nothing', async (t) => {
  const { top, git, put, commit } = repository(t);
  put('src/a.ts', 'export const a = 1;\n');
  commit('Init');
  git('checkout', '-q', '-b', 'feat');
  put('src/a.ts', 'export const a = 2;\n');
  const sha = commit('Feature');
  git('checkout', '-q', 'main');
  git('merge', '-q', '--squash', 'feat');
  commit('Squash feat');
  t.is(await note(top, { path: 'src/a.ts', sha }), undefined);
  put('src/a.ts', 'export const a = 3;\n');
  commit('Change a');
  t.regex(
    (await note(top, { path: 'src/a.ts', sha })) ?? '',
    /changed: the file at HEAD differs from [0-9a-f]{7}, which is not in HEAD's history/
  );
});

test('a copy that left its source alone is not a former name', async (t) => {
  const { top, put, commit } = repository(t);
  const header = Array.from({ length: 12 }, (_, i) => `// header ${i}\n`).join(
    ''
  );
  put('src/a.ts', `${header}export function alpha() {}\n`);
  commit('Add a');
  put('src/b.ts', `${header}export function beta() {}\n`);
  commit('Add b');
  t.deepEqual(await new CodeHistory(top).formerNames('src/b.ts', false), []);
});

test('moved to names only files the removing commit added the symbol to', async (t) => {
  const { top, put, commit } = repository(t);
  put('src/a.ts', 'export function update() {}\nexport function keep() {}\n');
  put(
    'src/ui.ts',
    '// call update() when the screen changes\nexport const ui = 1;\n'
  );
  const sha = commit('Add');
  put('src/a.ts', 'export function keep() {}\n');
  const removed = commit('Delete update');
  t.is(
    await note(top, { path: 'src/a.ts', symbol: 'update', sha }),
    `anchor src/a.ts#update@${sha} is stale: #update no longer in src/a.ts; removed in ${removed} "Delete update"; 1 commit touched it since ${sha}: ${removed} (above)`
  );
  put('src/a.ts', 'export function keep() {}\nexport function later() {}\n');
  const laterSha = commit('Add later');
  put('src/a.ts', 'export function keep() {}\n');
  put('src/b.ts', 'export function later() {}\n');
  const split = commit('Move later to b');
  t.regex(
    (await note(top, { path: 'src/a.ts', symbol: 'later', sha: laterSha })) ??
      '',
    new RegExp(`#later moved to src/b.ts \\(out of src/a.ts in ${split} `)
  );
});
