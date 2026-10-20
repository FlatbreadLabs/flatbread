import test from 'ava';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  lstat,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { handleEffortFind, handleEffortWrite } from './proof.js';
import { serveProofReads } from './serve.js';

// `proof find --path` and `--refs` on small fixture repositories made with
// `git init`. Each test builds its own repository in a temp folder.

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

async function createProject(t: Context, withGit = true): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'flatbread-proof-git-'));
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
  if (withGit) await git(cwd, 'init', '-q', '-b', 'main');
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

async function commit(cwd: string, message: string): Promise<void> {
  await git(cwd, 'add', '-A');
  await git(cwd, 'commit', '-q', '-m', message);
}

function writer(cwd: string) {
  return async (input: Record<string, unknown>): Promise<string> =>
    (await handleEffortWrite(JSON.stringify(input), { cwd })).artifacts[0].id;
}

function runCli(
  cwd: string,
  env: Record<string, string>,
  ...args: string[]
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--no-deprecation',
        fileURLToPath(new URL('../../bin/flatbread.js', import.meta.url)),
        ...args,
      ],
      { cwd, env: { ...process.env, FLATBREAD_PROOF_SERVER: '', ...env } }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test.serial(
  'find --path ties records to code by code Citation, commit trailer, and body text',
  async (t) => {
    t.timeout(180_000);
    const cwd = await createProject(t);
    const write = writer(cwd);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Fuse',
      body: '',
    });
    await mkdir(join(cwd, 'src/net'), { recursive: true });
    await writeFile(join(cwd, 'src/fuse.ts'), 'export function budget() {}\n');
    await writeFile(join(cwd, 'src/net/peer.ts'), 'export {};\n');
    await commit(cwd, 'Add the code');
    const sha = (await git(cwd, 'rev-parse', 'HEAD')).trim();
    const citation = await write({
      type: 'WriteCitation',
      effort,
      title: 'Fuse budget code',
      body: `src/fuse.ts#budget@${sha}`,
      role: 'code',
    });
    const decision = await write({
      type: 'WriteDecision',
      effort,
      title: 'Cap the fuse budget at 4 ms',
      body: 'The budget stops the frame from running long.',
      cites: [citation],
    });
    const trailer = await write({
      type: 'WriteFinding',
      effort,
      title: 'The fuse overran on Skiff',
      body: 'Measured 6 ms on the slow device.',
      kind: 'measurement',
    });
    const text = await write({
      type: 'WriteFinding',
      effort,
      title: 'Where the cap lives',
      body: 'The cap is set in src/fuse.ts, next to the frame clock.',
      kind: 'observation',
    });
    await write({
      type: 'WriteFinding',
      effort,
      title: 'Peer handshake',
      body: 'The handshake is in src/net/peer.ts.',
      kind: 'observation',
    });
    await commit(cwd, 'Record the fuse work');
    await writeFile(
      join(cwd, 'src/fuse.ts'),
      'export function budget() { return 4; }\n'
    );
    await commit(cwd, `Cap the fuse\n\nProof: ${trailer}`);

    const byPath = await handleEffortFind('', { cwd, path: 'src/fuse.ts' });
    t.deepEqual(
      byPath.find.hits.map((hit) => hit.id),
      [decision, trailer, text]
    );
    t.deepEqual(byPath.find.hits[0].via, [
      `cites ${citation}: src/fuse.ts#budget@${sha.slice(0, 7)}`,
    ]);
    t.regex(
      byPath.find.hits[1].via?.[0] ?? '',
      /^commit [0-9a-f]{7} "Cap the fuse"$/
    );
    t.deepEqual(byPath.find.hits[2].via, ['body names src/fuse.ts']);
    t.regex(
      byPath.cards,
      /^find --path src\/fuse\.ts in all Efforts \(3 governing, 3 shown\)\n/
    );
    t.notRegex(byPath.cards, /score|^matched:/m);

    // Words rank the governed set by BM25.
    const worded = await handleEffortFind('frame clock', {
      cwd,
      path: 'src/fuse.ts',
    });
    t.is(worded.find.hits[0].id, text);
    // A folder matches the files under it; a symbol matches #symbol anchors.
    const folder = await handleEffortFind('', { cwd, path: 'src' });
    t.is(folder.find.hits.length, 4);
    const symbol = await handleEffortFind('', { cwd, path: 'budget' });
    t.deepEqual(
      symbol.find.hits.map((hit) => hit.id),
      [decision]
    );
    t.deepEqual(
      (
        await handleEffortFind('', { cwd, path: 'src/fuse.ts#budget' })
      ).find.hits.map((hit) => hit.id),
      [decision, trailer]
    );

    // Served and local print the same, and plain find has no new lines.
    const socket = join(cwd, '.flatbread/proof/serve.sock');
    const server = await serveProofReads(socket);
    t.teardown(() => new Promise((done) => server.close(() => done())));
    for (const args of [
      ['proof', 'find', '--path', 'src/fuse.ts'],
      ['proof', 'find', 'budget', '--path', 'src', '--effort', effort],
    ]) {
      const local = await runCli(cwd, {}, ...args);
      t.is(local.code, 0, local.stderr);
      const remote = await runCli(
        cwd,
        { FLATBREAD_PROOF_SERVER: socket },
        ...args
      );
      t.is(remote.code, 0, remote.stderr);
      t.deepEqual(JSON.parse(remote.stdout), JSON.parse(local.stdout));
    }
    const plain = await handleEffortFind('fuse budget', { cwd });
    t.notRegex(plain.cards, /via:|branch:|CONFLICTS/);
    t.false('path' in plain.find);
    const none = await runCli(cwd, {}, 'proof', 'find');
    t.is(none.code, 1);
    t.regex(JSON.parse(none.stderr).error.message, /at least one word/);
  }
);

test.serial('find --path outside git skips trailers quietly', async (t) => {
  t.timeout(120_000);
  const cwd = await createProject(t, false);
  const write = writer(cwd);
  const effort = await write({ type: 'CreateEffort', title: 'Fuse', body: '' });
  const text = await write({
    type: 'WriteFinding',
    effort,
    title: 'Where the cap lives',
    body: 'The cap is set in src/fuse.ts.',
    kind: 'observation',
  });
  const found = await handleEffortFind('', { cwd, path: 'src/fuse.ts' });
  t.deepEqual(
    found.find.hits.map((hit) => hit.id),
    [text]
  );
  await t.throwsAsync(handleEffortFind('', { cwd, refs: 'all' }), {
    message: /inside a git repository/,
  });
});

test.serial(
  'find --path on a path only a branch has: a plain hint, and --refs reads the branch tree and trailers',
  async (t) => {
    t.timeout(180_000);
    const cwd = await createProject(t);
    const write = writer(cwd);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Net',
      body: '',
    });
    const finding = await write({
      type: 'WriteFinding',
      effort,
      title: 'Peers drop on hotel Wi-Fi',
      body: 'Packets drop.',
      kind: 'measurement',
    });
    await commit(cwd, 'Base graph');
    // A branch that only adds code, tied to the main record by a trailer.
    await git(cwd, 'checkout', '-q', '-b', 'feat/net', 'main');
    await mkdir(join(cwd, 'netcode'), { recursive: true });
    await writeFile(join(cwd, 'netcode/peer.rs'), 'fn open() {}\n');
    await commit(cwd, `Add the peer code\n\nProof: ${finding}`);
    await git(cwd, 'checkout', '-q', 'main');

    // Without --refs: empty cards that say why and name the branch.
    const hinted = await handleEffortFind('', { cwd, path: 'netcode/peer.rs' });
    t.deepEqual(hinted.find.hits, []);
    const note =
      'note: netcode/peer.rs is not in the working tree; feat/net has it. --refs all overlays branches, with their records and commit trailers.';
    t.is(hinted.find.note, note);
    t.true(hinted.cards.split('\n').includes(note), hinted.cards);
    t.true(hinted.summary.endsWith(`; ${note}`), hinted.summary);
    // A bare word a branch holds as a folder gets the hint too.
    t.regex(
      (await handleEffortFind('', { cwd, path: 'netcode' })).cards,
      /\nnote: netcode is not in the working tree; feat\/net has it as a path\./
    );
    const nowhere = await handleEffortFind('', { cwd, path: 'src/gone.ts' });
    t.is(
      nowhere.find.note,
      'note: src/gone.ts is not in the working tree or on any branch. --refs all overlays branches, with their records and commit trailers.'
    );

    // With --refs: the branch tree says netcode is a folder, and the
    // trailer on the branch governs it, though the branch changes no record.
    for (const refs of ['all', ['feat/net']] as const) {
      const found = await handleEffortFind('', {
        cwd,
        path: 'netcode',
        refs: refs === 'all' ? 'all' : [...refs],
      });
      t.is(found.find.path, 'netcode/');
      t.deepEqual(
        found.find.hits.map((hit) => hit.id),
        [finding]
      );
      t.regex(found.find.hits[0].via?.[0] ?? '', /^commit [0-9a-f]{7} "Add/);
      t.is(found.find.note, undefined);
    }
    const missing = await handleEffortFind('', {
      cwd,
      path: 'src/gone.ts',
      refs: ['feat/net'],
    });
    t.is(
      missing.find.note,
      'note: src/gone.ts is not in the working tree or on feat/net; --refs all overlays every branch.'
    );
  }
);

test.serial(
  'find --refs overlays branches without a checkout, tags each card, and lists conflicts',
  async (t) => {
    t.timeout(240_000);
    const cwd = await createProject(t);
    const write = writer(cwd);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Net',
      body: '',
    });
    const question = await write({
      type: 'WriteIssue',
      effort,
      title: 'Which transport carries co-op?',
      body: 'We need one transport for co-op sessions.',
      kind: 'question',
    });
    const proposed = await write({
      type: 'WriteDecision',
      effort,
      title: 'Use TCP for co-op',
      body: 'TCP is simple.',
      derives_from: [question],
    });
    await commit(cwd, 'Base graph');
    const before = await handleEffortFind('transport co-op', { cwd });

    const propose = async (branch: string, title: string) => {
      await git(cwd, 'checkout', '-q', '-b', branch, 'main');
      const id = await write({
        type: 'WriteDecision',
        effort,
        title,
        body: `${title} for the co-op transport.`,
        derives_from: [question],
      });
      await write({ type: 'AcceptDecision', decisionId: id });
      await commit(cwd, title);
      return id;
    };
    const quic = await propose('feat/quic', 'Use QUIC');
    const udp = await propose('feat/udp', 'Use raw UDP');
    await git(cwd, 'checkout', '-q', 'main');
    // A branch merely behind main adds nothing.
    await git(cwd, 'branch', 'stale', 'main');
    await mkdir(join(cwd, '.flatbread/proof'), { recursive: true });
    await writeFile(
      join(cwd, '.flatbread/proof/prs.json'),
      JSON.stringify([
        { number: 3, headRefName: 'feat/quic', isDraft: true, author: 'ana' },
      ])
    );

    // Plain find on the working tree is unchanged by the branches.
    const after = await handleEffortFind('transport co-op', { cwd });
    t.is(after.cards, before.cards);

    const overlay = await handleEffortFind('', { cwd, refs: 'all' });
    t.deepEqual(overlay.find.refs?.map((ref) => ref.name).sort(), [
      'feat/quic',
      'feat/udp',
    ]);
    const branch = Object.fromEntries(
      overlay.find.hits.map((hit) => [hit.id, hit.branch])
    );
    t.is(branch[quic], 'only on feat/quic (draft #3 by ana)');
    t.is(branch[udp], 'only on feat/udp');
    // Refs list newest commit first, and the two commits may share a second.
    t.deepEqual(branch[proposed]?.split('; ').sort(), [
      'differs on feat/quic (draft #3 by ana): proposed vs rejected',
      'differs on feat/udp: proposed vs rejected',
    ]);
    t.deepEqual(overlay.find.conflicts, [
      `two accepted Decisions on question ${question}: ${[quic, udp]
        .sort()
        .map((id) => `${id} (${id === quic ? 'feat/quic' : 'feat/udp'})`)
        .join(', ')}`,
    ]);
    t.regex(overlay.cards, /\nCONFLICTS \(1\)\n- two accepted Decisions/);
    t.regex(overlay.cards, /\nrefs: (?:feat\/quic|feat\/udp)/);

    // Named refs, words, and --effort compose; the base record shows `main`.
    const named = await handleEffortFind('transport', {
      cwd,
      refs: ['feat/udp'],
      effort,
    });
    t.deepEqual(
      named.find.refs?.map((ref) => ref.name),
      ['feat/udp']
    );
    t.is(named.find.hits.find((hit) => hit.id === question)?.branch, 'main');
    t.deepEqual(named.find.conflicts, []);
    t.regex(named.cards, /\nCONFLICTS: none$/);
    await t.throwsAsync(handleEffortFind('x', { cwd, refs: ['nope'] }), {
      message: /Unknown git ref: nope/,
    });

    // --refs composes with --path: a code Citation only on a branch counts.
    await git(cwd, 'checkout', '-q', 'feat/udp');
    const citation = await write({
      type: 'WriteCitation',
      effort,
      title: 'UDP socket code',
      body: 'src/net/udp.ts#open',
      role: 'code',
    });
    const cited = await write({
      type: 'WriteFinding',
      effort,
      title: 'UDP drops on hotel Wi-Fi',
      body: 'Packets drop.',
      kind: 'measurement',
      cites: [citation],
    });
    await commit(cwd, 'Cite the UDP code');
    await git(cwd, 'checkout', '-q', 'main');
    const both = await handleEffortFind('', {
      cwd,
      path: 'src/net/udp.ts',
      refs: 'all',
    });
    t.deepEqual(
      both.find.hits.map((hit) => [hit.id, hit.branch]),
      [[cited, 'only on feat/udp']]
    );
    t.deepEqual(
      (await handleEffortFind('', { cwd, path: 'src/net/udp.ts' })).find.hits,
      []
    );

    // Served and local print the same.
    const socket = join(cwd, '.flatbread/proof/serve.sock');
    const server = await serveProofReads(socket);
    t.teardown(() => new Promise((done) => server.close(() => done())));
    for (const args of [
      ['proof', 'find', '--refs', 'all'],
      ['proof', 'find', 'transport', '--refs', 'feat/quic,feat/udp', '--all'],
      ['proof', 'find', '--path', 'src/net', '--refs', 'all'],
    ]) {
      const local = await runCli(cwd, {}, ...args);
      t.is(local.code, 0, local.stderr);
      const remote = await runCli(
        cwd,
        { FLATBREAD_PROOF_SERVER: socket },
        ...args
      );
      t.is(remote.code, 0, remote.stderr);
      t.deepEqual(JSON.parse(remote.stdout), JSON.parse(local.stdout));
    }
    const branches = await runCli(cwd, {}, 'proof', 'branches');
    t.is(branches.code, 0, branches.stderr);
    t.deepEqual(
      JSON.parse(branches.stdout)
        .refs.map((ref: { name: string }) => ref.name)
        .sort(),
      ['feat/quic', 'feat/udp']
    );
  }
);

test.serial(
  'find --refs: ResolveIssue rivals conflict; an older ref and a squash-merged branch do not',
  async (t) => {
    t.timeout(240_000);
    const cwd = await createProject(t);
    const write = writer(cwd);
    const effort = await write({
      type: 'CreateEffort',
      title: 'Net',
      body: '',
    });
    const question = await write({
      type: 'WriteIssue',
      effort,
      title: 'How many frames of input delay?',
      body: 'Pick the delay.',
      kind: 'question',
    });
    await commit(cwd, 'Base graph');
    // Each branch answers through ResolveIssue, with no derives_from.
    const answer = async (branch: string, frames: number) => {
      await git(cwd, 'checkout', '-q', '-b', branch, 'main');
      const id = await write({
        type: 'WriteDecision',
        effort,
        title: `Use ${frames} frames`,
        body: `${frames} frames of delay.`,
      });
      await write({ type: 'AcceptDecision', decisionId: id });
      await write({
        type: 'ResolveIssue',
        issueId: question,
        resolution: 'resolved',
        resolvedBy: [id],
      });
      await commit(cwd, `Use ${frames} frames`);
      return id;
    };
    const two = await answer('feat/d2', 2);
    const four = await answer('feat/d4', 4);
    // origin/feat/d4 stands one commit behind feat/d4: it holds a Decision
    // that feat/d4 then accepts.
    const later = await write({
      type: 'WriteDecision',
      effort,
      title: 'Use a jitter buffer',
      body: 'Buffer.',
    });
    await commit(cwd, 'Propose a jitter buffer');
    await git(cwd, 'remote', 'add', 'origin', 'https://example.invalid/r.git');
    await git(cwd, 'update-ref', 'refs/remotes/origin/feat/d4', 'HEAD');
    await write({ type: 'AcceptDecision', decisionId: later });
    await commit(cwd, 'Accept the jitter buffer');
    await git(cwd, 'checkout', '-q', 'main');

    const overlay = await handleEffortFind('', { cwd, refs: 'all' });
    t.deepEqual(overlay.find.conflicts, [
      `two accepted Decisions on question ${question}: ${[two, four]
        .sort()
        .map((id) => `${id} (${id === two ? 'feat/d2' : 'feat/d4'})`)
        .join(', ')}`,
    ]);
    const branch = Object.fromEntries(
      overlay.find.hits.map((hit) => [hit.id, hit.branch])
    );
    t.is(branch[later], 'only on feat/d4');
    t.regex(overlay.cards, new RegExp(`in: resolves ${question}`));
    // origin/feat/d4, which feat/d4 contains, is left out.
    t.deepEqual(overlay.find.refs?.map((ref) => ref.name).sort(), [
      'feat/d2',
      'feat/d4',
    ]);

    // Squash-merge feat/d2, then supersede its Decision on main: the
    // branch left behind is merged, not a rival.
    await git(cwd, 'merge', '-q', '--squash', 'feat/d2');
    await commit(cwd, 'Squash feat/d2');
    const three = await write({
      type: 'WriteDecision',
      effort,
      title: 'Use 3 frames',
      body: '3 frames of delay.',
    });
    await write({ type: 'Supersede', supersederId: three, targetId: two });
    await commit(cwd, 'Use 3 frames');
    const merged = await handleEffortFind('', { cwd, refs: 'all' });
    t.false(merged.find.refs?.some((ref) => ref.name === 'feat/d2'));
    // What is left is real: main resolved the question with the squashed
    // Decision, and feat/d4 resolves it with its own.
    t.deepEqual(merged.find.conflicts, [
      `${question} resolved differently: by ${two} on base; by ${four} on feat/d4`,
    ]);
  }
);
