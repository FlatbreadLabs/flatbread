#!/usr/bin/env node
// Prepares a clean folder for one benchmark run: the built graph, the config,
// and the question text, with no answers, specs, or key map.
//
//   node scripts/prepare-run.mjs <out-dir> [--only render,world] [--ids a,b]
//        [--graph <built-graph-dir>]
//
// The answering agent works only inside <out-dir>, running
// `./flatbread proof …` there.
import { execFileSync } from 'node:child_process';
import {
  appendFile,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pickQuestions } from './check.mjs';

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

/**
 * Questions as an agent may see them: text and answer form only. The
 * default is the original 246; `only` names sets (`ambiguous`, or
 * `default,ambiguous` for both), and `ids` finds questions in any set.
 */
export async function publicQuestions({ only = [], ids = [] } = {}) {
  return (await pickQuestions({ only, ids }))
    .flatMap((set) => set.questions)
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
 * With `server`, its `./flatbread` sends reads to that `proof serve` socket.
 */
export async function prepareFolder(
  out,
  questions,
  graph = join(BENCH, '.flatbread-proof'),
  { linkTo, server } = {}
) {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  if (linkTo) await symlink(linkTo, join(out, '.flatbread-proof'), 'junction');
  else await copyPublicGraph(join(out, '.flatbread-proof'), graph);
  await cp(
    join(BENCH, 'flatbread.config.js'),
    join(out, 'flatbread.config.js')
  );
  await linkTools(out, server);
  await writeFile(
    join(out, 'questions.json'),
    `${JSON.stringify(questions, null, 2)}\n`
  );
}

/**
 * Links the workspace's node_modules into `out` and writes its `./flatbread`
 * wrapper. With `server`, the wrapper sends reads to that socket.
 */
async function linkTools(out, server) {
  await symlink(
    join(REPO, 'node_modules'),
    join(out, 'node_modules'),
    'junction'
  );
  await writeFile(
    join(out, 'flatbread'),
    `#!/bin/sh\n${
      server ? `export FLATBREAD_PROOF_SERVER="${server}"\n` : ''
    }exec node "${join(
      REPO,
      'packages',
      'flatbread',
      'bin',
      'flatbread.js'
    )}" "$@"\n`,
    { mode: 0o755 }
  );
}

// Files a session adds to its clone, kept out of `git status`.
const SESSION_FILES = [
  '/flatbread',
  '/node_modules',
  '/TASK.md',
  '/answer.json',
  '/transcript.jsonl',
  '/stderr.txt',
];

/**
 * Empties `out` and makes it a `git clone --no-hardlinks` of the test bed
 * `repo` (from build-repo.mjs), so a session has main checked out, every
 * branch as `origin/<name>`, and the full log. The clone gets the
 * gitignored draft-PR file, the tool links, and nothing else: no key map,
 * spec, or questions. Its `origin` is renamed to a URL that leads nowhere
 * and its reflogs are deleted, since the real path sits beside the key map.
 */
export async function prepareClone(out, repo, { server } = {}) {
  await rm(out, { recursive: true, force: true });
  await mkdir(dirname(out), { recursive: true });
  const git = (cwd, ...argv) =>
    execFileSync('git', argv, {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
      },
    });
  git(dirname(out), 'clone', '--quiet', '--no-hardlinks', repo, out);
  git(
    out,
    'remote',
    'set-url',
    'origin',
    'https://git.tidewater.example/saltglass-reach.git'
  );
  // The reflogs record "clone: from <repo>", so they go too.
  await rm(join(out, '.git', 'logs'), { recursive: true, force: true });
  for (const file of await readdir(join(out, '.git'), { recursive: true })) {
    const path = join(out, '.git', file);
    if ((await stat(path)).isFile() && (await readFile(path)).includes(repo))
      throw new Error(`${path} still names the test bed path ${repo}`);
  }
  const prs = join('.flatbread', 'proof', 'prs.json');
  await mkdir(join(out, dirname(prs)), { recursive: true });
  await cp(join(repo, prs), join(out, prs));
  await linkTools(out, server);
  await appendFile(
    join(out, '.git', 'info', 'exclude'),
    `${SESSION_FILES.join('\n')}\n`
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
