import { promises as fs } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(scriptDirectory, '../../..');
export const defaultSource = resolve(
  repositoryRoot,
  'packages/effort-graph/skills/effort-graph'
);
export const defaultDestination = resolve(
  repositoryRoot,
  '.agents/skills/effort-graph'
);
export const managedSkillNames = [
  'effort-graph',
  'effort-modeling',
  'grill-with-efforts',
];
export const managedSkillSources = managedSkillNames.map((name) =>
  resolve(repositoryRoot, 'packages/effort-graph/skills', name)
);

async function entries(root) {
  const result = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        result.push(relative(root, path));
      }
    }
  }
  await visit(root);
  return result.sort();
}

async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function inspectProjection(
  source = defaultSource,
  destination = defaultDestination
) {
  const sourceFiles = await entries(source);
  const destinationFiles = (await exists(destination))
    ? await entries(destination)
    : [];
  const sourceSet = new Set(sourceFiles);
  const destinationSet = new Set(destinationFiles);
  const missing = sourceFiles.filter((file) => !destinationSet.has(file));
  const stale = destinationFiles.filter((file) => !sourceSet.has(file));
  const different = [];

  for (const file of sourceFiles) {
    if (
      destinationSet.has(file) &&
      !Buffer.from(await fs.readFile(resolve(source, file))).equals(
        await fs.readFile(resolve(destination, file))
      )
    ) {
      different.push(file);
    }
  }

  return { missing, different, stale };
}

export async function syncProjection({
  source = defaultSource,
  destination = defaultDestination,
  check = false,
} = {}) {
  const drift = await inspectProjection(source, destination);
  if (check) return drift;

  await fs.mkdir(destination, { recursive: true });
  for (const file of [...drift.missing, ...drift.different]) {
    const target = resolve(destination, file);
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.copyFile(resolve(source, file), target);
  }
  for (const file of drift.stale) {
    await fs.rm(resolve(destination, file));
  }

  return inspectProjection(source, destination);
}

export async function syncManagedProjections({ check = false } = {}) {
  const drift = { missing: [], different: [], stale: [] };

  for (const [index, name] of managedSkillNames.entries()) {
    const source = managedSkillSources[index];
    const destination = resolve(repositoryRoot, '.agents/skills', name);
    const result = await syncProjection({ source, destination, check });
    for (const key of Object.keys(drift)) {
      drift[key].push(...result[key].map((file) => `${name}/${file}`));
    }
  }

  return drift;
}

function parseArguments(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--check') options.check = true;
    else if (argument === '--source')
      options.source = resolve(arguments_[++index]);
    else if (argument === '--destination')
      options.destination = resolve(arguments_[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const hasCustomProjection = options.source || options.destination;
    if (Boolean(options.source) !== Boolean(options.destination)) {
      throw new Error('--source and --destination must be provided together');
    }
    const drift = hasCustomProjection
      ? await syncProjection(options)
      : await syncManagedProjections(options);
    const changed =
      drift.missing.length + drift.different.length + drift.stale.length;
    if (options.check && changed > 0) {
      console.error(
        [
          'Effort Graph skill projection is out of date:',
          ...drift.missing.map((file) => `  missing: ${file}`),
          ...drift.different.map((file) => `  different: ${file}`),
          ...drift.stale.map((file) => `  stale: ${file}`),
        ].join('\n')
      );
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
