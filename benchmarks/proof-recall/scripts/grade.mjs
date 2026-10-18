#!/usr/bin/env node
// Scores one benchmark run.
//
//   node scripts/grade.mjs runs/<name>.json
//
// A run file holds one entry per question id:
//   { "run": { "strategy": "brief", "model": "..." },
//     "answers": { "<question id>": { "answer": ..., "tokens": 1234, "tool_calls": 5 } } }
// Record answers may be Proof ids or benchmark keys. Text answers are scored
// against the question's rubric: each rubric item lists phrases, and the item
// counts when the answer contains any one of them.
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuestions } from './check.mjs';
import { loadGraph, qualify, sameAnswer } from './graph.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function toKey(graph, effort, value) {
  if (typeof value !== 'string') return value;
  const key = graph.keyById.get(value.trim());
  return key ?? qualify(effort, value.trim());
}

function score(graph, q, effort, given) {
  if (given === undefined || given === null) return 0;
  const { kind, value, rubric, accept } = q.answer;
  if (kind === 'text') {
    const text = String(given).toLowerCase();
    const hits = rubric.filter((item) =>
      (Array.isArray(item) ? item : [item]).some((p) =>
        text.includes(p.toLowerCase())
      )
    );
    return hits.length / rubric.length;
  }
  if (kind === 'record')
    return sameAnswer(kind, value, toKey(graph, effort, given), effort) ? 1 : 0;
  if (kind === 'records')
    return sameAnswer(
      kind,
      value,
      (Array.isArray(given) ? given : [given]).map((v) =>
        toKey(graph, effort, v)
      ),
      effort
    )
      ? 1
      : 0;
  if (
    kind === 'value' &&
    accept?.some((alt) => sameAnswer(kind, alt, given, effort))
  )
    return 1;
  return sameAnswer(kind, value, given, effort) ? 1 : 0;
}

function summarize(rows, by) {
  const groups = {};
  for (const row of rows)
    for (const key of [].concat(by(row))) {
      const g = (groups[key] ??= { n: 0, score: 0, tokens: 0, tool_calls: 0 });
      g.n++;
      g.score += row.score;
      g.tokens += row.tokens ?? 0;
      g.tool_calls += row.tool_calls ?? 0;
    }
  return Object.fromEntries(
    Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, g]) => [
        key,
        {
          n: g.n,
          accuracy: +(g.score / g.n).toFixed(3),
          mean_tokens: Math.round(g.tokens / g.n),
          mean_tool_calls: +(g.tool_calls / g.n).toFixed(1),
        },
      ])
  );
}

async function main() {
  const runPath = process.argv[2];
  if (!runPath) throw new Error('usage: grade.mjs <run.json>');
  const run = JSON.parse(await readFile(resolve(runPath), 'utf8'));
  const graph = await loadGraph(join(BENCH, '.flatbread-proof'));
  const rows = [];
  for (const set of await loadQuestions())
    for (const q of set.questions) {
      const entry = run.answers?.[q.id];
      if (!entry) continue;
      rows.push({
        id: q.id,
        effort: set.effort,
        tier: q.tier,
        categories: q.categories,
        score: score(graph, q, set.effort, entry.answer),
        tokens: entry.tokens,
        tool_calls: entry.tool_calls,
      });
    }
  console.log(
    JSON.stringify(
      {
        run: run.run ?? {},
        answered: rows.length,
        overall: summarize(rows, () => 'all').all,
        byTier: summarize(rows, (r) => `tier-${r.tier}`),
        byEffort: summarize(rows, (r) => r.effort),
        byCategory: summarize(rows, (r) => r.categories),
        misses: rows.filter((r) => r.score < 1).map((r) => r.id),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
