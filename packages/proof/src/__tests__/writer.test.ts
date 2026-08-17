import test from 'ava';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { createProofWriter } from '../writer.js';
import { ProofValidationError } from '../errors.js';
import type { ProofWriter, MutationResult } from '../types.js';
import type { ProofMutation } from '../schemas.js';

async function makeWriter(): Promise<{
  root: string;
  writer: ProofWriter;
}> {
  const root = await mkdtemp(join(tmpdir(), 'eg-writer-'));
  return { root, writer: createProofWriter({ rootDir: root }) };
}

async function readFrontmatter(root: string, relativePath: string) {
  const raw = await readFile(join(root, relativePath), 'utf8');
  return matter(raw);
}

function soleId(result: MutationResult): string {
  return result.artifacts[0].id;
}

test('CreateEffort rejects cites through the writer', async (t) => {
  const { writer } = await makeWriter();
  await t.throwsAsync(
    writer.mutate({
      type: 'CreateEffort',
      title: 'E',
      body: '',
      cites: ['cit-paper--0123456789abcdef'],
    } as unknown as ProofMutation),
    {
      instanceOf: ProofValidationError,
      message:
        'CreateEffort does not accept cites; create the Effort before its Citations.',
    }
  );
});

test('WriteCitation and WriteBlob reject cites through the writer', async (t) => {
  const { writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E', body: '' })
  );
  await t.throwsAsync(
    writer.mutate({
      type: 'WriteCitation',
      effort,
      title: 'Paper',
      body: 'https://example.com/paper',
      cites: ['cit-other--0123456789abcdef'],
    } as unknown as ProofMutation),
    {
      instanceOf: ProofValidationError,
      message: /WriteCitation does not accept cites/,
    }
  );
  await t.throwsAsync(
    writer.mutate({
      type: 'WriteBlob',
      effort,
      title: 'Payload',
      body: '# longform research\n',
      cites: ['cit-paper--0123456789abcdef'],
    } as unknown as ProofMutation),
    {
      instanceOf: ProofValidationError,
      message: /WriteBlob does not accept cites/,
    }
  );
});

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

test('one create preserves both reverse projections to the same target', async (t) => {
  const { root, writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'Dual edge', body: '' })
  );
  const target = soleId(
    await writer.mutate({
      type: 'WriteFinding',
      effort,
      title: 'Target',
      body: '',
      kind: 'measurement',
    })
  );
  const result = await writer.mutate({
    type: 'WriteFinding',
    effort,
    title: 'Replacement and correction',
    body: '',
    kind: 'measurement',
    supersedes: [target],
    invalidates: [target],
  });
  const source = result.artifacts.find(
    (artifact) => artifact.operation === 'created'
  )?.id;
  t.truthy(source);

  const sourceRecord = await readFrontmatter(
    root,
    `findings/${source as string}.md`
  );
  t.deepEqual(sourceRecord.data.supersedes, [target]);
  t.deepEqual(sourceRecord.data.invalidates, [target]);

  const targetRecord = await readFrontmatter(root, `findings/${target}.md`);
  t.deepEqual(targetRecord.data.superseded_by, [source]);
  t.deepEqual(targetRecord.data.invalidated_by, [source]);
});

test('cross-Effort create relations reject without changing files or generation', async (t) => {
  const { root, writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'Local', body: '' })
  );
  const otherEffort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'Foreign', body: '' })
  );
  const target = soleId(
    await writer.mutate({
      type: 'WriteFinding',
      effort: otherEffort,
      title: 'Foreign target',
      body: '',
      kind: 'measurement',
    })
  );
  const targetPath = `findings/${target}.md`;
  const targetBefore = await readFile(join(root, targetPath));
  const generationPath = join(root, '.journal', 'generation.json');
  const generationBefore = await readFile(generationPath, 'utf8');
  const attempts: {
    relation: string;
    path: string;
    input: ProofMutation;
  }[] = [
    {
      relation: 'derives_from',
      path: 'decisions/dec-cross-derive--0000000000000001.md',
      input: {
        type: 'WriteDecision',
        id: 'dec-cross-derive--0000000000000001',
        effort,
        title: 'Cross derive',
        body: '',
        derives_from: [target],
      },
    },
    {
      relation: 'supersedes',
      path: 'findings/fnd-cross-supersede--0000000000000002.md',
      input: {
        type: 'WriteFinding',
        id: 'fnd-cross-supersede--0000000000000002',
        effort,
        title: 'Cross supersede',
        body: '',
        kind: 'measurement',
        supersedes: [target],
      },
    },
    {
      relation: 'invalidates',
      path: 'decisions/dec-cross-invalidate--0000000000000003.md',
      input: {
        type: 'WriteDecision',
        id: 'dec-cross-invalidate--0000000000000003',
        effort,
        title: 'Cross invalidate',
        body: '',
        invalidates: [target],
      },
    },
  ];

  for (const attempt of attempts) {
    await t.throwsAsync(writer.mutate(attempt.input), {
      instanceOf: ProofValidationError,
      message: `${attempt.relation} target ${target} belongs to a different effort`,
    });
    t.false(
      await readFile(join(root, attempt.path)).then(
        () => true,
        () => false
      )
    );
  }

  t.is(await readFile(generationPath, 'utf8'), generationBefore);
  t.deepEqual(await readFile(join(root, targetPath)), targetBefore);
  const targetAfter = await readFrontmatter(root, targetPath);
  t.is(targetAfter.data.superseded_by, undefined);
  t.is(targetAfter.data.invalidated_by, undefined);
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
    { instanceOf: ProofValidationError }
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
    { instanceOf: ProofValidationError }
  );
  // A non-Finding source is rejected.
  await t.throwsAsync(
    writer.mutate({
      type: 'Invalidate',
      findingId: decision,
      targetId: finding,
    }),
    { instanceOf: ProofValidationError }
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
    { instanceOf: ProofValidationError }
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
    { instanceOf: ProofValidationError }
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
    { instanceOf: ProofValidationError }
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
    { instanceOf: ProofValidationError }
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
    { instanceOf: ProofValidationError }
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
    {
      instanceOf: ProofValidationError,
      message: new RegExp(
        `cites target ${foreignCitation} belongs to a different effort`
      ),
    }
  );
});

test('WriteCitation rejects a Blob from another effort', async (t) => {
  const { writer } = await makeWriter();
  const effort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E1', body: '' })
  );
  const otherEffort = soleId(
    await writer.mutate({ type: 'CreateEffort', title: 'E2', body: '' })
  );
  const foreignBlob = soleId(
    await writer.mutate({
      type: 'WriteBlob',
      effort: otherEffort,
      title: 'Foreign payload',
      body: '',
    })
  );
  await t.throwsAsync(
    writer.mutate({
      type: 'WriteCitation',
      effort,
      title: 'Source',
      body: 'https://example.com/source',
      blob: foreignBlob,
    }),
    {
      instanceOf: ProofValidationError,
      message: new RegExp(
        `Citation\\.blob ${foreignBlob} belongs to a different effort`
      ),
    }
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
  const snapshot = (await import('../snapshot.js')).createProofSnapshot([
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
  const writer = createProofWriter({
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
  const captured = (await import('../snapshot.js')).createProofSnapshot([
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
  const writer = createProofWriter({
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
