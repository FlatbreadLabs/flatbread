import test from 'ava';
import {
  canonicalizeReadQuery,
  parseGenerationToken,
  ProofCrossEffortRelationError,
  readQueryHash,
} from '../index.js';

test('canonicalizeReadQuery removes undefined values and normalizes sets', (t) => {
  t.deepEqual(
    canonicalizeReadQuery({
      z: ['b', 'a', 'b'],
      nested: { optional: undefined, value: 1 },
    }),
    { nested: { value: 1 }, z: ['a', 'b'] }
  );
});

test('readQueryHash is stable for equivalent query shapes', (t) => {
  t.is(
    readQueryHash({ kinds: ['risk', 'issue', 'risk'] }),
    readQueryHash({ kinds: ['issue', 'risk'] })
  );
});

test('readQueryHash includes page cursors while keeping set arrays stable', (t) => {
  const base = { type: 'listEfforts', status: ['paused', 'active'] };
  t.not(
    readQueryHash({ ...base, page: { limit: 1, cursor: 'page-1' } }),
    readQueryHash({ ...base, page: { limit: 1, cursor: 'page-2' } })
  );
  t.is(
    readQueryHash({ ...base, page: { limit: 1, cursor: 'page-1' } }),
    readQueryHash({
      type: 'listEfforts',
      status: ['active', 'paused', 'active'],
      page: { cursor: 'page-1', limit: 1 },
    })
  );
});

test('strict generation tokens are canonical safe non-negative integers', (t) => {
  for (const value of ['', '-1', '1.5', '1e3', '01', '9007199254740992']) {
    t.throws(() => parseGenerationToken(value), {
      message: /canonical non-negative safe integer string/,
    });
  }
  t.is(parseGenerationToken('0'), 0);
  t.is(parseGenerationToken('42'), 42);
});

test('cross-Effort relation errors name both Efforts and every edge', (t) => {
  const error = new ProofCrossEffortRelationError(
    'eff-local--0123456789abcdef',
    'dec-source--0123456789abcdef',
    [
      {
        relation: 'derives_from',
        to_id: 'fnd-foreign--0123456789abcdef',
        target_effort_id: 'eff-foreign--0123456789abcdef',
      },
    ]
  );
  t.deepEqual(error.shape, {
    error: {
      code: 'PROOF_CROSS_EFFORT_RELATION',
      message:
        'Record dec-source--0123456789abcdef in effort eff-local--0123456789abcdef stores relation targets outside that effort: derives_from -> fnd-foreign--0123456789abcdef (effort eff-foreign--0123456789abcdef)',
      effort_id: 'eff-local--0123456789abcdef',
      from_id: 'dec-source--0123456789abcdef',
      edges: [
        {
          relation: 'derives_from',
          to_id: 'fnd-foreign--0123456789abcdef',
          target_effort_id: 'eff-foreign--0123456789abcdef',
        },
      ],
    },
  });
});
