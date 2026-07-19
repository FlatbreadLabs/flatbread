import test from 'ava';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderDigest } from '../digest.js';

test('renderDigest is deterministic and reuses the atomic cache artifact', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-'));
  const longBody = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
  const input = {
    query: { type: 'getRecord', id: 'dec-one--0123456789abcdef' },
    queryHash: 'hash',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    fullBody: true,
    records: [
      {
        id: 'dec-one--0123456789abcdef',
        kind: 'decision' as const,
        path: 'decisions/one.md',
        frontmatter: {
          id: 'dec-one--0123456789abcdef',
          title: 'One',
          state: 'proposed',
        },
        body_excerpt: longBody,
        relations: { derives_from: ['iss-one--0123456789abcdef'] },
      },
    ],
    edges: [
      {
        from_id: 'dec-one--0123456789abcdef',
        relation: 'derives_from' as const,
        to_id: 'iss-one--0123456789abcdef',
      },
    ],
  };
  const first = await renderDigest(input);
  const bytes = await readFile(first.artifact_path);
  const second = await renderDigest(input);
  t.deepEqual(first, second);
  t.is(await stat(first.artifact_path).then((x) => x.isFile()), true);
  const digest = bytes.toString();
  t.true(digest.includes(longBody));
  t.false(digest.includes('[…truncated]'));
});

test('renderDigest excerpts long bodies for non-getRecord queries', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-excerpt-'));
  const longBody = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
  const result = await renderDigest({
    query: { type: 'listRecords', effort: 'eff-one--0123456789abcdef' },
    queryHash: 'list',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    records: [
      {
        id: 'dec-one--0123456789abcdef',
        kind: 'decision' as const,
        path: 'decisions/one.md',
        frontmatter: {
          id: 'dec-one--0123456789abcdef',
          title: 'One',
          state: 'proposed',
        },
        body_excerpt: longBody,
        relations: {},
      },
    ],
    edges: [],
  });
  const digest = await readFile(result.artifact_path, 'utf8');
  t.true(digest.includes('[…truncated]'));
  t.false(digest.includes('line 19'));
});

test('renderDigest fullBody byte-cap miss does not fake-full with excerpt', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-full-bytes-'));
  const hugeBody = 'x'.repeat(70 * 1024);
  const result = await renderDigest({
    query: { type: 'getRecord', id: 'dec-huge--0123456789abcdef' },
    queryHash: 'huge',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    fullBody: true,
    records: [
      {
        id: 'dec-huge--0123456789abcdef',
        kind: 'decision' as const,
        path: 'decisions/huge.md',
        frontmatter: { title: 'Huge' },
        body_excerpt: hugeBody,
        relations: {},
      },
    ],
    edges: [],
  });
  const digest = await readFile(result.artifact_path, 'utf8');
  t.true(digest.includes('complete: false'));
  t.true(digest.includes('cap_reasons'));
  t.true(digest.includes('body exceeded digest byte cap'));
  t.true(digest.includes('decisions/huge.md'));
  t.false(digest.includes('[…truncated]'));
  t.false(digest.includes(hugeBody.slice(0, 100)));
});

test('renderDigest refreshes same-generation cache bytes when records change', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-refresh-'));
  const input = {
    query: { type: 'getRecord', id: 'dec-one--0123456789abcdef' },
    queryHash: 'same-query',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    edges: [],
    records: [
      {
        id: 'dec-one--0123456789abcdef',
        kind: 'decision' as const,
        path: 'decisions/one.md',
        frontmatter: { title: 'One' },
        body_excerpt: 'original body',
        relations: {},
      },
    ],
  };
  const first = await renderDigest(input);
  const second = await renderDigest({
    ...input,
    records: [{ ...input.records[0], body_excerpt: 'updated body' }],
  });
  t.not(first.artifact_sha256, second.artifact_sha256);
  t.true(
    (await readFile(second.artifact_path, 'utf8')).includes('updated body')
  );
});

test('pagination is incomplete without adding a cap reason', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-page-'));
  const result = await renderDigest({
    query: { type: 'listEfforts', page: { limit: 1 } },
    queryHash: 'page',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    edges: [],
    records: [
      {
        id: 'eff-one--0123456789abcdef',
        kind: 'effort' as const,
        path: 'efforts/one.md',
        frontmatter: { title: 'One' },
        body_excerpt: '',
        relations: {},
      },
    ],
    totalKnown: 2,
    hasMore: true,
    nextCursor: 'next',
  });
  const digest = await readFile(result.artifact_path, 'utf8');
  t.true(digest.includes('complete: false'));
  t.true(digest.includes('"total_known":2'));
  t.false(digest.includes('cap_reasons'));
  t.true(result.summary.includes('incomplete: pagination'));
  t.true(result.page.has_more);
  t.is(result.page.next_cursor, 'next');
});

test('byte caps keep complete unicode sections and rows', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-bytes-'));
  const result = await renderDigest({
    query: { type: 'getRecord', id: 'dec-large--0123456789abcdef' },
    queryHash: 'large',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    records: Array.from({ length: 25 }, (_, index) => ({
      id: `dec-large-${index}--0123456789abcdef`,
      kind: 'decision' as const,
      path: `decisions/large-${index}.md`,
      frontmatter: { title: '巨大'.repeat(3000) },
      body_excerpt: '界'.repeat(600),
      relations: {},
    })),
    edges: [
      {
        from_id: 'dec-large--0123456789abcdef',
        relation: 'derives_from' as const,
        to_id: 'iss-large--0123456789abcdef',
      },
    ],
  });
  const bytes = await readFile(result.artifact_path);
  t.true(bytes.byteLength <= 64 * 1024);
  t.true(bytes.toString().endsWith('\n'));
  t.true(bytes.toString().includes('cap_reasons'));
});
