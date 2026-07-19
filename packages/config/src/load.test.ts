import test from 'ava';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import { NoConfigFoundError, TooManyConfigsFoundError } from './errors';
import { loadConfig } from './load';

async function withTempConfig(
  files: Record<string, string>,
  callback: (cwd: string) => Promise<void>
) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'flatbread-config-'));

  try {
    await Promise.all(
      Object.entries(files).map(([filename, contents]) =>
        fs.writeFile(path.join(cwd, filename), contents)
      )
    );
    await callback(cwd);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}

test('loadConfig throws NoConfigFoundError without exiting', async (t) => {
  await withTempConfig({}, async (cwd) => {
    const error = await t.throwsAsync(loadConfig({ cwd }));

    t.true(error instanceof NoConfigFoundError);
  });
});

test('loadConfig throws TooManyConfigsFoundError without exiting', async (t) => {
  await withTempConfig(
    {
      'flatbread.config.js': 'export default {};',
      'flatbread.config.ts': 'export default {};',
    },
    async (cwd) => {
      const error = await t.throwsAsync(loadConfig({ cwd }));

      t.true(error instanceof TooManyConfigsFoundError);
    }
  );
});

test('loadConfig returns an initialized config', async (t) => {
  await withTempConfig(
    {
      'flatbread.config.js': `
        export default {
          source: { fetch: async () => ({}) },
          transformer: { extensions: ['.md'], inspect: (input) => String(input) },
          content: [],
        };
      `,
    },
    async (cwd) => {
      const result = await loadConfig({ cwd });
      const config = result.config as LoadedFlatbreadConfig;

      t.is(result.filepath, path.join(cwd, 'flatbread.config.js'));
      t.is(config.transformer.length, 1);
      t.deepEqual(config.loaded.extensions, ['.md']);
      t.is(typeof config.fieldNameTransform, 'function');
    }
  );
});

test('loadConfig isolates concurrent temporary ESM modules', async (t) => {
  await withTempConfig(
    {
      'flatbread.config.js': `
        export default {
          source: { fetch: async () => ({}) },
          transformer: { extensions: ['.md'], inspect: (input) => String(input) },
          content: [],
        };
      `,
    },
    async (cwd) => {
      const results = await Promise.all(
        Array.from({ length: 32 }, () => loadConfig({ cwd }))
      );

      t.is(results.length, 32);
      t.true(
        results.every(
          (result) => result.filepath === path.join(cwd, 'flatbread.config.js')
        )
      );

      const remainingFiles = await fs.readdir(cwd);
      t.deepEqual(
        remainingFiles.filter((filename) =>
          filename.startsWith('.flatbread.config.js.timestamp-')
        ),
        []
      );
    }
  );
});
