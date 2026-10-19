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
  ProofCrossEffortRelationError,
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
  handleEffortBrief,
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
  'spawned CLI exposes complete, paged, byte-, and edge-capped reads',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-completeness-', t);
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
    const firstEffort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'First', body: '' }),
      { cwd }
    );
    await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Second', body: '' }),
      { cwd }
    );
    const blob = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteBlob',
        effort: firstEffort.artifacts[0].id,
        title: 'Large payload',
        body: 'x'.repeat(70 * 1024),
        kind: 'markdown',
      }),
      { cwd }
    );
    const effortId = firstEffort.artifacts[0].id;
    const citationIds = Array.from(
      { length: 51 },
      (_, index) =>
        `cit-edge-${String(index).padStart(2, '0')}--0123456789abcdef`
    );
    const findingId = 'fnd-edge-source--0123456789abcdef';
    await mkdir(join(cwd, '.flatbread-proof', 'citations'), {
      recursive: true,
    });
    await mkdir(join(cwd, '.flatbread-proof', 'findings'), {
      recursive: true,
    });
    await Promise.all(
      citationIds.map((id, index) =>
        writeFile(
          join(cwd, '.flatbread-proof', 'citations', `${id}.md`),
          serializeDocument(`https://example.com/${index}`, {
            id,
            effort: effortId,
            title: `Edge ${index}`,
            created_at: `2025-01-01T00:00:${String(index).padStart(
              2,
              '0'
            )}.000Z`,
            role: 'evidence',
          })
        )
      )
    );
    await writeFile(
      join(cwd, '.flatbread-proof', 'findings', `${findingId}.md`),
      serializeDocument('', {
        id: findingId,
        effort: effortId,
        title: 'Edge source',
        created_at: '2025-01-01T00:01:00.000Z',
        kind: 'measurement',
        cites: citationIds,
      })
    );

    const completeResult = await runCli(
      cwd,
      'proof',
      'get',
      firstEffort.artifacts[0].id
    );
    t.is(completeResult.code, 0);
    const complete = JSON.parse(completeResult.stdout);
    t.true(complete.complete);
    t.deepEqual(complete.cap_reasons, []);

    const pagedResult = await runCli(cwd, 'proof', 'list', '--limit', '1');
    t.is(pagedResult.code, 0);
    const paged = JSON.parse(pagedResult.stdout);
    t.false(paged.complete);
    t.deepEqual(paged.cap_reasons, []);
    t.true(paged.page.has_more);
    t.truthy(paged.page.next_cursor);

    const cappedResult = await runCli(
      cwd,
      'proof',
      'get',
      blob.artifacts[0].id
    );
    t.is(cappedResult.code, 0);
    const capped = JSON.parse(cappedResult.stdout);
    t.false(capped.complete);
    t.deepEqual(capped.cap_reasons, ['bytes']);
    t.false(capped.page.has_more);
    t.is(capped.page.next_cursor, null);

    const edgeResult = await runCli(
      cwd,
      'proof',
      'relations',
      effortId,
      findingId,
      '--relations',
      'cites'
    );
    t.is(edgeResult.code, 0);
    const edgeCapped = JSON.parse(edgeResult.stdout);
    t.false(edgeCapped.complete);
    t.deepEqual(edgeCapped.cap_reasons, ['displayed_edges']);
    t.true(edgeCapped.page.has_more);
    t.truthy(edgeCapped.page.next_cursor);
    t.true(edgeCapped.summary.includes('displayed_edges'));
    t.true(edgeCapped.summary.includes('pagination'));
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
    const getResult = await handleEffortGet(decisionId, { cwd });
    t.true(
      (await readFile(getResult.artifact_path, 'utf8')).includes(
        'Written before its evidence existed.'
      )
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
  'foreign causal references page without expanding target bodies',
  async (t) => {
    const cwd = await createTempProject('flatbread-foreign-causal-pages-', t);
    await writeFile(
      join(cwd, 'flatbread.config.js'),
      `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default { source: source(), transformer: transformer(), content: proofContent('.flatbread-proof') };`
    );
    const domain = (
      await handleEffortWrite(
        JSON.stringify({ type: 'CreateEffort', title: 'Domain', body: '' }),
        { cwd }
      )
    ).artifacts[0].id;
    const feature = (
      await handleEffortWrite(
        JSON.stringify({ type: 'CreateEffort', title: 'Feature', body: '' }),
        { cwd }
      )
    ).artifacts[0].id;
    const causes: string[] = [];
    for (let i = 0; i < 26; i++) {
      const result = await handleEffortWrite(
        JSON.stringify({
          type: 'WriteFinding',
          effort: domain,
          title: `Cause ${i}`,
          body: `foreign body ${i}`,
          kind: 'measurement',
        }),
        { cwd }
      );
      causes.push(result.artifacts[0].id);
    }
    const decision = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: feature,
        title: 'Feature choice',
        body: '',
        derives_from: causes,
      }),
      { cwd }
    );
    const fromId = decision.artifacts[0].id;
    const first = await handleEffortRelations(feature, fromId, {
      cwd,
      relations: ['derives_from'],
      limit: 25,
      strictMinGeneration: decision.generation,
    });
    t.is(first.page.returned, 25);
    t.true(first.page.has_more);
    const firstDigest = await readFile(first.artifact_path, 'utf8');
    t.is((firstDigest.match(/^- foreign derives_from/gm) ?? []).length, 25);
    t.false(firstDigest.includes('foreign body'));
    const got = await handleEffortGet(fromId, {
      cwd,
      strictMinGeneration: decision.generation,
    });
    const getDigest = await readFile(got.artifact_path, 'utf8');
    t.is((getDigest.match(/^foreign derives_from/gm) ?? []).length, 25);
    t.true(
      getDigest.includes(
        '1 more foreign references; use proof relations to page through them'
      )
    );
    t.false(getDigest.includes('foreign body'));
    const second = await handleEffortRelations(feature, fromId, {
      cwd,
      relations: ['derives_from'],
      limit: 25,
      cursor: first.page.next_cursor ?? undefined,
      strictMinGeneration: decision.generation,
    });
    t.is(second.page.returned, 1);
    t.false(second.page.has_more);
    t.is(
      (
        (await readFile(second.artifact_path, 'utf8')).match(
          /^- foreign derives_from/gm
        ) ?? []
      ).length,
      1
    );
  }
);
test.serial(
  'cross-Effort causal links read as checkpoints while state edges fail closed',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-cross-edge-', t);
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
    const effortA = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Effort A', body: '' }),
      { cwd }
    );
    const effortB = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Effort B', body: '' }),
      { cwd }
    );
    const effortAId = effortA.artifacts[0].id;
    const effortBId = effortB.artifacts[0].id;
    const findingA = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteFinding',
        effort: effortAId,
        title: 'Finding A',
        body: '',
        kind: 'measurement',
      }),
      { cwd }
    );
    const findingAId = findingA.artifacts[0].id;
    const decisionA = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effortAId,
        title: 'Decision A',
        body: '',
      }),
      { cwd }
    );
    const decisionAId = decisionA.artifacts[0].id;
    await handleEffortWrite(
      JSON.stringify({
        type: 'AcceptDecision',
        decisionId: decisionAId,
        rejectSiblings: false,
      }),
      { cwd }
    );

    const ownEffortDecision = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effortBId,
        title: 'Own Effort context',
        body: '',
        derives_from: [effortBId],
      }),
      { cwd }
    );
    const ownEffortRead = await handleEffortRelations(
      effortBId,
      ownEffortDecision.artifacts[0].id,
      {
        cwd,
        relations: ['derives_from'],
        strictMinGeneration: ownEffortDecision.generation,
      }
    );
    t.is(ownEffortRead.page.returned, 1);

    const decisionB = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effortBId,
        title: 'Decision B',
        body: '',
      }),
      { cwd }
    );
    const decisionBId = decisionB.artifacts[0].id;
    const crossDerive = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effortBId,
        title: 'Cross derive',
        body: '',
        derives_from: [decisionAId],
      }),
      { cwd }
    );
    t.is(crossDerive.touched.length, 1);
    const crossDeriveId = crossDerive.artifacts[0].id;
    const causalRead = await handleEffortRelations(effortBId, crossDeriveId, {
      cwd,
      relations: ['derives_from'],
      strictMinGeneration: crossDerive.generation,
    });
    t.is(causalRead.page.returned, 1);
    t.true(causalRead.complete);
    const checkpoint = `foreign derives_from -> ${decisionAId} (decision; effort ${effortAId}; state accepted)`;
    const causalDigest = await readFile(causalRead.artifact_path, 'utf8');
    t.true(causalDigest.includes(checkpoint));
    t.false(causalDigest.includes('### ' + decisionAId));
    const recordRead = await handleEffortGet(crossDeriveId, {
      cwd,
      strictMinGeneration: crossDerive.generation,
    });
    t.true(
      (await readFile(recordRead.artifact_path, 'utf8')).includes(checkpoint)
    );
    const rejectedWrites = [
      {
        relation: 'supersedes',
        input: {
          type: 'WriteDecision',
          effort: effortBId,
          title: 'Cross supersede',
          body: '',
          supersedes: [decisionAId],
        },
      },
      {
        relation: 'invalidates',
        input: {
          type: 'WriteDecision',
          effort: effortBId,
          title: 'Cross invalidate',
          body: '',
          invalidates: [decisionAId],
        },
      },
    ];
    for (const attempt of rejectedWrites)
      await t.throwsAsync(
        () => handleEffortWrite(JSON.stringify(attempt.input), { cwd }),
        {
          instanceOf: ProofValidationError,
          message: `${attempt.relation} target ${
            attempt.relation === 'derives_from' ? findingAId : decisionAId
          } belongs to a different effort`,
        }
      );
    t.is(
      JSON.parse(
        await readFile(
          join(cwd, '.flatbread-proof', '.journal', 'generation.json'),
          'utf8'
        )
      ).generation,
      Number(crossDerive.generation)
    );

    await writeFile(
      join(cwd, '.flatbread-proof', 'decisions', `${decisionBId}.md`),
      serializeDocument('Legacy foreign edges.', {
        id: decisionBId,
        effort: effortBId,
        title: 'Decision B',
        created_at: '2025-01-02T00:00:00.000Z',
        state: 'proposed',
        derives_from: [findingAId],
        supersedes: [decisionAId],
        invalidates: [decisionAId],
      })
    );
    await writeFile(
      join(cwd, '.flatbread-proof', 'decisions', `${decisionAId}.md`),
      serializeDocument('Legacy reverse edges.', {
        id: decisionAId,
        effort: effortAId,
        title: 'Decision A',
        created_at: '2025-01-01T00:00:00.000Z',
        state: 'proposed',
        superseded_by: [decisionBId],
        invalidated_by: [decisionBId],
      })
    );

    const forwardEdges = [
      {
        relation: 'supersedes',
        to_id: decisionAId,
        target_effort_id: effortAId,
      },
      {
        relation: 'invalidates',
        to_id: decisionAId,
        target_effort_id: effortAId,
      },
    ];
    const forwardError = await t.throwsAsync<ProofCrossEffortRelationError>(
      () =>
        handleEffortRelations(effortBId, decisionBId, {
          cwd,
          relations: ['supersedes', 'invalidates'],
          strictMinGeneration: decisionB.generation,
        }),
      { instanceOf: ProofCrossEffortRelationError }
    );
    t.deepEqual(forwardError?.shape, {
      error: {
        code: 'PROOF_CROSS_EFFORT_RELATION',
        message: `Record ${decisionBId} in effort ${effortBId} stores relation targets outside that effort: supersedes -> ${decisionAId} (effort ${effortAId}), invalidates -> ${decisionAId} (effort ${effortAId})`,
        effort_id: effortBId,
        from_id: decisionBId,
        edges: forwardEdges,
      },
    });

    const reverseEdges = [
      {
        relation: 'superseded_by',
        to_id: decisionBId,
        target_effort_id: effortBId,
      },
      {
        relation: 'invalidated_by',
        to_id: decisionBId,
        target_effort_id: effortBId,
      },
    ];
    const reverseError = await t.throwsAsync<ProofCrossEffortRelationError>(
      () =>
        handleEffortRelations(effortAId, decisionAId, {
          cwd,
          relations: ['superseded_by', 'invalidated_by'],
          strictMinGeneration: decisionB.generation,
        }),
      { instanceOf: ProofCrossEffortRelationError }
    );
    t.deepEqual(reverseError?.shape.error.edges, reverseEdges);

    const result = await runCli(
      cwd,
      'proof',
      'relations',
      effortBId,
      decisionBId,
      '--relations',
      'supersedes,invalidates',
      '--strict-min-generation',
      decisionB.generation
    );
    t.is(result.code, 1);
    t.is(result.stdout, '');
    t.deepEqual(JSON.parse(result.stderr), forwardError?.shape);
    t.false(result.stderr.includes(' at '));
  }
);

test.serial(
  'bootstrap names the write journal for Proof without a branded The Proof',
  async (t) => {
    const cwd = await createTempProject('flatbread-bootstrap-journal-copy-', t);
    await writeFile(
      join(cwd, 'flatbread.config.js'),
      `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default { source: source(), transformer: transformer(), content: proofContent() };`
    );
    const report = await inspectEffortBootstrap(cwd);
    const journal = report.requirements.find(
      (requirement) =>
        requirement.code === 'EFFORT_BOOTSTRAP_JOURNAL_IGNORE_MISSING'
    );
    t.is(
      journal?.message,
      'The write journal for Proof at .flatbread-proof is not ignored.'
    );
    t.false((journal?.message ?? '').includes('The Proof'));
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

test.serial(
  'Retract hides a record from default browse reads, keeps get, and lists it, marked, on request',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-retract-', t);
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
    const finding = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteFinding',
        effort: effortId,
        title: 'Checklist kind',
        body: 'temporary review note',
        kind: 'survey',
      }),
      { cwd }
    );
    const findingId = finding.artifacts[0].id;
    const decision = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effortId,
        title: 'Keep',
        body: 'durable product rule',
        derives_from: [findingId],
      }),
      { cwd }
    );
    const decisionId = decision.artifacts[0].id;
    const retracted = await handleEffortWrite(
      JSON.stringify({
        type: 'Retract',
        recordId: findingId,
        reason: 'session noise; not a turning point',
      }),
      { cwd }
    );
    const listed = await handleEffortRecords(effortId, {
      cwd,
      kinds: ['finding', 'decision'],
      strictMinGeneration: retracted.generation,
    });
    const listedDigest = await readFile(listed.artifact_path, 'utf8');
    t.false(listedDigest.includes(findingId));
    t.true(listedDigest.includes(decisionId));
    const got = await handleEffortGet(findingId, {
      cwd,
      strictMinGeneration: retracted.generation,
    });
    const gotDigest = await readFile(got.artifact_path, 'utf8');
    t.true(gotDigest.includes('retracted: true'));
    t.true(gotDigest.includes('temporary review note'));
    t.true(gotDigest.includes('> **RETRACTED** on '));
    t.true(gotDigest.includes(': session noise; not a turning point.'));
    // Retracted records can be listed on request, always marked as such.
    const only = await handleEffortRecords(effortId, {
      cwd,
      kinds: ['finding', 'decision'],
      retracted: 'only',
      strictMinGeneration: retracted.generation,
    });
    const onlyDigest = await readFile(only.artifact_path, 'utf8');
    t.is(only.page.returned, 1);
    t.regex(only.summary, /retracted 1/);
    t.true(
      onlyDigest.includes(`- [\`${findingId}\`](#${findingId}) (retracted)`)
    );
    t.true(onlyDigest.includes('This record is not live.'));
    t.false(onlyDigest.includes(decisionId));
    const both = await handleEffortRecords(effortId, {
      cwd,
      kinds: ['finding', 'decision'],
      retracted: 'include',
      strictMinGeneration: retracted.generation,
    });
    const bothDigest = await readFile(both.artifact_path, 'utf8');
    t.is(both.page.returned, 2);
    t.true(bothDigest.includes(`- [\`${decisionId}\`](#${decisionId})\n`));
    t.is(bothDigest.split('> **RETRACTED**').length - 1, 1);
    t.not(both.artifact_path, listed.artifact_path);
    await t.throwsAsync(
      handleEffortRecords(effortId, {
        cwd,
        retracted: 'hidden' as never,
      }),
      { message: /Invalid retracted mode: hidden/ }
    );
    const neighbors = await handleEffortRelations(effortId, decisionId, {
      cwd,
      relations: ['derives_from'],
      strictMinGeneration: retracted.generation,
    });
    t.is(neighbors.page.returned, 0);
  }
);

test.serial(
  'proof write --dry-run previews Decision changes without saving',
  async (t) => {
    const cwd = await createTempProject('flatbread-decision-preview-', t);
    await writeFile(
      join(cwd, 'flatbread.config.js'),
      `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default { source: source(), transformer: transformer(), content: proofContent('.flatbread-proof') };`
    );
    const effort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'Preview', body: '' }),
      { cwd }
    );
    const decision = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effort.artifacts[0].id,
        title: 'Choice',
        body: '',
      }),
      { cwd }
    );
    const id = decision.artifacts[0].id;
    const preview = await runCli(
      cwd,
      'proof',
      'write',
      JSON.stringify({ type: 'AcceptDecision', decisionId: id }),
      '--dry-run'
    );
    t.is(preview.code, 0);
    const result = JSON.parse(preview.stdout);
    t.true(result.dryRun);
    t.deepEqual(result.changedDecisionIds, [id]);
    t.deepEqual(result.rejectedIds, []);
    t.is(result.generation, decision.generation);
    const saved = await handleEffortGet(id, { cwd });
    const text = await readFile(saved.artifact_path, 'utf8');
    t.regex(text, /proposed/);
    const alternative = await handleEffortWrite(
      JSON.stringify({
        type: 'WriteDecision',
        effort: effort.artifacts[0].id,
        title: 'Alternative',
        body: '',
      }),
      { cwd }
    );
    const alternativeId = alternative.artifacts[0].id;
    await handleEffortWrite(
      JSON.stringify({
        type: 'AcceptDecision',
        decisionId: id,
        rejects: [alternativeId],
      }),
      { cwd }
    );
    const reopened = await handleEffortWrite(
      JSON.stringify({
        type: 'ReopenDecision',
        decisionId: alternativeId,
        reason: 'Wrong choice',
      }),
      { cwd }
    );
    const reopenedGet = await handleEffortGet(alternativeId, {
      cwd,
      strictMinGeneration: reopened.generation,
    });
    const reopenedText = await readFile(reopenedGet.artifact_path, 'utf8');
    t.regex(reopenedText, /reopen_history:/);
    t.regex(reopenedText, /Wrong choice/);
    t.true(reopenedText.includes(id));
  }
);

test.serial(
  'brief reports the head compaction, its changes, and staleness',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-brief-', t);
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
    const write = async (payload: Record<string, unknown>) =>
      handleEffortWrite(JSON.stringify(payload), { cwd });
    const effortId = (
      await write({ type: 'CreateEffort', title: 'Brief', body: '' })
    ).artifacts[0].id;
    const decisionId = (
      await write({
        type: 'WriteDecision',
        effort: effortId,
        title: 'Pick the index',
        body: 'Use the sorted index.',
      })
    ).artifacts[0].id;

    const empty = await handleEffortBrief(effortId, { cwd });
    t.deepEqual(empty.compaction, {
      head_id: null,
      heads: 0,
      stale: false,
      changes: 1,
      recompact: true,
    });

    const citationId = (
      await write({
        type: 'WriteCitation',
        effort: effortId,
        title: 'Index benchmark',
        body: 'https://example.com/benchmark',
      })
    ).artifacts[0].id;
    const first = await write({
      type: 'WriteCompaction',
      effort: effortId,
      title: 'Index choice pending',
      body: 'One proposed Decision: the sorted index.',
      // A Citation is never live, so it must not read as a moved target.
      derives_from: [decisionId, citationId],
    });
    const firstId = first.artifacts[0].id;
    const fresh = await handleEffortBrief(effortId, {
      cwd,
      strictMinGeneration: first.generation,
    });
    t.deepEqual(fresh.compaction, {
      head_id: firstId,
      heads: 1,
      stale: false,
      changes: 0,
      recompact: false,
    });
    const freshDigest = await readFile(fresh.artifact_path, 'utf8');
    t.true(freshDigest.includes('One proposed Decision: the sorted index.'));
    t.false(freshDigest.includes('covers'));

    const accepted = await write({
      type: 'AcceptDecision',
      decisionId,
    });
    const stale = await handleEffortBrief(effortId, {
      cwd,
      strictMinGeneration: accepted.generation,
    });
    t.like(stale.compaction, { head_id: firstId, stale: true, changes: 1 });
    t.true(stale.compaction?.recompact);
    const staleDigest = await readFile(stale.artifact_path, 'utf8');
    t.true(
      staleDigest.includes(
        `- changed | ${decisionId} | decision | proposed -> accepted | Pick the index`
      )
    );
    t.true(staleDigest.includes('## Stale derivations'));

    const second = await write({
      type: 'WriteCompaction',
      effort: effortId,
      title: 'Index chosen',
      body: 'Accepted: the sorted index.',
      derives_from: [decisionId],
    });
    const secondId = second.artifacts[0].id;
    t.deepEqual(
      second.touched.map((touched) => touched.id).sort(),
      [firstId, secondId].sort()
    );
    const result = await runCli(
      cwd,
      'proof',
      'brief',
      effortId,
      '--strict-min-generation',
      second.generation
    );
    t.is(result.code, 0, result.stderr);
    const renewed = JSON.parse(result.stdout);
    t.like(renewed.compaction, {
      head_id: secondId,
      heads: 1,
      stale: false,
      changes: 0,
      recompact: false,
    });
    const renewedDigest = await readFile(renewed.artifact_path, 'utf8');
    t.true(renewedDigest.includes('## Lineage checkpoints'));
    t.true(renewedDigest.includes(`${firstId} | Index choice pending`));
    t.false(renewedDigest.includes('One proposed Decision'));

    const head = await handleEffortGet(firstId, {
      cwd,
      resolve: 'head',
      strictMinGeneration: second.generation,
    });
    t.true(
      (await readFile(head.artifact_path, 'utf8')).includes(
        'Accepted: the sorted index.'
      )
    );

    await t.throwsAsync(
      write({
        type: 'WriteFinding',
        effort: effortId,
        title: 'Hand-made',
        body: '',
        kind: 'compaction',
      }),
      { message: /WriteCompaction/ }
    );
  }
);

test.serial(
  'get on a compaction says whether it is head, whether it is stale and why, and what changed',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-get-compaction-', t);
    await writeFile(
      join(cwd, 'flatbread.config.js'),
      `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default { source: source(), transformer: transformer(), content: proofContent('.flatbread-proof') };`
    );
    const write = async (payload: Record<string, unknown>) =>
      handleEffortWrite(JSON.stringify(payload), { cwd });
    const digest = async (id: string) =>
      readFile((await handleEffortGet(id, { cwd })).artifact_path, 'utf8');
    const effortId = (
      await write({ type: 'CreateEffort', title: 'Get', body: '' })
    ).artifacts[0].id;
    const measured = (
      await write({
        type: 'WriteFinding',
        effort: effortId,
        title: 'Reads take 4 ms',
        body: 'Measured on the dev kit.',
        kind: 'measurement',
      })
    ).artifacts[0].id;
    const gap = (
      await write({
        type: 'WriteIssue',
        effort: effortId,
        title: 'No cold-cache numbers',
        body: '',
        kind: 'gap',
      })
    ).artifacts[0].id;
    const decision = (
      await write({
        type: 'WriteDecision',
        effort: effortId,
        title: 'Keep the reader',
        body: 'It is fast enough.',
        derives_from: [measured],
      })
    ).artifacts[0].id;
    const decisionBefore = await digest(decision);
    const firstId = (
      await write({
        type: 'WriteCompaction',
        effort: effortId,
        title: 'Reader is fast enough',
        body: 'One measurement, one Decision.',
        derives_from: [measured],
      })
    ).artifacts[0].id;
    const fresh = await digest(firstId);
    t.true(
      fresh.includes('## Compaction\n- Head compaction of its Effort: yes\n')
    );
    t.true(
      fresh.includes(
        '- Stale: no. None of the 1 record it derives from changed standing, and nothing invalidated it. A compaction is stale when'
      )
    );
    t.true(
      fresh.includes(
        '- Since it was written, 0 records differ from the live set it covers.'
      )
    );
    t.true(fresh.includes('## Changes since compaction\n- none\n'));

    // An Issue it does not derive from closes in place and a record is
    // added: the compaction is not stale, but two records differ.
    await write({
      type: 'ResolveIssue',
      issueId: gap,
      resolution: 'deferred',
      resolvedBy: [measured],
    });
    const added = (
      await write({
        type: 'WriteFinding',
        effort: effortId,
        title: 'Cold reads take 9 ms',
        body: '',
        kind: 'measurement',
      })
    ).artifacts[0].id;
    const moved = await digest(firstId);
    t.true(moved.includes('- Stale: no.'));
    t.true(
      moved.includes(
        '- Since it was written, 2 records differ from the live set it covers. This count is exact: 1 new live, 1 covered and no longer live, 0 covered with a new standing.'
      )
    );
    t.true(
      moved.includes(
        `- left | ${gap} | issue | open -> deferred | No cold-cache numbers`
      )
    );
    t.true(
      moved.includes(
        `- added | ${added} | finding | none -> live | Cold reads take 9 ms`
      )
    );
    const brief = await handleEffortBrief(effortId, { cwd });
    t.like(brief.compaction, { head_id: firstId, stale: false, changes: 2 });

    // Replacing the record it derives from makes it stale, and says which.
    await write({ type: 'Supersede', supersederId: added, targetId: measured });
    const stale = await digest(firstId);
    t.true(
      stale.includes(
        `- Stale: yes. 1 of the 1 record it derives from changed standing: ${measured} live -> superseded. A compaction is stale when`
      )
    );
    t.like((await handleEffortBrief(effortId, { cwd })).compaction, {
      stale: true,
    });

    // A newer compaction makes this one history.
    const second = await write({
      type: 'WriteCompaction',
      effort: effortId,
      title: 'Cold reads matter',
      body: 'Cold reads take 9 ms.',
      derives_from: [added],
    });
    const secondId = second.artifacts[0].id;
    const old = await digest(firstId);
    t.regex(
      old,
      new RegExp(
        `- Head compaction of its Effort: no; superseded by ${secondId} \\(\\d{4}-\\d{2}-\\d{2}\\)`
      )
    );
    t.true((await digest(secondId)).includes('- Stale: no.'));

    // Other records print what they printed before.
    const decisionAfter = await digest(decision);
    t.false(decisionAfter.includes('## Compaction'));
    t.false(decisionAfter.includes('## Changes since compaction'));
    t.is(
      decisionAfter.replace(/^served_generation: .*$/m, ''),
      decisionBefore.replace(/^served_generation: .*$/m, '')
    );
  }
);

test.serial(
  'records filters by standing and by dead support, and refuses a state no record stores',
  async (t) => {
    const cwd = await createTempProject('flatbread-effort-standing-', t);
    await writeFile(
      join(cwd, 'flatbread.config.js'),
      `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default { source: source(), transformer: transformer(), content: proofContent('.flatbread-proof') };`
    );
    const write = async (payload: Record<string, unknown>) =>
      handleEffortWrite(JSON.stringify(payload), { cwd });
    const effortId = (
      await write({ type: 'CreateEffort', title: 'Standing', body: '' })
    ).artifacts[0].id;
    const wrong = (
      await write({
        type: 'WriteFinding',
        effort: effortId,
        title: 'Reads take 4 ms',
        body: '',
        kind: 'measurement',
      })
    ).artifacts[0].id;
    const decision = (
      await write({
        type: 'WriteDecision',
        effort: effortId,
        title: 'Keep the reader',
        body: '',
        derives_from: [wrong],
      })
    ).artifacts[0].id;
    const right = (
      await write({
        type: 'WriteFinding',
        effort: effortId,
        title: 'Reads take 9 ms cold',
        body: '',
        kind: 'measurement',
        derives_from: [wrong],
      })
    ).artifacts[0].id;
    await write({ type: 'Invalidate', findingId: right, targetId: wrong });
    // A compaction rests on everything, so it is never listed as resting.
    await write({
      type: 'WriteCompaction',
      effort: effortId,
      title: 'Reader',
      body: '',
      derives_from: [wrong],
    });
    const ids = async (options: Record<string, unknown>) => {
      const read = await handleEffortRecords(effortId, { cwd, ...options });
      const text = await readFile(read.artifact_path, 'utf8');
      return [...text.matchAll(/^### (\S+)$/gm)].map((match) => match[1]);
    };
    t.deepEqual(await ids({ standing: ['invalidated'] }), [wrong]);
    // The Finding that disproved it derives from it but does not rest on it.
    t.deepEqual(await ids({ restsOn: ['invalidated'] }), [decision]);
    t.deepEqual(await ids({ restsOn: ['superseded'] }), []);
    t.deepEqual(await ids({ state: ['proposed'] }), [decision]);
    const plain = await handleEffortRecords(effortId, {
      cwd,
      state: ['proposed'],
    });
    const header = (await readFile(plain.artifact_path, 'utf8')).split('\n')[1];
    t.false(header.includes('"standing"'));
    t.false(header.includes('"rests_on"'));
    await t.throwsAsync(
      handleEffortRecords(effortId, { cwd, state: ['invalidated'] }),
      { message: /`invalidated` is not a stored state.*--standing invalidated/ }
    );
    await t.throwsAsync(
      handleEffortRecords(effortId, { cwd, status: ['bogus'] }),
      { message: /`bogus` is not a stored status.*--standing/ }
    );
    await t.throwsAsync(
      handleEffortRecords(effortId, { cwd, restsOn: ['open'] }),
      { message: /Invalid rests-on standing: open/ }
    );
    t.deepEqual(
      mapEffortCliOptions({ standing: 'invalidated', 'rests-on': 'a,b' }),
      { standing: ['invalidated'], restsOn: ['a', 'b'] }
    );
    const spawned = await runCli(
      cwd,
      'proof',
      'records',
      effortId,
      '--rests-on',
      'invalidated,rejected'
    );
    t.is(spawned.code, 0, spawned.stderr);
    t.regex(JSON.parse(spawned.stdout).summary, /^1 record;/);
    const refused = await runCli(
      cwd,
      'proof',
      'records',
      effortId,
      '--state',
      'invalidated'
    );
    t.not(refused.code, 0);
    t.regex(JSON.parse(refused.stderr).error.message, /--standing/);
  }
);
