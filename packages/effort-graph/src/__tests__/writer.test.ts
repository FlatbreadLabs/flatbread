import test from 'ava';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { createEffortGraphWriter } from '../writer.js';
import { EffortGraphValidationError } from '../errors.js';
import type { EffortGraphWriter, MutationResult } from '../types.js';

async function makeWriter(): Promise<{
  root: string;
  writer: EffortGraphWriter;
}> {
  const root = await mkdtemp(join(tmpdir(), 'eg-writer-'));
  return { root, writer: createEffortGraphWriter({ rootDir: root }) };
}

async function readFrontmatter(root: string, relativePath: string) {
  const raw = await readFile(join(root, relativePath), 'utf8');
  return matter(raw);
}

function soleId(result: MutationResult): string {
  return result.artifacts[0].id;
}

test('WriteDecision with supersedes materializes superseded_by on the target file', async (t) => {
  const { root, writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E', body: '' })
  );
  const older = soleId(
    await writer.mutate({
      type: 'WriteDecision',
      effort,
      title: 'Older',
      body: '',
    })
  );
  const result = await writer.mutate({
    type: 'WriteDecision',
    effort,
    title: 'Newer',
    body: '',
    supersedes: [older],
  });
  t.is(result.touched.length, 2);
  const target = await readFrontmatter(root, `decisions/${older}.md`);
  t.deepEqual(target.data.superseded_by, [soleId(result)]);
  const newer = result.artifacts.find((a) => a.operation === 'created')!;
  t.deepEqual(newer.frontmatter.supersedes, [older]);
});

test('Supersede sets a Decision target state to superseded, exactly 2 files', async (t) => {
  const { root, writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E', body: '' })
  );
  const a = soleId(
    await writer.mutate({ type: 'WriteDecision', effort, title: 'A', body: '' })
  );
  const b = soleId(
    await writer.mutate({ type: 'WriteDecision', effort, title: 'B', body: '' })
  );
  const result = await writer.mutate({
    type: 'Supersede',
    supersederId: b,
    targetId: a,
  });
  t.is(result.touched.length, 2);
  const target = await readFrontmatter(root, `decisions/${a}.md`);
  t.is(target.data.state, 'superseded');
  t.deepEqual(target.data.superseded_by, [b]);
  // Already-superseded target rejects a second superseder.
  await t.throwsAsync(
    writer.mutate({ type: 'Supersede', supersederId: b, targetId: a }),
    { instanceOf: EffortGraphValidationError }
  );
});

test('Invalidate changes only edge fields on the target', async (t) => {
  const { root, writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E', body: '' })
  );
  const decision = soleId(
    await writer.mutate({ type: 'WriteDecision', effort, title: 'D', body: '' })
  );
  const before = await readFrontmatter(root, `decisions/${decision}.md`);
  const finding = soleId(
    await writer.mutate({
      type: 'WriteFinding',
      effort,
      title: 'F',
      body: '',
      kind: 'retrospective',
    })
  );
  await writer.mutate({
    type: 'Invalidate',
    findingId: finding,
    targetId: decision,
  });
  const after = await readFrontmatter(root, `decisions/${decision}.md`);
  t.deepEqual(after.data.invalidated_by, [finding]);
  t.is(after.data.state, before.data.state);
  const changedKeys = Object.keys(after.data).filter(
    (k) => JSON.stringify(after.data[k]) !== JSON.stringify(before.data[k])
  );
  t.deepEqual(changedKeys, ['invalidated_by']);
  t.is(after.content, before.content);
  // A second identical invalidation is a duplicate edge.
  await t.throwsAsync(
    writer.mutate({
      type: 'Invalidate',
      findingId: finding,
      targetId: decision,
    }),
    { instanceOf: EffortGraphValidationError }
  );
  // A non-Finding source is rejected.
  await t.throwsAsync(
    writer.mutate({
      type: 'Invalidate',
      findingId: decision,
      targetId: finding,
    }),
    { instanceOf: EffortGraphValidationError }
  );
});

test('ResolveIssue rejects non-open issues and cross-effort sources', async (t) => {
  const { writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E1', body: '' })
  );
  const otherEffort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E2', body: '' })
  );
  const issue = soleId(
    await writer.mutate({
      type: 'WriteIssue',
      effort,
      title: 'Q',
      body: '',
      kind: 'question',
    })
  );
  const localFinding = soleId(
    await writer.mutate({
      type: 'WriteFinding',
      effort,
      title: 'F1',
      body: '',
      kind: 'measurement',
    })
  );
  const foreignFinding = soleId(
    await writer.mutate({
      type: 'WriteFinding',
      effort: otherEffort,
      title: 'F2',
      body: '',
      kind: 'measurement',
    })
  );
  await t.throwsAsync(
    writer.mutate({
      type: 'ResolveIssue',
      issueId: issue,
      resolution: 'resolved',
      resolvedBy: [foreignFinding],
    }),
    { instanceOf: EffortGraphValidationError }
  );
  const resolved = await writer.mutate({
    type: 'ResolveIssue',
    issueId: issue,
    resolution: 'resolved',
    resolvedBy: [localFinding],
  });
  t.is(resolved.artifacts[0].frontmatter.status, 'resolved');
  t.deepEqual(resolved.artifacts[0].frontmatter.resolved_by, [localFinding]);
  await t.throwsAsync(
    writer.mutate({
      type: 'ResolveIssue',
      issueId: issue,
      resolution: 'wontfix',
      resolvedBy: [localFinding],
    }),
    { instanceOf: EffortGraphValidationError }
  );
});

test('AcceptDecision rejects proposed siblings and leaves others untouched', async (t) => {
  const { root, writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E1', body: '' })
  );
  const otherEffort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E2', body: '' })
  );
  const winner = soleId(
    await writer.mutate({ type: 'WriteDecision', effort, title: 'W', body: '' })
  );
  const sibling = soleId(
    await writer.mutate({ type: 'WriteDecision', effort, title: 'S', body: '' })
  );
  const foreign = soleId(
    await writer.mutate({
      type: 'WriteDecision',
      effort: otherEffort,
      title: 'Other',
      body: '',
    })
  );
  const result = await writer.mutate({
    type: 'AcceptDecision',
    decisionId: winner,
  });
  t.deepEqual(result.touched.map((x) => x.id).sort(), [winner, sibling].sort());
  const winnerDoc = await readFrontmatter(root, `decisions/${winner}.md`);
  t.is(winnerDoc.data.state, 'accepted');
  const siblingDoc = await readFrontmatter(root, `decisions/${sibling}.md`);
  t.is(siblingDoc.data.state, 'rejected');
  t.is(siblingDoc.data.rejected_by, winner);
  const foreignDoc = await readFrontmatter(root, `decisions/${foreign}.md`);
  t.is(foreignDoc.data.state, 'proposed');
  t.is(foreignDoc.data.rejected_by, undefined);
  // A later accept must not touch the already-rejected sibling.
  const later = soleId(
    await writer.mutate({ type: 'WriteDecision', effort, title: 'L', body: '' })
  );
  const secondAccept = await writer.mutate({
    type: 'AcceptDecision',
    decisionId: later,
  });
  t.deepEqual(
    secondAccept.touched.map((x) => x.id),
    [later]
  );
  const siblingAfter = await readFrontmatter(root, `decisions/${sibling}.md`);
  t.is(siblingAfter.data.rejected_by, winner);
  // Accepting a non-proposed decision is rejected.
  await t.throwsAsync(
    writer.mutate({ type: 'AcceptDecision', decisionId: winner }),
    { instanceOf: EffortGraphValidationError }
  );
});

test('MitigateRisk requires an accepted Decision in the same Effort', async (t) => {
  const { writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E', body: '' })
  );
  const risk = soleId(
    await writer.mutate({
      type: 'WriteRisk',
      effort,
      title: 'R',
      body: '',
      likelihood: 'high',
      severity: 'high',
    })
  );
  const decision = soleId(
    await writer.mutate({ type: 'WriteDecision', effort, title: 'D', body: '' })
  );
  await t.throwsAsync(
    writer.mutate({ type: 'MitigateRisk', riskId: risk, decisionId: decision }),
    { instanceOf: EffortGraphValidationError }
  );
  await writer.mutate({ type: 'AcceptDecision', decisionId: decision });
  const result = await writer.mutate({
    type: 'MitigateRisk',
    riskId: risk,
    decisionId: decision,
  });
  t.is(result.artifacts[0].frontmatter.state, 'mitigated');
  t.is(result.artifacts[0].frontmatter.mitigated_by, decision);
});

test('SetRiskState realized requires at least one Finding in evidence', async (t) => {
  const { writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E', body: '' })
  );
  const risk = soleId(
    await writer.mutate({
      type: 'WriteRisk',
      effort,
      title: 'R',
      body: '',
      likelihood: 'low',
      severity: 'low',
    })
  );
  const decision = soleId(
    await writer.mutate({ type: 'WriteDecision', effort, title: 'D', body: '' })
  );
  await t.throwsAsync(
    writer.mutate({
      type: 'SetRiskState',
      riskId: risk,
      state: 'realized',
      evidence: [decision],
    }),
    { instanceOf: EffortGraphValidationError }
  );
  const finding = soleId(
    await writer.mutate({
      type: 'WriteFinding',
      effort,
      title: 'F',
      body: '',
      kind: 'measurement',
    })
  );
  const result = await writer.mutate({
    type: 'SetRiskState',
    riskId: risk,
    state: 'realized',
    evidence: [finding],
  });
  t.is(result.artifacts[0].frontmatter.state, 'realized');
  t.deepEqual(result.artifacts[0].frontmatter.evidence, [finding]);
});

test('WriteBlob, WriteCitation(blob), and WriteFinding(cites) persist same-effort links', async (t) => {
  const { root, writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E', body: '' })
  );
  const blobId = soleId(
    await writer.mutate({
      type: 'WriteBlob',
      effort,
      title: 'Payload',
      body: '# longform research\n',
      kind: 'markdown',
    })
  );
  const blobDoc = await readFrontmatter(root, `blobs/${blobId}.md`);
  t.is(blobDoc.data.effort, effort);
  t.is(blobDoc.content.trim(), '# longform research');
  const citationId = soleId(
    await writer.mutate({
      type: 'WriteCitation',
      effort,
      title: 'Paper',
      body: 'https://example.com/paper',
      role: 'evidence',
      blob: blobId,
    })
  );
  const citationDoc = await readFrontmatter(root, `citations/${citationId}.md`);
  t.is(citationDoc.data.blob, blobId);
  const findingId = soleId(
    await writer.mutate({
      type: 'WriteFinding',
      effort,
      title: 'F',
      body: 'short',
      kind: 'measurement',
      cites: [citationId],
    })
  );
  const findingDoc = await readFrontmatter(root, `findings/${findingId}.md`);
  t.deepEqual(findingDoc.data.cites, [citationId]);
});

test('WriteFinding rejects cites from another effort', async (t) => {
  const { writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E1', body: '' })
  );
  const otherEffort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E2', body: '' })
  );
  const foreignCitation = soleId(
    await writer.mutate({
      type: 'WriteCitation',
      effort: otherEffort,
      title: 'Foreign',
      body: 'https://example.com/foreign',
    })
  );
  await t.throwsAsync(
    writer.mutate({
      type: 'WriteFinding',
      effort,
      title: 'F',
      body: '',
      kind: 'measurement',
      cites: [foreignCitation],
    }),
    { instanceOf: EffortGraphValidationError, message: /Different effort/ }
  );
});

test('generation tokens increment across successive mutations', async (t) => {
  const { writer } = await makeWriter();
  const first = await writer.mutate({
    type: 'CreateEffort',
    title: 'One',
    body: '',
  });
  t.is(first.generation, '1');
  const effort = soleId(first);
  const second = await writer.mutate({
    type: 'WriteFinding',
    effort,
    title: 'F',
    body: '',
    kind: 'note',
  });
  t.is(second.generation, '2');
  const third = await writer.mutate({
    type: 'SetEffortStatus',
    effortId: effort,
    status: 'paused',
  });
  t.is(third.generation, '3');
  t.truthy(third.artifacts[0].frontmatter);
  t.is(third.artifacts[0].frontmatter.status, 'paused');
});

test('writer uses one injected snapshot source', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'eg-snapshot-writer-'));
  const id = 'eff-active--0123456789abcdef';
  const snapshot = (await import('../snapshot.js')).createEffortGraphSnapshot([
    {
      id,
      kind: 'effort',
      path: `efforts/${id}.md`,
      frontmatter: {
        id,
        title: 'E',
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z',
      },
      body: '',
      rawBytes: Buffer.from('captured'),
    },
  ]);
  let count = 0;
  const writer = createEffortGraphWriter({
    rootDir: root,
    index: {
      async buildSnapshot() {
        count++;
        return snapshot;
      },
    },
  });
  const result = await writer.mutate({
    type: 'SetEffortStatus',
    effortId: id,
    status: 'paused',
  });
  t.is(count, 1);
  t.is(result.artifacts.length, 1);
  t.is(result.artifacts[0].id, id);
});

test('snapshot before-image drives journal-compatible end-to-end output', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'eg-snapshot-before-'));
  const id = 'eff-captured--0123456789abcdef';
  const captured = (await import('../snapshot.js')).createEffortGraphSnapshot([
    {
      id,
      kind: 'effort',
      path: `efforts/${id}.md`,
      frontmatter: {
        id,
        title: 'Captured',
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z',
      },
      body: 'captured body',
      rawBytes: Buffer.from('captured raw bytes'),
    },
  ]);
  const writer = createEffortGraphWriter({
    rootDir: root,
    index: {
      async buildSnapshot() {
        await mkdir(join(root, 'efforts'), { recursive: true });
        await import('node:fs/promises').then(({ writeFile }) =>
          writeFile(
            join(root, 'efforts', `${id}.md`),
            'distinguishable disk bytes'
          )
        );
        return captured;
      },
    },
  });
  const result = await writer.mutate({
    type: 'SetEffortStatus',
    effortId: id,
    status: 'paused',
  });
  t.is(result.artifacts[0].frontmatter.title, 'Captured');
  t.is(result.artifacts[0].frontmatter.status, 'paused');
  t.is(result.artifacts[0].body, 'captured body\n');
});
