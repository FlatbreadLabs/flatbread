import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import colors from 'kleur';
import {
  formatGithubReleaseNotes,
  prepareReleaseChangelog,
} from './utils/changelog';

export type ChangelogCliOptions = {
  readonly dryRun: boolean;
  readonly version?: string;
};

export function parseChangelogArgs(
  argv: readonly string[]
): ChangelogCliOptions {
  let dryRun = false;
  let version: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--version') {
      version = argv[index + 1];
      if (!version || version.startsWith('-')) {
        throw new Error('--version requires a semver value');
      }
      index += 1;
      continue;
    }
    if (arg.startsWith('--version=')) {
      version = arg.slice('--version='.length);
      if (!version) throw new Error('--version requires a semver value');
      continue;
    }
    throw new Error(`Unknown changelog flag: ${arg}`);
  }

  return { dryRun, version };
}

export async function readLockstepVersion(): Promise<string> {
  const manifest = JSON.parse(
    await fs.readFile('packages/flatbread/package.json', 'utf8')
  ) as { version?: string };
  if (!manifest.version) {
    throw new Error('packages/flatbread/package.json is missing a version');
  }
  return manifest.version;
}

export async function shiftChangelog(
  options: ChangelogCliOptions
): Promise<void> {
  const version = options.version ?? (await readLockstepVersion());
  const path = 'CHANGELOG.md';
  const markdown = await fs.readFile(path, 'utf8');
  const prepared = prepareReleaseChangelog(markdown, version);

  if (options.dryRun) {
    console.log(
      colors.bold().yellow(`Dry run: changelog for ${version} (no file write)`)
    );
  }

  if (!prepared.didShift) {
    console.log(
      colors
        .bold()
        .green(
          `CHANGELOG.md already has ## ${version}; Unreleased has no items to move`
        )
    );
    printNotes(prepared.notes, version);
    return;
  }

  if (options.dryRun) {
    printNotes(prepared.notes, version);
    printPreview(prepared.markdown);
    return;
  }

  await fs.writeFile(path, prepared.markdown);
  console.log(
    colors.bold().green(`Moved Unreleased items under ## ${version}`)
  );
  printNotes(prepared.notes, version);
}

function printNotes(notes: string, version: string): void {
  console.log(colors.bold('\nGitHub release notes\n'));
  console.log(formatGithubReleaseNotes(notes, version));
}

function printPreview(markdown: string): void {
  const lines = markdown.split('\n');
  const preview = lines.slice(0, 40).join('\n');
  const omitted =
    lines.length > 40 ? `\n… ${lines.length - 40} more lines` : '';
  console.log(colors.bold('\nCHANGELOG.md preview\n'));
  console.log(`${preview}${omitted}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await shiftChangelog(parseChangelogArgs(process.argv.slice(2)));
}
