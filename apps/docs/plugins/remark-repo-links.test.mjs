import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import remarkRepoLinks, {
  remarkRepoLinks as namedRemarkRepoLinks,
  resolveRepoLink,
} from './remark-repo-links.mjs';

const BLOB = 'https://github.com/FlatbreadLabs/flatbread/blob/main';

let repoRoot;

beforeAll(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'docs-links-'));
  write('README.md', '# Flatbread\n');
  write('CONTRIBUTING.md', '# Contributing\n');
  write('apps/docs/content/docs/glossary.md', '# Glossary\n');
  write('apps/docs/content/docs/json-export.md', '# Snapshot export\n');
  write('packages/codegen/README.md', '# codegen\n');
  write('packages/core/README.md', '# core\n');
});

afterAll(() => {
  rmSync(repoRoot, { recursive: true, force: true });
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

  it('rewrites a file with no site route to the GitHub blob URL', () => {
    expect(apply('../../CONTRIBUTING.md')).toBe(`${BLOB}/CONTRIBUTING.md`);
  });

  it('leaves absolute URLs and site paths alone', () => {
    expect(apply('https://example.com/x')).toBe('https://example.com/x');
    expect(apply('mailto:hi@example.com')).toBe('mailto:hi@example.com');
    expect(apply('/docs/x/')).toBe('/docs/x/');
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
