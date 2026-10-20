#!/usr/bin/env node
// Scores one benchmark run.
//
//   node scripts/grade.mjs runs/<name>.json [--only ambiguous]
//        [--split tune|holdout|all] [--repo <test bed>]
//
// It scores the original 246 questions that the run answered. `--only`
// names the sets to score instead, as run.mjs takes them: `ambiguous` for
// the ambiguous-Effort set alone, `default,ambiguous` for both. `--split`
// scores only the tune or holdout questions, split by a hash of each id as
// in find-recall.mjs. A read that was changed after reading tune misses,
// such as `proof state`, should be judged on holdout. `bySplit` always
// reports both halves. The code and branch sets name records that exist
// only in the git test bed, so score them with `--repo <dir>`, the folder
// build-repo.mjs wrote; its key map sits beside it.
//
// A run file holds one entry per question id:
//   { "run": { "strategy": "brief", "model": "..." },
//     "answers": { "<question id>": { "answer": ..., "tokens": 1234, "tool_calls": 5 } } }
// Record answers may be Proof ids or benchmark keys. Text answers are scored
// against the question's rubric: each rubric item lists phrases, and the item
// counts when the answer contains any one of them.
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadQuestions } from './check.mjs';
import { splitOf } from './find-recall.mjs';
import { loadGraph, qualify, readGraph, sameAnswer } from './graph.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function toKey(graph, effort, value) {
  if (typeof value !== 'string') return value;
  const key = graph.keyById.get(value.trim());
  return key ?? qualify(effort, value.trim());
}

export function score(graph, q, effort, given) {
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
  if (kind === 'boolean') {
    // Agents add evidence after the verdict: "false, fnd-...". Read the
    // leading word.
    const parsed =
      typeof given === 'string'
        ? /^(true|false)\b/.exec(given.trim().toLowerCase())?.[1]
        : given;
    if (parsed === 'true' || parsed === true) return value === true ? 1 : 0;
    if (parsed === 'false' || parsed === false) return value === false ? 1 : 0;
    return 0;
  }
  if (kind === 'count')
    return firstNumber(String(given)) === Number(value) ? 1 : 0;
  return [value, ...(accept ?? [])].some((gold) => looseValue(gold, given))
    ? 1
    : 0;
}

function firstNumber(text) {
  const match = /-?\d[\d,]*(?:\.\d+)?/.exec(text);
  return match ? Number(match[0].replace(/,/g, '')) : NaN;
}

/**
 * Agents add detail to short answers: "46 player-proximity reads" for "46",
 * "textures (3,184 MB)" for "textures". Accept an answer that equals the gold
 * value, starts with it, or carries the same leading number and unit.
 */
function looseValue(gold, given) {
  const want = String(gold).trim().toLowerCase();
  const got = String(given).trim().toLowerCase();
  if (got === want) return true;
  if (got.startsWith(want) && !/[a-z0-9.]/.test(got[want.length] ?? ''))
    return true;
  const number = firstNumber(want);
  if (Number.isNaN(number) || firstNumber(got) !== number) return false;
  const unit = (text) =>
    /-?\d[\d,]*(?:\.\d+)?\s*([a-z%/]+)?/.exec(text)?.[1] ?? '';
  return !unit(want) || unit(want) === unit(got);
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
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--only');
  const only = at >= 0 ? argv.splice(at, 2)[1].split(',') : [];
  const atSplit = argv.indexOf('--split');
  const split = atSplit >= 0 ? argv.splice(atSplit, 2)[1] : 'all';
  const atRepo = argv.indexOf('--repo');
  const repo = atRepo >= 0 ? resolve(argv.splice(atRepo, 2)[1]) : null;
  if (!['tune', 'holdout', 'all'].includes(split))
    throw new Error('--split must be one of tune, holdout, all');
  const [runPath] = argv;
  if (!runPath)
    throw new Error(
      'usage: grade.mjs <run.json> [--only sets] [--split tune|holdout|all]'
    );
  const run = JSON.parse(await readFile(resolve(runPath), 'utf8'));
  const graph = repo
    ? readGraph(
        join(repo, '.flatbread-proof'),
        JSON.parse(await readFile(`${repo}.keymap.json`, 'utf8'))
      )
    : await loadGraph(join(BENCH, '.flatbread-proof'));
  const rows = [];
  for (const set of await loadQuestions(only))
    for (const q of set.questions) {
      const entry = run.answers?.[q.id];
      if (!entry || (split !== 'all' && splitOf(q.id) !== split)) continue;
      rows.push({
        id: q.id,
        effort: set.effort,
        tier: q.tier,
        categories: q.categories,
        score: score(graph, q, set.effort, entry.answer),
        tokens: entry.tokens,
        tool_calls: entry.tool_calls,
        timed_out: entry.timed_out === true,
        left_folder: entry.left_folder === true,
      });
    }
  console.log(
    JSON.stringify(
      {
        run: run.run ?? {},
        split,
        answered: rows.length,
        overall: summarize(rows, () => 'all').all,
        bySplit: summarize(rows, (r) => splitOf(r.id)),
        byTier: summarize(rows, (r) => `tier-${r.tier}`),
        byEffort: summarize(rows, (r) => r.effort),
        byCategory: summarize(rows, (r) => r.categories),
        misses: rows.filter((r) => r.score < 1).map((r) => r.id),
        // Sessions that never finished, and sessions that reached outside
        // their folder: read those transcripts before trusting the score.
        timed_out: rows.filter((r) => r.timed_out).map((r) => r.id),
        left_folder: rows.filter((r) => r.left_folder).map((r) => r.id),
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
