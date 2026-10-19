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
  t.false(hit.passages[0].text.includes('zeta'));
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
  t.is(result.hits[0].passages[0].start, 0);
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

test('the passage leads with query words the title does not already show', (t) => {
  const filler = 'Nothing else to note in this sentence. '.repeat(6);
  const body = `The walrus kiln layout sets the firing order. ${filler}Past the ridge the kiln stops at 40 m.`;
  const index = buildFindIndex([
    rec('eff-a'),
    rec('dec-kiln', { title: 'Walrus kiln layout', body }),
  ]);
  const [hit] = findRecords(index, 'walrus kiln ridge', {
    effort: 'eff-a',
  }).hits;
  // The title shows walrus and kiln, so the passage goes where ridge is.
  t.regex(hit.passages[0].text, /ridge the kiln stops at 40 m/);
  t.is(hit.passages.length, 1);
});

test('the passage centers its matches and keeps the word after the last one', (t) => {
  const before = 'Earlier words that set the scene for the reader. '.repeat(6);
  const body = `${before}The kiln ridge sits high. ${'Later words. '.repeat(
    20
  )}`;
  const at = body.indexOf('kiln');
  const centered = bestSnippet(body, new Set(['kiln', 'ridg']));
  t.true(centered.start < at - 40, `starts at ${centered.start}`);
  t.true(centered.end > at + 60, `ends at ${centered.end}`);
  // A label right at the window's edge keeps the value after it.
  const edge = `kiln ${'a'.repeat(140)} ridge: 4242 and more text after it`;
  const snippet = bestSnippet(edge, new Set(['kiln', 'ridg']));
  t.regex(snippet.text, /ridge: 4242/);
});

test('a body that matches in two places gets a second passage', (t) => {
  const filler = 'Nothing else to note in this sentence. '.repeat(10);
  const body = `The kiln fires at dawn. ${filler}The ridge vent closes at noon.`;
  const index = buildFindIndex([
    rec('eff-a'),
    rec('fnd-two', { title: 'Firing notes', body }),
    rec('fnd-one', { title: 'Short notes', body: 'The kiln fires again.' }),
  ]);
  const result = findRecords(index, 'kiln ridge', { effort: 'eff-a' });
  const two = result.hits.find((hit) => hit.record.id === 'fnd-two');
  const one = result.hits.find((hit) => hit.record.id === 'fnd-one');
  // Ridge is the rarer word, so its passage is the best one and comes first.
  t.is(two?.passages.length, 2);
  t.regex(two?.passages[0].text ?? '', /ridge vent closes/);
  t.regex(two?.passages[1].text ?? '', /kiln fires at dawn/);
  t.true((two?.passages[1].end ?? 0) <= (two?.passages[0].start ?? 0));
  // No second place to quote, no second passage.
  t.is(one?.passages.length, 1);
  const cards = renderFindCards(index, result);
  t.regex(
    cards,
    /"…[^"\n]*The ridge vent closes at noon\." \[chars \d+-\d+ of \d+\]/
  );
});

test('a card quotes the best passage of a Blob its Citation carries', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    rec('fnd-cost', {
      title: 'Kiln firing cost',
      body: 'The full table is in the attached capture.',
      relations: { cites: ['cit-cap'] },
    }),
    {
      ...rec('cit-cap', { title: 'Capture', body: 'https://example.test/c' }),
      frontmatter: {
        title: 'Capture',
        effort: 'eff-a',
        created_at: '2026-01-01T00:00:00.000Z',
        blob: 'blb-cap',
      },
    },
    rec('blb-cap', {
      title: 'Capture payload',
      body: '{ "firing": { "glaze_ms": 3.1, "quench_ms": 1.9 } }',
    }),
  ]);
  // Findings only, so the Blob is not a hit and the finding's card quotes it.
  const findings = findRecords(index, 'kiln firing quench', {
    effort: 'eff-a',
    kinds: ['finding'],
  });
  t.is(findings.hits[0].attached?.id, 'blb-cap');
  t.regex(
    renderFindCards(index, findings),
    /blob blb-cap: "\{[^\n]*"quench_ms": 1\.9[^\n]*\[chars 0-51 of 51\]/
  );
  // A query word found only in the quoted Blob is not reported missing.
  t.deepEqual(findings.missing, []);
  // When the Blob is a hit, its own card quotes it instead.
  const all = findRecords(index, 'kiln firing quench', { effort: 'eff-a' });
  t.true(all.hits.some((hit) => hit.record.id === 'blb-cap'));
  t.true(all.hits.every((hit) => hit.attached === undefined));
});

test('a quoted Blob must be live: not retracted, superseded, or written after as-of', (t) => {
  const cit = (
    id: string,
    blob: string,
    extra: Record<string, unknown> = {},
    relations: ReadRecord['relations'] = {}
  ): ReadRecord => {
    const base = rec(id, { title: `Capture ${id}`, body: 'https://x.test' });
    return {
      ...base,
      frontmatter: { ...base.frontmatter, blob, ...extra },
      relations,
    };
  };
  const index = buildFindIndex([
    rec('eff-a'),
    rec('fnd-cost', {
      title: 'Kiln firing cost',
      created_at: '2026-01-05T00:00:00.000Z',
      body: 'The full table is in the attached capture.',
      relations: { cites: ['cit-old', 'cit-new', 'cit-v1'] },
    }),
    cit('cit-old', 'blb-old', {
      retracted: true,
      retracted_reason: 'wrong build',
    }),
    rec('blb-old', { title: 'payload', body: '{ "quench_ms": 9.9 }' }),
    cit('cit-new', 'blb-new', { created_at: '2026-03-01T00:00:00.000Z' }),
    rec('blb-new', {
      title: 'payload',
      created_at: '2026-03-01T00:00:00.000Z',
      body: '{ "quench_ms": 1.9 }',
    }),
    cit('cit-v1', 'blb-v1', {}, { superseded_by: ['cit-v2'] }),
    cit(
      'cit-v2',
      'blb-v2',
      { created_at: '2026-04-01T00:00:00.000Z' },
      { supersedes: ['cit-v1'] }
    ),
    rec('blb-v1', { title: 'payload', body: '{ "quench_ms": 5.5 }' }),
    rec('blb-v2', {
      title: 'payload',
      created_at: '2026-04-01T00:00:00.000Z',
      body: '{ "quench": "see v2" }',
    }),
  ]);
  const findings = { effort: 'eff-a', kinds: ['finding' as PrimitiveKind] };
  // The retracted Citation and the superseded one are not quoted.
  const now = findRecords(index, 'kiln firing quench', findings);
  t.is(now.hits[0].attached?.id, 'blb-new');
  // Before cit-new was written, cit-v1 was still the newest version.
  const then = findRecords(index, 'kiln firing quench', {
    ...findings,
    asOf: '2026-02-01',
  });
  t.is(then.hits[0].attached?.id, 'blb-v1');
  // With retracted records let in, a retracted source is marked.
  const index2 = buildFindIndex(
    [...index.records.values()].filter(
      (record) => !['cit-new', 'cit-v1', 'cit-v2'].includes(record.id)
    )
  );
  const hidden = findRecords(index2, 'kiln firing quench', findings);
  t.is(hidden.hits[0].attached, undefined);
  t.deepEqual(hidden.missing, ['quench']);
  const shown = findRecords(index2, 'kiln firing quench', {
    ...findings,
    retracted: 'include',
  });
  t.is(shown.hits[0].attached?.retracted, true);
  t.regex(renderFindCards(index2, shown), /blob blb-old \(retracted\): /);
});

test('a Blob quoted on one card is not quoted again on a later card', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    ...['fnd-a', 'fnd-b'].map((id) =>
      rec(id, {
        title: `Kiln firing ${id}`,
        body: 'See the capture.',
        relations: { cites: ['cit-cap'] },
      })
    ),
    {
      ...rec('cit-cap'),
      frontmatter: { ...rec('cit-cap').frontmatter, blob: 'blb-cap' },
    },
    rec('blb-cap', { body: '{ "quench_ms": 1.9 }' }),
  ]);
  const result = findRecords(index, 'kiln firing quench', {
    effort: 'eff-a',
    kinds: ['finding'],
  });
  t.deepEqual(
    result.hits.map((hit) => hit.attached?.id),
    ['blb-cap', undefined]
  );
  t.deepEqual(result.missing, []);
});

test('a passage finishes a short word after its last match, not a long token', (t) => {
  const short = bestSnippet(
    `kiln ${'a'.repeat(148)} ridge 42 tail`,
    new Set(['kiln', 'ridg'])
  );
  t.regex(short.text, /ridge 42/);
  const token = bestSnippet(
    `kiln ridge ${'x'.repeat(3000)} tail`,
    new Set(['kiln', 'ridg'])
  );
  t.true(token.end - token.start <= 160, `${token.end - token.start}`);
  const rules = bestSnippet(
    `kiln ridge ${'| --- | --- | '.repeat(100)}zeta`,
    new Set(['kiln', 'ridg'])
  );
  t.true(rules.end - rules.start <= 160, `${rules.end - rules.start}`);
});

test('the best passage comes first, even when the second sits earlier', (t) => {
  const filler = 'Nothing else to note in this sentence. '.repeat(8);
  const body = `The ridge vent closes at noon. ${filler}The kiln and the glaze fire at dawn.`;
  const index = buildFindIndex([
    rec('eff-a'),
    rec('fnd-two', { title: 'Notes', body }),
  ]);
  const [hit] = findRecords(index, 'kiln glaze ridge', {
    effort: 'eff-a',
  }).hits;
  t.is(hit.passages.length, 2);
  t.regex(hit.passages[0].text, /kiln and the glaze/);
  t.regex(hit.passages[1].text, /ridge vent/);
  t.true(hit.passages[1].end <= hit.passages[0].start);
});

test('reverse links list verdicts before derived records', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    rec('dec-pick', { title: 'Pick the yak kiln', state: 'accepted' }),
    ...[1, 2, 3, 4].map((n) =>
      rec(`fnd-use-${n}`, { relations: { derives_from: ['dec-pick'] } })
    ),
    ...[1, 2].map((n) =>
      rec(`dec-alt-${n}`, {
        state: 'rejected',
        relations: { rejected_by: ['dec-pick'] },
      })
    ),
  ]);
  const result = findRecords(index, 'yak kiln', { effort: 'eff-a' });
  t.deepEqual(
    result.hits[0].inbound.map((link) => link.relation),
    ['rejects', 'derived_by']
  );
  t.regex(
    renderFindCards(index, result),
    /in: rejects dec-alt-1 [^;]*dec-alt-2 [^;]*; derived_by /
  );
});

test('quoting a second passage never pushes out a chain or a link', (t) => {
  const ids = [1, 2, 3, 4, 5, 6].map((n) => `dec-c${n}`);
  const records: ReadRecord[] = [rec('eff-a')];
  for (let h = 0; h < 5; h++)
    ids.forEach((id, i) =>
      records.push(
        rec(`${id}-${h}`, {
          title: `Kiln schedule ${h} version ${i} with a long enough title`,
          body: `The kiln schedule fires at dawn. ${'Filler words here. '.repeat(
            20
          )}The ridge vent opens at noon.`,
          created_at: `2026-0${i + 1}-01T00:00:00.000Z`,
          relations: {
            ...(i ? { supersedes: [`${ids[i - 1]}-${h}`] } : {}),
            ...(i < 5 ? { superseded_by: [`${ids[i + 1]}-${h}`] } : {}),
            derives_from: [`fnd-base-${h}`],
          },
        })
      )
    );
  for (let h = 0; h < 5; h++) records.push(rec(`fnd-base-${h}`));
  const index = buildFindIndex(records);
  const frame = (query: string) =>
    renderFindCards(index, findRecords(index, query, { effort: 'eff-a' }))
      .split('\n')
      .filter((line) => /^ {3}(chain|out|in):/.test(line));
  const one = frame('kiln schedule');
  const two = frame('kiln schedule ridge');
  t.true(
    renderFindCards(
      index,
      findRecords(index, 'kiln schedule ridge', { effort: 'eff-a' })
    ).includes('The ridge vent opens at noon.')
  );
  t.deepEqual(two, one);
});
