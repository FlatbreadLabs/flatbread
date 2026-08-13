import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { collectProblems, frontmatter } from './check-links.mjs';

describe('collectProblems', () => {
  it('reports nothing for a valid guide', () => {
    const problems = withRepo({
      'apps/docs/content/docs/glossary.md': page({
        id: 'glossary',
        body: '# Glossary\n\nSee [this page](./glossary.md).\n',
      }),
    });
    expect(problems).toEqual([]);
  });

  it('reports each missing required frontmatter key once', () => {
    const problems = withRepo({
      'apps/docs/content/docs/gap.md': page({
        id: 'gap',
        omit: ['title', 'summary'],
      }),
    });
    expect(problems).toEqual([
      'apps/docs/content/docs/gap.md: frontmatter is missing `title`',
      'apps/docs/content/docs/gap.md: frontmatter is missing `summary`',
    ]);
  });

  it('reports a frontmatter id that disagrees with the filename', () => {
    const problems = withRepo({
      'apps/docs/content/docs/gap.md': page({ id: 'other' }),
    });
    expect(problems).toContain(
      'apps/docs/content/docs/gap.md: frontmatter id `other` does not match the filename `gap`. Flatbread takes the id from the filename, so the two must agree.'
    );
  });

  it('reports a section with no file under content/nav', () => {
    const problems = withRepo({
      'apps/docs/content/docs/gap.md': page({
        id: 'gap',
        section: 'missing',
      }),
    });
    expect(problems).toContain(
      'apps/docs/content/docs/gap.md: section `missing` has no file at content/nav/missing.yaml'
    );
  });

  it('reports a scalar related as one list error and not per character', () => {
    const problems = withRepo({
      'apps/docs/content/docs/gap.md': page({
        id: 'gap',
        relatedScalar: 'json-export',
      }),
    });
    expect(problems).toEqual([
      'apps/docs/content/docs/gap.md: `related` must be a list',
    ]);
    expect(
      frontmatter(page({ id: 'gap', relatedScalar: 'json-export' })).related
    ).toBe('json-export');
  });

  it('reports a related guide that does not exist, and accepts a valid list', () => {
    const missing = withRepo({
      'apps/docs/content/docs/gap.md': page({
        id: 'gap',
        related: ['no-such-guide'],
      }),
    });
    expect(missing).toContain(
      'apps/docs/content/docs/gap.md: related page `no-such-guide` does not exist'
    );

    const ok = withRepo({
      'apps/docs/content/docs/gap.md': page({
        id: 'gap',
        related: ['glossary'],
      }),
      'apps/docs/content/docs/glossary.md': page({ id: 'glossary' }),
    });
    expect(ok.filter((problem) => problem.includes('related page'))).toEqual(
      []
    );
  });

  it('reports a link that points at nothing', () => {
    const problems = withRepo({
      'apps/docs/content/docs/gap.md': page({
        id: 'gap',
        body: '# Gap\n\nSee [missing](./nope.md).\n',
      }),
    });
    expect(problems).toContain(
      'apps/docs/content/docs/gap.md: link `./nope.md` points at nothing'
    );
  });

  it('reports an ambiguous link with its candidate targets', () => {
    const problems = withRepo({
      'apps/docs/content/docs/gap.md': page({ id: 'gap' }),
      'packages/codegen/README.md': '# codegen\n\nSee [readme](./README.md).\n',
      'packages/core/README.md': '# core\n',
      'apps/docs/content/reference/codegen.md': {
        linkTo: 'packages/codegen/README.md',
      },
      'apps/docs/content/reference/core.md': {
        linkTo: 'packages/core/README.md',
      },
    });
    const ambiguous = problems.filter((problem) =>
      problem.includes('is ambiguous')
    );
    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0]).toContain(
      'packages/codegen/README.md: link `./README.md` is ambiguous'
    );
    expect(ambiguous[0]).toContain('packages/codegen/README.md');
    expect(ambiguous[0]).toContain('packages/core/README.md');
    expect(ambiguous[0]).toContain(
      'https://github.com/FlatbreadLabs/flatbread/blob/main/...'
    );
    expect(ambiguous[0]).toContain('site path');
  });
});

function page({
  id,
  title = 'Title',
  section = 'start',
  order = 1,
  summary = 'A summary.',
  related,
  relatedScalar,
  body = '# Title\n',
  omit = [],
} = {}) {
  const fields = { id, title, section, order, summary };
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (omit.includes(key) || value === undefined) continue;
    lines.push(`${key}: ${value}`);
  }
  if (relatedScalar !== undefined) {
    lines.push(`related: ${relatedScalar}`);
  } else if (related) {
    lines.push('related:');
    for (const entry of related) lines.push(`  - ${entry}`);
  }
  lines.push('---', '', body);
  return lines.join('\n');
}

function withRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'docs-links-'));
  mkdirSync(join(root, 'apps/docs/content/docs'), { recursive: true });
  mkdirSync(join(root, 'apps/docs/content/nav'), { recursive: true });
  mkdirSync(join(root, 'apps/docs/content/reference'), { recursive: true });
  writeFileSync(
    join(root, 'apps/docs/content/nav/start.yaml'),
    'id: start\ntitle: Start\n'
  );

  try {
    for (const [rel, value] of Object.entries(files)) {
      const path = join(root, rel);
      mkdirSync(dirname(path), { recursive: true });
      if (value && typeof value === 'object' && value.linkTo) {
        symlinkSync(join(root, value.linkTo), path);
      } else {
        writeFileSync(path, value);
      }
    }
    return collectProblems({
      repoRoot: root,
      docsDir: join(root, 'apps/docs/content/docs'),
      navDir: join(root, 'apps/docs/content/nav'),
      referenceDir: join(root, 'apps/docs/content/reference'),
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
