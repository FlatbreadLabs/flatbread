import test from 'ava';
import { spawn } from 'node:child_process';
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
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { proofContent } from '@flatbread/proof';
import { proofContent as publicProofContent } from '../index.js';
import {
  ProofDanglingRelationError,
  ProofValidationError,
  serializeDocument,
} from '@flatbread/proof';
import {
  handleEffortBlockingDecisions,
  handleEffortBootstrap,
  handleEffortGet,
  handleEffortList,
  handleEffortRecords,
  handleEffortRelations,
  handleEffortWrite,
  inspectEffortBootstrap,
  mapEffortCliOptions,
} from './proof.js';

type TeardownContext = {
  teardown(callback: () => void | Promise<void>): void;
};

const repositoryNodeModules = fileURLToPath(
  new URL('../../../../node_modules/', import.meta.url)
);

async function createTempProject(
  prefix: string,
  t: TeardownContext
): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), prefix));
  const nodeModules = join(cwd, 'node_modules');
  await symlink(repositoryNodeModules, nodeModules, 'junction');
  t.teardown(async () => {
    if ((await lstat(nodeModules).catch(() => null))?.isSymbolicLink()) {
      await unlink(nodeModules);
    }
    await rm(cwd, { recursive: true, force: true });
  });
  return cwd;
}

function runCli(
  cwd: string,
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
      { cwd }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('public flatbread facade exposes the Proof preset', (t) => {
  t.deepEqual(publicProofContent(), proofContent());
});

test.serial(
  'spawned CLI emits JSON bootstrap errors without traces',
  async (t) => {
    const cwd = await createTempProject('flatbread-bootstrap-process-', t);
    const result = await runCli(cwd, 'proof', 'bootstrap', '--verify');
    t.not(result.code, 0);
    t.is(JSON.parse(result.stdout).status, 'action_required');
    t.is(result.stderr, '');
  }
);

test.serial(
  'spawned CLI emits typed JSON validation errors without traces',
  async (t) => {
    for (const args of [
      ['proof', 'list', '--status', 'invalid'],
      ['proof', 'list', '--limit', '0'],
      ['proof', 'list', '--strict-min-generation', '1.5'],
    ]) {
      const result = await runCli(process.cwd(), ...args);
      t.not(result.code, 0);
      const payload = JSON.parse(result.stderr);
      t.regex(payload.error.code, /^PROOF_INVALID_/);
      t.false(result.stderr.includes(' at '));
      t.is(result.stdout, '');
    }
  }
);

test.serial('maps sade kebab-case effort options to handler options', (t) => {
  t.deepEqual(
    mapEffortCliOptions({
      'strict-min-generation': 53,
      'timeout-ms': '1250',
    }),
    {
      strictMinGeneration: '53',
      timeoutMs: 1250,
    }
  );
});

test.serial(
  'effort handlers write and read the configured graph root',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-cli-', t);
    for (const directory of [
      'efforts',
      'issues',
      'findings',
      'decisions',
      'constraints',
      'risks',
      'citations',
      'blobs',
    ])
      await mkdir(join(cwd, '.flatbread-proof', directory), {
        recursive: true,
      });
    await writeFile(
      join(cwd, 'flatbread.config.js'),
      `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default {
  source: source(),
  transformer: transformer(),
  content: proofContent(${JSON.stringify(
    relative(cwd, join(cwd, '.flatbread-proof'))
  )}),
};`
    );
    const effort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'E', body: '' }),
      { cwd }
    );
    const effortId = effort.artifacts[0].id;
    const issue = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteIssue',
        effort: effortId,
        title: 'Blocker',
        body: '',
        kind: 'blocker',
      }),
      { cwd }
    );
    const pausedStatus = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effortId,
        title: 'D',
        body: '',
        derives_from: [issue.artifacts[0].id],
      }),
      { cwd }
    );
    const ordinary = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteIssue',
        effort: effortId,
        title: 'Ordinary',
        body: '',
        kind: 'question',
      }),
      { cwd }
    );
    const excluded = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effortId,
        title: 'Excluded',
        body: '',
        derives_from: [ordinary.artifacts[0].id],
      }),
      { cwd }
    );
    const otherEffort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Other', body: '' }),
      { cwd }
    );
    const foreign = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: otherEffort.artifacts[0].id,
        title: 'Foreign',
        body: '',
      }),
      { cwd }
    );
    const envelope = await handleEffortBlockingDecisions(effortId, {
      cwd,
      strictMinGeneration: '7',
    });
    t.is(envelope.served_generation, '7');
    t.truthy(await readFile(envelope.artifact_path, 'utf8'));
    t.is(envelope.page.returned, 1);
    const digest = await readFile(envelope.artifact_path, 'utf8');
    t.true(digest.includes(issue.artifacts[0].id));
    t.false(digest.includes(excluded.artifacts[0].id));
    t.false(digest.includes(foreign.artifacts[0].id));
  }
);

test.serial(
  'engine-backed get returns an empty eventual envelope for a missing record',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-get-', t);
    for (const directory of [
      'efforts',
      'issues',
      'findings',
      'decisions',
      'constraints',
      'risks',
      'citations',
      'blobs',
    ])
      await mkdir(join(cwd, '.flatbread-proof', directory), {
        recursive: true,
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
    const result = await handleEffortGet('dec-missing--0123456789abcdef', {
      cwd,
    });
    t.is(result.page.returned, 0);
    t.is(result.consistency.mode, 'eventual');
  }
);

test.serial(
  'effort get digests include the full body while records digests stay excerpted',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-get-full-', t);
    for (const directory of [
      'efforts',
      'issues',
      'findings',
      'decisions',
      'constraints',
      'risks',
      'citations',
      'blobs',
    ])
      await mkdir(join(cwd, '.flatbread-proof', directory), {
        recursive: true,
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
    const longBody = [
      '## Context',
      ...Array.from({ length: 20 }, (_, i) => `Context line ${i}.`),
      '',
      '## Decision',
      'Ship full-body get digests.',
      '',
      '## Reversal criteria',
      'If get digests truncate normal Decision bodies again.',
    ].join('\n');
    const effort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Full body', body: '' }),
      { cwd }
    );
    const decision = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effort.artifacts[0].id,
        title: 'Full body decision',
        body: longBody,
      }),
      { cwd }
    );
    const getEnvelope = await handleEffortGet(decision.artifacts[0].id, {
      cwd,
    });
    const getDigest = await readFile(getEnvelope.artifact_path, 'utf8');
    t.true(getDigest.includes('## Reversal criteria'));
    t.true(getDigest.includes('Context line 19.'));
    t.false(getDigest.includes('[…truncated]'));

    const recordsEnvelope = await handleEffortRecords(effort.artifacts[0].id, {
      cwd,
      kinds: ['decision'],
    });
    const recordsDigest = await readFile(recordsEnvelope.artifact_path, 'utf8');
    t.true(recordsDigest.includes('[…truncated]'));
    t.false(recordsDigest.includes('Context line 19.'));
  }
);

test.serial(
  'effort list defaults to active and supports explicit statuses and cursors',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-list-', t);
    for (const directory of [
      'efforts',
      'issues',
      'findings',
      'decisions',
      'constraints',
      'risks',
      'citations',
      'blobs',
    ])
      await mkdir(join(cwd, '.flatbread-proof', directory), {
        recursive: true,
      });
    await writeFile(
      join(cwd, 'flatbread.config.js'),
      `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default { source: source(), transformer: transformer(), content: proofContent() };`
    );
    const active = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Active', body: '' }),
      { cwd }
    );
    const paused = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Paused', body: '' }),
      { cwd }
    );
    const pausedStatus = await handleEffortWrite(
      JSON.stringify({
        type: 'SetEffortStatus',
        effortId: paused.artifacts[0].id,
        status: 'paused',
      }),
      { cwd }
    );
    const defaults = await handleEffortList({ cwd, limit: 1 });
    t.is(defaults.page.returned, 1);
    const defaultDigest = await readFile(defaults.artifact_path, 'utf8');
    t.true(defaultDigest.includes(active.artifacts[0].id));
    t.false(defaultDigest.includes(paused.artifacts[0].id));
    const explicit = await handleEffortList({
      cwd,
      status: ['paused'],
    });
    t.is(explicit.page.returned, 1);
    t.true(
      (await readFile(explicit.artifact_path, 'utf8')).includes(
        paused.artifacts[0].id
      )
    );
    await t.throwsAsync(() => handleEffortList({ cwd, status: ['invalid'] }), {
      message: /Invalid effort status: invalid/,
    });
    const firstPage = await handleEffortList({
      cwd,
      limit: 1,
      status: ['active', 'paused'],
    });
    t.truthy(firstPage.page.next_cursor);
    const secondPage = await handleEffortList({
      cwd,
      limit: 1,
      cursor: firstPage.page.next_cursor ?? undefined,
      status: ['active', 'paused'],
    });
    t.is(secondPage.page.returned, 1);
    t.not(firstPage.artifact_path, secondPage.artifact_path);
    const firstDigest = await readFile(firstPage.artifact_path, 'utf8');
    const secondDigest = await readFile(secondPage.artifact_path, 'utf8');
    t.not(firstDigest, secondDigest);
    t.not(
      firstDigest.includes(active.artifacts[0].id),
      secondDigest.includes(active.artifacts[0].id)
    );
    t.not(
      firstDigest.includes(paused.artifacts[0].id),
      secondDigest.includes(paused.artifacts[0].id)
    );
    const strict = await handleEffortList({
      cwd,
      status: ['active'],
      strictMinGeneration: pausedStatus.generation,
    });
    t.is(strict.served_generation, pausedStatus.generation);
    t.truthy(active.artifacts[0].id);
  }
);

test.serial(
  'bootstrap reports missing config and preserves missing-preset config bytes',
  async (t) => {
    const missing = await createTempProject('flatbread-bootstrap-missing-', t);
    const missingReport = await inspectEffortBootstrap(missing);
    t.is(missingReport.status, 'action_required');
    t.is(missingReport.config_path, null);
    const cwd = await createTempProject('flatbread-bootstrap-preset-', t);
    const configPath = join(cwd, 'flatbread.config.js');
    const config = `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
export default { source: source(), transformer: transformer(), content: [{ collection: 'Post', path: 'content' }] };`;
    await writeFile(configPath, config);
    const report = await inspectEffortBootstrap(cwd);
    t.is(report.requirements[0]?.code, 'EFFORT_BOOTSTRAP_PRESET_MISSING');
    t.is(await readFile(configPath, 'utf8'), config);
  }
);

test.serial(
  'effort handlers wire Blob, Citation cites, records browse, get, and relations',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-citation-blob-', t);
    for (const directory of [
      'efforts',
      'issues',
      'findings',
      'decisions',
      'constraints',
      'risks',
      'citations',
      'blobs',
    ])
      await mkdir(join(cwd, '.flatbread-proof', directory), {
        recursive: true,
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
    const effort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Cite chain', body: '' }),
      { cwd }
    );
    const effortId = effort.artifacts[0].id;
    await t.throwsAsync(
      () =>
        handleEffortWrite(
          JSON.stringify({
            type: 'WriteCitation',
            effort: effortId,
            title: 'Invalid source',
            body: 'https://example.com/invalid',
            cites: ['cit-paper--0123456789abcdef'],
          }),
          { cwd }
        ),
      { message: /Unrecognized key\(s\) in object: 'cites'/ }
    );
    await t.throwsAsync(
      () =>
        handleEffortWrite(
          JSON.stringify({
            type: 'CreateEffort',
            title: 'Invalid',
            body: '',
            cites: ['cit-paper--0123456789abcdef'],
          }),
          { cwd }
        ),
      {
        instanceOf: ProofValidationError,
        message: /CreateEffort does not accept cites/,
      }
    );
    const otherEffort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Other', body: '' }),
      { cwd }
    );
    const blobBody = '# longform research payload\n\nDetailed content here.\n';
    const blob = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteBlob',
        effort: effortId,
        title: 'Payload',
        body: blobBody,
        kind: 'markdown',
      }),
      { cwd }
    );
    const blobId = blob.artifacts[0].id;
    const foreignBlob = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteBlob',
        effort: otherEffort.artifacts[0].id,
        title: 'Foreign payload',
        body: '',
      }),
      { cwd }
    );
    await t.throwsAsync(
      () =>
        handleEffortWrite(
          JSON.stringify({
            type: 'WriteCitation',
            effort: effortId,
            title: 'Invalid source',
            body: 'https://example.com/invalid',
            blob: foreignBlob.artifacts[0].id,
          }),
          { cwd }
        ),
      {
        instanceOf: ProofValidationError,
        message: new RegExp(
          `Citation\\.blob ${foreignBlob.artifacts[0].id} belongs to a different effort`
        ),
      }
    );
    const citation = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteCitation',
        effort: effortId,
        title: 'Paper',
        body: 'https://example.com/paper',
        role: 'evidence',
        blob: blobId,
      }),
      { cwd }
    );
    const citationId = citation.artifacts[0].id;
    const finding = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteFinding',
        effort: effortId,
        title: 'Measured',
        body: 'short',
        kind: 'measurement',
        cites: [citationId],
      }),
      { cwd }
    );
    const findingId = finding.artifacts[0].id;
    const foreignCitation = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteCitation',
        effort: otherEffort.artifacts[0].id,
        title: 'Foreign',
        body: 'https://example.com/foreign',
      }),
      { cwd }
    );
    await t.throwsAsync(
      () =>
        handleEffortWrite(
          JSON.stringify({
            type: 'WriteFinding',
            effort: effortId,
            title: 'Bad cite',
            body: '',
            kind: 'measurement',
            cites: [foreignCitation.artifacts[0].id],
          }),
          { cwd }
        ),
      {
        instanceOf: ProofValidationError,
        message: new RegExp(
          `cites target ${foreignCitation.artifacts[0].id} belongs to a different effort`
        ),
      }
    );
    await t.throwsAsync(
      () =>
        handleEffortRelations(effortId, foreignCitation.artifacts[0].id, {
          cwd,
          relations: ['cites'],
        }),
      {
        message: new RegExp(
          `Record ${foreignCitation.artifacts[0].id} does not exist in effort ${effortId}`
        ),
      }
    );

    const browse = await handleEffortRecords(effortId, { cwd });
    const browseDigest = await readFile(browse.artifact_path, 'utf8');
    t.is(browse.page.returned, 2);
    t.true(browseDigest.includes(citationId));
    t.true(browseDigest.includes(findingId));
    t.false(browseDigest.includes(`### ${blobId}`));
    t.false(browseDigest.includes('longform research payload'));

    const explicitBlob = await handleEffortRecords(effortId, {
      cwd,
      kinds: ['blob'],
    });
    const blobBrowseDigest = await readFile(explicitBlob.artifact_path, 'utf8');
    t.true(blobBrowseDigest.includes(blobId));
    t.true(blobBrowseDigest.includes('Blob body omitted from bounded digests'));
    t.false(blobBrowseDigest.includes('Detailed content here.'));

    const blobGet = await handleEffortGet(blobId, { cwd });
    const blobGetDigest = await readFile(blobGet.artifact_path, 'utf8');
    t.true(blobGetDigest.includes('longform research payload'));
    t.true(blobGetDigest.includes('Detailed content here.'));
    t.false(blobGetDigest.includes('Blob body omitted from bounded digests'));

    const citesRelations = await handleEffortRelations(effortId, findingId, {
      cwd,
      relations: ['cites'],
    });
    const citesDigest = await readFile(citesRelations.artifact_path, 'utf8');
    t.is(citesRelations.page.returned, 1);
    t.true(citesDigest.includes(`### ${citationId}`));
    t.false(citesDigest.includes(`### ${blobId}`));

    const effortRelations = await handleEffortRelations(effortId, effortId, {
      cwd,
      relations: ['cites'],
    });
    t.is(effortRelations.page.returned, 0);
  }
);

test.serial(
  'a strict read of a sparse Proof succeeds without pre-created collection directories',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-sparse-', t);
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
    const effort = await handleEffortWrite(
      JSON.stringify({
        type: 'CreateEffort',
        title: 'Critical path',
        body: 'Exercise storage and consistency.',
      }),
      { cwd }
    );
    const effortId = effort.artifacts[0].id;
    const issue = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteIssue',
        effort: effortId,
        title: 'Need a decision',
        body: 'A blocker for the strict-read path.',
        kind: 'blocker',
      }),
      { cwd }
    );

    // Writes create only the directories they touch, and Git cannot store an
    // empty directory, so a fresh clone always reads a sparse graph.
    t.is(
      await lstat(join(cwd, '.flatbread-proof', 'findings')).catch(() => null),
      null
    );

    const result = await runCli(
      cwd,
      'proof',
      'records',
      effortId,
      '--kinds',
      'issue',
      '--strict-min-generation',
      issue.generation,
      '--timeout-ms',
      '3000'
    );
    t.is(result.code, 0);
    t.is(result.stderr, '');
    t.is(JSON.parse(result.stdout).page.returned, 1);
  }
);

test.serial(
  'a dangling derives_from is rejected on write and reported on read',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-dangling-', t);
    // Create every collection directory so this case turns only on relation
    // integrity, not on how a sparse graph reads.
    for (const directory of [
      'efforts',
      'issues',
      'findings',
      'decisions',
      'constraints',
      'risks',
      'citations',
      'blobs',
    ])
      await mkdir(join(cwd, '.flatbread-proof', directory), {
        recursive: true,
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
    const effort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Provenance', body: '' }),
      { cwd }
    );
    const effortId = effort.artifacts[0].id;
    const missingId = 'fnd-does-not-exist--0000000000000000';

    await t.throwsAsync(
      () =>
        handleEffortWrite(
          JSON.stringify({
            type: 'WriteDecision',
            effort: effortId,
            title: 'Dangling derives-from',
            body: 'This must have failed closed.',
            derives_from: [missingId],
          }),
          { cwd }
        ),
      {
        instanceOf: ProofValidationError,
        message: new RegExp(`Unknown artifact ${missingId}`),
      }
    );
    // The rejected write leaves the durable generation where the Effort left it.
    t.is(
      JSON.parse(
        await readFile(
          join(cwd, '.flatbread-proof', '.journal', 'generation.json'),
          'utf8'
        )
      ).generation,
      Number(effort.generation)
    );

    // Legacy or hand-edited data can still hold a dangling edge. Recall must say
    // so rather than return provenance that dropped the edge in silence.
    const decisionId = 'dec-legacy--0000000000000000';
    await writeFile(
      join(cwd, '.flatbread-proof', 'decisions', `${decisionId}.md`),
      serializeDocument('Written before its evidence existed.', {
        id: decisionId,
        effort: effortId,
        title: 'Legacy decision',
        created_at: '2025-01-01T00:00:00.000Z',
        state: 'proposed',
        derives_from: [missingId],
      })
    );
    const error = await t.throwsAsync<ProofDanglingRelationError>(
      () =>
        handleEffortRelations(effortId, decisionId, {
          cwd,
          relations: ['derives_from'],
        }),
      { instanceOf: ProofDanglingRelationError }
    );
    t.deepEqual(error?.shape, {
      error: {
        code: 'PROOF_DANGLING_RELATION',
        message: `Record ${decisionId} stores relation targets that do not exist: derives_from -> ${missingId}`,
        from_id: decisionId,
        edges: [{ relation: 'derives_from', to_id: missingId }],
      },
    });
    const result = await runCli(
      cwd,
      'proof',
      'relations',
      effortId,
      decisionId,
      '--relations',
      'derives_from'
    );
    t.is(result.code, 1);
    t.is(result.stdout, '');
    t.deepEqual(JSON.parse(result.stderr), error?.shape);
    t.false(result.stderr.includes(' at '));
  }
);

test.serial(
  'bootstrap detects a ready custom root and verify returns action-required JSON state',
  async (t) => {
    const cwd = await createTempProject('flatbread-bootstrap-ready-', t);
    await writeFile(
      join(cwd, 'flatbread.config.js'),
      `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default { source: source(), transformer: transformer(), content: proofContent('memory/graph') };`
    );
    await writeFile(
      join(cwd, '.gitignore'),
      '**/memory/graph/.journal/\n**/.flatbread/proof/read-cache/\n'
    );
    const ready = await inspectEffortBootstrap(cwd);
    t.deepEqual(ready, {
      status: 'ready',
      config_path: 'flatbread.config.js',
      graph_root: 'memory/graph',
      requirements: [],
    });
    const previous = process.exitCode;
    process.exitCode = undefined;
    const action = await handleEffortBootstrap({
      cwd: await createTempProject('flatbread-bootstrap-verify-', t),
      verify: true,
    });
    t.is(action.status, 'action_required');
    t.true(process.exitCode === 1);
    process.exitCode = previous;
  }
);
