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
  handleEffortFind,
  handleEffortGet,
  handleEffortWrite,
} from './proof.js';

// Proof reads against git history: `find --path` follows renames and folder
// moves, says where a gone path or symbol went, and every printed code
// Citation says when HEAD no longer bears it out. Each test builds its own
// repository in a temp folder.

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

async function createProject(t: Context): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'flatbread-proof-history-'));
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
  await git(cwd, 'init', '-q', '-b', 'main');
  return cwd;
}

function git(cwd: string, ...args: string[]): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(
      'git',
      ['-c', 'commit.gpgsign=false', ...args],
      { cwd, env: { ...process.env, ...GIT_ENV } },
      (error, stdout, stderr) =>
        error
          ? reject(new Error(`${error.message}\n${stderr}`))
          : resolve(stdout)
    )
  );
}

async function commit(cwd: string, message: string): Promise<string> {
  await git(cwd, 'add', '-A');
  await git(cwd, 'commit', '-q', '-m', message);
  return (await git(cwd, 'rev-parse', 'HEAD')).trim();
}

function writer(cwd: string) {
  return async (input: Record<string, unknown>): Promise<string> =>
    (await handleEffortWrite(JSON.stringify(input), { cwd })).artifacts[0].id;
}

const short = (sha: string) => sha.slice(0, 7);

test.serial(
  'find --path follows a rename-only commit; a gone path says where it went',
  async (t) => {
    t.timeout(180_000);
    const cwd = await createProject(t);
    const write = writer(cwd);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Queue',
      body: '',
    });
    await mkdir(join(cwd, 'src'), { recursive: true });
    await writeFile(
      join(cwd, 'src/queue.ts'),
      'export function drainJobs() {\n  return 0;\n}\n'
    );
    await writeFile(join(cwd, 'src/legacy.ts'), 'export {};\n');
    const added = await commit(cwd, 'Add the queue');
    const citation = await write({
      type: 'WriteCitation',
      effort,
      title: 'Queue drain code',
      body: `src/queue.ts#drainJobs@${added}`,
      role: 'code',
    });
    const decision = await write({
      type: 'WriteDecision',
      effort,
      title: 'Drain the oldest jobs first',
      body: 'Oldest jobs go first.',
      cites: [citation],
    });
    const trailer = await write({
      type: 'WriteFinding',
      effort,
      title: 'Draining stalls on full queues',
      body: 'Measured a 3 ms stall.',
      kind: 'measurement',
    });
    const text = await write({
      type: 'WriteFinding',
      effort,
      title: 'Where draining lives',
      body: 'Draining is in src/queue.ts, beside the scheduler.',
      kind: 'observation',
    });
    const legacy = await write({
      type: 'WriteFinding',
      effort,
      title: 'The legacy loader',
      body: 'The loader in src/legacy.ts is kept for old saves.',
      kind: 'observation',
    });
    await commit(cwd, 'Record the queue work');
    await writeFile(
      join(cwd, 'src/queue.ts'),
      'export function drainJobs() {\n  return 1;\n}\n'
    );
    await commit(cwd, `Stop the stall\n\nProof: ${trailer}`);
    await git(cwd, 'mv', 'src/queue.ts', 'src/job_queue.ts');
    const renamed = await commit(cwd, 'Rename queue.ts to job_queue.ts');
    await rm(join(cwd, 'src/legacy.ts'));
    const dropped = await commit(cwd, 'Drop the legacy loader');

    const moved = `renamed to src/job_queue.ts in ${short(
      renamed
    )} "Rename queue.ts to job_queue.ts"`;
    const now = await handleEffortFind('', { cwd, path: 'src/job_queue.ts' });
    t.deepEqual(
      now.find.hits.map((hit) => hit.id),
      [decision, trailer, text]
    );
    t.deepEqual(now.find.hits[0].via, [
      `cites ${citation}: src/queue.ts#drainJobs@${short(
        added
      )}; anchored at src/queue.ts, ${moved}`,
    ]);
    t.regex(
      now.find.hits[1].via?.[0] ?? '',
      new RegExp(
        `^commit [0-9a-f]{7} "Stop the stall", on src/queue.ts, ${moved}$`
      )
    );
    t.deepEqual(now.find.hits[2].via, [`body names src/queue.ts, ${moved}`]);
    t.regex(
      now.cards,
      /^note: src\/job_queue\.ts has had other names: src\/queue\.ts \(/m
    );
    // The card flags the anchor: its file moved, and two commits touched it.
    t.true(
      now.cards.includes(
        `   anchor ${citation} src/queue.ts#drainJobs@${short(
          added
        )} is stale: file ${moved}; 2 commits touched it since ${short(
          added
        )}: ${short(renamed)} (above), `
      ),
      now.cards
    );
    t.regex(now.cards, /"Stop the stall"/);

    // The old name still finds its records, and says where the file went.
    const old = await handleEffortFind('', { cwd, path: 'src/queue.ts' });
    t.deepEqual(
      old.find.hits.map((hit) => hit.id),
      [decision, trailer, text]
    );
    t.is(old.find.note, `note: src/queue.ts is not at HEAD: ${moved}.`);
    // A deleted file: its records, and the commit that deleted it.
    const gone = await handleEffortFind('', { cwd, path: 'src/legacy.ts' });
    t.deepEqual(
      gone.find.hits.map((hit) => hit.id),
      [legacy]
    );
    t.is(
      gone.find.note,
      `note: src/legacy.ts is not at HEAD: deleted in ${short(
        dropped
      )} "Drop the legacy loader".`
    );
    t.true(
      gone.cards.includes(
        `   path src/legacy.ts is stale: deleted in ${short(
          dropped
        )} "Drop the legacy loader"`
      ),
      gone.cards
    );

    // get prints the same flag, on the Citation and on the record citing it.
    const cited = await handleEffortGet(citation, { cwd });
    t.regex(
      cited.summary,
      /1 code note \(## Code anchors at HEAD\): anchor src\/queue\.ts#drainJobs@[0-9a-f]{7} is stale: file renamed to src\/job_queue\.ts/
    );
    const digest = await readFile(cited.artifact_path, 'utf8');
    t.regex(
      digest,
      /## Code anchors at HEAD\n- anchor src\/queue\.ts#drainJobs@/
    );
    const citing = await handleEffortGet(decision, { cwd });
    t.true(
      citing.summary.includes(`anchor ${citation} src/queue.ts#drainJobs@`),
      citing.summary
    );
  }
);

test.serial(
  'find --path on a moved folder matches anchors, trailers, and bodies under its old name',
  async (t) => {
    t.timeout(180_000);
    const cwd = await createProject(t);
    const write = writer(cwd);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Parser',
      body: '',
    });
    await mkdir(join(cwd, 'lib/parser'), { recursive: true });
    await writeFile(
      join(cwd, 'lib/parser/lexer.py'),
      'def tokenize(src):\n    return src\n'
    );
    await writeFile(
      join(cwd, 'lib/parser/reader.py'),
      'def read():\n    pass\n'
    );
    const added = await commit(cwd, 'Add the parser');
    const citation = await write({
      type: 'WriteCitation',
      effort,
      title: 'Tokenizer code',
      body: `lib/parser/lexer.py#tokenize@${added}`,
      role: 'code',
    });
    const decision = await write({
      type: 'WriteDecision',
      effort,
      title: 'Tokenize after macro expansion',
      body: 'Macros change the tokens.',
      cites: [citation],
    });
    const issue = await write({
      type: 'WriteIssue',
      effort,
      title: 'Unreadable files are skipped',
      body: 'The skip is in lib/parser/reader.py.',
      kind: 'defect',
    });
    await commit(cwd, 'Record the parser work');
    await mkdir(join(cwd, 'lib/lang'), { recursive: true });
    await git(cwd, 'mv', 'lib/parser', 'lib/lang/parser');
    const move = await commit(cwd, 'Move the parser package under lang');

    const how = `moved to lib/lang/parser/ in ${short(
      move
    )} "Move the parser package under lang"`;
    const found = await handleEffortFind('', {
      cwd,
      path: 'lib/lang/parser',
    });
    t.deepEqual(
      found.find.hits.map((hit) => hit.id),
      [decision, issue]
    );
    t.deepEqual(found.find.hits[0].via, [
      `cites ${citation}: lib/parser/lexer.py#tokenize@${short(
        added
      )}; anchored at lib/parser/, ${how}`,
    ]);
    t.deepEqual(found.find.hits[1].via, [`body names lib/parser/, ${how}`]);
    t.true(
      found.cards.includes(
        `   path lib/parser/reader.py is stale: renamed to lib/lang/parser/reader.py in ${short(
          move
        )}`
      ),
      found.cards
    );
    t.regex(
      found.cards,
      /^note: lib\/lang\/parser\/ has had other names: lib\/parser\/ \(moved to/m
    );
    // The old folder name says where it went.
    const old = await handleEffortFind('', { cwd, path: 'lib/parser' });
    t.is(old.find.note, `note: lib/parser is not at HEAD: ${how}.`);
    t.deepEqual(
      old.find.hits.map((hit) => hit.id),
      [decision, issue]
    );
  }
);

test.serial(
  'a renamed symbol and a behaviour change after the anchor are flagged',
  async (t) => {
    t.timeout(180_000);
    const cwd = await createProject(t);
    const write = writer(cwd);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Retry',
      body: '',
    });
    await mkdir(join(cwd, 'src'), { recursive: true });
    await writeFile(
      join(cwd, 'src/net.ts'),
      'export const RETRIES = 3;\nexport function retryFetch() {\n  return RETRIES;\n}\n'
    );
    const added = await commit(cwd, 'Retry failed fetches');
    const citation = await write({
      type: 'WriteCitation',
      effort,
      title: 'Retry code',
      body: `src/net.ts#retryFetch@${added}`,
      role: 'code',
    });
    const decision = await write({
      type: 'WriteDecision',
      effort,
      title: 'Retry failed fetches 3 times',
      body: 'Three tries ride out a flaky network.',
      cites: [citation],
    });
    await commit(cwd, 'Record the retry work');
    await writeFile(
      join(cwd, 'src/net.ts'),
      'export const RETRIES = 3;\nexport function retryRequest() {\n  return RETRIES;\n}\n'
    );
    const rename = await commit(cwd, 'Rename retryFetch to retryRequest');
    await writeFile(
      join(cwd, 'src/net.ts'),
      'export const RETRIES = 5;\nexport function retryRequest() {\n  return RETRIES;\n}\n'
    );
    const change = await commit(cwd, 'Retry 5 times');

    const found = await handleEffortFind('retry', { cwd, path: 'src/net.ts' });
    t.deepEqual(
      found.find.hits.map((hit) => hit.id),
      [decision]
    );
    t.true(
      found.cards.includes(
        `   anchor ${citation} src/net.ts#retryFetch@${short(
          added
        )} is stale: #retryFetch renamed to retryRequest in ${short(
          rename
        )} "Rename retryFetch to retryRequest"; 2 commits touched it since ${short(
          added
        )}: ${short(change)} "Retry 5 times", ${short(rename)} (above)`
      ),
      found.cards
    );
    // The new name finds the record anchored at the old one.
    const renamed = await handleEffortFind('', {
      cwd,
      path: 'src/net.ts#retryRequest',
    });
    t.deepEqual(
      renamed.find.hits.map((hit) => hit.id),
      [decision]
    );
    t.regex(
      renamed.find.hits[0].via?.[0] ?? '',
      /#retryFetch renamed to retryRequest in [0-9a-f]{7}/
    );
    t.regex(
      renamed.find.note ?? '',
      /^note: #retryRequest was #retryFetch until [0-9a-f]{7} /
    );
    // The old name, gone from HEAD's code, says what it became.
    const old = await handleEffortFind('', { cwd, path: 'retryFetch' });
    t.deepEqual(
      old.find.hits.map((hit) => hit.id),
      [decision]
    );
    t.is(
      old.find.note,
      `note: retryFetch is not in the code at HEAD; renamed to retryRequest in ${short(
        rename
      )} "Rename retryFetch to retryRequest".`
    );
  }
);

test.serial('an anchor that still holds prints nothing new', async (t) => {
  t.timeout(180_000);
  const cwd = await createProject(t);
  const write = writer(cwd);
  const effort = await write({ type: 'CreateEffort', title: 'Fuse', body: '' });
  await mkdir(join(cwd, 'src'), { recursive: true });
  await writeFile(join(cwd, 'src/fuse.ts'), 'export function budget() {}\n');
  await writeFile(join(cwd, 'src/other.ts'), 'export {};\n');
  const added = await commit(cwd, 'Add the fuse');
  const citation = await write({
    type: 'WriteCitation',
    effort,
    title: 'Fuse budget code',
    body: `src/fuse.ts#budget@${added}`,
    role: 'code',
  });
  const decision = await write({
    type: 'WriteDecision',
    effort,
    title: 'Cap the fuse budget',
    body: 'The cap is set in src/fuse.ts.',
    cites: [citation],
  });
  await commit(cwd, 'Record the fuse work');
  // A commit to another file does not touch the anchor.
  await writeFile(join(cwd, 'src/other.ts'), 'export const x = 1;\n');
  await commit(cwd, 'Touch another file');

  const found = await handleEffortFind('', { cwd, path: 'src/fuse.ts' });
  t.deepEqual(
    found.find.hits.map((hit) => hit.id),
    [decision]
  );
  t.false('note' in found.find);
  t.notRegex(
    found.cards,
    /stale|changed since|^note:|^ {3}anchor |^ {3}path /m
  );
  const words = await handleEffortFind('fuse budget', { cwd });
  t.notRegex(words.cards, /stale|changed since|^ {3}anchor /m);
  const cited = await handleEffortGet(citation, { cwd });
  t.notRegex(cited.summary, /code note/);
  t.notRegex(
    await readFile(cited.artifact_path, 'utf8'),
    /Code anchors at HEAD/
  );
});

test.serial(
  'records on a reused old name after the move stay with the new file there',
  async (t) => {
    t.timeout(180_000);
    const cwd = await createProject(t);
    const write = writer(cwd);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Move',
      body: '',
    });
    await mkdir(join(cwd, 'src'), { recursive: true });
    await writeFile(
      join(cwd, 'src/a.ts'),
      'export function pool() {\n  return 1;\n}\n// one\n// two\n'
    );
    const added = await commit(cwd, 'Add a');
    const before = await write({
      type: 'WriteCitation',
      effort,
      title: 'The pool helper',
      body: `src/a.ts#pool@${added}`,
      role: 'code',
    });
    await commit(cwd, 'Record the helper');
    await git(cwd, 'mv', 'src/a.ts', 'src/b.ts');
    await commit(cwd, 'Move a to b');
    await writeFile(join(cwd, 'src/a.ts'), 'export function unrelated() {}\n');
    const reused = await commit(cwd, 'A new a');
    const late = await write({
      type: 'WriteCitation',
      effort,
      title: 'The new unrelated helper',
      body: `src/a.ts#unrelated@${reused}`,
      role: 'code',
    });
    const body = await write({
      type: 'WriteFinding',
      effort,
      title: 'Note on the new file',
      body: 'The helper in src/a.ts is unrelated to pooling.',
      kind: 'observation',
    });
    await commit(cwd, 'Record the new file');

    const moved = await handleEffortFind('', { cwd, path: 'src/b.ts' });
    t.deepEqual(
      moved.find.hits.map((hit) => hit.id),
      [before]
    );
    const now = await handleEffortFind('', { cwd, path: 'src/a.ts' });
    t.deepEqual(
      now.find.hits.map((hit) => hit.id).sort(),
      [late, body, before].sort()
    );
  }
);

test.serial(
  'a path deleted at HEAD but on a branch keeps the branch hint',
  async (t) => {
    t.timeout(180_000);
    const cwd = await createProject(t);
    await writer(cwd)({ type: 'CreateEffort', title: 'Branch', body: '' });
    await mkdir(join(cwd, 'src'), { recursive: true });
    await writeFile(join(cwd, 'src/a.ts'), 'export const a = 1;\n');
    await commit(cwd, 'Add a');
    await git(cwd, 'branch', 'feat');
    await rm(join(cwd, 'src/a.ts'));
    const dropped = await commit(cwd, 'Drop a on main');
    const found = await handleEffortFind('', { cwd, path: 'src/a.ts' });
    t.is(
      found.find.note,
      `note: src/a.ts is not at HEAD: deleted in ${short(
        dropped
      )} "Drop a on main". note: src/a.ts is not in the working tree; feat has it. --refs all overlays branches, with their records and commit trailers.`
    );
  }
);

test.serial(
  'a split takes the anchors on symbols that went with it',
  async (t) => {
    t.timeout(180_000);
    const cwd = await createProject(t);
    const write = writer(cwd);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Split',
      body: '',
    });
    await mkdir(join(cwd, 'src'), { recursive: true });
    const moving = Array.from(
      { length: 10 },
      (_, i) => `export function gamma${i}() {\n  return ${i};\n}\n`
    ).join('');
    await writeFile(
      join(cwd, 'src/a.ts'),
      `export function alpha() {\n  return 1;\n}\n${moving}`
    );
    const added = await commit(cwd, 'Add a');
    const stays = await write({
      type: 'WriteCitation',
      effort,
      title: 'Alpha code',
      body: `src/a.ts#alpha@${added}`,
      role: 'code',
    });
    const goes = await write({
      type: 'WriteCitation',
      effort,
      title: 'Gamma code',
      body: `src/a.ts#gamma3@${added}`,
      role: 'code',
    });
    await commit(cwd, 'Record the code');
    await writeFile(
      join(cwd, 'src/a.ts'),
      'export function alpha() {\n  return 1;\n}\n'
    );
    await writeFile(join(cwd, 'src/c.ts'), moving);
    await commit(cwd, 'Split the gamma functions out of a.ts');
    const found = await handleEffortFind('', { cwd, path: 'src/c.ts' });
    t.deepEqual(
      found.find.hits.map((hit) => hit.id),
      [goes]
    );
    t.regex(found.find.hits[0].via?.[0] ?? '', /split into src\/c\.ts/);
    t.false(found.find.hits.some((hit) => hit.id === stays));
  }
);
