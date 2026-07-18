import test from 'ava';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EffortGraphValidationError } from '../errors.js';
import { serializeDocument } from '../frontmatter.js';
import {
  buildEffortGraphSnapshot,
  createEffortGraphSnapshot,
} from '../snapshot.js';

const e = 'eff-one--0123456789abcdef';
const d = 'dec-one--0123456789abcdef';
const e2 = 'eff-two--0123456789abcdef';
const input = (id: string, kind: 'effort' | 'decision', effort?: string) => ({
  id,
  kind,
  path: `${kind}s/${id}.md`,
  frontmatter: {
    id,
    title: id,
    created_at: '2025-01-01T00:00:00.000Z',
    ...(effort ? { effort, state: 'proposed' } : { status: 'active' }),
  },
  body: `body-${id}`,
  rawBytes: serializeDocument(`body-${id}`, {
    id,
    title: id,
    created_at: '2025-01-01T00:00:00.000Z',
    ...(effort ? { effort, state: 'proposed' } : { status: 'active' }),
  }),
});

test('1 build capture survives later disk mutation', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'snap-'));
  await mkdir(join(root, 'efforts'));
  await mkdir(join(root, 'decisions'));
  const eb = serializeDocument('old', {
    id: e,
    title: 'old',
    created_at: '2025-01-01T00:00:00.000Z',
    status: 'active',
  });
  const db = serializeDocument('old', {
    id: d,
    effort: e,
    title: 'old',
    created_at: '2025-01-01T00:00:00.000Z',
    state: 'proposed',
  });
  await writeFile(join(root, 'efforts', `${e}.md`), eb);
  await writeFile(join(root, 'decisions', `${d}.md`), db);
  const snapshot = await buildEffortGraphSnapshot(root);
  await writeFile(
    join(root, 'efforts', `${e}.md`),
    serializeDocument('new', {
      id: e,
      title: 'new',
      created_at: '2025-01-01T00:00:00.000Z',
      status: 'paused',
    })
  );
  t.is(snapshot.getRecord(e)?.frontmatter.title, 'old');
  t.is(snapshot.recordsByEffort(e)[0].id, d);
  t.deepEqual(snapshot.getRawBytes(e), eb);
});

test('2 duplicate IDs fail deterministically', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'snap-'));
  await mkdir(join(root, 'efforts'));
  await mkdir(join(root, 'decisions'));
  const bytes = serializeDocument('', {
    id: e,
    title: 'x',
    created_at: '2025-01-01T00:00:00.000Z',
    status: 'active',
  });
  await writeFile(join(root, 'efforts', 'a.md'), bytes);
  await writeFile(
    join(root, 'decisions', 'b.md'),
    serializeDocument('', {
      id: e,
      effort: e,
      title: 'x',
      created_at: '2025-01-01T00:00:00.000Z',
      state: 'proposed',
    })
  );
  await t.throwsAsync(buildEffortGraphSnapshot(root), {
    instanceOf: EffortGraphValidationError,
    message: `Duplicate id ${e} at ${join(root, 'decisions/b.md')}`,
  });
});

test('3 missing and empty collection directories contribute no records', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'snap-'));
  const a = await buildEffortGraphSnapshot(root);
  t.false(a.hasId(e));
  t.deepEqual(a.recordsByKind('effort'), []);
  await mkdir(join(root, 'efforts'));
  const b = await buildEffortGraphSnapshot(root);
  t.deepEqual(b.recordsByEffort(e), []);
  t.is(b.getRecord(e), undefined);
});

test('4 byEffort filtering is exact', (t) => {
  const s = createEffortGraphSnapshot([
    input(e, 'effort'),
    input(e2, 'effort'),
    input(d, 'decision', e),
  ]);
  t.deepEqual(
    s.recordsByEffort(e).map((x) => x.id),
    [d]
  );
});
test('5 byKind filtering is exact', (t) => {
  const s = createEffortGraphSnapshot([
    input(e, 'effort'),
    input(e2, 'effort'),
    input(d, 'decision', e),
  ]);
  t.deepEqual(
    s.recordsByKind('decision').map((x) => x.id),
    [d]
  );
});
test('6 sibling filtering is exact', (t) => {
  const s = createEffortGraphSnapshot([
    input(e, 'effort'),
    input(d, 'decision', e),
    {
      ...input('dec-two--0123456789abcdef', 'decision', e),
      frontmatter: {
        ...input('dec-two--0123456789abcdef', 'decision', e).frontmatter,
        state: 'accepted',
      },
    },
    {
      ...input('dec-three--0123456789abcdef', 'decision', e),
      frontmatter: {
        ...input('dec-three--0123456789abcdef', 'decision', e).frontmatter,
        state: 'rejected',
      },
    },
    input('dec-four--0123456789abcdef', 'decision', e2),
  ]);
  t.deepEqual(
    s.siblingDecisions(e, { state: 'proposed', excludeId: d }).map((x) => x.id),
    []
  );
});
test('7 constructor protects snapshot data', (t) => {
  const fm = { ...input(d, 'decision', e).frontmatter };
  const bytes = Buffer.from('raw');
  const s = createEffortGraphSnapshot([
    { ...input(d, 'decision', e), frontmatter: fm, rawBytes: bytes },
  ]);
  fm.title = 'mutated';
  bytes[0] = 0;
  const records = s.recordsByKind('decision') as any[];
  records.push(input('x', 'decision', e) as any);
  const copy = s.getRawBytes(d)!;
  copy[0] = 0;
  t.is(s.getRecord(d)?.frontmatter.title, d);
  t.is(s.getRawBytes(d)?.toString(), 'raw');
  t.is(s.recordsByKind('decision').length, 1);
});
