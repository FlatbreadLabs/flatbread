import { existsSync, readdirSync } from 'node:fs';
import { posix, resolve, relative, sep } from 'node:path';

import { walk } from './walk.mjs';

/**
 * Rewrite links that point at files in this repository.
 *
 * Every page the site renders is a real Markdown file that also has to read
 * well on GitHub, so the files keep ordinary relative links such as
 * `./glossary.md`. Package READMEs that must work on npm use absolute GitHub
 * blob URLs instead. This plugin turns both into site routes while the page
 * is being built.
 *
 * Flatbread hands the markdown processor a string, not a file, so the plugin
 * cannot see which document it is rewriting. A relative path is resolved
 * against every directory that holds a page — the guides folder and each
 * package folder — and rewritten only when every base agrees on one file.
 * An ambiguous relative link is left alone. An absolute blob URL into this
 * repository names its file outright, so the plugin maps it to the site
 * route when the site serves that file.
 */
export function remarkRepoLinks(options = {}) {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'link' || typeof node.url !== 'string') return;
      const href = resolveRepoLink(node.url, options)?.href;
      if (href) node.url = href;
    });
  };
}

/**
 * Resolve a link against this repository.
 *
 * A relative path is tried against every page directory. Returns undefined
 * when no base names a file that exists. When the matching bases all point
 * at the same file, `href` is the site route or the GitHub blob URL. When
 * they disagree, `targets` lists the distinct files and `href` is omitted
 * so the caller can leave the link alone.
 *
 * An absolute GitHub blob URL that starts with `blobBase` and names a file
 * this site serves becomes that site route. The URL already names the file,
 * so there is nothing to guess. A blob URL to a file with no page, a file
 * that is not there, another branch or repository, or a query string is
 * left alone. Query strings are refused rather than stripped: this site has
 * no equivalent of GitHub's `?plain=1`, so the address is kept as written.
 */
export function resolveRepoLink(url, options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const docsDir = options.docsDir ?? 'apps/docs/content/docs';
  const packagesDir = options.packagesDir ?? 'packages';
  const blobBase =
    options.blobBase ?? 'https://github.com/FlatbreadLabs/flatbread/blob/main';

  if (isRelative(url)) {
    const [path, hash] = splitHash(url);
    if (!path) return undefined;

    const bases = [docsDir, ...listPackageDirs(repoRoot, packagesDir)];
    const targets = findTargets(path, { repoRoot, bases });
    if (targets.length === 0) return undefined;
    if (targets.length > 1) return { targets };

    const target = targets[0];
    const route = routeFor(target, docsDir);
    const href = route ? route + hash : `${blobBase}/${target}${hash}`;
    return { targets, target, route, href };
  }

  return resolveBlobUrl(url, { repoRoot, docsDir, blobBase });
}

function listPackageDirs(repoRoot, packagesDir) {
  const root = resolve(repoRoot, packagesDir);
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => posix.join(packagesDir, entry.name));
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

function resolveBlobUrl(url, { repoRoot, docsDir, blobBase }) {
  const [withoutHash, hash] = splitHash(url);
  const prefix = `${blobBase}/`;
  if (!withoutHash.startsWith(prefix)) return undefined;
  if (withoutHash.includes('?')) return undefined;

  const encoded = withoutHash.slice(prefix.length);
  if (!encoded) return undefined;

  let decoded;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return undefined;
  }

  const absolute = resolve(repoRoot, decoded);
  const target = relative(repoRoot, absolute).split(sep).join('/');
  if (!target || target.startsWith('..')) return undefined;
  if (!existsSync(absolute)) return undefined;

  const route = routeFor(target, docsDir);
  if (!route) return undefined;

  return { targets: [target], target, route, href: route + hash };
}

function findTargets(path, { repoRoot, bases }) {
  const seen = new Set();
  for (const base of bases) {
    const absolute = resolve(repoRoot, base, path);
    if (!existsSync(absolute)) continue;
    seen.add(relative(repoRoot, absolute).split(sep).join('/'));
  }
  return [...seen].sort();
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
