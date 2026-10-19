import test from 'ava';
import {
  compactionChanges,
  parseCovers,
  type PrimitiveKind,
  type ReadRecord,
} from '@flatbread/proof';
import { buildFindIndex } from './find.js';
import { buildEffortState, STATE_CHARS } from './state.js';

function rec(
  id: string,
  fields: Record<string, unknown> & {
    relations?: ReadRecord['relations'];
  } = {}
): ReadRecord {
  const prefix = id.split('-', 1)[0];
  const kind = (
    {
      eff: 'effort',
      iss: 'issue',
      fnd: 'finding',
      dec: 'decision',
      con: 'constraint',
      rsk: 'risk',
      cit: 'citation',
      blb: 'blob',
    } as Record<string, PrimitiveKind>
  )[prefix];
  const { relations, ...frontmatter } = fields;
  return {
    id,
    kind,
    path: `${id}.md`,
    frontmatter: {
      title: id,
      created_at: '2026-01-01T00:00:00.000Z',
      ...(kind === 'effort' ? { status: 'active' } : { effort: 'eff-a' }),
      ...frontmatter,
    },
    body_excerpt: '',
    relations: relations ?? {},
  };
}

const at = (day: string) => `2026-${day}T10:00:00.000Z`;

/** A small Effort with one record or more for every section. */
function fixture(): ReadRecord[] {
  return [
    rec('eff-a', { title: 'Renderer', created_at: at('01-01') }),
    // A contested question: one rejected Decision, one replaced, one live.
    rec('iss-q', {
      kind: 'question',
      status: 'resolved',
      created_at: at('01-02'),
      relations: { resolved_by: ['dec-b'] },
    }),
    rec('dec-a', {
      state: 'rejected',
      created_at: at('01-03'),
      relations: { derives_from: ['iss-q'], rejected_by: ['dec-b'] },
    }),
    rec('dec-b', {
      state: 'accepted',
      created_at: at('01-03'),
      relations: { derives_from: ['iss-q'], superseded_by: ['dec-c'] },
    }),
    rec('dec-c', {
      state: 'accepted',
      created_at: at('02-01'),
      relations: { supersedes: ['dec-b'] },
    }),
    // Settled filler: a question its one accepted Decision resolves.
    rec('iss-filler', {
      kind: 'question',
      status: 'resolved',
      created_at: at('01-04'),
      relations: { resolved_by: ['dec-filler'] },
    }),
    rec('dec-filler', {
      state: 'accepted',
      created_at: at('01-04'),
      relations: { derives_from: ['iss-filler'] },
    }),
    // An open blocker that gates a proposed Decision.
    rec('fnd-capture', { kind: 'measurement', created_at: at('01-05') }),
    rec('iss-blk', {
      kind: 'blocker',
      status: 'open',
      created_at: at('01-06'),
      relations: { derives_from: ['fnd-capture'] },
    }),
    rec('dec-p', {
      state: 'proposed',
      created_at: at('01-07'),
      relations: { derives_from: ['iss-blk'] },
    }),
    // Risks in three states.
    rec('rsk-open', {
      state: 'open',
      created_at: at('01-08'),
      relations: { derives_from: ['dec-c'] },
    }),
    rec('fnd-ev', { kind: 'measurement', created_at: at('03-01') }),
    rec('rsk-real', {
      state: 'realized',
      created_at: at('01-09'),
      relations: { evidence: ['fnd-ev'] },
    }),
    rec('rsk-mit', {
      state: 'mitigated',
      created_at: at('01-10'),
      relations: { mitigated_by: ['dec-c'] },
    }),
    // Closed without a fix: won't fix, and resolved by a Citation only.
    rec('fnd-why', { kind: 'measurement', created_at: at('01-12') }),
    rec('iss-gap', {
      kind: 'gap',
      status: 'wontfix',
      created_at: at('01-11'),
      relations: { resolved_by: ['fnd-why'] },
    }),
    rec('cit-link', { created_at: at('01-13') }),
    rec('iss-def', {
      kind: 'defect',
      status: 'resolved',
      created_at: at('01-11'),
      relations: { resolved_by: ['cit-link'] },
    }),
    // Dead evidence: a live Decision on a disproved Finding, a Risk one link
    // further, and the disproving Finding, which does not rest on it.
    rec('fnd-old', {
      kind: 'measurement',
      created_at: at('01-14'),
      relations: { invalidated_by: ['fnd-new'] },
    }),
    rec('fnd-new', {
      kind: 'measurement',
      created_at: at('02-10'),
      relations: { derives_from: ['fnd-old'], invalidates: ['fnd-old'] },
    }),
    rec('dec-live', {
      state: 'accepted',
      created_at: at('01-15'),
      relations: { derives_from: ['fnd-old'] },
    }),
    rec('rsk-on', {
      state: 'open',
      created_at: at('01-16'),
      relations: { derives_from: ['dec-live'] },
    }),
    // Lifecycle: a fixed defect and a reopened Decision.
    rec('iss-bug', {
      kind: 'defect',
      status: 'resolved',
      created_at: at('01-17'),
      relations: { resolved_by: ['dec-c'] },
    }),
    rec('dec-reopened', {
      state: 'accepted',
      created_at: at('01-18'),
      reopen_history: [{ at: at('02-05'), reason: 'x', rejected_by: 'dec-c' }],
    }),
    // A retraction and a Constraint in force.
    rec('fnd-ret', {
      kind: 'measurement',
      created_at: at('01-19'),
      retracted: true,
      retracted_at: at('01-20'),
      retracted_reason: 'Duplicate write',
    }),
    rec('con-h', { kind: 'hard', created_at: at('01-21') }),
    // Another Effort's record never counts here.
    rec('dec-other', { effort: 'eff-b', state: 'rejected' }),
  ];
}

function sectionOf(markdown: string, heading: string): string {
  const start = markdown.indexOf(`### ${heading}\n`);
  if (start < 0) return '';
  const next = markdown.indexOf('\n### ', start + 1);
  return markdown.slice(start, next < 0 ? undefined : next);
}

test('counts every record by kind, standing, and own kind', (t) => {
  const state = buildEffortState(buildFindIndex(fixture()), 'eff-a');
  const counts = sectionOf(state.markdown, 'Counts');
  t.regex(counts, /- Issues 6: resolved 4, open 1, wontfix 1\n/);
  t.regex(counts, /  - blocker 1: open 1/);
  t.regex(counts, /  - question 2: resolved 2/);
  t.regex(
    counts,
    /- Decisions 7: accepted 4, proposed 1, rejected 1, superseded 1/
  );
  t.regex(counts, /- Risks 4: open 2, mitigated 1, realized 1/);
  t.regex(counts, /- Findings 6: live 4, invalidated 1, retracted 1/);
  t.regex(counts, /- Decisions ever reopened: 1; now accepted 1/);
  t.regex(
    counts,
    /- Live records: 14 of 25; Citations and Blobs \(1\) are never counted live; retracted: 1/
  );
  t.is(state.records, 25);
  t.is(state.live, 14);
  t.false(state.markdown.includes('dec-other'));
});

test('lists contested topics with what replaced or rejected each version', (t) => {
  const state = buildEffortState(buildFindIndex(fixture()), 'eff-a');
  const topics = sectionOf(state.markdown, 'Contested topics');
  t.regex(topics, /^1 topic:/m);
  t.regex(
    topics,
    /- iss-q \(resolved\), question with 3 Decisions; resolved by \[b\]/
  );
  t.regex(topics, /\[a\] dec-c: now accepted, written 2026-02-01/);
  t.regex(topics, /\[b\] dec-b: superseded by \[a\] on 2026-02-01/);
  t.regex(topics, /\[c\] dec-a: rejected by \[b\] on 2026-01-03/);
  // Settled filler costs only its counts.
  t.false(state.markdown.includes('iss-filler'));
  t.false(state.markdown.includes('dec-filler'));
});

test('shows open blockers with what they gate, and Risks with their state', (t) => {
  const { markdown } = buildEffortState(buildFindIndex(fixture()), 'eff-a');
  const open = sectionOf(markdown, 'Open Issues and blockers');
  t.regex(open, /1 open blocker, 1 open Issue in all/);
  t.regex(open, /- iss-blk \(open\), blocker, open since 2026-01-06/);
  t.regex(open, /  - gates: dec-p \(proposed\)/);
  t.regex(open, /  - comes from: fnd-capture \(live\)/);
  const risks = sectionOf(markdown, 'Risks');
  t.regex(
    risks,
    /- rsk-real \(realized\), raised 2026-01-09; realized on 2026-03-01, evidence fnd-ev \(live\)\n  - mitigation: none/
  );
  t.regex(
    risks,
    /- rsk-open \(open\), raised 2026-01-08\n  - mitigation: none; comes from: dec-c \(accepted\)/
  );
  t.regex(
    risks,
    /- rsk-mit \(mitigated\), raised 2026-01-10; mitigated on 2026-02-01 by dec-c \(accepted\)$/m
  );
  // Realized comes before open, and mitigated after both.
  t.true(risks.indexOf('rsk-real') < risks.indexOf('rsk-open'));
  t.true(risks.indexOf('rsk-open') < risks.indexOf('rsk-mit'));
  t.regex(sectionOf(markdown, 'Constraints in force'), /- hard 1: con-h$/m);
});

test('lists Issues closed without a fix', (t) => {
  const { markdown } = buildEffortState(buildFindIndex(fixture()), 'eff-a');
  const closed = sectionOf(markdown, 'Closed without a fix');
  t.regex(
    closed,
    /- iss-gap \(wontfix\), gap, opened 2026-01-11; closed wontfix on 2026-01-12 by fnd-why \(live\)/
  );
  t.regex(
    closed,
    /- iss-def \(resolved\), defect, opened 2026-01-11; closed resolved on 2026-01-13 by cit-link \(live\)/
  );
  t.false(closed.includes('iss-bug'));
});

test('lists live records on dead evidence, but not the record that overturned it', (t) => {
  const { markdown } = buildEffortState(buildFindIndex(fixture()), 'eff-a');
  const dead = sectionOf(markdown, 'Dead evidence');
  t.regex(
    dead,
    /1 live record rests directly on 1 dead record \(invalidated 1\)/
  );
  t.regex(
    dead,
    /- fnd-old, invalidated by fnd-new on 2026-02-10; rested on by dec-live \(accepted\)\n  - and, one link further, by rsk-on \(open\)/
  );
  t.false(dead.includes('rested on by fnd-new'));
});

test('dates lifecycle changes not shown elsewhere, and lists retractions', (t) => {
  const { markdown } = buildEffortState(buildFindIndex(fixture()), 'eff-a');
  t.regex(markdown, /"Renderer", status active, created 2026-01-01/);
  const lifecycle = sectionOf(markdown, 'Lifecycle');
  t.regex(
    lifecycle,
    /- iss-bug \(resolved\), defect: opened 2026-01-17; resolved on 2026-02-01 by dec-c \(accepted\)/
  );
  t.regex(
    lifecycle,
    /- dec-reopened \(accepted\): written 2026-01-18; reopened on 2026-02-05 after rejection by dec-c/
  );
  // Newest first.
  t.true(lifecycle.indexOf('dec-reopened') < lifecycle.indexOf('iss-bug'));
  // Shown in other sections, so not repeated here.
  for (const id of ['dec-p', 'dec-a', 'fnd-old', 'iss-gap'])
    t.false(lifecycle.includes(id), id);
  const retractions = sectionOf(markdown, 'Retractions');
  t.regex(retractions, /1 retracted record, none of them live./);
  t.regex(
    retractions,
    /- fnd-ret, finding \(measurement\), written 2026-01-19, retracted on 2026-01-20: Duplicate write/
  );
});

test('a large Effort shows fewer entries and says how many it left out', (t) => {
  const records = fixture();
  // Sixty contested questions with long ids, each with two Decisions.
  for (let i = 0; i < 60; i++) {
    const n = String(i).padStart(2, '0');
    const long = `-${'x'.repeat(170)}--${n}`;
    records.push(
      rec(`iss-question${long}`, {
        kind: 'question',
        status: 'resolved',
        created_at: at('04-01'),
      }),
      rec(`dec-winner${long}`, {
        state: 'accepted',
        created_at: at('04-02'),
        relations: { derives_from: [`iss-question${long}`] },
      }),
      rec(`dec-loser${long}`, {
        state: 'rejected',
        created_at: at('04-02'),
        relations: {
          derives_from: [`iss-question${long}`],
          rejected_by: [`dec-winner${long}`],
        },
      })
    );
  }
  const state = buildEffortState(buildFindIndex(records), 'eff-a');
  t.true(state.capped);
  t.true(state.markdown.length <= STATE_CHARS);
  const topics = state.sections.find((s) => s.heading === 'Contested topics');
  t.is(topics?.total, 61);
  t.true((topics?.shown ?? 0) < 61);
  t.regex(
    state.markdown,
    new RegExp(`- … ${61 - (topics?.shown ?? 0)} more topics`)
  );
  // Counts are never cut.
  t.regex(state.markdown, /  - question 62: resolved 62/);
});

test('a list cut inside an entry marks the state capped', (t) => {
  const records = [
    rec('eff-a', { created_at: at('01-01') }),
    rec('iss-q', { kind: 'question', status: 'open', created_at: at('01-02') }),
  ];
  for (let i = 1; i <= 7; i++)
    records.push(
      rec(`dec-option-${i}`, {
        state: 'proposed',
        created_at: at(`01-${String(i + 2).padStart(2, '0')}`),
        relations: { derives_from: ['iss-q'] },
      })
    );
  const state = buildEffortState(buildFindIndex(records), 'eff-a');
  t.regex(state.markdown, /  - gates: .*, and 3 more/);
  t.true(state.capped);
  // The topic keeps the newest live versions and names what it left out.
  const topics = sectionOf(state.markdown, 'Contested topics');
  t.regex(topics, /\[a\] dec-option-7: now proposed/);
  t.regex(topics, /  - … 2 more versions, 2 of them live/);
  t.false(topics.includes('dec-option-1:'));
});

test('a retracted duplicate Decision is not a version in a topic', (t) => {
  const records = [
    rec('eff-a', { created_at: at('01-01') }),
    rec('iss-q', {
      kind: 'question',
      status: 'resolved',
      created_at: at('01-02'),
      relations: { resolved_by: ['dec-one'] },
    }),
    rec('dec-one', {
      state: 'accepted',
      created_at: at('01-03'),
      relations: { derives_from: ['iss-q'] },
    }),
    rec('dec-dup', {
      state: 'accepted',
      created_at: at('01-03'),
      retracted: true,
      retracted_at: at('01-03'),
      relations: { derives_from: ['iss-q'] },
    }),
  ];
  const { markdown } = buildEffortState(buildFindIndex(records), 'eff-a');
  t.regex(sectionOf(markdown, 'Contested topics'), /^0 topics:/m);
  t.regex(sectionOf(markdown, 'Retractions'), /- dec-dup, decision/);
});

test('dates a replaced Risk by what replaced it, and sorts lifecycle by change', (t) => {
  const records = [
    rec('eff-a', { created_at: at('01-01') }),
    rec('fnd-early', { created_at: at('03-02') }),
    rec('rsk-old', {
      state: 'realized',
      created_at: at('01-04'),
      relations: { evidence: ['fnd-early'], superseded_by: ['rsk-new'] },
    }),
    rec('rsk-new', {
      state: 'open',
      created_at: at('05-04'),
      relations: { supersedes: ['rsk-old'] },
    }),
    rec('fnd-late', { created_at: at('09-01') }),
    rec('iss-old', {
      kind: 'defect',
      status: 'resolved',
      created_at: at('01-05'),
      relations: { resolved_by: ['fnd-late'] },
    }),
    rec('iss-new', {
      kind: 'defect',
      status: 'resolved',
      created_at: at('03-01'),
      relations: { resolved_by: ['fnd-early'] },
    }),
  ];
  const { markdown } = buildEffortState(buildFindIndex(records), 'eff-a');
  t.regex(
    sectionOf(markdown, 'Risks'),
    /- rsk-old \(superseded\), raised 2026-01-04; superseded by rsk-new on 2026-05-04$/m
  );
  const lifecycle = sectionOf(markdown, 'Lifecycle');
  t.true(lifecycle.indexOf('iss-old') < lifecycle.indexOf('iss-new'));
});

test('section totals count Constraints and every dead record', (t) => {
  const records = [rec('eff-a', { created_at: at('01-01') })];
  for (let i = 1; i <= 3; i++)
    records.push(rec(`con-h${i}`, { kind: 'hard', created_at: at('01-02') }));
  // Five replaced Findings, each still cited by a live Decision.
  for (let i = 1; i <= 5; i++)
    records.push(
      rec(`fnd-v${i}`, {
        created_at: at('01-03'),
        relations: { superseded_by: [`fnd-w${i}`] },
      }),
      rec(`fnd-w${i}`, {
        created_at: at('01-04'),
        relations: { supersedes: [`fnd-v${i}`] },
      }),
      rec(`dec-on${i}`, {
        state: 'accepted',
        created_at: at('01-05'),
        relations: { derives_from: [`fnd-v${i}`] },
      })
    );
  const state = buildEffortState(buildFindIndex(records), 'eff-a');
  const of = (heading: string) =>
    state.sections.find((s) => s.heading === heading);
  t.deepEqual(of('Constraints in force'), {
    heading: 'Constraints in force',
    total: 3,
    shown: 3,
  });
  t.is(of('Dead evidence')?.total, 5);
});

/** A head compaction written when `fnd-old` was live, resting on it. */
function compacted(records: ReadRecord[]): ReadRecord[] {
  return [
    ...records,
    rec('fnd-summary', {
      kind: 'compaction',
      created_at: at('01-20'),
      covers: ['dec-live@accepted', 'fnd-old@live', 'iss-blk@open'],
      relations: { derives_from: ['fnd-old', 'dec-live'] },
    }),
  ];
}

function changedIds(records: ReadRecord[]): string[] {
  const all = records.filter((record) => record.frontmatter.effort === 'eff-a');
  const head = all.find((record) => record.id === 'fnd-summary') as ReadRecord;
  return compactionChanges(
    parseCovers(head.frontmatter.covers),
    all.map((record) => ({
      id: record.id,
      kind: record.kind,
      frontmatter: { ...record.frontmatter, ...record.relations },
    }))
  ).map((change) => change.id);
}

test('the head compaction has its own section: stale or not, and what it no longer matches', (t) => {
  const records = compacted(fixture());
  const state = buildEffortState(buildFindIndex(records), 'eff-a');
  const section = sectionOf(state.markdown, 'Head compaction');
  t.regex(
    section,
    /- fnd-summary \(2026-01-20\)\. Stale: yes \(1 of the 2 records it derives from changed standing: fnd-old \(live -> invalidated\)\)\./
  );
  t.true(
    section.includes(
      '\n- A compaction is stale when a record it derives from changed standing after it was written, or when a Finding invalidated it.'
    )
  );
  const changed = changedIds(records);
  t.true(changed.length > 10);
  const line = section
    .split('\n')
    .find((entry) => entry.includes('differ from the live set'));
  t.regex(
    line ?? '',
    new RegExp(
      `^- ${changed.length} records differ from the live set it covers \\(exact\\): `
    )
  );
  t.deepEqual(
    [...(line ?? '').matchAll(/(\S+) \((?:new|[a-z]+ -> [a-z]+)\)/g)].map(
      (match) => match[1]
    ),
    changed.slice(0, 10)
  );
  t.true(line?.endsWith(`, and ${changed.length - 10} more`));
  t.true(line?.includes('fnd-old (live -> invalidated)'));
  t.true(line?.includes('dec-p (new)'));
  t.like(
    state.sections.find((entry) => entry.heading === 'Head compaction'),
    { total: changed.length, shown: 10 }
  );
  t.false(sectionOf(state.markdown, 'Dead evidence').includes('fnd-summary'));
  // A compaction rests on everything, so it is not listed as resting.
  t.regex(
    sectionOf(state.markdown, 'Dead evidence'),
    /1 live record rests directly on 1 dead record/
  );
});

test('a compaction nothing moved under reads as not stale', (t) => {
  const records = [
    rec('eff-a', { created_at: at('01-01') }),
    rec('fnd-m', { kind: 'measurement', created_at: at('01-02') }),
    rec('fnd-summary', {
      kind: 'compaction',
      created_at: at('01-03'),
      covers: ['fnd-m@live'],
      relations: { derives_from: ['fnd-m'] },
    }),
  ];
  const section = sectionOf(
    buildEffortState(buildFindIndex(records), 'eff-a').markdown,
    'Head compaction'
  );
  t.regex(
    section,
    /- fnd-summary \(2026-01-03\)\. Stale: no \(none of the 1 record it derives from changed standing; not invalidated\)\.\n- 0 records differ from the live set it covers \(exact\)\.\n/
  );
});

/** The compacted fixture plus sixty contested questions with long ids. */
function large(idLength: number): ReadRecord[] {
  const records = compacted(fixture());
  for (let i = 0; i < 60; i++) {
    const n = String(i).padStart(2, '0');
    const long = `-${'x'.repeat(idLength)}--${n}`;
    records.push(
      rec(`iss-question${long}`, {
        kind: 'question',
        status: 'resolved',
        created_at: at('04-01'),
      }),
      rec(`dec-winner${long}`, {
        state: 'accepted',
        created_at: at('04-02'),
        relations: { derives_from: [`iss-question${long}`] },
      }),
      rec(`dec-loser${long}`, {
        state: 'rejected',
        created_at: at('04-02'),
        relations: {
          derives_from: [`iss-question${long}`],
          rejected_by: [`dec-winner${long}`],
        },
      })
    );
  }
  return records;
}

test('a large Effort cuts the compaction list before other lists, and keeps its count', (t) => {
  const shown = (state: ReturnType<typeof buildEffortState>, heading: string) =>
    state.sections.find((entry) => entry.heading === heading)?.shown;
  // A little over the size aim: the compaction list goes to 5 first, while
  // Contested topics keeps all 12 it shows at full size.
  const over = buildEffortState(buildFindIndex(large(140)), 'eff-a');
  t.true(over.markdown.length <= STATE_CHARS);
  t.is(shown(over, 'Head compaction'), 5);
  t.is(shown(over, 'Contested topics'), 12);
  // Far over: the list goes, and the exact count stays.
  const records = large(180);
  const state = buildEffortState(buildFindIndex(records), 'eff-a');
  const changed = changedIds(records);
  t.true(
    sectionOf(state.markdown, 'Head compaction').includes(
      `- ${
        changed.length
      } records differ from the live set it covers (exact); \`proof get fnd-summary\` lists ${
        changed.length > 25 ? '25 of them' : 'them'
      }.`
    )
  );
  t.like(
    state.sections.find((entry) => entry.heading === 'Head compaction'),
    { total: changed.length, shown: 0 }
  );
  t.true(state.capped);
  // Counts are never cut.
  t.regex(state.markdown, /  - question 62: resolved 62/);
});
