import test from 'ava';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PrimitiveKind, ReadRecord } from '@flatbread/proof';
import {
  anchorMatches,
  codeAnchors,
  governingRecords,
  namesTarget,
  parseCodeTarget,
  type CodeTarget,
} from './anchors.js';
import { buildFindIndex, findRecords, renderFindCards } from './find.js';

const KINDS: Record<string, PrimitiveKind> = {
  eff: 'effort',
  iss: 'issue',
  fnd: 'finding',
  dec: 'decision',
  cit: 'citation',
};

function rec(
  id: string,
  fields: {
    title?: string;
    body?: string;
    created_at?: string;
    role?: string;
    state?: string;
    retracted?: boolean;
    relations?: ReadRecord['relations'];
  } = {}
): ReadRecord {
  const kind = KINDS[id.split('-', 1)[0]];
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

const file = (path: string, symbol?: string): CodeTarget => ({
  path,
  dir: false,
  file: true,
  ...(symbol ? { symbol } : {}),
  label: path,
});
const dir = (path: string): CodeTarget => ({
  path,
  dir: true,
  file: false,
  label: `${path}/`,
});
const symbol = (name: string): CodeTarget => ({
  dir: false,
  file: false,
  symbol: name,
  label: name,
});
const all = () => true;

test('a --path value reads as a file, a folder, a symbol, or both', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'anchors-'));
  t.teardown(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'pkg/src'), { recursive: true });
  await writeFile(join(root, 'pkg/src/run.ts'), '');
  const cwd = join(root, 'pkg');
  t.like(await parseCodeTarget('src/run.ts', cwd, root), {
    path: 'pkg/src/run.ts',
    dir: false,
    file: true,
  });
  t.like(await parseCodeTarget('./src', cwd, root), {
    path: 'pkg/src',
    dir: true,
    file: false,
    label: 'pkg/src/',
  });
  t.like(await parseCodeTarget('src/run.ts#start', cwd, root), {
    path: 'pkg/src/run.ts',
    symbol: 'start',
  });
  t.like(await parseCodeTarget('startFrame()', cwd, root), {
    path: undefined,
    symbol: 'startFrame',
  });
  t.like(await parseCodeTarget('Planner.plan', cwd, root), {
    symbol: 'Planner.plan',
  });
  // Not on disk: taken from the repository root, as a file and a folder.
  t.like(await parseCodeTarget('lib/gone.ts', cwd, root), {
    path: 'lib/gone.ts',
    dir: true,
    file: true,
  });
  // The repository root itself names everything, so it is refused.
  for (const value of ['.', './', root])
    await t.throwsAsync(parseCodeTarget(value, root, root), {
      message: /names the whole repository/,
    });
});

test('a --path value missing from the working tree resolves against ref trees', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'anchors-'));
  t.teardown(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'pkg/src'), { recursive: true });
  await writeFile(join(root, 'pkg/src/run.ts'), '');
  const cwd = join(root, 'pkg');
  // On disk, from the cwd or from the repository root: not absent.
  t.is((await parseCodeTarget('src/run.ts', cwd, root)).absent, undefined);
  t.like(await parseCodeTarget('pkg/src', cwd, root), {
    path: 'pkg/src',
    dir: true,
    file: false,
    absent: undefined,
  });
  t.like(await parseCodeTarget('lib/gone.ts', cwd, root), { absent: true });
  const trees: Record<string, 'file' | 'dir'> = {
    netcode: 'dir',
    'pkg/feature/wire.ts': 'file',
  };
  const inRefs = async (path: string) => trees[path];
  // A bare word a ref holds as a folder is that folder, not a symbol.
  t.like(await parseCodeTarget('netcode', cwd, root, inRefs), {
    path: 'netcode',
    dir: true,
    file: false,
    absent: true,
    label: 'netcode/',
  });
  t.like(await parseCodeTarget('netcode', cwd, root), {
    path: undefined,
    symbol: 'netcode',
  });
  // A path from the cwd that only a ref has.
  t.like(await parseCodeTarget('feature/wire.ts', cwd, root, inRefs), {
    path: 'pkg/feature/wire.ts',
    dir: false,
    file: true,
    absent: true,
  });
  // On no ref either: as before, a file and a folder from the root.
  t.like(await parseCodeTarget('lib/gone.ts', cwd, root, inRefs), {
    path: 'lib/gone.ts',
    dir: true,
    file: true,
    absent: true,
  });
});

test('code anchors parse path, symbol, and sha, and skip URLs and prose', (t) => {
  t.deepEqual(
    codeAnchors(
      'Pins `src/fuse.ts#budget@1a2b3c4d` and docs/fuse.md. See ' +
        'https://github.com/o/r/blob/main/src/other.ts, e.g. the plan.'
    ),
    [
      { path: 'src/fuse.ts', symbol: 'budget', sha: '1a2b3c4d' },
      { path: 'docs/fuse.md' },
    ]
  );
});

test('anchors match a file, files under a folder, and a symbol', (t) => {
  const anchor = { path: 'src/fuse.ts', symbol: 'budget' };
  t.true(anchorMatches(anchor, file('src/fuse.ts')));
  t.true(anchorMatches(anchor, file('src/fuse.ts', 'budget')));
  t.false(anchorMatches(anchor, file('src/fuse.ts', 'other')));
  // A file anchor with no symbol covers every symbol in it.
  t.true(anchorMatches({ path: 'src/fuse.ts' }, file('src/fuse.ts', 'x')));
  t.true(anchorMatches(anchor, dir('src')));
  t.false(anchorMatches(anchor, dir('sr')));
  t.true(anchorMatches(anchor, symbol('budget')));
  t.false(anchorMatches({ path: 'src/fuse.ts' }, symbol('budget')));
});

test('a body names a path only as a whole token, and a symbol as name( or #name', (t) => {
  t.true(namesTarget('We changed src/fuse.ts.', file('src/fuse.ts')));
  t.false(namesTarget('We changed src/fuse.tsx', file('src/fuse.ts')));
  t.false(namesTarget('We changed lib/src/fuse.ts', file('src/fuse.ts')));
  t.true(namesTarget('see src/net/peer.ts', dir('src/net')));
  t.false(namesTarget('see src/network.ts', dir('src/net')));
  t.true(namesTarget('calls budget() each frame', symbol('budget')));
  t.true(namesTarget('see src/fuse.ts#budget', symbol('budget')));
  t.false(namesTarget('the budget is 4 ms', symbol('budget')));
  // A method call names the method.
  t.true(
    namesTarget('Calling this.budget() twice is cheap.', symbol('budget'))
  );
  t.false(namesTarget('calls overbudget() once', symbol('budget')));
  t.true(
    namesTarget('src/fuse.ts calls budget()', file('src/fuse.ts', 'budget'))
  );
  t.false(namesTarget('src/fuse.ts only', file('src/fuse.ts', 'budget')));
});

test('a code Citation governs its citers and causes; trailers and text add weaker ties', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    rec('cit-code', { role: 'code', body: 'src/fuse.ts#budget@1a2b3c4' }),
    rec('cit-url', { body: 'https://example.com/src/fuse.ts' }),
    rec('cit-orphan', { role: 'code', body: 'src/fuse.ts' }),
    rec('dec-cites', {
      state: 'accepted',
      relations: { cites: ['cit-code'] },
    }),
    rec('fnd-trailer'),
    rec('fnd-text', { body: 'The cap lives in src/fuse.ts.' }),
    rec('fnd-other', { body: 'Nothing about code.' }),
  ]);
  const governed = governingRecords(
    index,
    file('src/fuse.ts'),
    [{ sha: 'abcdef1234567', subject: 'Cap the fuse', ids: ['fnd-trailer'] }],
    all
  );
  t.deepEqual([...governed.keys()].sort(), [
    'cit-orphan',
    'dec-cites',
    'fnd-text',
    'fnd-trailer',
  ]);
  t.deepEqual(governed.get('dec-cites'), [
    {
      strength: 3,
      record: 'dec-cites',
      text: 'cites cit-code: src/fuse.ts#budget@1a2b3c4',
    },
  ]);
  t.is(governed.get('fnd-trailer')?.[0].text, 'commit abcdef1 "Cap the fuse"');
  t.is(governed.get('fnd-text')?.[0].strength, 1);
});

test('governed cards resolve to the chain head and rank by tie, then recency', (t) => {
  const index = buildFindIndex([
    rec('eff-a'),
    rec('cit-code', { role: 'code', body: 'src/fuse.ts' }),
    rec('dec-old', {
      state: 'superseded',
      relations: { cites: ['cit-code'], superseded_by: ['dec-new'] },
    }),
    rec('dec-new', {
      state: 'accepted',
      created_at: '2026-02-01T00:00:00.000Z',
      relations: { supersedes: ['dec-old'] },
    }),
    rec('fnd-text-old', { body: 'see src/fuse.ts' }),
    rec('fnd-text-new', {
      body: 'see src/fuse.ts again',
      created_at: '2026-03-01T00:00:00.000Z',
    }),
    rec('fnd-retracted', { body: 'src/fuse.ts', retracted: true }),
  ]);
  const governed = governingRecords(index, file('src/fuse.ts'), [], all);
  const result = findRecords(index, '', { governed });
  t.deepEqual(
    result.hits.map((hit) => hit.record.id),
    ['dec-new', 'fnd-text-new', 'fnd-text-old']
  );
  t.true(result.unscored);
  const cards = renderFindCards(index, {
    ...result,
    header: 'find --path src/fuse.ts',
  });
  t.regex(
    cards,
    /1\. dec-new \| decision \| accepted \(head\) \| 2026-02-01\n/
  );
  t.regex(cards, /via: cites cit-code: src\/fuse\.ts \(on dec-old\)/);
  t.notRegex(cards, /score/);
  t.notRegex(cards, /^matched:/m);
  // Words rank the governed set by BM25, and only it.
  const worded = findRecords(index, 'again', { governed });
  t.is(worded.hits[0].record.id, 'fnd-text-new');
  t.is(worded.hits.length, 3);
  // A retracted record shows only when asked for.
  t.true(
    findRecords(index, '', { governed, retracted: 'include' }).hits.some(
      (hit) => hit.record.id === 'fnd-retracted'
    )
  );
});
