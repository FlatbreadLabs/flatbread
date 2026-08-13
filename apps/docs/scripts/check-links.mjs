#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveRepoLink } from '../plugins/remark-repo-links.mjs';

/**
 * Check the pages before the site is built.
 *
 * Four things go wrong when documentation and code live in one repository:
 * a page loses the frontmatter Flatbread needs, a link points at a file that
 * has moved, a `related` entry names a page that no longer exists, or a
 * relative link names more than one file so the site cannot rewrite it. Each
 * of those fails the build here, with the file and the line.
 */

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');
const defaultRepoRoot = resolve(app, '../..');
const defaultDocsDir = resolve(app, 'content/docs');
const defaultNavDir = resolve(app, 'content/nav');
const defaultReferenceDir = resolve(app, 'content/reference');

const REQUIRED = ['id', 'title', 'section', 'order', 'summary'];
const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function collectProblems({
  repoRoot = defaultRepoRoot,
  docsDir = defaultDocsDir,
  navDir = defaultNavDir,
  referenceDir = defaultReferenceDir,
} = {}) {
  const problems = [];

  // The rewriter names its bases relative to the repository root, so the
  // checker has to ask its questions in the same terms.
  const site = {
    problems,
    repoRoot,
    docsDir: relative(repoRoot, docsDir).split(sep).join('/'),
  };

  const guides = readdirSync(docsDir).filter((name) => name.endsWith('.md'));
  const sections = new Set(
    readdirSync(navDir)
      .filter((name) => name.endsWith('.yaml'))
      .map((name) => name.replace(/\.yaml$/, ''))
  );
  const guideIds = new Set(guides.map((name) => name.replace(/\.md$/, '')));

  for (const name of guides) {
    const path = resolve(docsDir, name);
    const text = readFileSync(path, 'utf8');
    const front = frontmatter(text);
    const id = name.replace(/\.md$/, '');

    for (const key of REQUIRED) {
      if (!(key in front)) {
        problems.push(
          `${rel(path, repoRoot)}: frontmatter is missing \`${key}\``
        );
      }
    }

    if (front.id && front.id !== id) {
      problems.push(
        `${rel(path, repoRoot)}: frontmatter id \`${
          front.id
        }\` does not match the filename \`${id}\`. Flatbread takes the id from the filename, so the two must agree.`
      );
    }

    if (front.section && !sections.has(front.section)) {
      problems.push(
        `${rel(path, repoRoot)}: section \`${
          front.section
        }\` has no file at content/nav/${front.section}.yaml`
      );
    }

    const related = front.related ?? [];
    if (!Array.isArray(related)) {
      problems.push(`${rel(path, repoRoot)}: \`related\` must be a list`);
    } else {
      for (const entry of related) {
        if (!guideIds.has(entry)) {
          problems.push(
            `${rel(path, repoRoot)}: related page \`${entry}\` does not exist`
          );
        }
      }
    }

    checkLinks(path, text, site);
  }

  for (const name of readdirSync(referenceDir).filter((n) =>
    n.endsWith('.md')
  )) {
    const link = resolve(referenceDir, name);
    if (!existsSync(link)) {
      problems.push(
        `${rel(link, repoRoot)}: symlink points at a README that is not there`
      );
      continue;
    }
    checkLinks(realpathSync(link), readFileSync(link, 'utf8'), site);
  }

  return problems;
}

function main() {
  const problems = collectProblems();
  if (problems.length > 0) {
    console.error(`\nThe docs site found ${problems.length} problem(s):\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('');
    process.exit(1);
  }

  const guides = readdirSync(defaultDocsDir).filter((name) =>
    name.endsWith('.md')
  );
  console.log(
    `Checked ${guides.length} guides and ${
      readdirSync(defaultReferenceDir).length
    } package pages. Every link resolves.`
  );
}

function checkLinks(path, text, { problems, repoRoot, docsDir }) {
  const base = dirname(path);

  for (const match of text.matchAll(LINK)) {
    const url = match[1];
    if (!url || url.startsWith('#')) continue;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) || url.startsWith('//')) continue;

    const [target] = url.split('#');
    if (!target) continue;

    if (!existsSync(resolve(base, target))) {
      problems.push(
        `${rel(path, repoRoot)}: link \`${url}\` points at nothing`
      );
    }

    // A link the rewriter cannot pin to one file stays relative on the site,
    // where it points at nothing, even though GitHub renders it correctly.
    const resolved = resolveRepoLink(url, { repoRoot, docsDir });
    if (resolved && resolved.targets.length > 1) {
      problems.push(
        `${rel(
          path,
          repoRoot
        )}: link \`${url}\` is ambiguous (${resolved.targets.join(
          ', '
        )}). Use an absolute \`https://github.com/FlatbreadLabs/flatbread/blob/main/...\` URL or a site path.`
      );
    }
  }
}

/** A deliberately small YAML reader: strings, numbers, and lists of strings. */
export function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return {};

  const data = {};
  let listKey;

  for (const line of match[1].split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) {
      data[listKey].push(unquote(item[1]));
      continue;
    }

    const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!pair) continue;

    if (pair[2] === '') {
      listKey = pair[1];
      data[listKey] = [];
      continue;
    }

    listKey = undefined;
    const value = unquote(pair[2]);
    data[pair[1]] = /^-?\d+$/.test(value) ? Number(value) : value;
  }

  return data;
}

function unquote(value) {
  return value.trim().replace(/^["'](.*)["']$/, '$1');
}

function rel(path, repoRoot) {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
