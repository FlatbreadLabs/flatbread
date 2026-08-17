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

import { collectExportProblems } from './check-export.mjs';

describe('collectExportProblems', () => {
  it('accepts base-prefixed routes, assets, and fragments', () => {
    const problems = withExport({
      'index.html':
        '<main id="main-content"><a href="/flatbread/docs/guide/#part">Guide</a><script src="/flatbread/app%5Bslug%5D.js"></script></main>',
      'docs/guide/index.html': '<h2 id="part">Part</h2>',
      'app[slug].js': 'console.log("ok")',
    });

    expect(problems).toEqual([]);
  });

  it('reports missing fragment targets and duplicate ids', () => {
    const problems = withExport({
      'index.html':
        '<main id="same"><div id="same"></div><a href="/flatbread/docs/guide/#missing">Guide</a></main>',
      'docs/guide/index.html': '<h2 id="present">Present</h2>',
    });

    expect(problems).toContain('index.html has duplicate ids: same');
    expect(problems).toContain(
      'index.html: `/flatbread/docs/guide/#missing` has no `#missing` target in docs/guide/index.html'
    );
  });

  it('reports a missing base prefix and a missing local file', () => {
    const problems = withExport({
      'index.html':
        '<a href="/docs/guide/">Unprefixed</a><a href="/flatbread/nope/">Missing</a>',
    });

    expect(problems).toContain(
      'index.html: absolute site URL omits base path `/flatbread` in `/docs/guide/`'
    );
    expect(problems).toContain(
      'index.html: `/flatbread/nope/` points at missing nope/index.html'
    );
  });

  it('resolves relative and encoded paths the way a browser does', () => {
    const problems = withExport({
      'index.html': '<a href="/flat%62read/docs/other/">Encoded base</a>',
      'docs/guide/index.html':
        '<a href="%2e%2e%2fother/?view=full#part">Other</a>',
      'docs/other/index.html': '<h2 id="part">Part</h2>',
    });

    expect(problems).toEqual([]);
  });

  it('reports malformed encoded paths', () => {
    const problems = withExport({
      'index.html': '<a href="/flatbread/%ZZ">Broken</a>',
    });

    expect(problems).toContain(
      'index.html: URL path has malformed percent-encoding in `/flatbread/%ZZ`'
    );
  });

  it('requires a parseable search index array', () => {
    expect(
      withExport({ 'index.html': '<main></main>' }, { includeIndex: false })
    ).toContain('search-index.json is missing from the exported artifact');

    expect(
      withExport({
        'index.html': '<main></main>',
        'search-index.json': '{not-json',
      }).some((problem) =>
        problem.startsWith('search-index.json is not valid JSON:')
      )
    ).toBe(true);

    expect(
      withExport({
        'index.html': '<main></main>',
        'search-index.json': JSON.stringify({ entries: [] }),
      })
    ).toContain('search-index.json must contain an array of entries');

    expect(
      withExport({
        'index.html': '<main></main>',
        'search-index.json': '[]',
      })
    ).toContain('search-index.json must contain at least one entry');
  });

  it('validates search entry fields, uniqueness, and page targets', () => {
    const entry = {
      id: 'guide',
      title: 'Guide',
      href: '/docs/missing/',
      kind: 'guide',
      group: 'Start',
      summary: '',
      body: 'Guide body',
    };
    const problems = withExport({
      'index.html': '<main></main>',
      'search-index.json': JSON.stringify([
        entry,
        { ...entry, title: 42, kind: 'other' },
      ]),
    });

    expect(problems).toContain(
      'search-index.json entry 0 `href` points at missing docs/missing/index.html'
    );
    expect(problems).toContain(
      'search-index.json entry 1 `title` must be a string'
    );
    expect(problems).toContain(
      'search-index.json entry 1 `kind` must be `guide` or `package`'
    );
    expect(problems).toContain(
      'search-index.json entry 1 repeats `id` `guide`'
    );
    expect(problems).toContain(
      'search-index.json entry 1 repeats `href` `/docs/missing/`'
    );
  });

  it('validates search entry fragments', () => {
    const problems = withExport({
      'index.html': '<main></main>',
      'docs/guide/index.html': '<h2 id="present">Present</h2>',
      'search-index.json': JSON.stringify([
        {
          id: 'guide',
          title: 'Guide',
          href: '/docs/guide/#missing',
          kind: 'guide',
          group: 'Start',
          summary: 'Guide',
          body: 'Guide body',
        },
      ]),
    });

    expect(problems).toContain(
      'search-index.json entry 0 `href` has no `#missing` target in docs/guide/index.html'
    );
  });

  it('rejects an exported target whose symlink leaves the artifact', () => {
    const problems = withExport({
      'index.html': '<a href="/flatbread/escape.html">Escape</a>',
      'escape.html': { outside: '<main>Outside</main>' },
    });

    expect(problems).toContain(
      'index.html: URL target leaves the exported artifact in `/flatbread/escape.html`'
    );
    expect(problems).toContain(
      'escape.html resolves outside the exported artifact'
    );
  });
});

function withExport(files, { includeIndex = true } = {}) {
  const outDir = mkdtempSync(join(tmpdir(), 'docs-export-'));
  const outsideDir = mkdtempSync(join(tmpdir(), 'docs-export-outside-'));
  try {
    if (includeIndex && !Object.hasOwn(files, 'search-index.json')) {
      files = {
        ...files,
        'search-index.json': JSON.stringify([
          {
            id: 'home',
            title: 'Home',
            href: '/',
            kind: 'guide',
            group: 'Docs',
            summary: 'Home page',
            body: 'Home page',
          },
        ]),
      };
    }

    for (const [name, contents] of Object.entries(files)) {
      const path = join(outDir, name);
      mkdirSync(dirname(path), { recursive: true });
      if (contents && typeof contents === 'object' && contents.outside) {
        const target = join(outsideDir, name);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, contents.outside);
        symlinkSync(target, path);
      } else {
        writeFileSync(path, contents);
      }
    }
    return collectExportProblems({ outDir, basePath: '/flatbread' });
  } finally {
    rmSync(outDir, { recursive: true, force: true });
    rmSync(outsideDir, { recursive: true, force: true });
  }
}
