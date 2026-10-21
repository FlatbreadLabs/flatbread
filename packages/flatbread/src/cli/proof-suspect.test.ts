import test from 'ava';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  handleEffortBrief,
  handleEffortFind,
  handleEffortGet,
  handleEffortRecords,
  handleEffortState,
  handleEffortWrite,
} from './proof.js';
import { churnThreshold, namesSymbol } from '../proof/suspect.js';

// A live Decision or Constraint reads as suspect when the code it rests on
// moved or changed after it was recorded, or when it rests on dead
// evidence. Each test builds its own repository in a temp folder, with a
// commit clock that moves a minute per commit, so "after the record" never
// hangs on two commits in the same second.

const repositoryNodeModules = fileURLToPath(
  new URL('../../../../node_modules/', import.meta.url)
);
const GIT_ENV = {
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
};

type Context = { teardown(callback: () => void | Promise<void>): void };

interface Project {
  readonly cwd: string;
  commit(message: string): Promise<string>;
  write(input: Record<string, unknown>): Promise<string>;
  file(path: string, text: string): Promise<void>;
}

function git(
  cwd: string,
  env: Record<string, string>,
  ...args: string[]
): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(
      'git',
      ['-c', 'commit.gpgsign=false', ...args],
      { cwd, env: { ...process.env, ...GIT_ENV, ...env } },
      (error, stdout, stderr) =>
        error
          ? reject(new Error(`${error.message}\n${stderr}`))
          : resolve(stdout)
    )
  );
}

async function createProject(t: Context): Promise<Project> {
  const cwd = await mkdtemp(join(tmpdir(), 'flatbread-proof-suspect-'));
  const nodeModules = join(cwd, 'node_modules');
  await symlink(repositoryNodeModules, nodeModules, 'junction');
  t.teardown(async () => {
    if ((await lstat(nodeModules).catch(() => null))?.isSymbolicLink())
      await unlink(nodeModules);
    await rm(cwd, { recursive: true, force: true });
  });
  await writeFile(
    join(cwd, 'flatbread.config.js'),
    `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default {
  source: source(),
  transformer: transformer(),
  content: proofContent('.flatbread-proof'),
};`
  );
  await writeFile(
    join(cwd, '.gitignore'),
    'node_modules\n**/.flatbread-proof/.journal/\n.flatbread/\n'
  );
  await git(cwd, {}, 'init', '-q', '-b', 'main');
  // Records carry today's created_at; commits start an hour later and move a
  // minute each, so every commit comes after every record before it.
  let clock = Math.floor(Date.now() / 1000) + 3600;
  return {
    cwd,
    async commit(message) {
      const date = `@${(clock += 60)} +0000`;
      const env = { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
      await git(cwd, env, 'add', '-A');
      await git(cwd, env, 'commit', '-q', '-m', message);
      return (await git(cwd, {}, 'rev-parse', 'HEAD')).trim();
    },
    async write(input) {
      return (await handleEffortWrite(JSON.stringify(input), { cwd }))
        .artifacts[0].id;
    },
    async file(path, text) {
      await mkdir(join(cwd, path, '..'), { recursive: true });
      await writeFile(join(cwd, path), text);
    },
  };
}

const short = (sha: string) => sha.slice(0, 7);
const lines = (n: number, word: string) =>
  Array.from({ length: n }, (_, i) => `export const ${word}${i} = ${i};`).join(
    '\n'
  ) + '\n';

async function digest(envelope: { artifact_path: string }): Promise<string> {
  return readFile(envelope.artifact_path, 'utf8');
}

const KEYMAP = `export const DEFAULT_KEYMAP = { canvas: { 'Mod+Z': 'undo' } };
export function registerBinding(scope: string, chord: string, action: string) {
  (DEFAULT_KEYMAP as Record<string, Record<string, string>>)[scope][chord] = action;
}
${lines(10, 'keyPad')}`;

test('a symbol counts as named only where the text writes it as code', (t) => {
  t.true(namesSymbol('call registerBinding at run time', 'registerBinding'));
  t.true(namesSymbol('add it to DEFAULT_KEYMAP first', 'DEFAULT_KEYMAP'));
  t.false(namesSymbol('records nested dispatches as a batch', 'batch'));
  t.true(namesSymbol('wrap them in `batch` so', 'batch'));
  t.true(namesSymbol('call batch() around them', 'batch'));
  t.false(namesSymbol('the registerBindings list', 'registerBinding'));
  // The dotted parts of a file name are not `.word`.
  t.false(namesSymbol('Scripts are declared in package.json', 'json'));
  t.false(namesSymbol('Build settings live in vite.config.ts', 'config'));
  t.true(namesSymbol('it returns res.json() as is', 'json'));
  t.true(namesSymbol('see store.ts#batch', 'batch'));
});

test('the churn threshold: ten lines, a quarter of the file, at most 100', (t) => {
  t.is(churnThreshold(8), 10);
  t.is(churnThreshold(60), 15);
  t.is(churnThreshold(1000), 100);
});

test.serial(
  'a Decision whose cited code Citation went stale is suspect, as is one that derives from it; the code wins',
  async (t) => {
    t.timeout(180_000);
    const project = await createProject(t);
    const { cwd, write, commit, file } = project;
    const effort = await write({
      type: 'CreateEffort',
      title: 'Keys',
      body: '',
    });
    await file('src/keys/keymap.ts', KEYMAP);
    const added = await commit('Add shortcuts');
    const citation = await write({
      type: 'WriteCitation',
      effort,
      title: 'Registering a shortcut',
      body: `src/keys/keymap.ts#registerBinding@${added}`,
      role: 'code',
    });
    const decision = await write({
      type: 'WriteDecision',
      effort,
      title: 'Shortcuts go in one table',
      body: 'Every shortcut is one row in the table.',
      cites: [citation],
    });
    const after = await write({
      type: 'WriteDecision',
      effort,
      title: 'Plugins read the table',
      body: 'Plugins see what the editor runs.',
      derives_from: [decision],
    });
    await commit('Record the shortcut rules');
    await file(
      'src/keys/keymap.ts',
      KEYMAP.replace('registerBinding', 'legacyAction')
    );
    const renamed = await commit('Rename the binding helper');

    const got = await handleEffortGet(decision, { cwd });
    const banner = `SUSPECT — the code this Decision rests on changed after it was recorded: src/keys/keymap.ts: #registerBinding renamed to legacyAction in ${short(
      renamed
    )} "Rename the binding helper". Read the code first; where they disagree, the code is the current behaviour.`;
    t.is(got.suspect?.[decision], banner);
    t.true(got.summary.startsWith(`${banner} | 1 record;`), got.summary);
    const text = await digest(got);
    // Before the body: under the heading, ahead of the frontmatter.
    t.true(text.includes(`### ${decision}\n> ${banner}\n\n\`\`\`yaml`), text);
    t.true(text.includes(`(#${decision}) (suspect: code changed)`), text);
    // Two links out, through derives_from and cites.
    const derived = await handleEffortGet(after, { cwd });
    t.regex(
      derived.suspect?.[after] ?? '',
      /#registerBinding renamed to legacyAction/
    );
  }
);

test.serial(
  'a Decision whose text names a stale symbol is suspect without a link; a prose word is not a symbol',
  async (t) => {
    t.timeout(180_000);
    const { cwd, write, commit, file } = await createProject(t);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Keys',
      body: '',
    });
    await file('src/keys/keymap.ts', KEYMAP);
    await file('src/batch.ts', 'export function batch() {}\n');
    const added = await commit('Add shortcuts');
    await write({
      type: 'WriteCitation',
      effort,
      title: 'Registering a shortcut',
      body: `src/keys/keymap.ts#registerBinding@${added}`,
      role: 'code',
    });
    await write({
      type: 'WriteCitation',
      effort,
      title: 'Batches',
      body: `src/batch.ts#batch@${added}`,
      role: 'code',
    });
    const named = await write({
      type: 'WriteDecision',
      effort,
      title: 'Plugins add shortcuts at run time',
      body: 'A plugin calls registerBinding in keys/keymap.ts with a scope and a chord.',
    });
    // Through its chain: the Decision it derives from names the file.
    const chained = await write({
      type: 'WriteDecision',
      effort,
      title: 'Plugins see their own shortcuts',
      body: 'What a plugin adds with registerBinding shows up at once.',
      derives_from: [named],
    });
    // The same name in another file is another symbol.
    const elsewhere = await write({
      type: 'WriteDecision',
      effort,
      title: 'The menu registers its own items',
      body: 'src/menu.ts has a registerBinding of its own for menu items.',
    });
    const prose = await write({
      type: 'WriteDecision',
      effort,
      title: 'Undo takes a whole batch',
      body: 'One batch of edits is one undo step.',
    });
    await commit('Record the rules');
    await file(
      'src/keys/keymap.ts',
      KEYMAP.replace('registerBinding', 'legacyAction')
    );
    await file('src/batch.ts', 'export function group() {}\n');
    await commit('Rename helpers');

    const got = await handleEffortGet(named, { cwd });
    t.regex(
      got.suspect?.[named] ?? '',
      /src\/keys\/keymap\.ts: #registerBinding renamed to legacyAction/
    );
    t.regex(
      (await handleEffortGet(chained, { cwd })).suspect?.[chained] ?? '',
      /#registerBinding renamed to legacyAction/
    );
    t.is((await handleEffortGet(elsewhere, { cwd })).suspect, undefined);
    const plain = await handleEffortGet(prose, { cwd });
    t.is(plain.suspect, undefined);
  }
);

test.serial(
  'a Decision whose named file is gone, or was largely rewritten since it was recorded, is suspect; a small edit is not',
  async (t) => {
    t.timeout(180_000);
    const { cwd, write, commit, file } = await createProject(t);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Code',
      body: '',
    });
    await file('src/keys/keymap.ts', KEYMAP);
    await file('src/legacy/loader.ts', lines(20, 'loader'));
    await file('src/panel/fields.ts', lines(40, 'field'));
    await commit('Add the code');
    const rewritten = await write({
      type: 'WriteDecision',
      effort,
      title: 'Shortcuts are registered in keys/keymap.ts',
      body: 'Add a row to the table.',
    });
    const gone = await write({
      type: 'WriteConstraint',
      effort,
      title: 'Old saves load through src/legacy/loader.ts',
      body: 'Never drop the loader.',
      kind: 'hard',
    });
    const holds = await write({
      type: 'WriteDecision',
      effort,
      title: 'Fields parse in panel/fields.ts',
      body: 'One parser for every field.',
    });
    const recorded = await commit('Record the rules');
    await file(
      'src/keys/keymap.ts',
      `${lines(8, 'scopeA')}${KEYMAP.split('\n').slice(0, 4).join('\n')}\n`
    );
    const first = await commit('Split bindings by scope');
    await file('src/keys/keymap.ts', `${lines(8, 'scopeB')}`);
    const second = await commit('Move the table out');
    await rm(join(cwd, 'src/legacy/loader.ts'));
    const dropped = await commit('Drop the legacy loader');
    await file(
      'src/panel/fields.ts',
      lines(40, 'field').replace('field3 = 3', 'field3 = 33')
    );
    await commit('Fix a typo');

    const got = await handleEffortGet(rewritten, { cwd });
    t.regex(
      got.suspect?.[rewritten] ?? '',
      new RegExp(
        `^SUSPECT — the code this Decision rests on changed after it was recorded: src/keys/keymap\\.ts: 14 of the 14 lines it had when this was recorded are rewritten or removed \\(git diff ${short(
          recorded
        )} HEAD\\); since then: ${short(second)} "Move the table out", ${short(
          first
        )} "Split bindings by scope"\\. Read the code first`
      )
    );
    const loader = await handleEffortGet(gone, { cwd });
    t.is(
      loader.suspect?.[gone],
      `SUSPECT — the code this Constraint rests on changed after it was recorded: src/legacy/loader.ts is gone at HEAD: deleted in ${short(
        dropped
      )} "Drop the legacy loader". Read the code first; where they disagree, the code is the current behaviour.`
    );
    // Two changed lines of 40: the code still holds, and nothing is said.
    const held = await handleEffortGet(holds, { cwd });
    t.is(held.suspect, undefined);
    t.false((await digest(held)).includes('SUSPECT'));

    // Listings: a marker on the index line, and --suspect keeps only them.
    const listed = await handleEffortRecords(effort, {
      cwd,
      kinds: ['decision', 'constraint'],
    });
    const text = await digest(listed);
    t.true(text.includes(`(#${rewritten}) (suspect: code changed)`), text);
    t.true(text.includes(`(#${holds})\n`), text);
    t.regex(listed.summary, /; 2 suspect \(/);
    const only = await handleEffortRecords(effort, { cwd, suspect: true });
    t.deepEqual(
      Object.keys(only.suspect ?? {}).sort(),
      [gone, rewritten].sort()
    );
    t.is(only.page.returned, 2);

    // find cards carry the warning under the title.
    const found = await handleEffortFind('shortcuts registered', {
      cwd,
      effort,
    });
    t.regex(
      found.cards,
      new RegExp(
        `1\\. ${rewritten} \\| decision \\| proposed \\| [^\\n]+\\n   "Shortcuts are registered in keys/keymap\\.ts"\\n   SUSPECT — the code this Decision rests on changed`
      )
    );
    t.regex(found.summary, new RegExp(`SUSPECT ${rewritten}`));

    // brief lists them above the body; state lists them after the counts.
    const brief = await digest(await handleEffortBrief(effort, { cwd }));
    t.regex(
      brief,
      /# Proof read\n> \*\*SUSPECT\*\* — 2 live records in this Effort may be out of date/
    );
    t.true(brief.includes(`> - ${rewritten} "Shortcuts are registered`));
    const state = await handleEffortState(effort, { cwd });
    t.regex(
      state.markdown,
      /### Counts[\s\S]*### Suspect records\n\*\*SUSPECT\*\*: 2 live records may be out of date/
    );
    t.true(
      state.markdown.includes(`- ${gone} (live): src/legacy/loader.ts is gone`)
    );
  }
);

test.serial(
  'a Decision that rests on dead evidence is suspect, and says what to check',
  async (t) => {
    t.timeout(180_000);
    const { cwd, write, commit } = await createProject(t);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Perf',
      body: '',
    });
    const finding = await write({
      type: 'WriteFinding',
      effort,
      title: 'Hit testing takes 2 ms',
      body: 'Measured on 5,000 nodes.',
      kind: 'measurement',
    });
    const decision = await write({
      type: 'WriteDecision',
      effort,
      title: 'Keep hit testing linear',
      body: 'Linear is fast enough.',
      derives_from: [finding],
    });
    const wrong = await write({
      type: 'WriteFinding',
      effort,
      title: 'The 2 ms figure was a warm cache',
      body: 'Cold, it is 40 ms.',
      kind: 'measurement',
    });
    await write({ type: 'Invalidate', findingId: wrong, targetId: finding });
    await commit('Record the measurements');

    const got = await handleEffortGet(decision, { cwd });
    t.is(
      got.suspect?.[decision],
      `SUSPECT — this Decision rests on records that are no longer live: ${finding} (invalidated). Check what replaced them before relying on it.`
    );
    t.true(
      (await digest(got)).includes(`(#${decision}) (suspect: dead evidence)`)
    );
  }
);

test.serial(
  'implementing, appending to, moving, or documenting a named file is not suspect; branch work merged after the record and a deleted bare name are',
  async (t) => {
    t.timeout(180_000);
    const { cwd, write, commit, file } = await createProject(t);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Code',
      body: '',
    });
    await file('src/append.ts', lines(30, 'stub'));
    await file('src/utils.ts', lines(30, 'util'));
    await file('src/keys.ts', lines(40, 'key'));
    await file('src/legacy.ts', lines(20, 'old'));
    await file('NOTES.md', `${lines(40, 'note')}`);
    await commit('Add the code');
    // Branch work committed before the record lands, merged after it: its
    // commit time is earlier than the record's commit.
    const base = Number(
      (await git(cwd, {}, 'log', '-1', '--format=%ct')).trim()
    );
    const early = `@${base + 30} +0000`;
    const env = { GIT_AUTHOR_DATE: early, GIT_COMMITTER_DATE: early };
    await git(cwd, {}, 'checkout', '-q', '-b', 'feat');
    await file('src/keys.ts', lines(40, 'scope'));
    await git(cwd, env, 'add', '-A');
    await git(cwd, env, 'commit', '-q', '-m', 'Rewrite keys on a branch');
    await git(cwd, {}, 'checkout', '-q', 'main');
    const decide = (title: string, body: string) =>
      write({ type: 'WriteDecision', effort, title, body });
    const implement = await decide(
      'Config is parsed in src/config.ts',
      'One parser for the config.'
    );
    const append = await decide(
      'Validation lives in src/append.ts',
      'Add checks at the end.'
    );
    const move = await decide(
      'Helpers live in src/utils.ts',
      'Small pure helpers only.'
    );
    const doc = await decide(
      'Working notes live in NOTES.md',
      'Rewrite them freely.'
    );
    const merged = await decide(
      'Shortcuts are listed in src/keys.ts',
      'One row per shortcut.'
    );
    const bare = await decide(
      'Old files load through legacy.ts',
      'Keep the loader.'
    );
    await commit('Record the rules');
    await file('src/config.ts', lines(40, 'config'));
    await file('src/append.ts', `${lines(30, 'stub')}${lines(12, 'check')}`);
    await mkdir(join(cwd, 'src/lib'), { recursive: true });
    await git(cwd, {}, 'mv', 'src/utils.ts', 'src/lib/utils.ts');
    await file('NOTES.md', lines(40, 'draft'));
    await rm(join(cwd, 'src/legacy.ts'));
    await commit('Implement, append, move, and drop');
    const late = `@${base + 3600} +0000`;
    await git(
      cwd,
      { GIT_AUTHOR_DATE: late, GIT_COMMITTER_DATE: late },
      'merge',
      '-q',
      '--no-ff',
      'feat',
      '-m',
      'Merge the branch'
    );

    for (const id of [implement, append, move, doc])
      t.is((await handleEffortGet(id, { cwd })).suspect, undefined, id);
    t.regex(
      (await handleEffortGet(merged, { cwd })).suspect?.[merged] ?? '',
      /src\/keys\.ts: 40 of the 40 lines it had when this was recorded are rewritten or removed/
    );
    t.regex(
      (await handleEffortGet(bare, { cwd })).suspect?.[bare] ?? '',
      /src\/legacy\.ts is gone at HEAD: deleted in [0-9a-f]{7} "Implement, append, move, and drop"/
    );
  }
);

test.serial(
  'dead evidence a live revision of itself replaced is not suspect; a check that stops at a cap says so',
  async (t) => {
    t.timeout(180_000);
    const { cwd, write, commit, file } = await createProject(t);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Rules',
      body: '',
    });
    const first = await write({
      type: 'WriteConstraint',
      effort,
      title: 'The mutation list stays small',
      body: 'Thirteen mutations.',
      kind: 'hard',
    });
    const decision = await write({
      type: 'WriteDecision',
      effort,
      title: 'Blobs are a citation field',
      body: 'Not a new mutation.',
      derives_from: [first],
    });
    await write({
      type: 'WriteConstraint',
      effort,
      title: 'The mutation list stays small',
      body: 'Sixteen mutations.',
      kind: 'hard',
      supersedes: [first],
    });
    t.is((await handleEffortGet(decision, { cwd })).suspect, undefined);

    // Seven Decisions name seven deleted files: one check asks history
    // about six, so a listing is marked incomplete.
    const ids: string[] = [];
    for (let i = 0; i < 7; i++) {
      await file(`src/gone${i}/mod.ts`, lines(12, `m${i}`));
      ids.push(
        await write({
          type: 'WriteDecision',
          effort,
          title: `Module ${i} lives in src/gone${i}/mod.ts`,
          body: 'Keep it.',
        })
      );
    }
    await commit('Add modules and rules');
    for (let i = 0; i < 7; i++)
      await rm(join(cwd, `src/gone${i}`), { recursive: true });
    await commit('Drop the modules');
    const listed = await handleEffortRecords(effort, { cwd, suspect: true });
    t.true(listed.page.returned >= 6);
    t.regex(listed.summary, /incomplete: suspect_limit/);
    t.regex(listed.summary, /the suspect check stopped at its limit/);
    t.true((await digest(listed)).includes('cap_reasons: ["suspect_limit"]'));
    for (const id of ids)
      t.regex(
        (await handleEffortGet(id, { cwd })).suspect?.[id] ?? '',
        /is gone at HEAD/
      );
  }
);
