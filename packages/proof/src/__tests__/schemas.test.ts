import test from 'ava';
import { parse as parseMarkdown } from '@flatbread/transformer-markdown';
import {
  ProofMutationSchema,
  EffortFrontmatterSchema,
  IssueFrontmatterSchema,
  RiskFrontmatterSchema,
} from '../schemas.js';
import { serializeDocument } from '../frontmatter.js';

const suffix = '0123456789abcdef';
const eff = `eff-anchor--${suffix}`;
const iss = `iss-question--${suffix}`;
const fnd = `fnd-observation--${suffix}`;
const dec = `dec-choice--${suffix}`;
const rsk = `rsk-hazard--${suffix}`;

const validMutations: Record<string, Record<string, unknown>> = {
  CreateEffort: { type: 'CreateEffort', title: 'Anchor', body: '', slug: 'a' },
  SetEffortStatus: { type: 'SetEffortStatus', effortId: eff, status: 'paused' },
  WriteIssue: {
    type: 'WriteIssue',
    effort: eff,
    title: 'Q',
    body: 'b',
    kind: 'question',
    derives_from: [fnd],
  },
  WriteFinding: {
    type: 'WriteFinding',
    effort: eff,
    title: 'F',
    body: 'b',
    kind: 'measurement',
    supersedes: [fnd],
  },
  WriteDecision: {
    type: 'WriteDecision',
    effort: eff,
    title: 'D',
    body: 'b',
    invalidates: [dec],
  },
  WriteConstraint: {
    type: 'WriteConstraint',
    effort: eff,
    title: 'C',
    body: 'b',
    kind: 'hard',
  },
  WriteRisk: {
    type: 'WriteRisk',
    effort: eff,
    title: 'R',
    body: 'b',
    likelihood: 'low',
    severity: 'high',
  },
  WriteCitation: {
    type: 'WriteCitation',
    effort: eff,
    title: 'Paper',
    body: 'https://example.com/paper',
    role: 'evidence',
  },
  WriteBlob: {
    type: 'WriteBlob',
    effort: eff,
    title: 'Payload',
    body: '# longform\n',
    kind: 'markdown',
  },
  Supersede: { type: 'Supersede', supersederId: dec, targetId: dec },
  Invalidate: { type: 'Invalidate', findingId: fnd, targetId: dec },
  ResolveIssue: {
    type: 'ResolveIssue',
    issueId: iss,
    resolution: 'resolved',
    resolvedBy: [dec],
  },
  AcceptDecision: { type: 'AcceptDecision', decisionId: dec },
  MitigateRisk: { type: 'MitigateRisk', riskId: rsk, decisionId: dec },
  SetRiskState: {
    type: 'SetRiskState',
    riskId: rsk,
    state: 'realized',
    evidence: [fnd],
  },
};

test('each of the 15 mutation schemas accepts a valid input', (t) => {
  const types = Object.keys(validMutations);
  t.is(types.length, 15);
  for (const type of types) {
    t.notThrows(() => ProofMutationSchema.parse(validMutations[type]), type);
  }
});

test('union rejects an unknown discriminant', (t) => {
  t.throws(() => ProofMutationSchema.parse({ type: 'DeleteEverything' }));
});

test('rejects bad enum values', (t) => {
  t.throws(() =>
    ProofMutationSchema.parse({
      type: 'SetEffortStatus',
      effortId: eff,
      status: 'archived',
    })
  );
  t.throws(() =>
    ProofMutationSchema.parse({
      ...validMutations.WriteRisk,
      likelihood: 'certain',
    })
  );
  t.throws(() =>
    ProofMutationSchema.parse({
      ...validMutations.SetRiskState,
      state: 'mitigated',
    })
  );
  t.throws(() =>
    ProofMutationSchema.parse({
      ...validMutations.WriteConstraint,
      kind: 'squishy',
    })
  );
});

test('rejects malformed ids', (t) => {
  t.throws(() =>
    ProofMutationSchema.parse({
      type: 'AcceptDecision',
      decisionId: 'not-an-id',
    })
  );
  t.throws(() =>
    ProofMutationSchema.parse({
      ...validMutations.WriteIssue,
      effort: 'eff-UPPER--0123456789abcdef',
    })
  );
  t.throws(() =>
    ProofMutationSchema.parse({
      ...validMutations.ResolveIssue,
      resolvedBy: ['dec-short--abc'],
    })
  );
});

test('WriteCitation allows URL body without blob; records cite Citation ids', (t) => {
  t.notThrows(() =>
    ProofMutationSchema.parse({
      type: 'WriteCitation',
      effort: eff,
      title: 'External link',
      body: 'https://example.com/research',
    })
  );
  t.notThrows(() =>
    ProofMutationSchema.parse({
      ...validMutations.WriteCitation,
      blob: `blb-payload--${suffix}`,
      role: 'context',
    })
  );
  t.notThrows(() =>
    ProofMutationSchema.parse({
      ...validMutations.WriteFinding,
      cites: [`cit-paper--${suffix}`],
    })
  );
});

test('CreateEffort rejects cites', (t) => {
  const result = ProofMutationSchema.safeParse({
    ...validMutations.CreateEffort,
    cites: [`cit-paper--${suffix}`],
  });
  t.false(result.success);
  if (!result.success)
    t.true(
      result.error.issues.some(
        (issue) =>
          issue.code === 'unrecognized_keys' &&
          issue.keys.includes('cites') &&
          issue.path.length === 0
      )
    );
});

test('WriteCitation and WriteBlob reject relation keys', (t) => {
  for (const type of ['WriteCitation', 'WriteBlob'] as const) {
    const result = ProofMutationSchema.safeParse({
      ...validMutations[type],
      cites: [`cit-paper--${suffix}`],
    });
    t.false(result.success, type);
    if (!result.success)
      t.true(
        result.error.issues.some(
          (issue) =>
            issue.code === 'unrecognized_keys' &&
            issue.keys.includes('cites') &&
            issue.path.length === 0
        ),
        type
      );
  }
});

test('frontmatter schemas passthrough unknown keys', (t) => {
  const parsed = EffortFrontmatterSchema.parse({
    id: eff,
    title: 'Anchor',
    created_at: '2026-07-17T00:00:00.000Z',
    status: 'active',
    hand_authored_note: 'keep me',
  });
  t.is((parsed as Record<string, unknown>).hand_authored_note, 'keep me');
  const issue = IssueFrontmatterSchema.parse({
    id: iss,
    effort: eff,
    title: 'Q',
    created_at: '2026-07-17T00:00:00.000Z',
    kind: 'question',
    status: 'open',
    custom: [1, 2],
  });
  t.deepEqual((issue as Record<string, unknown>).custom, [1, 2]);
  t.throws(() =>
    RiskFrontmatterSchema.parse({
      id: rsk,
      effort: eff,
      title: 'R',
      created_at: '2026-07-17T00:00:00.000Z',
      state: 'open',
      likelihood: 'low',
      severity: 'never',
    })
  );
});

test('serialized documents round-trip through @flatbread/transformer-markdown parse', (t) => {
  const frontmatter = {
    id: dec,
    effort: eff,
    title: 'Adopt the writer',
    state: 'proposed',
    created_at: '2026-07-17T00:00:00.000Z',
    supersedes: [`dec-older--${suffix}`],
    hand_authored: 'still here',
  };
  const body = '# Rationale\n\nBecause it is journaled.\n';
  const doc = serializeDocument(body, frontmatter).toString();
  const vfile = {
    toString: () => doc,
    basename: `${dec}.md`,
    path: `decisions/${dec}.md`,
    stem: dec,
    data: {},
  };
  const node = parseMarkdown(vfile as Parameters<typeof parseMarkdown>[0], {});
  t.is(node.id, dec);
  t.is(node.effort, eff);
  t.is(node.title, 'Adopt the writer');
  t.is(node.state, 'proposed');
  t.deepEqual(node.supersedes, [`dec-older--${suffix}`]);
  t.is(node.hand_authored, 'still here');
  t.is((node._content as { raw: string }).raw.trim(), body.trim());
});
