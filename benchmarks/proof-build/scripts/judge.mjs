#!/usr/bin/env node
// Scores plan sessions: strips Proof ids and wording from PLAN.md, then has
// a fixed judge model score it against the task's rubric, twice.
//
//   node scripts/judge.mjs <work-dir> --name <run> --tasks <p4/tasks>
//        [--arms a,b] [--ids L-P1] [--model claude-opus-5-5] [--effort high]
//        [--repeats 2] [--jobs 4] [--timeout 600] [--rejudge] [--dry-run]
//   node scripts/judge.mjs --plan <PLAN.md> --task <id> --tasks <p4/tasks>
//        [--out <judge.json>] [--dry-run]
//   node scripts/judge.mjs --gate --tasks <p4/tasks> [--ids L-P1]
//        [--out <gate-judge.json>] [--dry-run]
//
// The first form judges every plan session of a run (each folder with a
// session.json marked done) that has no judge.json yet, and writes
// judge.json beside it. The second judges one plan file, which is what the
// offline gate needs for its hand-written good and trap plans.
//
// --gate is the rubric gate of DESIGN.md §5, run in the pilot because it
// calls the judge: for each plan task it judges plans/good.md, trap.md and
// plausible.md (a realistic plan written from the code alone, with no
// Proof). It passes when every good plan scores at least 0.8 and every trap
// plan at most 0.5; the plausible scores are reported, and on proof-only
// tasks a plausible plan scoring as high as the good one means the rubric
// does not reward what only Proof says. It exits 1 when the gate fails.
//
// --dry-run (also --prepare-only) writes each session's judge-input.md,
// prints the prompt, and calls no model.
//
// Rubric (<task>/rubric.json): { "include": [...], "avoid": [...] }, each
// item a string or { "id", "text" }; ids default to I1… and A1….
//
// Blinding (stripPlan): record ids (with or without their hash, and as
// qualified keys), `.flatbread-proof` paths, `flatbread proof` commands,
// "Proof", "project memory", "recorded decision" and similar, "Effort" and
// "compaction" are cut out together with the parenthesis or lead-in
// ("per …", "see …") that held them, and nothing marks the cut. The rest of
// each line stays.
//
// The judge runs as `claude -p` with no tools, no MCP servers, no settings
// files and no session persistence, in an empty folder, with the prompt on
// stdin. A point is worth 1 when every repeat agrees it is good (an include
// met, an avoid not violated), 0 when every repeat says it is bad, and 0.5
// when they disagree; such points are listed in `disagreed`. The score is
// the sum over |include| + |avoid|, from 0 to 1. `avoid_violations` counts
// avoids that every repeat called violated.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  cleanEnv,
  listSessions,
  loadTasks,
  parseArgs,
  pickTasks,
  readJson,
  runCommand,
} from './common.mjs';

// Record ids with their hash suffix, qualified keys such as
// `model.dec-group-nostyle`, and bare kind-prefixed slugs.
const RECORD_ID = /\b(eff|dec|con|fnd|iss|rsk|cit|blb|cmp)-[\w-]+--[\w]+\b/g;
const QUALIFIED_ID =
  /\b(?:model|units|commands|panel|layers|persist|plugin)\.(?:eff|dec|con|fnd|iss|rsk|cit|blb|cmp)(?:-[\w-]+)?\b/g;
const BARE_ID = /\b(?:dec|con|fnd|iss|rsk|cit|cmp)-[a-z0-9]+(?:-[a-z0-9]+)+\b/g;
// Wording only a Proof-arm plan uses.
const PROOF_WORDS = [
  /`[^`\n]*flatbread\s+proof[^`\n]*`/gi,
  /(?:\.\/)?flatbread[ \t]+proof(?:[ \t]+[\w-]+)?(?:[ \t]+(?:--?[\w-]+|[\w.#@-]+))*/gi,
  /[^\s`'"()]*\.flatbread-proof[^\s`'"()]*/g,
  /\bproject[\s-]+memory\b/gi,
  /\b(?:the\s+)?proof\s+(?:skill|graph|records?|cli|briefs?|dump)\b/gi,
  /(?<![\w-])proof(?![\w-]|\s+of\b)/gi,
  /\brecorded\s+(?:decisions?|constraints?|findings?|issues?|risks?|rules?)\b/gi,
  /\b(?:decision|constraint|finding|issue|risk)\s+records?\b/gi,
  /\bcompactions?\b/gi,
  /\bEfforts?\b/g,
];
const MARK = '\u0000';

/**
 * The plan as the judge sees it. Proof's ids, commands and wording are cut
 * out with the clause that held them, rather than replaced with a marker,
 * so a Proof-arm plan does not give itself away and keeps the rest of the
 * line: "Merge by gesture id (`./flatbread proof get dec-x--ab12`)"
 * becomes "Merge by gesture id". Only lines that held a cut are touched, so
 * a plan that never mentions Proof comes out byte for byte unchanged.
 */
export function stripPlan(text) {
  let out = text;
  for (const re of [RECORD_ID, QUALIFIED_ID, ...PROOF_WORDS, BARE_ID])
    out = out.replace(re, MARK);
  // A code span that held only cut ids goes with them.
  out = out.replace(new RegExp(`\`[\\s,]*(?:${MARK}[\\s,]*)+\``, 'g'), MARK);
  return out
    .split('\n')
    .flatMap((line) => {
      if (!line.includes(MARK)) return [line];
      const cut = cutLine(line);
      // A line left with no words (a bullet that only cited records) goes.
      return /\w/.test(cut) ? [cut] : [];
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/** One line with cut marks in it, with the cuts and their clauses gone. */
function cutLine(line) {
  const m = MARK;
  return (
    line
      // A sentence that only reports running a Proof command goes whole.
      .replace(
        new RegExp(
          `[^.!?]*\\b(?:ran|run|running|used|using|queried|called|searched)\\s+${m}[^.!?]*[.!?]?`,
          'gi'
        ),
        ''
      )
      // A bracket or parenthesis that held a cut word goes whole.
      .replace(new RegExp(`\\s*\\([^()]*${m}[^()]*\\)`, 'g'), '')
      .replace(new RegExp(`\\s*\\[[^\\[\\]]*${m}[^\\[\\]]*\\]`, 'g'), '')
      // "as/per/see/from/in/according to <cut>" goes with its lead-in.
      .replace(
        new RegExp(
          `[,;]?\\s*\\b(?:as\\s+(?:recorded|noted|stated|said)\\s+in|according\\s+to|per|see|from|in|by|via|under|following|so|says|said|notes|states|records)\\s+(?:the\\s+|an?\\s+|its\\s+)?(?:${m}[\\s,/&-]*(?:and\\s+|or\\s+)?)+`,
          'gi'
        ),
        ' '
      )
      // "<cut> says:" and the like go with the cut.
      .replace(
        new RegExp(
          `(?:\\b(?:the|an?)\\s+)?(?:\\b\\w[\\w-]*\\s+)?(?:${m}[\\s,/&-]*)+(?:says|notes|states|records|requires|is clear|agrees)(?:\\s+that)?\\s*:?\\s*`,
          'gi'
        ),
        ''
      )
      .replace(
        new RegExp(`(?:\\b(?:the|an?)\\s+)?(?:${m}[\\s,:/&-]*)+`, 'gi'),
        ' '
      )
      // A lead-in left with nothing to point at.
      .replace(
        /[,;]?\s*\b(?:see|per|according to|as(?:\s+(?:recorded|noted|stated|said)\s+in)?|like|via|following)\s*(?=[.;,]|$)/gi,
        ''
      )
      .replace(/(\S)[ \t]{2,}/g, '$1 ')
      .replace(/(\S)[ \t]+([,.;:)])/g, '$1$2')
      .replace(/(?<!\.)\.\.(?!\.)/g, '.')
      // A bullet, or a line whose opening words were cut, starts upper case.
      .replace(
        new RegExp(
          `^(\\s*(?:[-*+]\\s+|\\d+\\.\\s+${
            /^\s*(?:[-*+]\s+|\d+\.\s+)?[a-z]/.test(line) ? ')' : '|)'
          })([a-z])`
        ),
        (_, a, b) => a + b.toUpperCase()
      )
      .replace(/[ \t]+$/, '')
      // The line keeps its own indentation, whatever the cuts left.
      .replace(/^[ \t]*/, line.match(/^[ \t]*/)[0])
  );
}

/** The rubric with ids filled in. */
export function loadRubric(raw) {
  const items = (list, prefix) =>
    (list ?? []).map((item, i) =>
      typeof item === 'string'
        ? { id: `${prefix}${i + 1}`, text: item }
        : { id: item.id ?? `${prefix}${i + 1}`, text: item.text }
    );
  const rubric = {
    include: items(raw.include, 'I'),
    avoid: items(raw.avoid, 'A'),
  };
  if (!rubric.include.length && !rubric.avoid.length)
    throw new Error('The rubric has no points');
  return rubric;
}

export function judgePrompt({ request, plan, rubric }) {
  const list = (items) => items.map((p) => `- ${p.id}: ${p.text}`).join('\n');
  return `You are grading a written implementation plan against a rubric. Score the plan's content only, whatever its source, and do not reward length or style.

## The request the plan answers

${request.trim()}

## The plan

<plan>
${plan.trim()}
</plan>

## Rubric

Must include. "met" is true only when the plan clearly states or commits to the point:
${list(rubric.include) || '- (none)'}

Must avoid. "violated" is true when the plan proposes, relies on, or leaves the door open to the point:
${list(rubric.avoid) || '- (none)'}

Reply with only this JSON and nothing else:
{"include":[{"id":"I1","met":true,"quote":"at most 25 words from the plan, or empty"}],"avoid":[{"id":"A1","violated":false,"quote":"..."}]}
`;
}

/** The first JSON object in a model reply. */
function parseVerdict(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no JSON in the reply');
  return JSON.parse(text.slice(start, end + 1));
}

async function callJudge(prompt, o) {
  const cwd = join(o.scratch, 'judge-cwd');
  await mkdir(cwd, { recursive: true });
  const run = await runCommand(
    'claude',
    [
      '-p',
      '--model',
      o.model,
      ...(o.effort ? ['--effort', o.effort] : []),
      '--tools',
      '',
      '--strict-mcp-config',
      '--mcp-config',
      '{"mcpServers":{}}',
      '--setting-sources',
      '',
      '--no-session-persistence',
      '--output-format',
      'json',
    ],
    { cwd, env: cleanEnv(), timeout: o.timeout * 1000, input: prompt }
  );
  if (run.timedOut) throw new Error('judge timed out');
  const envelope = JSON.parse(run.stdout);
  return {
    verdict: parseVerdict(envelope.result ?? ''),
    model: envelope.modelUsage ? Object.keys(envelope.modelUsage) : o.model,
    cost_usd: envelope.total_cost_usd ?? null,
  };
}

/** Combines repeated verdicts into a score (see the header). */
export function scoreVerdicts(rubric, verdicts) {
  const points = [];
  const good = (verdict, side, id) => {
    const hit = (verdict[side] ?? []).find((p) => p.id === id);
    if (!hit) return null;
    return side === 'include' ? hit.met === true : hit.violated !== true;
  };
  for (const side of ['include', 'avoid'])
    for (const point of rubric[side]) {
      const votes = verdicts.map((v) => good(v, side, point.id));
      const known = votes.filter((v) => v !== null);
      const value = !known.length
        ? 0
        : known.every(Boolean)
        ? 1
        : known.every((v) => !v)
        ? 0
        : 0.5;
      points.push({
        side,
        id: point.id,
        value,
        votes,
        quotes: verdicts.map(
          (v) => (v[side] ?? []).find((p) => p.id === point.id)?.quote ?? ''
        ),
      });
    }
  const total = rubric.include.length + rubric.avoid.length;
  return {
    score: +(points.reduce((n, p) => n + p.value, 0) / total).toFixed(4),
    includes_met: points
      .filter((p) => p.side === 'include')
      .reduce((n, p) => n + p.value, 0),
    avoid_violations: points.filter((p) => p.side === 'avoid' && p.value === 0)
      .length,
    disagreed: points.filter((p) => p.value === 0.5).map((p) => p.id),
    points,
  };
}

/** Judges one plan text for one task; with dryRun returns the prompt. */
export async function judgePlan(o, task, planText) {
  const rubric = loadRubric(
    JSON.parse(await readFile(join(task.dir, 'rubric.json'), 'utf8'))
  );
  const plan = planText === null ? null : stripPlan(planText);
  const prompt = judgePrompt({
    request: task.prompt,
    plan: plan ?? '(no plan was written)',
    rubric,
  });
  if (o.dryRun) return { prompt, rubric };
  if (plan === null)
    return {
      ...scoreVerdicts(rubric, []),
      plan_written: false,
      judge_model: null,
    };
  const verdicts = [];
  const costs = [];
  let model = null;
  for (let i = 0; i < o.repeats; i++) {
    const call = await callJudge(prompt, o);
    verdicts.push(call.verdict);
    costs.push(call.cost_usd);
    model = call.model;
  }
  return {
    ...scoreVerdicts(rubric, verdicts),
    plan_written: true,
    judge_model: model,
    judge_effort: o.effort,
    repeats: o.repeats,
    judge_cost_usd: costs,
    verdicts,
  };
}

function options(argv) {
  const o = parseArgs(
    argv,
    {
      name: null,
      tasks: null,
      arms: [],
      ids: [],
      model: 'claude-opus-5-5',
      effort: 'high',
      repeats: 2,
      jobs: 4,
      timeout: 600,
      plan: null,
      task: null,
      out: null,
    },
    {
      lists: ['arms', 'ids'],
      flags: ['dryRun', 'prepareOnly', 'rejudge', 'gate'],
    }
  );
  o.dryRun ||= o.prepareOnly;
  if (!o.tasks) throw new Error('judge.mjs needs --tasks');
  o.tasks = resolve(o.tasks);
  o.dir = o._[0] ? resolve(o._[0]) : null;
  o.scratch = o.dir ?? resolve(o.tasks, '..', 'judge');
  if (o.gate) {
    // Judges the hand-written plans in each task's plans/ folder.
  } else if (o.plan) {
    if (!o.task) throw new Error('--plan needs --task');
  } else if (!o.dir || !o.name)
    throw new Error('usage: judge.mjs <work-dir> --name <run> --tasks <dir>');
  return o;
}

const GATE_PLANS = ['good', 'trap', 'plausible'];

async function rubricGate(o, tasks) {
  const rows = [];
  for (const task of tasks)
    for (const which of GATE_PLANS) {
      const file = join(task.dir, 'plans', `${which}.md`);
      const text = await readFile(file, 'utf8').catch(() => null);
      if (text === null) {
        rows.push({ task: task.id, which, missing: true, ok: false });
        continue;
      }
      const result = await judgePlan(o, task, text);
      if (o.dryRun) {
        console.log(`----- ${task.id} ${which}\n${result.prompt}`);
        continue;
      }
      const ok =
        which === 'good'
          ? result.score >= 0.8
          : which === 'trap'
          ? result.score <= 0.5
          : true;
      rows.push({
        task: task.id,
        category: task.category,
        which,
        score: result.score,
        disagreed: result.disagreed,
        ok,
      });
      console.log(
        `${ok ? 'ok  ' : 'FAIL'} ${task.id} ${which.padEnd(9)} ${result.score}`
      );
    }
  if (o.dryRun) return;
  for (const task of tasks.filter((t) => t.category === 'proof-only')) {
    const score = (w) =>
      rows.find((r) => r.task === task.id && r.which === w)?.score;
    if (score('plausible') >= score('good'))
      console.log(
        `note ${task.id}: the plausible plan scores as high as the good one`
      );
  }
  const json = `${JSON.stringify({ rows }, null, 2)}\n`;
  if (o.out) await writeFile(resolve(o.out), json);
  else process.stdout.write(json);
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

async function main() {
  const o = options(process.argv.slice(2));
  const tasks = loadTasks(o.tasks).filter((t) => t.kind === 'plan');
  if (o.gate) return rubricGate(o, pickTasks(tasks, o));
  if (o.plan) {
    const task = tasks.find((t) => t.id === o.task);
    if (!task) throw new Error(`No plan task ${o.task}`);
    const result = await judgePlan(
      o,
      task,
      await readFile(resolve(o.plan), 'utf8')
    );
    if (o.dryRun) return console.log(result.prompt);
    const json = `${JSON.stringify(
      { task: task.id, plan: resolve(o.plan), ...result },
      null,
      2
    )}\n`;
    if (o.out) await writeFile(resolve(o.out), json);
    else process.stdout.write(json);
    return;
  }
  const picked = new Map(pickTasks(tasks, o).map((t) => [t.id, t]));
  const todo = [];
  for (const s of listSessions(o.dir, o.name)) {
    const task = picked.get(s.id);
    if (!task || (o.arms.length && !o.arms.includes(s.arm))) continue;
    if (!(await readJson(join(s.dir, 'session.json')))?.done) continue;
    if (!o.dryRun && !o.rejudge && (await readJson(join(s.dir, 'judge.json'))))
      continue;
    todo.push({ s, task });
  }
  console.log(`${todo.length} plans to judge${o.dryRun ? ' (dry run)' : ''}`);
  const worker = async () => {
    for (let job = todo.shift(); job; job = todo.shift()) {
      const plan = await readFile(join(job.s.dir, 'PLAN.md'), 'utf8').catch(
        () => null
      );
      const result = await judgePlan(o, job.task, plan);
      if (o.dryRun) {
        await writeFile(join(job.s.dir, 'judge-input.md'), result.prompt);
        console.log(`----- ${job.s.arm}/${job.s.id}\n${result.prompt}`);
        continue;
      }
      await writeFile(
        join(job.s.dir, 'judge.json'),
        `${JSON.stringify(
          { task: job.s.id, arm: job.s.arm, run: o.name, ...result },
          null,
          2
        )}\n`
      );
      console.log(`${job.s.arm}/${job.s.id}: score ${result.score}`);
    }
  };
  await Promise.all(Array.from({ length: o.dryRun ? 1 : o.jobs }, worker));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
