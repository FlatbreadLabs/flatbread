#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');

const QUERY = `
  query DocsContentParity {
    allDocs { id }
    allSections { id }
    allPackages { id }
  }
`;

const COLLECTIONS = [
  ['allDocs', resolve(app, 'content/docs'), '.md'],
  ['allSections', resolve(app, 'content/nav'), '.yaml'],
  ['allPackages', resolve(app, 'content/reference'), '.md'],
];

export function compareIds(collection, diskIds, records) {
  const problems = [];
  const graphIds = records.flatMap((record) =>
    typeof record?.id === 'string' && record.id.length > 0 ? [record.id] : []
  );
  const disk = [...new Set(diskIds)].sort();
  const graph = [...new Set(graphIds)].sort();
  const missing = disk.filter((id) => !graph.includes(id));
  const extra = graph.filter((id) => !disk.includes(id));
  const duplicates = graphIds.filter(
    (id, index) => graphIds.indexOf(id) !== index
  );

  if (records.length !== graphIds.length) {
    problems.push(`${collection} returned a row without an id`);
  }
  if (duplicates.length > 0) {
    problems.push(
      `${collection} returned duplicate ids: ${[...new Set(duplicates)].join(
        ', '
      )}`
    );
  }
  if (missing.length > 0) {
    problems.push(`${collection} missed files: ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    problems.push(
      `${collection} returned ids with no file: ${extra.join(', ')}`
    );
  }

  return problems;
}

export async function collectParityProblems({
  endpoint = process.env.FLATBREAD_GRAPHQL_ENDPOINT ??
    'http://localhost:5057/graphql',
  fetchImpl = fetch,
  collections = COLLECTIONS,
} = {}) {
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY }),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    // An HTTP failure may not have a JSON body. The status below is still
    // actionable; a successful response without JSON is reported separately.
  }

  if (result?.errors?.length) {
    const details = result.errors.map((error) => error.message).join('\n');
    const status = response.ok
      ? ''
      : `Flatbread answered ${response.status} during parity check:\n`;
    throw new Error(`${status}${details}`);
  }
  if (!response.ok) {
    throw new Error(
      `Flatbread answered ${response.status} during parity check.`
    );
  }
  if (!result?.data) throw new Error('Flatbread returned no parity data.');

  return collections.flatMap(([name, directory, extension]) => {
    const diskIds = readdirSync(directory)
      .filter((file) => file.endsWith(extension))
      .map((file) => file.slice(0, -extension.length));
    return compareIds(name, diskIds, result.data[name] ?? []);
  });
}

async function main() {
  const problems = await collectParityProblems();
  if (problems.length > 0) {
    console.error(`\nThe content graph differs from disk:\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('');
    process.exit(1);
  }

  console.log(
    'The content graph contains every guide, section, and package page.'
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
