#!/usr/bin/env node
// Compares two runs over the questions both answered, pair by pair.
//
//   node scripts/compare.mjs runs/<a>.json runs/<b>.json [--skip id1,id2]
//        [--only ambiguous]
//   node scripts/compare.mjs runs/a-r1.json,runs/a-r2.json \
//        runs/b-r1.json,runs/b-r2.json
//
// It compares the original 246 questions. `--only` names the sets to compare
// instead, as run.mjs takes them, so a run that also asked the
// ambiguous-Effort set reports that set apart: `--only ambiguous`.
//
// With several files on each side, the runs are pooled: run i of side A is
// paired with run i of side B, and each question in each pair of runs is one
// row, named `<id>#<i>` in the lists of questions only one side got right.
// `signTestP` then counts every disagreement across the runs. That is sound
// only when each file is its own run of fresh sessions, so the script refuses
// a file listed twice, and it speaks only for these questions. To ask whether
// the gap would hold on new questions, `questionSignTest` counts each
// question once: a win for the side with more right answers over the runs.
// If the run files record different `find_hash` values, a warning says so.
// Read tokens leave out each session's first turn (`fixed_tokens`), which is
// the same task and system prompt in both runs. A sign test on the questions
// that only one run got right says how likely the accuracy gap is by chance.
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadQuestions } from './check.mjs';
import { score } from './grade.mjs';
import { loadGraph } from './graph.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median =
    sorted.length % 2
      ? sorted[Math.floor(mid)]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { mean: Math.round(mean), median: Math.round(median) };
}

/** Two-sided exact sign test: P(a split at least this uneven | p = 0.5). */
export function signTest(wins, losses) {
  const n = wins + losses;
  if (!n) return 1;
  const k = Math.min(wins, losses);
  let tail = 0;
  for (let i = 0, c = 1; i <= k; i++, c = (c * (n - i + 1)) / i)
    tail += c / 2 ** n;
  return Math.min(1, 2 * tail);
}

async function main() {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--skip');
  const skip = new Set(at >= 0 ? argv.splice(at, 2)[1].split(',') : []);
  const atOnly = argv.indexOf('--only');
  const only = atOnly >= 0 ? argv.splice(atOnly, 2)[1].split(',') : [];
  const [pathA, pathB] = argv;
  if (!pathB)
    throw new Error(
      'usage: compare.mjs <run-a.json>[,more] <run-b.json>[,more] [--skip ids] [--only sets]'
    );
  const load = (paths) =>
    Promise.all(
      paths
        .split(',')
        .map(async (p) => JSON.parse(await readFile(resolve(p), 'utf8')))
    );
  const files = [...pathA.split(','), ...pathB.split(',')].map((p) =>
    resolve(p)
  );
  if (new Set(files).size !== files.length)
    throw new Error('Each run file may appear only once');
  const [runsA, runsB] = await Promise.all([load(pathA), load(pathB)]);
  if (runsA.length !== runsB.length)
    throw new Error('Give each side the same number of run files');
  const hashes = new Set(
    [...runsA, ...runsB].map((run) => run.run?.find_hash).filter(Boolean)
  );
  if (hashes.size > 1)
    console.warn(
      `Warning: the run files used different proof find code: ${[
        ...hashes,
      ].join(', ')}`
    );
  const pooled = runsA.length > 1;
  const name = (runs, paths) =>
    pooled
      ? runs.map((run, i) => run.run?.name ?? paths.split(',')[i]).join(',')
      : runs[0].run?.name ?? paths;
  const graph = await loadGraph(join(BENCH, '.flatbread-proof'));
  const sets = await loadQuestions(only);
  const rows = [];
  for (const [i, a] of runsA.entries())
    for (const set of sets)
      for (const q of set.questions) {
        const x = a.answers?.[q.id];
        const y = runsB[i].answers?.[q.id];
        if (!x || !y || skip.has(q.id)) continue;
        rows.push({
          id: pooled ? `${q.id}#${i + 1}` : q.id,
          question: q.id,
          tier: q.tier,
          a: score(graph, q, set.effort, x.answer),
          b: score(graph, q, set.effort, y.answer),
          readA: x.tokens - (x.fixed_tokens ?? 0),
          readB: y.tokens - (y.fixed_tokens ?? 0),
          toolsA: x.tool_calls,
          toolsB: y.tool_calls,
        });
      }
  if (!rows.length) throw new Error('The runs share no questions');
  const onlyA = rows.filter((r) => r.a === 1 && r.b < 1).map((r) => r.id);
  const onlyB = rows.filter((r) => r.b === 1 && r.a < 1).map((r) => r.id);
  const total = (key) => +rows.reduce((n, r) => n + r[key], 0).toFixed(2);
  // Per question, the sum over runs of A's score minus B's.
  const margin = new Map();
  for (const r of rows)
    margin.set(r.question, (margin.get(r.question) ?? 0) + r.a - r.b);
  const questionWins = (sign) =>
    [...margin.values()].filter((m) => Math.sign(m) === sign).length;
  const byTier = {};
  for (const r of rows) {
    const t = (byTier[`tier-${r.tier}`] ??= { n: 0, a: 0, b: 0 });
    t.n++;
    t.a += r.a;
    t.b += r.b;
  }
  console.log(
    JSON.stringify(
      {
        a: name(runsA, pathA),
        b: name(runsB, pathB),
        ...(pooled ? { runs: runsA.length } : {}),
        questions: rows.length,
        correct: { a: total('a'), b: total('b') },
        byTier,
        onlyA,
        onlyB,
        signTestP: +signTest(onlyA.length, onlyB.length).toFixed(4),
        ...(pooled
          ? {
              questionSignTest: {
                a: questionWins(1),
                b: questionWins(-1),
                p: +signTest(questionWins(1), questionWins(-1)).toFixed(4),
              },
            }
          : {}),
        readTokens: {
          a: summary(rows.map((r) => r.readA)),
          b: summary(rows.map((r) => r.readB)),
          diff: summary(rows.map((r) => r.readA - r.readB)),
          aCheaper: rows.filter((r) => r.readA < r.readB).length,
        },
        toolCalls: {
          a: summary(rows.map((r) => r.toolsA)),
          b: summary(rows.map((r) => r.toolsB)),
        },
      },
      null,
      2
    )
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
