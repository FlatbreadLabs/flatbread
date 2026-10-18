#!/usr/bin/env node
// Prepares a clean folder for one benchmark run: the built graph, the config,
// and the question text, with no answers, specs, or key map.
//
//   node scripts/prepare-run.mjs <out-dir> [--only render,world] [--ids a,b]
//        [--graph <built-graph-dir>]
//
// The answering agent works only inside <out-dir>, running
// `./flatbread proof …` there.
import { cp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadQuestions } from './check.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The form an answer takes, never its content.
export const FORMATS = {
  record: 'one Proof record id',
  records: 'a list of Proof record ids',
  value: 'a short value, such as a number with its unit or a name',
  boolean: 'true or false',
  count: 'a whole number',
  text: 'one or two sentences',
};
const REPO = resolve(BENCH, '..', '..');

/** Questions as an agent may see them: text and answer form only. */
export async function publicQuestions({ only = [], ids = [] } = {}) {
  const wanted = new Set(ids);
  return (await loadQuestions(only))
    .flatMap((set) => set.questions)
    .filter((q) => !wanted.size || wanted.has(q.id))
    .map((q) => ({
      id: q.id,
      question: q.question,
      format: FORMATS[q.answer.kind],
    }));
}

/** Copies a built graph without its key map, which holds the answers. */
export async function copyPublicGraph(
  to,
  graph = join(BENCH, '.flatbread-proof')
) {
  await cp(graph, to, {
    recursive: true,
    filter: (src) => !src.endsWith('keymap.json'),
  });
}

/**
 * Empties `out` and fills it with a graph, the config, and the questions.
 * The graph is the committed one unless `graph` names another build. With
 * `linkTo`, the folder links to a public graph copy instead of copying one.
 */
export async function prepareFolder(
  out,
  questions,
  graph = join(BENCH, '.flatbread-proof'),
  { linkTo } = {}
) {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  if (linkTo) await symlink(linkTo, join(out, '.flatbread-proof'), 'junction');
  else await copyPublicGraph(join(out, '.flatbread-proof'), graph);
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
  await writeFile(
    join(out, 'questions.json'),
    `${JSON.stringify(questions, null, 2)}\n`
  );
}

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
  const questions = await publicQuestions({
    only: pick('--only'),
    ids: pick('--ids'),
  });
  const graph = pick('--graph')[0];
  await prepareFolder(out, questions, graph ? resolve(graph) : undefined);
  console.log(`${questions.length} questions ready in ${out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
