import { existsSync, readdirSync } from 'node:fs';
import { posix, resolve, relative, sep } from 'node:path';

import { walk } from './walk.mjs';

/**
 * Rewrite links that point at files in this repository.
 *
 * Every page the site renders is a real Markdown file that also has to read
 * well on GitHub, so the files keep ordinary relative links such as
 * `./glossary.md`. This plugin turns those into site routes while the page is
 * being built.
 *
 * Flatbread hands the markdown processor a string, not a file, so the plugin
 * cannot know which document it is rewriting. Instead it resolves each link
 * against every directory that holds a page — the guides folder and each
 * package folder — and takes the one that names a file that exists.
 */
export function remarkRepoLinks(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const docsDir = options.docsDir ?? 'apps/docs/content/docs';
  const packagesDir = options.packagesDir ?? 'packages';
  const blobBase =
    options.blobBase ?? 'https://github.com/FlatbreadLabs/flatbread/blob/main';

  const bases = [docsDir, ...listPackageDirs(repoRoot, packagesDir)];

  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'link' || typeof node.url !== 'string') return;
      const rewritten = rewrite(node.url, {
        repoRoot,
        docsDir,
        blobBase,
        bases,
      });
      if (rewritten) node.url = rewritten;
    });
  };
}

function listPackageDirs(repoRoot, packagesDir) {
  const root = resolve(repoRoot, packagesDir);
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => posix.join(packagesDir, entry.name));
}

function rewrite(url, { repoRoot, docsDir, blobBase, bases }) {
  if (!isRelative(url)) return undefined;

  const [path, hash] = splitHash(url);
  if (!path) return undefined;

  const target = findTarget(path, { repoRoot, bases });
  if (!target) return undefined;

  const route = routeFor(target, docsDir);
  if (route) return route + hash;

  return `${blobBase}/${target}${hash}`;
}

function isRelative(url) {
  if (!url) return false;
  if (url.startsWith('#')) return false;
  if (url.startsWith('/')) return false;
  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}

function splitHash(url) {
  const index = url.indexOf('#');
  if (index === -1) return [url, ''];
  return [url.slice(0, index), url.slice(index)];
}

function findTarget(path, { repoRoot, bases }) {
  for (const base of bases) {
    const absolute = resolve(repoRoot, base, path);
    if (!existsSync(absolute)) continue;
    return relative(repoRoot, absolute).split(sep).join('/');
  }
  return undefined;
}

/** Map a repo-relative file to the route the site serves it at, if any. */
function routeFor(target, docsDir) {
  if (target === 'README.md') return '/reference/flatbread/';

  const guide = new RegExp(`^${escapeRegExp(docsDir)}/([^/]+)\\.md$`).exec(
    target
  );
  if (guide) return `/docs/${guide[1]}/`;

  const pkg = /^packages\/([^/]+)\/README\.md$/.exec(target);
  if (pkg) return `/reference/${pkg[1]}/`;

  return undefined;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default remarkRepoLinks;
