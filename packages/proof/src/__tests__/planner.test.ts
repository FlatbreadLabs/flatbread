import test from 'ava';
import { parseDocument, serializeDocument } from '../frontmatter.js';
import { createProofSnapshot } from '../snapshot.js';
import { planMutation } from '../planner.js';
import type { PrimitiveKind } from '../types.js';

const E = 'eff-one--0123456789abcdef';
const ids = {
  issue: 'iss-one--0123456789abcdef',
  finding: 'fnd-one--0123456789abcdef',
  decision: 'dec-one--0123456789abcdef',
  constraint: 'con-one--0123456789abcdef',
  risk: 'rsk-one--0123456789abcdef',
  decision2: 'dec-two--0123456789abcdef',
};
function snap(extra: any[] = []) {
  const base = [
    {
      id: E,
      kind: 'effort' as const,
      path: `efforts/${E}.md`,
      frontmatter: {
        id: E,
        title: 'E',
        created_at: '2025-01-01T00:00:00.000Z',
        status: 'active',
      },
      body: 'eb',
    },
  ];
  return createProofSnapshot(
    [...base, ...extra].map((x) => ({
      ...x,
      rawBytes: serializeDocument(x.body, x.frontmatter),
    }))
  );
}
function record(
  id: string,
  kind: PrimitiveKind,
  fm: Record<string, unknown>,
  body = ''
) {
  return { id, kind, path: `${kind}s/${id}.md`, frontmatter: fm, body };
}
const now = new Date('2025-02-01T00:00:00.000Z');
const random = () => new Uint8Array(10);
function one(
  t: any,
  writes: any[],
  id: string,
  path: string,
  op: string,
  expected: Record<string, unknown>
) {
  t.is(writes.length, 1);
  t.is(writes[0].id, id);
  t.is(writes[0].relativePath, path);
  t.is(writes[0].operation, op);
  t.deepEqual(
    parseDocument(writes[0].afterBytes, writes[0].kind).frontmatter,
    expected
  );
}
test('8 CreateEffort', (t) => {
  const id = 'eff-new--0000000000000000';
  const w = planMutation(
    { type: 'CreateEffort', id, title: 'New', body: '' },
    snap(),
    '/root',
    now,
    random
  );
  one(t, w, id, `efforts/${id}.md`, 'create', {
    id,
    title: 'New',
    status: 'active',
    created_at: now.toISOString(),
  });
  t.is(w[0].beforeBytes, undefined);
});
test('CreateEffort rejects cites before planning a write', (t) => {
  const input = {
    type: 'CreateEffort',
    title: 'New',
    body: '',
    cites: ['cit-paper--0123456789abcdef'],
  } as unknown as import('../schemas.js').ProofMutation;
  t.throws(() => planMutation(input, snap(), '/root', now), {
    message:
      'CreateEffort does not accept cites; create the Effort before its Citations.',
  });
});
test('9 SetEffortStatus', (t) => {
  const s = snap();
  const w = planMutation(
    { type: 'SetEffortStatus', effortId: E, status: 'paused' },
    s,
    '/root',
    now
  );
  one(t, w, E, `efforts/${E}.md`, 'update', {
    id: E,
    title: 'E',
    status: 'paused',
    created_at: '2025-01-01T00:00:00.000Z',
  });
  t.deepEqual(w[0].beforeBytes, s.getRawBytes(E));
});
test('10 WriteIssue', (t) => {
  const i = ids.issue;
  const w = planMutation(
    {
      type: 'WriteIssue',
      id: i,
      effort: E,
      title: 'I',
      body: '',
      kind: 'question',
    },
    snap(),
    '/root',
    now
  );
  one(t, w, i, `issues/${i}.md`, 'create', {
    id: i,
    effort: E,
    title: 'I',
    kind: 'question',
    created_at: now.toISOString(),
    status: 'open',
  });
});
test('11 WriteFinding with supersedes', (t) => {
  const target = record(ids.finding, 'finding', {
    id: ids.finding,
    effort: E,
    title: 'F',
    kind: 'x',
    created_at: '2025-01-01T00:00:00.000Z',
  });
  const s = snap([target]);
  const w = planMutation(
    {
      type: 'WriteFinding',
      id: 'fnd-new--0123456789abcdef',
      effort: E,
      title: 'N',
      body: '',
      kind: 'x',
      supersedes: [ids.finding],
    },
    s,
    '/root',
    now
  );
  t.deepEqual(
    w.map((x) => x.id),
    ['fnd-new--0123456789abcdef', ids.finding]
  );
  t.deepEqual(
    parseDocument(w[1].afterBytes, 'finding').frontmatter.superseded_by,
    ['fnd-new--0123456789abcdef']
  );
  t.deepEqual(w[1].beforeBytes, s.getRawBytes(ids.finding));
});
test('12 WriteDecision with invalidates', (t) => {
  const target = record(ids.finding, 'finding', {
    id: ids.finding,
    effort: E,
    title: 'F',
    kind: 'x',
    created_at: '2025-01-01T00:00:00.000Z',
  });
  const id = ids.decision;
  const s = snap([target]);
  const w = planMutation(
    {
      type: 'WriteDecision',
      id,
      effort: E,
      title: 'D',
      body: '',
      invalidates: [ids.finding],
    },
    s,
    '/root',
    now
  );
  t.deepEqual(
    w.map((x) => x.id),
    [id, ids.finding]
  );
  t.deepEqual(
    parseDocument(w[1].afterBytes, 'finding').frontmatter.invalidated_by,
    [id]
  );
  t.deepEqual(w[1].beforeBytes, s.getRawBytes(ids.finding));
});
test('13 WriteConstraint', (t) => {
  const id = ids.constraint;
  const w = planMutation(
    {
      type: 'WriteConstraint',
      id,
      effort: E,
      title: 'C',
      body: '',
      kind: 'hard',
    },
    snap(),
    '/root',
    now
  );
  one(t, w, id, `constraints/${id}.md`, 'create', {
    id,
    effort: E,
    title: 'C',
    kind: 'hard',
    created_at: now.toISOString(),
  });
});
test('14 WriteRisk', (t) => {
  const id = ids.risk;
  const w = planMutation(
    {
      type: 'WriteRisk',
      id,
      effort: E,
      title: 'R',
      body: '',
      likelihood: 'low',
      severity: 'high',
    },
    snap(),
    '/root',
    now
  );
  one(t, w, id, `risks/${id}.md`, 'create', {
    id,
    effort: E,
    title: 'R',
    likelihood: 'low',
    severity: 'high',
    created_at: now.toISOString(),
    state: 'open',
  });
});
test('15 Supersede', (t) => {
  const a = record(ids.decision, 'decision', {
    id: ids.decision,
    effort: E,
    title: 'A',
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'proposed',
  });
  const b = record(ids.decision2, 'decision', {
    id: ids.decision2,
    effort: E,
    title: 'B',
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'proposed',
  });
  const s = snap([a, b]);
  const w = planMutation(
    { type: 'Supersede', supersederId: ids.decision2, targetId: ids.decision },
    s,
    '/root',
    now
  );
  t.deepEqual(
    w.map((x) => x.id),
    [ids.decision2, ids.decision]
  );
  t.is(
    parseDocument(w[1].afterBytes, 'decision').frontmatter.state,
    'superseded'
  );
  t.deepEqual(
    parseDocument(w[1].afterBytes, 'decision').frontmatter.superseded_by,
    [ids.decision2]
  );
  t.deepEqual(w[0].beforeBytes, s.getRawBytes(ids.decision2));
  t.deepEqual(w[1].beforeBytes, s.getRawBytes(ids.decision));
});
test('16 Invalidate', (t) => {
  const f = record(ids.finding, 'finding', {
    id: ids.finding,
    effort: E,
    title: 'F',
    kind: 'x',
    created_at: '2025-01-01T00:00:00.000Z',
  });
  const d = record(ids.decision, 'decision', {
    id: ids.decision,
    effort: E,
    title: 'D',
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'proposed',
  });
  const s = snap([f, d]);
  const w = planMutation(
    { type: 'Invalidate', findingId: ids.finding, targetId: ids.decision },
    s,
    '/root',
    now
  );
  t.deepEqual(
    w.map((x) => x.id),
    [ids.finding, ids.decision]
  );
  t.is(
    parseDocument(w[1].afterBytes, 'decision').frontmatter.state,
    'proposed'
  );
  t.deepEqual(w[0].beforeBytes, s.getRawBytes(ids.finding));
  t.deepEqual(w[1].beforeBytes, s.getRawBytes(ids.decision));
});
test('17 ResolveIssue', (t) => {
  const i = record(ids.issue, 'issue', {
    id: ids.issue,
    effort: E,
    title: 'I',
    kind: 'x',
    created_at: '2025-01-01T00:00:00.000Z',
    status: 'open',
  });
  const f = record(ids.finding, 'finding', {
    id: ids.finding,
    effort: E,
    title: 'F',
    kind: 'x',
    created_at: '2025-01-01T00:00:00.000Z',
  });
  const s = snap([i, f]);
  const w = planMutation(
    {
      type: 'ResolveIssue',
      issueId: ids.issue,
      resolution: 'resolved',
      resolvedBy: [ids.finding],
    },
    s,
    '/root',
    now
  );
  t.is(parseDocument(w[0].afterBytes, 'issue').frontmatter.status, 'resolved');
  t.deepEqual(parseDocument(w[0].afterBytes, 'issue').frontmatter.resolved_by, [
    ids.finding,
  ]);
  t.deepEqual(w[0].beforeBytes, s.getRawBytes(ids.issue));
});
test('18 AcceptDecision', (t) => {
  const a = record(ids.decision, 'decision', {
    id: ids.decision,
    effort: E,
    title: 'A',
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'proposed',
  });
  const b = record(ids.decision2, 'decision', {
    id: ids.decision2,
    effort: E,
    title: 'B',
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'proposed',
  });
  const w = planMutation(
    { type: 'AcceptDecision', decisionId: ids.decision },
    snap([a, b]),
    '/root',
    now
  );
  t.deepEqual(
    w.map((x) => x.id),
    [ids.decision, ids.decision2]
  );
  t.is(
    parseDocument(w[0].afterBytes, 'decision').frontmatter.state,
    'accepted'
  );
  t.is(
    parseDocument(w[1].afterBytes, 'decision').frontmatter.rejected_by,
    ids.decision
  );
});
test('19 MitigateRisk', (t) => {
  const r = record(ids.risk, 'risk', {
    id: ids.risk,
    effort: E,
    title: 'R',
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'open',
    likelihood: 'low',
    severity: 'high',
  });
  const d = record(ids.decision, 'decision', {
    id: ids.decision,
    effort: E,
    title: 'D',
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'accepted',
  });
  const s = snap([r, d]);
  const w = planMutation(
    { type: 'MitigateRisk', riskId: ids.risk, decisionId: ids.decision },
    s,
    '/root',
    now
  );
  t.is(parseDocument(w[0].afterBytes, 'risk').frontmatter.state, 'mitigated');
  t.deepEqual(w[0].beforeBytes, s.getRawBytes(ids.risk));
});
test('20 SetRiskState', (t) => {
  const r = record(ids.risk, 'risk', {
    id: ids.risk,
    effort: E,
    title: 'R',
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'open',
    likelihood: 'low',
    severity: 'high',
  });
  const f = record(ids.finding, 'finding', {
    id: ids.finding,
    effort: E,
    title: 'F',
    created_at: '2025-01-01T00:00:00.000Z',
    kind: 'x',
  });
  const s = snap([r, f]);
  const w = planMutation(
    {
      type: 'SetRiskState',
      riskId: ids.risk,
      state: 'realized',
      evidence: [ids.finding],
    },
    s,
    '/root',
    now
  );
  t.is(parseDocument(w[0].afterBytes, 'risk').frontmatter.state, 'realized');
  t.deepEqual(parseDocument(w[0].afterBytes, 'risk').frontmatter.evidence, [
    ids.finding,
  ]);
  t.deepEqual(w[0].beforeBytes, s.getRawBytes(ids.risk));
});
test('21 WriteBlob', (t) => {
  const id = 'blb-payload--0123456789abcdef';
  const w = planMutation(
    {
      type: 'WriteBlob',
      id,
      effort: E,
      title: 'Payload',
      body: '# longform research\n',
      kind: 'markdown',
    },
    snap(),
    '/root',
    now
  );
  one(t, w, id, `blobs/${id}.md`, 'create', {
    id,
    effort: E,
    title: 'Payload',
    kind: 'markdown',
    created_at: now.toISOString(),
  });
  t.is(
    parseDocument(w[0].afterBytes, 'blob').body.trim(),
    '# longform research'
  );
});
test('22 WriteCitation with URL body and no blob', (t) => {
  const id = 'cit-paper--0123456789abcdef';
  const w = planMutation(
    {
      type: 'WriteCitation',
      id,
      effort: E,
      title: 'Paper',
      body: 'https://example.com/paper',
      role: 'evidence',
    },
    snap(),
    '/root',
    now
  );
  one(t, w, id, `citations/${id}.md`, 'create', {
    id,
    effort: E,
    title: 'Paper',
    role: 'evidence',
    created_at: now.toISOString(),
  });
  t.is(
    parseDocument(w[0].afterBytes, 'citation').body.trim(),
    'https://example.com/paper'
  );
});
test('23 WriteCitation with optional blob', (t) => {
  const blobId = 'blb-payload--0123456789abcdef';
  const citId = 'cit-dump--0123456789abcdef';
  const blob = record(blobId, 'blob', {
    id: blobId,
    effort: E,
    title: 'Payload',
    created_at: '2025-01-01T00:00:00.000Z',
    kind: 'markdown',
  });
  const w = planMutation(
    {
      type: 'WriteCitation',
      id: citId,
      effort: E,
      title: 'Dump cite',
      body: 'Local research dump',
      blob: blobId,
      role: 'evidence',
    },
    snap([blob]),
    '/root',
    now
  );
  t.is(parseDocument(w[0].afterBytes, 'citation').frontmatter.blob, blobId);
});
test('WriteCitation rejects cites before planning a write', (t) => {
  t.throws(
    () =>
      planMutation(
        {
          type: 'WriteCitation',
          id: 'cit-paper--0123456789abcdef',
          effort: E,
          title: 'Paper',
          body: 'https://example.com/paper',
          cites: ['cit-other--0123456789abcdef'],
        } as unknown as import('../schemas.js').ProofMutation,
        snap(),
        '/root',
        now
      ),
    { message: /WriteCitation does not accept cites/ }
  );
});
test('WriteBlob rejects cites before planning a write', (t) => {
  t.throws(
    () =>
      planMutation(
        {
          type: 'WriteBlob',
          id: 'blb-payload--0123456789abcdef',
          effort: E,
          title: 'Payload',
          body: '# longform research\n',
          cites: ['cit-paper--0123456789abcdef'],
        } as unknown as import('../schemas.js').ProofMutation,
        snap(),
        '/root',
        now
      ),
    { message: /WriteBlob does not accept cites/ }
  );
});
test('24 WriteFinding cites Citation', (t) => {
  const citId = 'cit-paper--0123456789abcdef';
  const citation = record(
    citId,
    'citation',
    {
      id: citId,
      effort: E,
      title: 'Paper',
      created_at: '2025-01-01T00:00:00.000Z',
      role: 'evidence',
    },
    'https://example.com/paper'
  );
  const w = planMutation(
    {
      type: 'WriteFinding',
      id: ids.finding,
      effort: E,
      title: 'F',
      body: 'short',
      kind: 'measurement',
      cites: [citId],
    },
    snap([citation]),
    '/root',
    now
  );
  t.deepEqual(parseDocument(w[0].afterBytes, 'finding').frontmatter.cites, [
    citId,
  ]);
});
test('25 cites must target Citation', (t) => {
  const finding = record(ids.finding, 'finding', {
    id: ids.finding,
    effort: E,
    title: 'F',
    created_at: '2025-01-01T00:00:00.000Z',
    kind: 'x',
  });
  t.throws(
    () =>
      planMutation(
        {
          type: 'WriteDecision',
          id: ids.decision,
          effort: E,
          title: 'D',
          body: '',
          cites: [ids.finding],
        },
        snap([finding]),
        '/root',
        now
      ),
    { message: /cites must target a Citation/ }
  );
});
test('26 cites must belong to same effort', (t) => {
  const otherEffort = 'eff-two--0123456789abcdef';
  const citId = 'cit-paper--0123456789abcdef';
  const citation = record(
    citId,
    'citation',
    {
      id: citId,
      effort: otherEffort,
      title: 'Paper',
      created_at: '2025-01-01T00:00:00.000Z',
    },
    'https://example.com/paper'
  );
  const otherEffortRecord = record(otherEffort, 'effort', {
    id: otherEffort,
    title: 'Other',
    created_at: '2025-01-01T00:00:00.000Z',
    status: 'active',
  });
  t.throws(
    () =>
      planMutation(
        {
          type: 'WriteFinding',
          id: ids.finding,
          effort: E,
          title: 'F',
          body: '',
          kind: 'measurement',
          cites: [citId],
        },
        snap([otherEffortRecord, citation]),
        '/root',
        now
      ),
    {
      message: new RegExp(
        `cites target ${citId} belongs to a different effort`
      ),
    }
  );
});
test('27 Citation.blob must belong to same effort', (t) => {
  const otherEffort = 'eff-two--0123456789abcdef';
  const blobId = 'blb-payload--0123456789abcdef';
  const blob = record(blobId, 'blob', {
    id: blobId,
    effort: otherEffort,
    title: 'Payload',
    created_at: '2025-01-01T00:00:00.000Z',
  });
  const otherEffortRecord = record(otherEffort, 'effort', {
    id: otherEffort,
    title: 'Other',
    created_at: '2025-01-01T00:00:00.000Z',
    status: 'active',
  });
  t.throws(
    () =>
      planMutation(
        {
          type: 'WriteCitation',
          id: 'cit-dump--0123456789abcdef',
          effort: E,
          title: 'Dump cite',
          body: 'Local research dump',
          blob: blobId,
        },
        snap([otherEffortRecord, blob]),
        '/root',
        now
      ),
    {
      message: new RegExp(
        `Citation\\.blob ${blobId} belongs to a different effort`
      ),
    }
  );
});
test('28 Citation.blob must target Blob', (t) => {
  const finding = record(ids.finding, 'finding', {
    id: ids.finding,
    effort: E,
    title: 'F',
    created_at: '2025-01-01T00:00:00.000Z',
    kind: 'x',
  });
  t.throws(
    () =>
      planMutation(
        {
          type: 'WriteCitation',
          id: 'cit-bad--0123456789abcdef',
          effort: E,
          title: 'Bad cite',
          body: 'note',
          blob: ids.finding,
        },
        snap([finding]),
        '/root',
        now
      ),
    { message: /Citation\.blob must target a Blob/ }
  );
});
test('29 same-effort cites and blob happy path', (t) => {
  const blobId = 'blb-payload--0123456789abcdef';
  const citId = 'cit-paper--0123456789abcdef';
  const blob = record(blobId, 'blob', {
    id: blobId,
    effort: E,
    title: 'Payload',
    created_at: '2025-01-01T00:00:00.000Z',
    kind: 'markdown',
  });
  const citation = record(
    citId,
    'citation',
    {
      id: citId,
      effort: E,
      title: 'Paper',
      created_at: '2025-01-01T00:00:00.000Z',
      blob: blobId,
      role: 'evidence',
    },
    'https://example.com/paper'
  );
  const w = planMutation(
    {
      type: 'WriteDecision',
      id: ids.decision,
      effort: E,
      title: 'D',
      body: 'rationale',
      cites: [citId],
    },
    snap([blob, citation]),
    '/root',
    now
  );
  t.deepEqual(parseDocument(w[0].afterBytes, 'decision').frontmatter.cites, [
    citId,
  ]);
});
test('derives_from must target an existing record', (t) => {
  const missing = 'fnd-does-not-exist--0000000000000000';
  t.throws(
    () =>
      planMutation(
        {
          type: 'WriteDecision',
          id: ids.decision,
          effort: E,
          title: 'D',
          body: '',
          derives_from: [missing],
        },
        snap(),
        '/root',
        now
      ),
    { message: new RegExp(`Unknown artifact ${missing}`) }
  );
});
test('derives_from accepts an existing record', (t) => {
  const issue = record(ids.issue, 'issue', {
    id: ids.issue,
    effort: E,
    title: 'I',
    kind: 'blocker',
    created_at: '2025-01-01T00:00:00.000Z',
    status: 'open',
  });
  const w = planMutation(
    {
      type: 'WriteDecision',
      id: ids.decision,
      effort: E,
      title: 'D',
      body: '',
      derives_from: [ids.issue],
    },
    snap([issue]),
    '/root',
    now
  );
  one(t, w, ids.decision, `decisions/${ids.decision}.md`, 'create', {
    id: ids.decision,
    effort: E,
    title: 'D',
    derives_from: [ids.issue],
    created_at: now.toISOString(),
    state: 'proposed',
  });
});
