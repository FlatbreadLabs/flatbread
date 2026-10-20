import test from 'ava';
import type { PrimitiveKind, ReadRecord } from '@flatbread/proof';
import {
  buildOverlay,
  conflictsInScope,
  matchPullRequest,
  recordFromFile,
  type RefSide,
} from './refs.js';

const KINDS: Record<string, PrimitiveKind> = {
  eff: 'effort',
  iss: 'issue',
  fnd: 'finding',
  dec: 'decision',
  cit: 'citation',
};

function rec(
  id: string,
  fields: Record<string, unknown> & {
    relations?: ReadRecord['relations'];
  } = {}
): ReadRecord {
  const kind = KINDS[id.split('-', 1)[0]];
  const { relations, ...frontmatter } = fields;
  return {
    id,
    kind,
    path: `${id}.md`,
    frontmatter: {
      title: id,
      created_at: '2026-01-01T00:00:00.000Z',
      ...(kind === 'effort' ? {} : { effort: 'eff-a' }),
      ...frontmatter,
    },
    body_excerpt: '',
    relations: relations ?? {},
  };
}

/**
 * A ref holding the base ids plus its own records. `baseChanged` names ids
 * the working tree also changed since the ref split off.
 */
function side(
  name: string,
  base: readonly ReadRecord[],
  changed: readonly ReadRecord[],
  extra: Partial<RefSide> = {}
): RefSide {
  return {
    name,
    sha: `${name.length}`.padEnd(40, '0'),
    ids: new Set([...base, ...changed].map((record) => record.id)),
    changed: new Map(changed.map((record) => [record.id, record])),
    baseChanged: new Set(),
    sameAsBase: new Set(),
    ...extra,
  };
}

const question = rec('iss-q', { kind: 'question', status: 'open' });

test('tags say main, only on a ref, or how a ref differs, with its draft PR', (t) => {
  const base = [rec('eff-a'), question, rec('dec-a', { state: 'proposed' })];
  const overlay = buildOverlay(base, [
    side('feat/x', base, [
      rec('dec-a', { state: 'accepted' }),
      rec('dec-b', { state: 'proposed' }),
    ]),
    side('feat/y', base, [], {
      pr: { number: 7, headRefName: 'feat/y', isDraft: true, author: 'ana' },
    }),
  ]);
  t.is(overlay.tag('iss-q'), 'main');
  t.is(overlay.tag('dec-b'), 'only on feat/x');
  t.is(overlay.tag('dec-a'), 'differs on feat/x: proposed vs accepted');
  t.deepEqual([...overlay.proposed].sort(), ['dec-a', 'dec-b']);
  t.deepEqual(overlay.conflicts, []);
  const drafted = buildOverlay(base, [
    side('origin/feat/y', base, [rec('dec-c')], {
      pr: { number: 7, headRefName: 'feat/y', isDraft: true, author: 'ana' },
    }),
  ]);
  t.is(drafted.tag('dec-c'), 'only on origin/feat/y (draft #7 by ana)');
});

test('reverse links come from forward edges, never from stored reverse fields', (t) => {
  const base = [
    rec('eff-a'),
    // A stale stored reverse field the forward edges do not back.
    rec('fnd-a', { relations: { superseded_by: ['fnd-ghost'] } }),
  ];
  const overlay = buildOverlay(base, [
    side('feat/x', base, [
      rec('fnd-b', { relations: { supersedes: ['fnd-a'] } }),
    ]),
  ]);
  const a = overlay.records.find((record) => record.id === 'fnd-a');
  t.deepEqual(a?.relations.superseded_by, ['fnd-b']);
  t.is(overlay.tag('fnd-a'), 'main');
  // With no ref, the stored field is dropped too.
  t.is(
    buildOverlay(base, []).records.find((record) => record.id === 'fnd-a')
      ?.relations.superseded_by,
    undefined
  );
});

test('conflict: two accepted Decisions on one question across refs', (t) => {
  const base = [rec('eff-a'), question];
  const decision = (id: string) =>
    rec(id, { state: 'accepted', relations: { derives_from: ['iss-q'] } });
  const overlay = buildOverlay(base, [
    side('feat/x', base, [decision('dec-x')]),
    side('feat/y', base, [decision('dec-y')]),
  ]);
  t.deepEqual(
    overlay.conflicts.map((conflict) => conflict.text),
    ['two accepted Decisions on question iss-q: dec-x (feat/x), dec-y (feat/y)']
  );
  t.is(overlay.conflicts[0].effort, 'eff-a');
  // A ref that accepts its own Decision and rejects the base's is a proposal.
  const accepted = decision('dec-base');
  const replaced = buildOverlay(
    [...base, accepted],
    [
      side(
        'feat/x',
        [...base, accepted],
        [
          decision('dec-x'),
          rec('dec-base', {
            state: 'rejected',
            relations: { derives_from: ['iss-q'], rejected_by: ['dec-x'] },
          }),
        ]
      ),
    ]
  );
  t.deepEqual(replaced.conflicts, []);
});

test('conflict: a Decision one ref accepts and another rejects, proposed on the base', (t) => {
  const proposed = rec('dec-x', {
    state: 'proposed',
    relations: { derives_from: ['iss-q'] },
  });
  const base = [rec('eff-a'), question, proposed];
  const decision = (id: string) =>
    rec(id, { state: 'accepted', relations: { derives_from: ['iss-q'] } });
  const overlay = buildOverlay(base, [
    side('feat/a', base, [decision('dec-x')]),
    side('feat/b', base, [
      decision('dec-y'),
      rec('dec-x', {
        state: 'rejected',
        relations: { derives_from: ['iss-q'], rejected_by: ['dec-y'] },
      }),
    ]),
  ]);
  // The base never accepted dec-x, so feat/b rejecting it does not settle
  // feat/a's acceptance: the two refs answer the question differently.
  t.true(
    overlay.conflicts.some(
      (conflict) =>
        conflict.text ===
        'two accepted Decisions on question iss-q: dec-x (feat/a), dec-y (feat/b)'
    ),
    overlay.conflicts.map((conflict) => conflict.text).join('\n')
  );
});

test('conflict: two accepted Decisions that resolve one question, with no derives_from', (t) => {
  const base = [rec('eff-a'), question];
  const accepted = (id: string) => rec(id, { state: 'accepted' });
  const resolved = (by: string) =>
    rec('iss-q', {
      kind: 'question',
      status: 'resolved',
      relations: { resolved_by: [by] },
    });
  const overlay = buildOverlay(base, [
    side('feat/x', base, [accepted('dec-x'), resolved('dec-x')]),
    side('feat/y', base, [accepted('dec-y'), resolved('dec-y')]),
  ]);
  // One line: rule 1 names the question, so the resolved_by rule stays quiet.
  t.deepEqual(
    overlay.conflicts.map((conflict) => conflict.text),
    ['two accepted Decisions on question iss-q: dec-x (feat/x), dec-y (feat/y)']
  );
  // Each Decision card lists the question it resolves.
  t.deepEqual(
    overlay.records.find((record) => record.id === 'iss-q')?.relations
      .resolved_by,
    ['dec-x', 'dec-y']
  );
  // Resolved by records that are not accepted Decisions: the Issue rule.
  const findings = buildOverlay(base, [
    side('feat/x', base, [rec('fnd-x'), resolved('fnd-x')]),
    side('feat/y', base, [rec('fnd-y'), resolved('fnd-y')]),
  ]);
  t.deepEqual(
    findings.conflicts.map((conflict) => conflict.text),
    ['iss-q resolved differently: by fnd-x on feat/x; by fnd-y on feat/y']
  );
});

test('an older version of another ref, as origin/feat/x behind feat/x, makes no conflict', (t) => {
  const base = [rec('eff-a')];
  const overlay = buildOverlay(base, [
    side('feat/x', base, [rec('dec-x', { state: 'accepted' })]),
    side('origin/feat/x', base, [rec('dec-x', { state: 'proposed' })], {
      older: new Set(['dec-x']),
    }),
  ]);
  t.deepEqual(overlay.conflicts, []);
  t.is(overlay.tag('dec-x'), 'only on feat/x');
  t.is(
    overlay.records.find((record) => record.id === 'dec-x')?.frontmatter.state,
    'accepted'
  );
});

test('a record a ref deletes is tagged and proposed', (t) => {
  const base = [rec('eff-a'), rec('fnd-a')];
  const overlay = buildOverlay(base, [
    side('feat/x', [rec('eff-a')], [], { deleted: new Set(['fnd-a']) }),
  ]);
  t.is(overlay.tag('fnd-a'), 'deleted on feat/x');
  t.true(overlay.proposed.has('fnd-a'));
});

test('a pull request matches its branch exactly, or behind a remote name', (t) => {
  const prs = [
    { number: 1, headRefName: 'x', isDraft: true, author: 'bo' },
    { number: 2, headRefName: 'feat/x', isDraft: true, author: 'ana' },
  ];
  t.is(matchPullRequest('feat/x', prs, ['origin'])?.number, 2);
  t.is(matchPullRequest('origin/feat/x', prs, ['origin'])?.number, 2);
  t.is(matchPullRequest('refs/remotes/origin/x', prs, ['origin'])?.number, 1);
  t.is(matchPullRequest('other/x', prs, ['origin']), undefined);
});

test('conflicts in scope are capped, with the total', (t) => {
  const base = [rec('eff-a')];
  const changed = Array.from({ length: 15 }, (_, i) =>
    rec(`iss-${String(i).padStart(2, '0')}`, { status: 'resolved' })
  );
  const overlay = buildOverlay(
    [
      ...base,
      ...changed.map((record) => ({
        ...record,
        frontmatter: { ...record.frontmatter, status: 'open' },
      })),
    ],
    [
      side('feat/x', base, changed, {
        baseChanged: new Set(changed.map((record) => record.id)),
      }),
    ]
  );
  const { texts, total } = conflictsInScope(overlay, 'eff-a');
  t.is(texts.length, 12);
  t.is(total, 15);
  t.is(conflictsInScope(overlay, 'eff-b').total, 0);
});

test('conflict: one record superseded by two different records', (t) => {
  const base = [rec('eff-a'), rec('fnd-a')];
  const overlay = buildOverlay(base, [
    side('feat/x', base, [
      rec('fnd-x', { relations: { supersedes: ['fnd-a'] } }),
    ]),
    side('feat/y', base, [
      rec('fnd-y', { relations: { supersedes: ['fnd-a'] } }),
    ]),
  ]);
  t.deepEqual(
    overlay.conflicts.map((conflict) => conflict.text),
    ['fnd-a superseded by two records: fnd-x (feat/x), fnd-y (feat/y)']
  );
});

test('conflict: one id with a different state on two sides that both changed it', (t) => {
  const base = [rec('eff-a'), rec('iss-a', { status: 'wontfix' })];
  const resolved = rec('iss-a', { status: 'resolved' });
  // The working tree changed it too since feat/x split off: a conflict.
  const both = buildOverlay(base, [
    side('feat/x', base, [resolved], { baseChanged: new Set(['iss-a']) }),
  ]);
  t.deepEqual(
    both.conflicts.map((conflict) => conflict.text),
    ['iss-a has different status: wontfix on base; resolved on feat/x']
  );
  // Only the ref changed it: a proposal, shown on the tag.
  const proposal = buildOverlay(base, [side('feat/x', base, [resolved])]);
  t.deepEqual(proposal.conflicts, []);
  t.is(proposal.tag('iss-a'), 'differs on feat/x: wontfix vs resolved');
  // Two refs that each changed it differently conflict with each other.
  const refs = buildOverlay(base, [
    side('feat/x', base, [resolved]),
    side('feat/y', base, [rec('iss-a', { status: 'deferred' })]),
  ]);
  t.deepEqual(
    refs.conflicts.map((conflict) => conflict.text),
    ['iss-a has different status: resolved on feat/x; deferred on feat/y']
  );
});

test('conflict: a retraction on one side of a record another side relies on', (t) => {
  const base = [rec('eff-a'), rec('fnd-a')];
  const overlay = buildOverlay(base, [
    side('feat/x', base, [
      rec('fnd-a', { retracted: true, retracted_reason: 'wrong rig' }),
    ]),
    side('feat/y', base, [
      rec('dec-y', {
        state: 'proposed',
        relations: { derives_from: ['fnd-a'] },
      }),
    ]),
  ]);
  t.deepEqual(
    overlay.conflicts.map((conflict) => conflict.text),
    ['fnd-a retracted on feat/x; dec-y on feat/y relies on it (derives_from)']
  );
  // A ref that retracts a Finding and the Decision on it: the base's
  // Decision held that reliance before the split, so no conflict. A base
  // Decision added after the split is one.
  const relying = rec('dec-a', { relations: { derives_from: ['fnd-a'] } });
  const later = rec('dec-b', { relations: { derives_from: ['fnd-a'] } });
  const both = buildOverlay(
    [...base, relying, later],
    [
      side(
        'feat/r',
        [...base, relying],
        [rec('fnd-a', { retracted: true }), rec('dec-a', { retracted: true })],
        { baseChanged: new Set(['dec-b']) }
      ),
    ]
  );
  t.deepEqual(
    both.conflicts.map((conflict) => conflict.text),
    ['fnd-a retracted on feat/r; dec-b on base relies on it (derives_from)']
  );
});

test('conflict: two head compactions for one Effort', (t) => {
  const compaction = (id: string, extra: ReadRecord['relations'] = {}) =>
    rec(id, { kind: 'compaction', relations: extra });
  const base = [rec('eff-a'), compaction('fnd-c0')];
  const overlay = buildOverlay(base, [
    side('feat/x', base, [compaction('fnd-cx', { supersedes: ['fnd-c0'] })]),
    side('feat/y', base, [compaction('fnd-cy', { supersedes: ['fnd-c0'] })]),
  ]);
  // Rule 2 leaves compactions to this rule, so one line, not two.
  t.deepEqual(
    overlay.conflicts.map((conflict) => conflict.text),
    ['eff-a has 2 head compactions: fnd-cx (feat/x), fnd-cy (feat/y)']
  );
});

test('a record file parses as the find index reads it', (t) => {
  const record = recordFromFile(
    '.flatbread-proof/decisions/dec-a.md',
    "---\nid: dec-a--0123456789abcdef\neffort: eff-a\ntitle: Pick A\nstate: accepted\ncreated_at: '2026-01-02T00:00:00.000Z'\nderives_from:\n  - iss-q\n---\nBody text.\n"
  );
  t.like(record, {
    id: 'dec-a--0123456789abcdef',
    kind: 'decision',
    frontmatter: { effort: 'eff-a', state: 'accepted' },
    relations: { derives_from: ['iss-q'] },
  });
  t.is(record?.body_excerpt.trim(), 'Body text.');
});
