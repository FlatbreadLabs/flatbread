import test from 'ava';
import { parseDocument, serializeDocument } from '../frontmatter.js';
import { createEffortGraphSnapshot } from '../snapshot.js';
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
  return createEffortGraphSnapshot(
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
