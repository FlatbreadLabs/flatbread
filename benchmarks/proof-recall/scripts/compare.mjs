#!/usr/bin/env node
// Compares two runs over the questions both answered, pair by pair.
//
//   node scripts/compare.mjs runs/<a>.json runs/<b>.json [--skip id1,id2]
//
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
  const [pathA, pathB] = argv;
  if (!pathB)
    throw new Error(
      'usage: compare.mjs <run-a.json> <run-b.json> [--skip ids]'
    );
  const [a, b] = await Promise.all(
    [pathA, pathB].map(async (p) =>
      JSON.parse(await readFile(resolve(p), 'utf8'))
    )
  );
  const graph = await loadGraph(join(BENCH, '.flatbread-proof'));
  const rows = [];
  for (const set of await loadQuestions())
    for (const q of set.questions) {
      const x = a.answers?.[q.id];
      const y = b.answers?.[q.id];
      if (!x || !y || skip.has(q.id)) continue;
      rows.push({
        id: q.id,
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
        a: a.run?.name ?? pathA,
        b: b.run?.name ?? pathB,
        questions: rows.length,
        correct: { a: total('a'), b: total('b') },
        byTier,
        onlyA,
        onlyB,
        signTestP: +signTest(onlyA.length, onlyB.length).toFixed(4),
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
