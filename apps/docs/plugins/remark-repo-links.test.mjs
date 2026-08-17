import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import remarkRepoLinks, {
  remarkRepoLinks as namedRemarkRepoLinks,
  resolveRepoLink,
} from './remark-repo-links.mjs';

const BLOB = 'https://github.com/FlatbreadLabs/flatbread/blob/main';

let repoRoot;
let outsidePath;

beforeAll(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'docs-links-'));
  outsidePath = join(dirname(repoRoot), `${basename(repoRoot)}-outside.md`);
  writeFileSync(outsidePath, '# Outside\n');
  write('README.md', '# Flatbread\n');
  write('CONTRIBUTING.md', '# Contributing\n');
  write('apps/docs/content/docs/glossary.md', '# Glossary\n');
  write('apps/docs/content/docs/json-export.md', '# Snapshot export\n');
  write('packages/codegen/README.md', '# codegen\n');
  write('packages/core/README.md', '# core\n');
  symlinkSync(outsidePath, join(repoRoot, 'packages/core/outside.md'));
});

afterAll(() => {
  rmSync(repoRoot, { recursive: true, force: true });
  rmSync(outsidePath, { force: true });
});

describe('remarkRepoLinks', () => {
  it('keeps the default export and the named export as the same plugin', () => {
    expect(remarkRepoLinks).toBe(namedRemarkRepoLinks);
  });

  it('rewrites a guide-relative link to the guide route', () => {
    expect(apply('./glossary.md')).toBe('/docs/glossary/');
  });

  it('rewrites a link to the repository root README to the flatbread route', () => {
    expect(apply('../../README.md')).toBe('/reference/flatbread/');
    expect(resolveRepoLink('../../README.md', { repoRoot }).target).toBe(
      'README.md'
    );
  });

  it('rewrites a link to one package README to that package route', () => {
    expect(apply('../core/README.md')).toBe('/reference/core/');
    expect(apply('../codegen/README.md')).toBe('/reference/codegen/');
  });

  it('leaves ./README.md untouched when more than one package has that file', () => {
    expect(apply('./README.md')).toBe('./README.md');
    const resolved = resolveRepoLink('./README.md', { repoRoot });
    expect(resolved.href).toBeUndefined();
    expect(resolved.targets).toEqual([
      'packages/codegen/README.md',
      'packages/core/README.md',
    ]);
  });

  it('keeps a hash on a rewritten guide link and leaves a bare hash alone', () => {
    expect(apply('./glossary.md#terms')).toBe('/docs/glossary/#terms');
    expect(apply('#anchor')).toBe('#anchor');
  });

  it('prefixes site routes for a subpath deployment', () => {
    expect(
      resolveRepoLink('./glossary.md#terms', {
        repoRoot,
        basePath: '/flatbread/',
      }).href
    ).toBe('/flatbread/docs/glossary/#terms');
    expect(
      resolveRepoLink('/docs/glossary/#terms', {
        repoRoot,
        basePath: '/flatbread/',
      }).href
    ).toBe('/flatbread/docs/glossary/#terms');
    expect(
      resolveRepoLink('/flatbread/docs/glossary/#terms', {
        repoRoot,
        basePath: '/flatbread/',
      }).href
    ).toBe('/flatbread/docs/glossary/#terms');
  });

  it('rewrites a file with no site route to the GitHub blob URL', () => {
    expect(apply('../../CONTRIBUTING.md')).toBe(`${BLOB}/CONTRIBUTING.md`);
  });

  it('leaves absolute URLs and site paths alone', () => {
    expect(apply('https://example.com/x')).toBe('https://example.com/x');
    expect(apply('mailto:hi@example.com')).toBe('mailto:hi@example.com');
    expect(apply('/docs/x/')).toBe('/docs/x/');
  });

  it('refuses a relative link that leaves the repository', () => {
    const fromGuides = join(repoRoot, 'apps/docs/content/docs');
    const escaped = relative(fromGuides, outsidePath).split(sep).join('/');

    expect(apply(escaped)).toBe(escaped);
    expect(resolveRepoLink(escaped, { repoRoot })).toBeUndefined();
  });

  it('refuses a repository path whose symlink target leaves the repository', () => {
    expect(apply('./outside.md')).toBe('./outside.md');
    expect(resolveRepoLink('./outside.md', { repoRoot })).toBeUndefined();
  });

  it('rewrites a blob URL naming a guide to the guide route', () => {
    expect(apply(`${BLOB}/apps/docs/content/docs/glossary.md`)).toBe(
      '/docs/glossary/'
    );
    expect(apply(`${BLOB}/apps%2Fdocs%2Fcontent%2Fdocs%2Fglossary.md`)).toBe(
      '/docs/glossary/'
    );
  });

  it('keeps a hash on a rewritten blob URL naming a guide', () => {
    expect(
      apply(`${BLOB}/apps/docs/content/docs/glossary.md#cardinality`)
    ).toBe('/docs/glossary/#cardinality');
  });

  it('rewrites a blob URL naming a package README or the root README', () => {
    expect(apply(`${BLOB}/packages/core/README.md`)).toBe('/reference/core/');
    expect(apply(`${BLOB}/README.md`)).toBe('/reference/flatbread/');
  });

  it('leaves a blob URL naming a file with no page untouched', () => {
    expect(apply(`${BLOB}/CONTRIBUTING.md`)).toBe(`${BLOB}/CONTRIBUTING.md`);
  });

  it('leaves a blob URL naming a file that does not exist untouched', () => {
    const url = `${BLOB}/apps/docs/content/docs/nope.md`;
    expect(apply(url)).toBe(url);
  });

  it('leaves a blob URL on another branch or another repository untouched', () => {
    const otherBranch = `${BLOB.replace(
      /\/main$/,
      '/dev'
    )}/apps/docs/content/docs/glossary.md`;
    const otherRepo =
      'https://github.com/other/flatbread/blob/main/apps/docs/content/docs/glossary.md';
    expect(apply(otherBranch)).toBe(otherBranch);
    expect(apply(otherRepo)).toBe(otherRepo);
  });

  it('leaves a blob URL with a query string untouched', () => {
    const withQuery = `${BLOB}/apps/docs/content/docs/glossary.md?plain=1`;
    const withQueryAndHash = `${BLOB}/apps/docs/content/docs/glossary.md?plain=1#cardinality`;
    expect(apply(withQuery)).toBe(withQuery);
    expect(apply(withQueryAndHash)).toBe(withQueryAndHash);
  });
});

function apply(url) {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'link', url, children: [] }],
      },
    ],
  };
  namedRemarkRepoLinks({ repoRoot })(tree);
  return tree.children[0].children[0].url;
}

function write(rel, contents) {
  const path = join(repoRoot, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}
