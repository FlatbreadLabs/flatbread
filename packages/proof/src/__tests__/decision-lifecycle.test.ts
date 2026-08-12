import test from 'ava';
import { EffortGraphValidationError } from '../errors.js';
import { createEffortGraphSnapshot } from '../snapshot.js';
import {
  acceptDecisionLifecycle,
  supersedeDecisionLifecycle,
} from '../decision-lifecycle.js';

const effort = 'eff-one--0123456789abcdef';
const ids = [
  'dec-a--0123456789abcdef',
  'dec-b--0123456789abcdef',
  'dec-c--0123456789abcdef',
];
function snapshot(
  states = ['proposed', 'proposed', 'rejected'],
  foreign = false
) {
  return createEffortGraphSnapshot(
    ids.map((id, i) => ({
      id,
      kind: 'decision' as const,
      path: `decisions/${id}.md`,
      frontmatter: {
        id,
        effort: foreign && i === 2 ? 'eff-two--0123456789abcdef' : effort,
        title: id,
        created_at: '2025-01-01T00:00:00.000Z',
        state: states[i],
      },
      body: '',
      rawBytes: Buffer.from(id),
    }))
  );
}
test('21 acceptance rejects proposed siblings', (t) => {
  const changes = acceptDecisionLifecycle(snapshot(), {
    decisionId: ids[0],
    rejectSiblings: true,
  });
  t.deepEqual(
    changes.map((x) => [
      x.record.id,
      x.nextFrontmatter.state,
      x.nextFrontmatter.rejected_by,
    ]),
    [
      [ids[0], 'accepted', undefined],
      [ids[1], 'rejected', ids[0]],
    ]
  );
});
test('22 supersede flips a Decision target', (t) => {
  const originalFrontmatter = {
    id: ids[0],
    effort,
    title: ids[0],
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'proposed',
  };
  const change = supersedeDecisionLifecycle(snapshot(), ids[0]);
  t.deepEqual(change.nextFrontmatter, {
    ...originalFrontmatter,
    state: 'superseded',
  });
});
test('23 no siblings is valid', (t) => {
  t.is(
    acceptDecisionLifecycle(snapshot(['proposed', 'rejected', 'rejected']), {
      decisionId: ids[0],
      rejectSiblings: true,
    }).length,
    1
  );
});
test('24 already-rejected siblings remain untouched', (t) => {
  t.deepEqual(
    acceptDecisionLifecycle(snapshot(), {
      decisionId: ids[0],
      rejectSiblings: true,
    }).map((x) => x.record.id),
    [ids[0], ids[1]]
  );
});
test('25 accepting a non-proposed Decision throws', async (t) => {
  await t.throwsAsync(
    Promise.resolve().then(() =>
      acceptDecisionLifecycle(snapshot(['accepted', 'proposed', 'rejected']), {
        decisionId: ids[0],
        rejectSiblings: true,
      })
    ),
    {
      instanceOf: EffortGraphValidationError,
      message: 'Decision is not proposed',
    }
  );
  await t.throwsAsync(
    Promise.resolve().then(() =>
      acceptDecisionLifecycle(snapshot(['rejected', 'proposed', 'rejected']), {
        decisionId: ids[0],
        rejectSiblings: true,
      })
    ),
    {
      instanceOf: EffortGraphValidationError,
      message: 'Decision is not proposed',
    }
  );
});
test('26 rejectSiblings false and foreign siblings', (t) => {
  t.is(
    acceptDecisionLifecycle(
      snapshot(['proposed', 'proposed', 'proposed'], true),
      { decisionId: ids[0], rejectSiblings: false }
    ).length,
    1
  );
  t.deepEqual(
    acceptDecisionLifecycle(
      snapshot(['proposed', 'proposed', 'proposed'], true),
      { decisionId: ids[0], rejectSiblings: true }
    ).map((x) => x.record.id),
    [ids[0], ids[1]]
  );
});
