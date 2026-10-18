#!/usr/bin/env node
// Prepares a clean folder for one benchmark run: the built graph, the config,
// and the question text, with no answers, specs, or key map.
//
//   node scripts/prepare-run.mjs <out-dir> [--only render,world] [--ids a,b]
//
// The answering agent works only inside <out-dir>, running
// `./flatbread proof …` there.
import { cp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuestions } from './check.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(BENCH, '..', '..');

async function main() {
  const argv = process.argv.slice(2);
  const out = argv[0] && !argv[0].startsWith('--') ? resolve(argv[0]) : null;
  if (!out)
    throw new Error(
      'usage: prepare-run.mjs <out-dir> [--only e1,e2] [--ids q1,q2]'
    );
  const pick = (flag) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv[at + 1].split(',') : [];
  };
  const only = pick('--only');
  const ids = new Set(pick('--ids'));
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(join(BENCH, '.flatbread-proof'), join(out, '.flatbread-proof'), {
    recursive: true,
    filter: (src) => !src.endsWith('keymap.json'),
  });
  await cp(
    join(BENCH, 'flatbread.config.js'),
    join(out, 'flatbread.config.js')
  );
  await symlink(
    join(REPO, 'node_modules'),
    join(out, 'node_modules'),
    'junction'
  );
  await writeFile(
    join(out, 'flatbread'),
    `#!/bin/sh\nexec node "${join(
      REPO,
      'packages',
      'flatbread',
      'bin',
      'flatbread.js'
    )}" "$@"\n`,
    { mode: 0o755 }
  );
  const questions = (await loadQuestions(only))
    .flatMap((set) => set.questions)
    .filter((q) => !ids.size || ids.has(q.id))
    .map((q) => ({ id: q.id, question: q.question }));
  await writeFile(
    join(out, 'questions.json'),
    `${JSON.stringify(questions, null, 2)}\n`
  );
  console.log(`${questions.length} questions ready in ${out}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
