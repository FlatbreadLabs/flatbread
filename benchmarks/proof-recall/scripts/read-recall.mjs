#!/usr/bin/env node
// The free offline check for what `proof get` prints on a compaction and
// what `proof records --standing` and `--rests-on` list, before any paid
// agent run.
//
//   node scripts/read-recall.mjs [--graph <built-graph-dir>] [--ids a,b]
//        [--only ambiguous] [--split tune|holdout|all] [--out <json>]
//
// Invariants, on every Effort of the graph, with no questions:
//   - for each standing, the `records --standing <s>` total equals the sum
//     over kinds of that standing in `state`'s Counts;
//   - the `records --rests-on superseded,invalidated,rejected,retracted`
//     total equals `state`'s "N live records rest directly on";
//   - `get` on the head compaction gives the count and stale verdict that
//     `brief` gives in its `compaction` field.
// The script fails (exit code 1) when any of them does not hold.
//
// Questions, scored as the other gates score them:
//   compaction   for each evidence id that is a compaction, `get` it. A
//                count answer scores when it is the number on the "differ"
//                line, and a boolean answer when it matches the `Stale:`
//                line. A boolean question with the word "stale" asks for
//                the verdict; one with "still" ("does that still hold?")
//                asks for its opposite; any other boolean question is not
//                scored. A record answer scores when every id is in the
//                change list, and a value answer as find-recall.mjs scores
//                a card.
//   rests-on     dead-evidence and invalidation questions with a record,
//                records, or count answer. Each reads, for its Effort,
//                `records --rests-on` with each dead standing and with all
//                four, and `records --standing invalidated`, every page. A
//                record answer scores when all its ids fall inside one
//                read's set; a count when it equals one read's total.
// Text, "unknown", and other answers are not scored. A count can equal a
// total by chance, so the table also prints, for each count question in
// the split, the share of other Efforts whose reads give that total,
// averaged. Questions outside `--split` are not read at all.
//
// Before this change, `get` printed neither the count nor the verdict and
// `records` had neither flag, so the baseline is 0 by construction for
// counts and booleans. Read tune rows to debug; score holdout once.
//
// The graph is copied, without its key map, into a temporary folder, and one
// `proof serve` there answers every read. The folder is removed at the end.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MULTI_EFFORT_SETS, RUNS_DIR, pickQuestions } from './check.mjs';
import { readHash } from './collect.mjs';
import {
  answerOnCard,
  flatbread,
  pct,
  rate,
  serverAnswers,
  sleep,
  splitOf,
  targets,
} from './find-recall.mjs';
import { loadGraph, qualify } from './graph.mjs';
import { prepareFolder } from './prepare-run.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPLITS = ['tune', 'holdout', 'all'];
const KINDS = 'issue,finding,decision,constraint,risk,citation,blob';
const DEAD = ['superseded', 'invalidated', 'rejected', 'retracted'];
const STANDINGS = [
  'open',
  'resolved',
  'deferred',
  'wontfix',
  'proposed',
  'accepted',
  'rejected',
  'deprecated',
  'realized',
  'mitigated',
  'live',
  ...DEAD.filter((s) => s !== 'rejected'),
];
const REST_CATEGORIES = ['dead-evidence', 'invalidation'];

function args(argv) {
  const out = {
    graph: join(BENCH, '.flatbread-proof'),
    ids: [],
    only: [],
    out: join(RUNS_DIR, 'read-recall.json'),
    split: 'all',
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--graph') out.graph = resolve(argv[++i]);
    else if (flag === '--ids') out.ids = argv[++i].split(',');
    else if (flag === '--only') out.only = argv[++i].split(',');
    else if (flag === '--out') out.out = resolve(argv[++i]);
    else if (flag === '--split') out.split = argv[++i];
    else throw new Error(`Unknown argument ${flag}`);
  }
  if (!SPLITS.includes(out.split))
    throw new Error(`--split must be one of ${SPLITS.join(', ')}`);
  return out;
}

const isCompaction = (record) =>
  record?.kind === 'finding' && record.frontmatter.kind === 'compaction';

/** Standing totals from `state`'s Counts: the top-level line of each kind. */
function stateCounts(markdown) {
  const counts = new Map();
  const start = markdown.indexOf('### Counts\n');
  const end = markdown.indexOf('\n### ', start + 1);
  for (const line of markdown.slice(start, end).split('\n')) {
    const match = line.match(
      /^- (?:Issues|Decisions|Findings|Constraints|Risks|Citations|Blobs) \d+: (.*)$/
    );
    if (!match) continue;
    for (const part of match[1].split(', ')) {
      const [word, n] = part.split(' ');
      counts.set(word, (counts.get(word) ?? 0) + Number(n));
    }
  }
  return counts;
}

/** Ids and total of a `records` read, every page. */
async function readAll(read, argv) {
  const ids = [];
  let total = null;
  let cursor;
  do {
    const out = JSON.parse(
      await read([...argv, ...(cursor ? ['--cursor', cursor] : [])])
    );
    const digest = await readFile(out.artifact_path, 'utf8');
    total ??= Number(digest.match(/"total_known":(\d+)/)?.[1] ?? 0);
    ids.push(...[...digest.matchAll(/^### (\S+)$/gm)].map((m) => m[1]));
    cursor = out.page.next_cursor;
  } while (cursor);
  return { ids, total };
}

/** The total of a `records` read, from its first page of one record. */
async function totalOf(read, argv) {
  const out = JSON.parse(await read([...argv, '--limit', '1']));
  const digest = await readFile(out.artifact_path, 'utf8');
  return { total: Number(digest.match(/"total_known":(\d+)/)?.[1] ?? 0) };
}

/** What `get` prints on a compaction: the count, the verdict, the change list. */
function compactionFacts(digest) {
  const differ = digest.match(
    /^- Since it was written, (\d+) records? differs? from the live set/m
  );
  const stale = digest.match(/^- Stale: (yes|no)\./m);
  const start = digest.indexOf('## Changes since compaction\n');
  const end = digest.indexOf('\n## ', start + 1);
  const changes =
    start < 0
      ? []
      : [
          ...digest
            .slice(start, end)
            .matchAll(/^- (?:added|changed|left) \| (\S+) \|/gm),
        ].map((m) => m[1]);
  return {
    differ: differ ? Number(differ[1]) : null,
    stale: stale ? stale[1] === 'yes' : null,
    changes,
  };
}

/**
 * Whether a boolean compaction question is answered by a `Stale:` line:
 * "is it stale?" wants the verdict, "does it still hold?" its opposite.
 * Any other wording is not scored (null).
 */
function booleanHit(question, gold, facts) {
  const yes = gold === true || gold === 'true';
  const want = /\bstale\b/i.test(question)
    ? yes
    : /\bstill\b/i.test(question)
    ? !yes
    : null;
  if (want === null) return null;
  return facts.some((f) => f.stale === want);
}

function tally(rows) {
  return {
    n: rows.length,
    hit: rate(rows, 'hit'),
    mean_chars: Math.round(
      rows.reduce((sum, r) => sum + r.chars, 0) / (rows.length || 1)
    ),
  };
}

async function main() {
  const options = args(process.argv.slice(2));
  const graph = await loadGraph(options.graph);
  const read_hash = await readHash();
  const efforts = [...graph.records.values()]
    .filter((record) => record.kind === 'effort')
    .map((record) => record.id)
    .sort();
  const effortOfKey = Object.fromEntries(
    Object.entries(graph.keymap)
      .filter(([key]) => key.endsWith('.effort'))
      .map(([key, id]) => [key.split('.')[0], id])
  );

  const folder = await mkdtemp(join(tmpdir(), 'read-recall-'));
  const socket = join(folder, 'serve.sock');
  await prepareFolder(folder, [], options.graph);
  const server = spawn(
    join(folder, 'flatbread'),
    ['proof', 'serve', '--socket', socket],
    { cwd: folder, stdio: 'ignore' }
  );
  const read = (argv) =>
    flatbread(folder, ['proof', ...argv], { FLATBREAD_PROOF_SERVER: socket });
  const invariants = [];
  const restReads = new Map();
  const gets = new Map();
  const rows = [];
  try {
    for (let i = 0; !(await serverAnswers(socket)); i++) {
      if (i > 600) throw new Error('proof serve did not start');
      await sleep(200);
    }
    const check = (effort, name, want, got) =>
      invariants.push({ effort, name, want, got, ok: want === got });
    const getCompaction = async (id) => {
      if (!gets.has(id)) {
        const out = await read(['get', id]);
        const digest = await readFile(JSON.parse(out).artifact_path, 'utf8');
        gets.set(id, {
          chars: out.length + digest.length,
          digest,
          ...compactionFacts(digest),
        });
      }
      return gets.get(id);
    };

    const restsOn = async (effort) => {
      if (!restReads.has(effort)) {
        const reads = {};
        for (const standing of [...DEAD, DEAD.join(',')])
          reads[`rests-on ${standing}`] = await readAll(read, [
            'records',
            effort,
            '--rests-on',
            standing,
            '--kinds',
            KINDS,
          ]);
        reads['standing invalidated'] = await readAll(read, [
          'records',
          effort,
          '--standing',
          'invalidated',
          '--kinds',
          KINDS,
        ]);
        restReads.set(effort, reads);
      }
      return restReads.get(effort);
    };

    for (const effort of efforts) {
      // Every Effort's reads, so the chance rate below does not depend on
      // which Efforts the split's questions name.
      await restsOn(effort);
      const state = JSON.parse(await read(['state', effort]));
      const counts = stateCounts(state.markdown);
      for (const standing of STANDINGS) {
        const { total } = await totalOf(read, [
          'records',
          effort,
          '--standing',
          standing,
          '--kinds',
          KINDS,
        ]);
        check(effort, `standing ${standing}`, counts.get(standing) ?? 0, total);
      }
      const resting = Number(
        state.markdown.match(/(\d+) live records? rests? directly on/)?.[1]
      );
      const all = await readAll(read, [
        'records',
        effort,
        '--rests-on',
        DEAD.join(','),
        '--kinds',
        KINDS,
      ]);
      check(effort, 'rests-on all', resting, all.total);
      const brief = JSON.parse(await read(['brief', effort])).compaction;
      if (brief?.head_id) {
        const got = await getCompaction(brief.head_id);
        check(effort, 'compaction changes', brief.changes, got.differ);
        check(effort, 'compaction stale', brief.stale, got.stale);
      }
    }

    for (const set of await pickQuestions(options))
      for (const q of set.questions) {
        if (options.split !== 'all' && splitOf(q.id) !== options.split)
          continue;
        const { answers, evidence } = targets(graph, set.effort, q);
        const kind = q.answer.kind;
        const base = {
          id: q.id,
          effort: set.effort,
          categories: q.categories,
          answer_kind: kind,
        };
        if (q.categories.includes('compaction')) {
          const compactions = [...evidence].filter((id) =>
            isCompaction(graph.records.get(id))
          );
          if (compactions.length) {
            const facts = await Promise.all(compactions.map(getCompaction));
            const gold = q.answer.value;
            const hit =
              kind === 'count'
                ? facts.some((f) => f.differ === Number(gold))
                : kind === 'boolean'
                ? booleanHit(q.question, gold, facts)
                : kind === 'record' || kind === 'records'
                ? facts.some((f) =>
                    answers.every((id) => f.changes.includes(id))
                  )
                : answerOnCard(
                    q,
                    answers,
                    facts.map((f) => f.digest).join('\n')
                  );
            rows.push({
              ...base,
              read: 'compaction',
              hit,
              chars: facts.reduce((sum, f) => sum + f.chars, 0),
            });
          }
        }
        if (
          q.categories.some((c) => REST_CATEGORIES.includes(c)) &&
          ['record', 'records', 'count'].includes(kind)
        ) {
          const keys = MULTI_EFFORT_SETS.includes(set.effort)
            ? [
                ...new Set(
                  [
                    ...(q.evidence ?? []),
                    ...(kind === 'count' ? [] : [q.answer.value].flat()),
                  ].map((key) => qualify(set.effort, key).split('.')[0])
                ),
              ]
            : [set.effort];
          const reads = [];
          for (const key of keys)
            if (effortOfKey[key])
              reads.push(...Object.values(await restsOn(effortOfKey[key])));
          const hit =
            kind === 'count'
              ? reads.some((r) => r.total === Number(q.answer.value))
              : reads.some((r) => answers.every((id) => r.ids.includes(id)));
          rows.push({
            ...base,
            read: 'rests-on',
            hit,
            efforts: keys,
            gold: kind === 'count' ? Number(q.answer.value) : undefined,
            chars: 0,
          });
        }
      }
  } finally {
    server.kill();
    await rm(folder, { recursive: true, force: true });
  }

  // How often a count matches some read's total for another Effort.
  const totals = new Map(
    [...restReads].map(([effort, reads]) => [
      effort,
      Object.values(reads).map((r) => r.total),
    ])
  );
  const chance = rows
    .filter((r) => r.read === 'rests-on' && r.answer_kind === 'count')
    .map((r) => {
      const own = new Set(r.efforts.map((key) => effortOfKey[key]));
      const others = [...totals].filter(([effort]) => !own.has(effort));
      return others.length
        ? others.filter(([, list]) => list.includes(r.gold)).length /
            others.length
        : 0;
    });

  const groups = {
    all: tally(rows),
    compaction: tally(rows.filter((r) => r.read === 'compaction')),
    '  count': tally(
      rows.filter((r) => r.read === 'compaction' && r.answer_kind === 'count')
    ),
    '  boolean': tally(
      rows.filter((r) => r.read === 'compaction' && r.answer_kind === 'boolean')
    ),
    '  record': tally(
      rows.filter(
        (r) =>
          r.read === 'compaction' &&
          ['record', 'records'].includes(r.answer_kind)
      )
    ),
    '  value': tally(
      rows.filter((r) => r.read === 'compaction' && r.answer_kind === 'value')
    ),
    'rests-on': tally(rows.filter((r) => r.read === 'rests-on')),
    '  count ': tally(
      rows.filter((r) => r.read === 'rests-on' && r.answer_kind === 'count')
    ),
    '  record ': tally(
      rows.filter((r) => r.read === 'rests-on' && r.answer_kind !== 'count')
    ),
  };
  console.log(
    `\ngraph ${options.graph}, split ${options.split} (${rows.length} scored rows)`
  );
  console.log(
    'group'.padEnd(16) +
      'n'.padStart(5) +
      'scored'.padStart(8) +
      'hit'.padStart(7) +
      'chars'.padStart(8)
  );
  for (const [name, t] of Object.entries(groups))
    console.log(
      name.padEnd(16) +
        String(t.n).padStart(5) +
        String(t.hit.n).padStart(8) +
        pct(t.hit).padStart(7) +
        String(t.mean_chars).padStart(8)
    );
  const failed = invariants.filter((i) => !i.ok);
  for (const i of failed)
    console.log(
      `  invariant failed: ${i.effort} ${i.name}: want ${i.want}, got ${i.got}`
    );
  const meanChance = chance.length
    ? chance.reduce((a, b) => a + b, 0) / chance.length
    : 0;
  console.log(
    `TOTAL compaction ${pct(groups.compaction.hit)} of ${
      groups.compaction.hit.n
    }; rests-on ${pct(groups['rests-on'].hit)} of ${
      groups['rests-on'].hit.n
    }; count chance rate ${Math.round(meanChance * 100)}% over ${
      chance.length
    } count questions`
  );
  console.log(
    `INVARIANTS ${invariants.length - failed.length} of ${
      invariants.length
    } hold on ${efforts.length} Efforts${failed.length ? ' FAIL' : ''}`
  );
  await writeFile(
    options.out,
    `${JSON.stringify(
      {
        graph: options.graph,
        split: options.split,
        read_hash,
        invariants: { held: invariants.length - failed.length, failed },
        count_chance_rate: +meanChance.toFixed(3),
        groups,
        rows: rows,
      },
      null,
      2
    )}\n`
  );
  console.log(`read_hash ${read_hash}\nWrote ${options.out}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
