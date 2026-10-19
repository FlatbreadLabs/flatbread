import test from 'ava';
import type { PrimitiveKind, ReadRecord } from '@flatbread/proof';
import {
  bestSnippet,
  buildFindIndex,
  codeReferences,
  findRecords,
  renderFindCards,
  stem,
  tokenize,
} from './find.js';

function rec(
  id: string,
  fields: {
    title?: string;
    body?: string;
    effort?: string;
    created_at?: string;
    state?: string;
    status?: string;
    retracted?: boolean;
    retracted_reason?: string;
    created_by?: string;
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
  const { body, relations, ...frontmatter } = fields;
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
    body_excerpt: body ?? '',
    relations: relations ?? {},
  };
}

test('tokenize keeps numbers, units, and code terms and splits hyphens', (t) => {
  const terms = tokenize(
    "Lantern's ray-marched forward+ pass costs 4.7 ms at 120Hz in r11g11b10"
  );
  for (const term of [
    'lantern',
    'raymarch',
    'ray',
    'march',
    'forward+',
    'cost',
    '4.7',
    'ms',
    '4.7ms',
    '120hz',
    'r11g11b10',
  ])
    t.true(terms.includes(term), term);
  t.false(terms.includes('the'));
  t.false(terms.includes('at'));
  t.deepEqual(tokenize('Caches cached caching cache').slice(0, 4), [
    'cach',
    'cach',
    'cach',
    'cach',
  ]);
  t.is(stem('running'), 'run');
  t.is(stem('queries'), 'query');
  t.is(stem('status'), 'status');
  t.deepEqual(
    codeReferences(
      'See packages/render/tern/history.ts and resolveHistory() in a1b2c3d, PR #412.'
    ),
    ['packages/render/tern/history.ts', 'resolveHistory()', 'a1b2c3d', '#412']
  );
  const code = tokenize('packages/render/tern/history.ts');
  t.true(code.includes('packages/render/tern/history.ts'));
  t.true(code.includes('history.ts'));
});

test('BM25 ranks the record about the query first, ties break by id', (t) => {
  const index = buildFindIndex([
    rec('eff-a', { title: 'Renderer' }),
    rec('fnd-b', {
      title: 'Tern history buffer precision',
      body: 'The history buffer keeps 16 bits per channel.',
    }),
    rec('fnd-c', {
      title: 'Build times',
      body: 'The build takes ten minutes.',
    }),
    rec('fnd-d', {
      title: 'Shadow cascade',
      body: 'Buffer sizes for shadows.',
    }),
    rec('fnd-e', { title: 'Same words', body: 'zebra' }),
    rec('fnd-f', { title: 'Same words', body: 'zebra' }),
  ]);
  const result = findRecords(index, 'tern history buffer', { effort: 'eff-a' });
  t.is(result.hits[0].record.id, 'fnd-b');
  t.is(result.hits[1].record.id, 'fnd-d');
  t.is(result.matched, 2);
  t.is(result.searched, 5);
  t.deepEqual(result.missing, []);
  const tie = findRecords(index, 'zebra', { effort: 'eff-a' });
  t.deepEqual(
    tie.hits.map((hit) => hit.record.id),
    ['fnd-e', 'fnd-f']
  );
  const none = findRecords(index, 'tern unicorn', { effort: 'eff-a' });
  t.deepEqual(none.found, ['tern']);
  t.deepEqual(none.missing, ['unicorn']);
});

test('a supersession chain is one hit showing its head; as-of picks the version then current', (t) => {
  const index = buildFindIndex([
    rec('eff-a', { title: 'Renderer' }),
    rec('dec-v1', {
      title: 'Use TAA for upscaling',
      body: 'Temporal antialiasing with a sharpen pass.',
      created_at: '2025-11-02T00:00:00.000Z',
      state: 'accepted',
      relations: { superseded_by: ['dec-v2'] },
    }),
    rec('dec-v2', {
      title: 'Use Tern for upscaling',
      body: 'Tern replaces the old path.',
      created_at: '2026-01-12T00:00:00.000Z',
      state: 'accepted',
      relations: { supersedes: ['dec-v1'], superseded_by: ['dec-v3'] },
    }),
    rec('dec-v3', {
      title: 'Use Tern with history clamp for upscaling',
      body: 'Adds a clamp.',
      created_at: '2026-03-01T00:00:00.000Z',
      state: 'accepted',
      relations: { supersedes: ['dec-v2'] },
    }),
  ]);
  const result = findRecords(index, 'temporal antialiasing sharpen', {
    effort: 'eff-a',
  });
  t.is(result.hits.length, 1);
  const [hit] = result.hits;
  t.is(hit.record.id, 'dec-v3');
  t.is(hit.head.id, 'dec-v3');
  t.is(hit.matched.id, 'dec-v1');
  t.deepEqual(
    hit.chain.map((member) => member.id),
    ['dec-v1', 'dec-v2', 'dec-v3']
  );
  const cards = renderFindCards(index, result);
  t.regex(cards, /matched: v1 dec-v1/);
  t.regex(
    cards,
    /chain: v1 dec-v1 superseded 2025-11-02 -> v2 dec-v2 superseded 2026-01-12 -> v3 dec-v3 accepted 2026-03-01 \(head\)/
  );
  const asOf = findRecords(index, 'upscaling', {
    effort: 'eff-a',
    asOf: '2026-02-01T00:00:00.000Z',
  });
  t.is(asOf.hits[0].record.id, 'dec-v2');
  t.is(asOf.hits[0].head.id, 'dec-v3');
  t.regex(
    renderFindCards(index, asOf),
    /v2 dec-v2 superseded 2026-01-12 \(as of\)/
  );
  const before = findRecords(index, 'upscaling', {
    effort: 'eff-a',
    asOf: '2025-01-01T00:00:00.000Z',
  });
  t.is(before.hits.length, 0);
});

test('the snippet is the window with the most matched terms, even past 600 characters', (t) => {
  const filler = 'Nothing to see in this sentence at all. '.repeat(20);
  const body = `${filler}The saltglass caustic pass clamps luminance to 4.7 ms per frame.`;
  t.true(filler.length > 600);
  const snippet = bestSnippet(body, new Set(['saltglass', 'caustic']));
  t.true(snippet.start > 600);
  t.true(snippet.start <= body.indexOf('saltglass'));
  t.is(snippet.length, body.length);
  t.regex(snippet.text, /saltglass caustic pass/);
  t.true(snippet.end - snippet.start <= 160);
  const index = buildFindIndex([
    rec('eff-a'),
    rec('fnd-long', { title: 'Frame costs', body }),
  ]);
  const cards = renderFindCards(
    index,
    findRecords(index, 'saltglass caustic', { effort: 'eff-a' })
  );
  t.regex(
    cards,
    new RegExp(`\\[chars ${snippet.start}-${snippet.end} of ${body.length}\\]`)
  );
});

test('cards list stored links and reverse links, capped per relation', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    rec('iss-q', {
      title: 'Which upscaler',
      status: 'resolved',
      relations: { resolved_by: ['dec-pick'] },
    }),
    rec('fnd-cost', { title: 'Tern cost at 4K' }),
    rec('dec-pick', {
      title: 'Pick the zephyr upscaler',
      state: 'accepted',
      relations: { derives_from: ['fnd-cost'] },
    }),
    ...['a', 'b', 'c', 'd', 'e'].map((x) =>
      rec(`dec-alt-${x}`, {
        title: `Alternative ${x} with a long title that runs well past sixty characters`,
        state: 'rejected',
        relations: { rejected_by: ['dec-pick'] },
      })
    ),
  ]);
  const result = findRecords(index, 'zephyr', { effort: 'eff-a' });
  const [hit] = result.hits;
  t.deepEqual(
    hit.inbound.map((link) => link.relation),
    ['resolves', 'rejects']
  );
  const cards = renderFindCards(index, result);
  t.regex(cards, /out: derives_from fnd-cost "Tern cost at 4K" \(live\)/);
  t.regex(cards, /in: resolves iss-q "Which upscaler" \(resolved\)/);
  t.regex(
    cards,
    /rejects dec-alt-a "Alternative a with a long title that runs well past sixty c…" \(rejected\)/
  );
  t.regex(cards, /dec-alt-c [^;]+ \+2 more/);
  t.false(cards.includes('dec-alt-d'));
  // A record with no body gets no snippet line.
  t.false(cards.includes('[chars'));
});

test('retracted records are left out unless asked for, and marked when shown', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    rec('fnd-live', { title: 'Quokka live' }),
    rec('fnd-gone', {
      title: 'Quokka noise',
      retracted: true,
      retracted_reason: 'session noise',
    }),
  ]);
  const ids = (mode?: 'exclude' | 'include' | 'only') =>
    findRecords(index, 'quokka', { effort: 'eff-a', retracted: mode })
      .hits.map((hit) => hit.record.id)
      .sort();
  t.deepEqual(ids(), ['fnd-live']);
  t.deepEqual(ids('include'), ['fnd-gone', 'fnd-live']);
  t.deepEqual(ids('only'), ['fnd-gone']);
  const cards = renderFindCards(
    index,
    findRecords(index, 'quokka', { effort: 'eff-a', retracted: 'only' })
  );
  t.regex(cards, /fnd-gone \| finding \| RETRACTED/);
  t.regex(cards, /RETRACTED: session noise; not live/);
});

test('without an Effort, hits group by Effort, at most 3 each unless one Effort leads', (t) => {
  const records = [
    rec('eff-a', { title: 'Render' }),
    rec('eff-b', { title: 'World' }),
  ];
  const add = (effort: string, id: string) =>
    records.push(
      rec(id, {
        effort,
        title: `Shadow pool overflow ${id}`,
        body: 'shadow pool overflow at low tide',
      })
    );
  for (let i = 0; i < 6; i++) add('eff-a', `fnd-a${i}`);
  for (let i = 0; i < 3; i++) add('eff-b', `fnd-b${i}`);
  const index = buildFindIndex(records);
  // Equal mass: the cap applies, and the hits group by Effort.
  const result = findRecords(index, 'shadow pool overflow low tide');
  t.deepEqual(
    result.efforts?.map((effort) => effort.id),
    ['eff-a', 'eff-b']
  );
  t.deepEqual(
    result.hits.map((hit) => hit.effort),
    ['eff-a', 'eff-a', 'eff-a', 'eff-b', 'eff-b']
  );
  const cards = renderFindCards(index, result);
  t.regex(
    cards,
    /efforts by match: eff-a "Render" [\d.]+ \| eff-b "World" [\d.]+/
  );
  t.regex(cards, /## eff-a "Render"[\s\S]*## eff-b "World"/);
  // Slots the cap leaves empty go to the next hits by score.
  const ten = findRecords(index, 'shadow pool overflow low tide', {
    limit: 10,
  });
  t.is(ten.hits.length, 9);
  const scoped = findRecords(index, 'shadow pool overflow', {
    effort: 'eff-a',
  });
  t.is(scoped.hits.length, 5);
  t.is(scoped.efforts, undefined);
  // One Effort with at least 1.5 times the next one's mass is not capped.
  const lead = buildFindIndex(
    records.filter((record) => !['fnd-b1', 'fnd-b2'].includes(record.id))
  );
  t.deepEqual(
    findRecords(lead, 'shadow pool overflow low tide').hits.map(
      (hit) => hit.effort
    ),
    ['eff-a', 'eff-a', 'eff-a', 'eff-a', 'eff-a']
  );
});

test('stemming meets added and add, used and use, and keeps real doubles', (t) => {
  for (const [word, want] of [
    ['add', 'add'],
    ['added', 'add'],
    ['adding', 'add'],
    ['buff', 'buff'],
    ['buffed', 'buff'],
    ['use', 'use'],
    ['used', 'use'],
    ['using', 'use'],
    ['stopped', 'stop'],
    ['seed', 'seed'],
    ['thing', 'thing'],
  ])
    t.is(stem(word), want, word);
  const index = buildFindIndex([
    rec('eff-a'),
    rec('fnd-retry', { body: 'Added retry to the uploader.' }),
    rec('fnd-slice', { body: 'The vertical slice ships in May.' }),
  ]);
  t.deepEqual(
    findRecords(index, 'add retry', { effort: 'eff-a' }).hits.map(
      (hit) => hit.record.id
    ),
    ['fnd-retry']
  );
  // A hyphenated word whose parts both matched is not reported missing.
  const slice = findRecords(index, 'vertical-slice', { effort: 'eff-a' });
  t.deepEqual(slice.found, ['vertical', 'slice']);
  t.deepEqual(slice.missing, []);
});

test('chains follow supersession links, not created times', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    rec('dec-c1', {
      title: 'Walrus codec',
      created_at: '2026-05-01T00:00:00.000Z',
      relations: { superseded_by: ['dec-c2'] },
    }),
    rec('dec-c2', {
      title: 'Walrus codec, revised',
      created_at: '2026-04-01T00:00:00.000Z',
      relations: { supersedes: ['dec-c1'] },
    }),
  ]);
  const [hit] = findRecords(index, 'walrus', { effort: 'eff-a' }).hits;
  t.deepEqual(
    hit.chain.map((member) => member.id),
    ['dec-c1', 'dec-c2']
  );
  t.is(hit.head.id, 'dec-c2');
  const [asOf] = findRecords(index, 'walrus', {
    effort: 'eff-a',
    asOf: '2026-05-15T00:00:00Z',
  }).hits;
  t.is(asOf.record.id, 'dec-c2');
});

test('as-of scores and quotes only versions written by then', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    rec('dec-v1', {
      body: 'We use the alpha codec.',
      created_at: '2026-01-01T00:00:00.000Z',
      relations: { superseded_by: ['dec-v2'] },
    }),
    rec('dec-v2', {
      body: 'We switch to the zeta codec after the March capture.',
      created_at: '2026-03-01T00:00:00.000Z',
      relations: { supersedes: ['dec-v1'] },
    }),
  ]);
  const options = { effort: 'eff-a', asOf: '2026-02-01T00:00:00Z' };
  t.is(findRecords(index, 'zeta', options).hits.length, 0);
  const result = findRecords(index, 'zeta codec', options);
  const [hit] = result.hits;
  t.is(hit.record.id, 'dec-v1');
  t.is(hit.matched.id, 'dec-v1');
  t.false(hit.snippet.text.includes('zeta'));
  t.deepEqual(result.missing, ['zeta']);
});

test('the card shows a version in scope, never an out-of-scope head', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    rec('eff-b'),
    rec('dec-r1', {
      title: 'Kelp farm layout',
      relations: { superseded_by: ['dec-r2'] },
    }),
    rec('dec-r2', {
      title: 'Kelp farm layout v2',
      created_at: '2026-02-01T00:00:00.000Z',
      retracted: true,
      relations: { supersedes: ['dec-r1'] },
    }),
    rec('fnd-x1', {
      title: 'Zebra crossing',
      relations: { superseded_by: ['fnd-x2'] },
    }),
    rec('fnd-x2', {
      title: 'Zebra crossing moved',
      effort: 'eff-b',
      created_at: '2026-02-01T00:00:00.000Z',
      relations: { supersedes: ['fnd-x1'] },
    }),
  ]);
  const [kelp] = findRecords(index, 'kelp').hits;
  t.is(kelp.record.id, 'dec-r1');
  t.is(kelp.head.id, 'dec-r2');
  t.notRegex(renderFindCards(index, findRecords(index, 'kelp')), /RETRACTED/);
  const [only] = findRecords(index, 'kelp', { retracted: 'only' }).hits;
  t.is(only.record.id, 'dec-r2');
  const [zebra] = findRecords(index, 'zebra', { effort: 'eff-a' }).hits;
  t.is(zebra.record.id, 'fnd-x1');
  t.is(zebra.effort, 'eff-a');
});

test('long chains keep the head and the matched version, and snippets near the top start at 0', (t) => {
  const ids = [1, 2, 3, 4, 5, 6].map((n) => `dec-l${n}`);
  const index = buildFindIndex([
    rec('eff-a'),
    ...ids.map((id, i) =>
      rec(id, {
        title: i === 0 ? 'Narwhal budget' : `Budget ${i}`,
        body: i === 0 ? 'As of beta the narwhal mode costs 4 ms.' : 'Budget.',
        created_at: `2026-0${i + 1}-01T00:00:00.000Z`,
        relations: {
          ...(i ? { supersedes: [ids[i - 1]] } : {}),
          ...(i < 5 ? { superseded_by: [ids[i + 1]] } : {}),
        },
      })
    ),
  ]);
  const result = findRecords(index, 'narwhal beta', { effort: 'eff-a' });
  t.is(result.hits[0].snippet.start, 0);
  const cards = renderFindCards(index, result);
  t.regex(cards, /"As of beta the narwhal/);
  t.regex(
    cards,
    /chain: v1 dec-l1 [^>]+ -> \(2 more\) -> v4 dec-l4 [^>]+ -> v5 dec-l5 [^>]+ -> v6 dec-l6 \S+ \S+ \(head\)/
  );
});

test('five dense cards stay within the inline budget', (t) => {
  const records: ReadRecord[] = [rec('eff-a', { title: 'Render' })];
  const long = 'x'.repeat(40);
  for (let i = 0; i < 10; i++)
    records.push(
      rec(`dec-hit-${i}-${long}`, {
        title: `Gloam upscaler choice ${i} with a fairly long descriptive title`,
        body: `${'Context words here. '.repeat(
          40
        )} gloam upscaler packages/render/gloam/file${i}.ts`,
        relations: {
          derives_from: [0, 1, 2, 3, 4].map((j) => `fnd-dep-${j}-${long}`),
          cites: [0, 1, 2].map((j) => `cit-src-${j}-${long}`),
        },
      })
    );
  for (let j = 0; j < 5; j++)
    records.push(
      rec(`fnd-dep-${j}-${long}`, {
        title: 'A dependency finding with a title long enough to cut',
      })
    );
  const index = buildFindIndex(records);
  const cards = renderFindCards(
    index,
    findRecords(index, 'gloam upscaler', { effort: 'eff-a' })
  );
  t.true(cards.length / 4 <= 1000, `${cards.length / 4} tokens`);
  // A relation with no entry left still names itself, with its count.
  t.false(cards.includes('in other relations'));
});
