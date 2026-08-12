import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = resolve(
  fileURLToPath(new URL('..', import.meta.url))
);
export const canonicalSkillRoot = resolve(packageRoot, 'skills');
export const forbiddenInvocation = 'node packages/flatbread/bin/flatbread.js';

export function verifyReleaseIdentity(canonicalTexts, packageVersions) {
  const entry = canonicalTexts.find(
    ({ path }) => path === 'skills/proof/release.json'
  );
  if (!entry)
    throw new Error('Canonical skill payload is missing release.json');
  let release;
  try {
    release = JSON.parse(entry.text);
  } catch (error) {
    throw new Error(
      `Canonical release.json is invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  const expectedTag = `v${packageVersions.flatbreadVersion}`;
  if (
    release.format !== 1 ||
    release.flatbreadVersion !== packageVersions.flatbreadVersion ||
    release.effortGraphVersion !== packageVersions.effortGraphVersion ||
    release.gitTag !== expectedTag
  ) {
    throw new Error(
      'Canonical release.json must contain format 1, both current package versions, and gitTag=v<flatbreadVersion>'
    );
  }
}

export function verifyPackPayload(
  payload,
  canonicalFiles,
  canonicalTexts,
  packageVersions
) {
  const files = Array.isArray(payload) ? payload[0]?.files : payload?.files;
  if (!Array.isArray(files)) {
    throw new Error('npm pack --dry-run returned no files list');
  }

  const packagedPaths = new Set(
    files
      .map((file) =>
        typeof file === 'string'
          ? file
          : file && typeof file === 'object' && 'path' in file
          ? file.path
          : undefined
      )
      .filter((file) => typeof file === 'string')
  );
  const missing = canonicalFiles.filter((file) => !packagedPaths.has(file));
  if (missing.length > 0) {
    throw new Error(
      [
        'Effort Graph package payload is missing canonical skill files:',
        ...missing.map((file) => `  ${file}`),
        'Check the package "files" configuration and run pnpm skills:sync.',
      ].join('\n')
    );
  }

  const forbiddenFiles = canonicalTexts
    .filter((entry) => entry.text.includes(forbiddenInvocation))
    .map((entry) => entry.path);
  if (forbiddenFiles.length > 0) {
    throw new Error(
      [
        `Canonical skill text contains the monorepo-only invocation "${forbiddenInvocation}":`,
        ...forbiddenFiles.map((file) => `  ${file}`),
        'Use the installed flatbread CLI instead.',
      ].join('\n')
    );
  }
  verifyReleaseIdentity(canonicalTexts, packageVersions);
}

async function readCanonicalSkill() {
  const files = [];
  async function visit(directory) {
    const names = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of names) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile())
        files.push({
          path: relative(packageRoot, path),
          text: await fs.readFile(path, 'utf8'),
        });
    }
  }
  await visit(canonicalSkillRoot);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export async function verifyPackagePayload() {
  const canonicalTexts = await readCanonicalSkill();
  const canonicalFiles = canonicalTexts.map((entry) => entry.path);
  const flatbreadPackage = JSON.parse(
    await fs.readFile(resolve(packageRoot, '../flatbread/package.json'), 'utf8')
  );
  const effortGraphPackage = JSON.parse(
    await fs.readFile(resolve(packageRoot, 'package.json'), 'utf8')
  );
  let output;
  try {
    output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const detail =
      error && typeof error === 'object' && 'stderr' in error
        ? String(error.stderr)
        : error instanceof Error
        ? error.message
        : String(error);
    throw new Error(`npm pack --dry-run failed:\n${detail}`);
  }

  let payload;
  try {
    payload = JSON.parse(output);
  } catch (error) {
    throw new Error(
      `npm pack --dry-run returned invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  verifyPackPayload(payload, canonicalFiles, canonicalTexts, {
    flatbreadVersion: flatbreadPackage.version,
    effortGraphVersion: effortGraphPackage.version,
  });
  return canonicalFiles;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyPackagePayload()
    .then((files) => {
      console.log(
        `Effort Graph package payload verified (${files.length} skill files).`
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
