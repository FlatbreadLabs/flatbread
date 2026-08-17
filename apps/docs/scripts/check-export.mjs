#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
  posix,
} from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const defaultOutDir = resolve(here, '../out');
const ATTRIBUTE = /\b(?:href|src)=["']([^"']+)["']/gi;
const ID = /\bid=["']([^"']+)["']/gi;
const SEARCH_FIELDS = [
  'id',
  'title',
  'href',
  'kind',
  'group',
  'summary',
  'body',
];
const SEARCH_REQUIRED_TEXT = new Set(['id', 'title', 'href', 'kind', 'group']);
const SITE_ORIGIN = 'https://flatbread.invalid';

/** Validate the exact static artifact that Pages will receive. */
export function collectExportProblems({
  outDir = defaultOutDir,
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '',
} = {}) {
  const prefix = normalizeBasePath(basePath);
  const files = listFiles(outDir);
  const documents = new Map();
  const problems = [];
  const escapedFiles = new Set(
    files.filter((file) => !isArtifactPath(outDir, file))
  );
  for (const file of escapedFiles) {
    problems.push(
      `${nameOf(file, outDir)} resolves outside the exported artifact`
    );
  }

  const htmlFiles = files.filter(
    (file) => file.endsWith('.html') && !escapedFiles.has(file)
  );

  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    const ids = [...html.matchAll(ID)].map((match) => decodeHtml(match[1]));
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      problems.push(
        `${nameOf(file, outDir)} has duplicate ids: ${[
          ...new Set(duplicates),
        ].join(', ')}`
      );
    }
    documents.set(file, {
      ids: new Set(ids),
      urls: [...html.matchAll(ATTRIBUTE)].map((match) => decodeHtml(match[1])),
    });
  }

  for (const [file, document] of documents) {
    for (const url of document.urls) {
      if (isExternal(url)) continue;
      const [address, encodedFragment] = splitFragment(url);
      const route = routeFor(address, file, outDir, prefix);
      if (route.error) {
        problems.push(`${nameOf(file, outDir)}: ${route.error} in \`${url}\``);
        continue;
      }

      const output = outputFile(outDir, route.path);
      if (output.error) {
        problems.push(`${nameOf(file, outDir)}: ${output.error} in \`${url}\``);
        continue;
      }
      const target = output.path;
      if (!existsSync(target)) {
        problems.push(
          `${nameOf(file, outDir)}: \`${url}\` points at missing ${nameOf(
            target,
            outDir
          )}`
        );
        continue;
      }

      if (encodedFragment && target.endsWith('.html')) {
        const fragment = decodeFragment(encodedFragment);
        const targetDocument = documents.get(target);
        if (fragment && !targetDocument?.ids.has(fragment)) {
          problems.push(
            `${nameOf(
              file,
              outDir
            )}: \`${url}\` has no \`#${fragment}\` target in ${nameOf(
              target,
              outDir
            )}`
          );
        }
      }
    }
  }

  collectSearchIndexProblems(outDir, documents, problems);

  return problems;
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function routeFor(rawUrl, sourceFile, outDir, basePath) {
  const sourceRoute = routeOf(sourceFile, outDir);
  const sourceUrl = new URL(`${basePath}${sourceRoute}`, SITE_ORIGIN);
  let pathname;

  try {
    pathname = new URL(rawUrl || '', sourceUrl).pathname;
  } catch {
    return { error: 'URL is malformed' };
  }

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { error: 'URL path has malformed percent-encoding' };
  }

  // Static hosts decode paths before finding a file. Normalize only after
  // that decode, so encoded dot segments and slashes cannot escape the site.
  const normalized = posix.normalize(decoded);
  if (
    basePath &&
    normalized !== basePath &&
    !normalized.startsWith(`${basePath}/`)
  ) {
    return { error: `absolute site URL omits base path \`${basePath}\`` };
  }

  const stripped = basePath
    ? normalized.slice(basePath.length) || '/'
    : normalized;
  return { path: posix.normalize(stripped) };
}

function outputFile(outDir, route) {
  const clean = route.replace(/^\/+/, '');
  const path =
    !clean || route.endsWith('/') || extname(clean) === ''
      ? resolve(outDir, clean, 'index.html')
      : resolve(outDir, clean);

  if (!isArtifactPath(outDir, path)) {
    return { error: 'URL target leaves the exported artifact' };
  }
  return { path };
}

function collectSearchIndexProblems(outDir, documents, problems) {
  const file = resolve(outDir, 'search-index.json');
  if (!existsSync(file)) {
    problems.push('search-index.json is missing from the exported artifact');
    return;
  }
  if (!isArtifactPath(outDir, file)) {
    problems.push('search-index.json leaves the exported artifact');
    return;
  }

  let entries;
  try {
    entries = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    problems.push(
      `search-index.json is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return;
  }

  if (!Array.isArray(entries)) {
    problems.push('search-index.json must contain an array of entries');
    return;
  }
  if (entries.length === 0) {
    problems.push('search-index.json must contain at least one entry');
    return;
  }

  const ids = new Set();
  const hrefs = new Set();

  entries.forEach((entry, index) => {
    const label = `search-index.json entry ${index}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      problems.push(`${label} must be an object`);
      return;
    }

    for (const field of SEARCH_FIELDS) {
      const value = entry[field];
      if (typeof value !== 'string') {
        problems.push(`${label} \`${field}\` must be a string`);
      } else if (SEARCH_REQUIRED_TEXT.has(field) && value.trim().length === 0) {
        problems.push(`${label} \`${field}\` must not be blank`);
      }
    }

    if (
      typeof entry.kind === 'string' &&
      entry.kind !== 'guide' &&
      entry.kind !== 'package'
    ) {
      problems.push(`${label} \`kind\` must be \`guide\` or \`package\``);
    }

    checkUniqueSearchValue(entry.id, 'id', label, ids, problems);
    checkUniqueSearchValue(entry.href, 'href', label, hrefs, problems);

    if (typeof entry.href !== 'string' || entry.href.trim().length === 0) {
      return;
    }
    if (!entry.href.startsWith('/') || entry.href.startsWith('//')) {
      problems.push(`${label} \`href\` must be a root-relative site path`);
      return;
    }

    // Next's router adds the configured base path to logical app routes. The
    // index therefore stores `/docs/...`, not `/flatbread/docs/...`.
    const route = routeFor(entry.href, file, outDir, '');
    if (route.error) {
      problems.push(`${label} \`href\` ${route.error.toLowerCase()}`);
      return;
    }
    const output = outputFile(outDir, route.path);
    if (output.error) {
      problems.push(`${label} \`href\` ${output.error.toLowerCase()}`);
      return;
    }
    if (!existsSync(output.path)) {
      problems.push(
        `${label} \`href\` points at missing ${nameOf(output.path, outDir)}`
      );
      return;
    }
    if (!output.path.endsWith('.html') || !documents.has(output.path)) {
      problems.push(`${label} \`href\` must target an exported HTML page`);
      return;
    }

    const [, encodedFragment] = splitFragment(entry.href);
    if (encodedFragment) {
      const fragment = decodeFragment(encodedFragment);
      if (fragment && !documents.get(output.path)?.ids.has(fragment)) {
        problems.push(
          `${label} \`href\` has no \`#${fragment}\` target in ${nameOf(
            output.path,
            outDir
          )}`
        );
      }
    }
  });
}

function checkUniqueSearchValue(value, field, label, seen, problems) {
  if (typeof value !== 'string' || value.trim().length === 0) return;
  if (seen.has(value)) {
    problems.push(`${label} repeats \`${field}\` \`${value}\``);
  }
  seen.add(value);
}

function isArtifactPath(outDir, path) {
  const root = resolve(outDir);
  const target = resolve(path);
  const lexical = relative(root, target);
  if (
    lexical === '..' ||
    lexical.startsWith(`..${sep}`) ||
    isAbsolute(lexical)
  ) {
    return false;
  }

  if (!existsSync(target)) return true;
  try {
    const realRoot = realpathSync(root);
    const realTarget = realpathSync(target);
    const actual = relative(realRoot, realTarget);
    return (
      actual !== '..' && !actual.startsWith(`..${sep}`) && !isAbsolute(actual)
    );
  } catch {
    return false;
  }
}

function routeOf(file, outDir) {
  const name = nameOf(file, outDir);
  if (name === 'index.html') return '/';
  if (name.endsWith('/index.html')) {
    return `/${name.slice(0, -'index.html'.length)}`;
  }
  return `/${name}`;
}

function splitFragment(url) {
  const index = url.indexOf('#');
  return index === -1 ? [url, ''] : [url.slice(0, index), url.slice(index + 1)];
}

function decodeFragment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\dA-Fa-f]+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    );
}

function isExternal(url) {
  return (
    url.startsWith('//') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) ||
    url.startsWith('data:')
  );
}

function normalizeBasePath(value) {
  if (!value || value === '/') return '';
  return `/${value.replace(/^\/+|\/+$/g, '')}`;
}

function nameOf(path, root) {
  return relative(root, path).split(sep).join('/');
}

function main() {
  const problems = collectExportProblems();
  if (problems.length > 0) {
    console.error(
      `\nThe static docs export has ${problems.length} problem(s):\n`
    );
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('');
    process.exit(1);
  }
  console.log('Every exported route, asset, fragment, and id is valid.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
