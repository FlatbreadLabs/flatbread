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
  t.true(first.complete);
  t.deepEqual(first.cap_reasons, []);
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
  t.false(result.complete);
  t.deepEqual(result.cap_reasons, ['bytes']);
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
  t.false(result.complete);
  t.deepEqual(result.cap_reasons, []);
  t.true(digest.includes('complete: false'));
  t.true(digest.includes('"total_known":2'));
  t.false(digest.includes('cap_reasons'));
  t.true(result.summary.includes('incomplete: pagination'));
  t.true(result.page.has_more);
  t.is(result.page.next_cursor, 'next');
});

test('primary-record caps are machine readable', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-record-cap-'));
  const result = await renderDigest({
    query: { type: 'listRecords', effort: 'eff-one--0123456789abcdef' },
    queryHash: 'record-cap',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    records: Array.from({ length: 26 }, (_, index) => ({
      id: `fnd-record-${index}--0123456789abcdef`,
      kind: 'finding' as const,
      path: `findings/record-${index}.md`,
      frontmatter: { title: `Record ${index}` },
      body_excerpt: '',
      relations: {},
    })),
    edges: [],
  });
  const digest = await readFile(result.artifact_path, 'utf8');
  t.false(result.complete);
  t.deepEqual(result.cap_reasons, ['primary_records']);
  t.false(result.page.has_more);
  t.is(result.page.next_cursor, null);
  t.true(
    digest.includes(
      'primary: {"returned":25,"total_known":26,"has_more":false}'
    )
  );
  t.true(digest.includes('complete: false'));
  t.true(digest.includes('cap_reasons: ["primary_records"]'));
  t.true(result.summary.includes('incomplete: primary_records'));
});

test('displayed-edge caps are machine readable', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-edge-cap-'));
  const result = await renderDigest({
    query: { type: 'relations', effort_id: 'eff-one--0123456789abcdef' },
    queryHash: 'edge-cap',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    records: [
      {
        id: 'dec-one--0123456789abcdef',
        kind: 'decision' as const,
        path: 'decisions/one.md',
        frontmatter: { title: 'One' },
        body_excerpt: '',
        relations: {},
      },
    ],
    edges: Array.from({ length: 51 }, (_, index) => ({
      from_id: 'dec-one--0123456789abcdef',
      relation: 'derives_from' as const,
      to_id: `fnd-edge-${index}--0123456789abcdef`,
    })),
  });
  const digest = await readFile(result.artifact_path, 'utf8');
  t.false(result.complete);
  t.deepEqual(result.cap_reasons, ['displayed_edges']);
  t.false(result.page.has_more);
  t.is(result.page.next_cursor, null);
  t.true(digest.includes('complete: false'));
  t.true(digest.includes('cap_reasons: ["displayed_edges"]'));
  t.true(result.summary.includes('incomplete: displayed_edges'));
});

test('renderDigest refuses hasMore without a next cursor', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-refuse-page-'));
  const result = await renderDigest({
    query: { type: 'listEfforts', page: { limit: 1 } },
    queryHash: 'refuse-page',
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
    hasMore: true,
  });
  const digest = await readFile(result.artifact_path, 'utf8');
  t.true(result.complete);
  t.deepEqual(result.cap_reasons, []);
  t.false(result.page.has_more);
  t.is(result.page.next_cursor, null);
  t.true(
    digest.includes('primary: {"returned":1,"total_known":1,"has_more":false}')
  );
  t.true(result.summary.includes('complete'));
  t.false(result.summary.includes('pagination'));
});

test('renderDigest reports displayed-edge caps with pagination', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-edge-page-cap-'));
  const cursor = 'next-edge-page';
  const result = await renderDigest({
    query: { type: 'relations', effort_id: 'eff-one--0123456789abcdef' },
    queryHash: 'edge-page-cap',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    records: [
      {
        id: 'dec-one--0123456789abcdef',
        kind: 'decision' as const,
        path: 'decisions/one.md',
        frontmatter: { title: 'One' },
        body_excerpt: '',
        relations: {},
      },
    ],
    edges: Array.from({ length: 51 }, (_, index) => ({
      from_id: 'dec-one--0123456789abcdef',
      relation: 'derives_from' as const,
      to_id: `fnd-edge-page-${index}--0123456789abcdef`,
    })),
    hasMore: true,
    nextCursor: cursor,
  });
  t.false(result.complete);
  t.deepEqual(result.cap_reasons, ['displayed_edges']);
  t.true(result.page.has_more);
  t.is(result.page.next_cursor, cursor);
  t.true(result.summary.includes('incomplete: displayed_edges, pagination'));
});

test('stacked byte and record caps survive the byte rebuild', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-stacked-caps-'));
  const result = await renderDigest({
    query: { type: 'listRecords', effort: 'eff-one--0123456789abcdef' },
    queryHash: 'stacked-caps',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    records: Array.from({ length: 26 }, (_, index) => ({
      id: `fnd-large-${index}--0123456789abcdef`,
      kind: 'finding' as const,
      path: `findings/large-${index}.md`,
      frontmatter: { title: `Large ${index} ${'x'.repeat(3000)}` },
      body_excerpt: '',
      relations: {},
    })),
    edges: [],
  });
  const digest = await readFile(result.artifact_path, 'utf8');
  t.false(result.complete);
  t.deepEqual(result.cap_reasons, ['bytes', 'primary_records']);
  t.false(result.page.has_more);
  t.is(result.page.next_cursor, null);
  t.true(digest.includes('cap_reasons: ["bytes","primary_records"]'));
  t.true(result.summary.includes('incomplete: bytes, primary_records'));
});

test('renderDigest omits Blob bodies from bounded digests', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-blob-'));
  const secret = 'SECRET_BLOB_PAYLOAD_SHOULD_NOT_APPEAR';
  const result = await renderDigest({
    query: { type: 'listRecords', effort: 'eff-one--0123456789abcdef' },
    queryHash: 'blob-list',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    records: [
      {
        id: 'blb-payload--0123456789abcdef',
        kind: 'blob' as const,
        path: 'blobs/blb-payload--0123456789abcdef.md',
        frontmatter: {
          id: 'blb-payload--0123456789abcdef',
          title: 'Payload',
          kind: 'markdown',
        },
        body_excerpt: secret,
        relations: {},
      },
    ],
    edges: [],
  });
  const digest = await readFile(result.artifact_path, 'utf8');
  t.false(digest.includes(secret));
  t.true(digest.includes('Blob body omitted from bounded digests'));
  t.true(digest.includes('proof get <blob-id>'));
});

test('renderDigest includes Blob body on fullBody get', async (t) => {
  const cacheRoot = await mkdtemp(join(tmpdir(), 'eg-digest-blob-full-'));
  const secret = 'SECRET_BLOB_PAYLOAD_FULL_GET';
  const result = await renderDigest({
    query: { type: 'getRecord', id: 'blb-payload--0123456789abcdef' },
    queryHash: 'blob-get',
    generation: '4',
    consistency: { mode: 'eventual' as const, min_generation: null },
    cacheRoot,
    fullBody: true,
    records: [
      {
        id: 'blb-payload--0123456789abcdef',
        kind: 'blob' as const,
        path: 'blobs/blb-payload--0123456789abcdef.md',
        frontmatter: {
          id: 'blb-payload--0123456789abcdef',
          title: 'Payload',
        },
        body_excerpt: secret,
        relations: {},
      },
    ],
    edges: [],
  });
  const digest = await readFile(result.artifact_path, 'utf8');
  t.true(digest.includes(secret));
  t.false(digest.includes('Blob body omitted'));
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
