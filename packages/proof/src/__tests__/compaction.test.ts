import test from 'ava';
import {
  compactionChanges,
  compactionCovers,
  compactionHeads,
  parseCovers,
  recordStanding,
  staleDerivations,
  type CompactionRecord,
} from '../compaction.js';

const suffix = '0123456789abcdef';
const dec = `dec-choice--${suffix}`;
const dec2 = `dec-other--${suffix}`;
const iss = `iss-question--${suffix}`;
const fnd = `fnd-observation--${suffix}`;
const rsk = `rsk-hazard--${suffix}`;

function rec(
  id: string,
  kind: CompactionRecord['kind'],
  frontmatter: Record<string, unknown> = {}
): CompactionRecord {
  return { id, kind, frontmatter: { title: id, ...frontmatter } };
}

test('standing puts retraction, supersession, and invalidation first', (t) => {
  t.is(recordStanding(rec(dec, 'decision', { state: 'accepted' })), 'accepted');
  t.is(recordStanding(rec(iss, 'issue', { status: 'resolved' })), 'resolved');
  t.is(recordStanding(rec(fnd, 'finding')), 'live');
  t.is(
    recordStanding(
      rec(dec, 'decision', { state: 'accepted', invalidated_by: [fnd] })
    ),
    'invalidated'
  );
  t.is(
    recordStanding(
      rec(fnd, 'finding', { superseded_by: [`fnd-x--${suffix}`] })
    ),
    'superseded'
  );
  t.is(
    recordStanding(
      rec(dec, 'decision', { state: 'accepted', retracted: true })
    ),
    'retracted'
  );
});

test('covers holds live records only, plus derives_from targets', (t) => {
  const records = [
    rec(dec, 'decision', { state: 'accepted' }),
    rec(dec2, 'decision', { state: 'rejected' }),
    rec(iss, 'issue', { status: 'resolved' }),
    // An accepted Risk is closed even though Decisions use the same word.
    rec(rsk, 'risk', { state: 'accepted' }),
    rec(fnd, 'finding', { kind: 'compaction' }),
  ];
  t.deepEqual(compactionCovers(records), [`${dec}@accepted`]);
  t.deepEqual(compactionCovers(records, [dec2]), [
    `${dec}@accepted`,
    `${dec2}@rejected`,
  ]);
});

test('changes name added, changed, and departed records', (t) => {
  const covers = parseCovers([
    `${dec}@proposed`,
    `${iss}@open`,
    `${dec2}@rejected`,
  ]);
  const now = [
    rec(dec, 'decision', { state: 'accepted' }),
    rec(iss, 'issue', { status: 'resolved' }),
    rec(dec2, 'decision', { state: 'rejected' }),
    rec(fnd, 'finding'),
  ];
  t.deepEqual(
    compactionChanges(covers, now).map(({ change, id, from, to }) => ({
      change,
      id,
      from,
      to,
    })),
    [
      { change: 'changed', id: dec, from: 'proposed', to: 'accepted' },
      { change: 'added', id: fnd, from: null, to: 'live' },
      { change: 'left', id: iss, from: 'open', to: 'resolved' },
    ]
  );
  t.deepEqual(compactionChanges(parseCovers([`${dec}@accepted`]), []), [
    {
      change: 'left',
      id: dec,
      kind: 'decision',
      title: '',
      from: 'accepted',
      to: null,
    },
  ]);
});

test('a derives_from target that moved makes the compaction stale', (t) => {
  const covers = parseCovers([`${dec}@accepted`, `${dec2}@rejected`]);
  const now = [
    rec(dec, 'decision', { state: 'superseded', superseded_by: [dec2] }),
    rec(dec2, 'decision', { state: 'rejected' }),
  ];
  t.deepEqual(
    staleDerivations(covers, [dec, dec2], now).map((change) => change.id),
    [dec]
  );
  t.deepEqual(staleDerivations(covers, [dec2], now), []);
});

test('heads are live compactions nothing supersedes', (t) => {
  const a = rec(`fnd-a--${suffix}`, 'finding', { kind: 'compaction' });
  const b = rec(`fnd-b--${suffix}`, 'finding', {
    kind: 'compaction',
    superseded_by: [a.id],
  });
  const c = rec(`fnd-c--${suffix}`, 'finding', {
    kind: 'compaction',
    retracted: true,
  });
  t.deepEqual(
    compactionHeads([a, b, c, rec(fnd, 'finding')]).map((r) => r.id),
    [a.id]
  );
});
