import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'ava';

const run = promisify(execFile);
const script = resolve('packages/proof/scripts/sync-skills.mjs');

test('skill projection syncs, removes stale files, and checks without writing', async (t) => {
  const root = await mkdtemp(resolve(tmpdir(), 'flatbread-skills-'));
  const source = resolve(root, 'source');
  const destination = resolve(root, 'destination');
  try {
    await mkdir(resolve(source, 'nested'), { recursive: true });
    await mkdir(resolve(destination, 'nested'), { recursive: true });
    await writeFile(resolve(source, 'nested/skill.md'), 'canonical\n');
    await writeFile(resolve(destination, 'nested/skill.md'), 'old\n');
    await writeFile(resolve(destination, 'stale.md'), 'remove me\n');

    const check = (await t.throwsAsync(
      run(process.execPath, [
        script,
        '--check',
        '--source',
        source,
        '--destination',
        destination,
      ])
    )) as Error & { stderr: string };
    t.regex(check.stderr, /different: nested\/skill\.md/);
    t.regex(check.stderr, /stale: stale\.md/);
    t.is(
      await readFile(resolve(destination, 'nested/skill.md'), 'utf8'),
      'old\n'
    );

    await run(process.execPath, [
      script,
      '--source',
      source,
      '--destination',
      destination,
    ]);
    t.is(
      await readFile(resolve(destination, 'nested/skill.md'), 'utf8'),
      'canonical\n'
    );
    await run(process.execPath, [
      script,
      '--check',
      '--source',
      source,
      '--destination',
      destination,
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
