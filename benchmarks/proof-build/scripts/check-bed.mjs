#!/usr/bin/env node
// Checks built test beds against each other and against the design, for
// free, before any paid session:
//
//   node scripts/check-bed.mjs --proof <dir> --none <dir> [--x10 <dir>]
//
// - every commit has the same code tree in every variant (`git ls-tree`
//   with .flatbread-proof/ and flatbread.config.js left out), and the same
//   subject, author and date;
// - the none variant has no graph, no config and no `Proof:` trailer in any
//   commit, and no rule wording (spec/banned.mjs BANNED_IN_CODE) anywhere in
//   its history, code or messages;
// - the proof variants have trailers on the commits spec/proof.mjs says and
//   on no others, and the same record ids for the real Efforts;
// - each drift commit carries no trailer and touches no graph file;
// - the x10 graph holds the real graph plus filler Efforts only.
//
// It prints one line per check and exits non-zero on the first failure.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMMITS } from '../spec/history.mjs';
import { PROOF, DRIFTS, EFFORTS } from '../spec/proof.mjs';
import { BANNED_IN_CODE } from '../spec/banned.mjs';
import { FILLER_KEYS } from '../spec/filler.mjs';

const PROOF_DIR = '.flatbread-proof';
const CONFIG = 'flatbread.config.js';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i].replace(/^--/, '');
    if (!['proof', 'none', 'x10'].includes(flag))
      throw new Error(`Unknown argument ${argv[i]}`);
    out[flag] = resolve(argv[++i]);
  }
  if (!out.proof || !out.none)
    throw new Error(
      'usage: check-bed.mjs --proof <dir> --none <dir> [--x10 <dir>]'
    );
  return out;
}

const git = (dir, argv) =>
  execFileSync('git', argv, {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 1 << 30,
    env: {
      PATH: process.env.PATH,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
    },
  }).trim();

let failed = false;
function check(label, ok, detail = '') {
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`
  );
  if (!ok) failed = true;
}

function log(dir) {
  const shas = git(dir, ['rev-list', '--reverse', 'main']).split('\n');
  return shas.map((sha) => ({
    sha,
    subject: git(dir, ['log', '-1', '--format=%s', sha]),
    who: git(dir, ['log', '-1', '--format=%an <%ae> %aI | %cn <%ce> %cI', sha]),
    trailers: git(dir, [
      'log',
      '-1',
      '--format=%(trailers:key=Proof,valueonly,separator=%x2C)',
      sha,
    ])
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    code: git(dir, ['ls-tree', '-r', sha])
      .split('\n')
      .filter(
        (l) => !l.includes(`\t${PROOF_DIR}/`) && !l.endsWith(`\t${CONFIG}`)
      )
      .join('\n'),
    graph: git(dir, ['ls-tree', '-r', '--name-only', sha])
      .split('\n')
      .filter((p) => p.startsWith(`${PROOF_DIR}/`)),
  }));
}

function keymap(dir) {
  return JSON.parse(readFileSync(`${dir}.keymap.json`, 'utf8'));
}

function main() {
  const o = args(process.argv.slice(2));
  const beds = {
    proof: o.proof,
    none: o.none,
    ...(o.x10 ? { x10: o.x10 } : {}),
  };
  const logs = Object.fromEntries(
    Object.entries(beds).map(([k, d]) => [k, log(d)])
  );
  const maps = Object.fromEntries(
    Object.entries(beds).map(([k, d]) => [k, keymap(d)])
  );
  for (const [name, l] of Object.entries(logs))
    check(
      `${name}: ${COMMITS.length} commits on main`,
      l.length === COMMITS.length,
      `${l.length}`
    );

  // Same code tree, subject, author and date, commit for commit.
  for (const other of Object.keys(beds).filter((k) => k !== 'none')) {
    const diff = COMMITS.map((c, i) => i).filter(
      (i) => logs.none[i].code !== logs[other][i].code
    );
    check(
      `${other} and none have identical code trees at every commit`,
      diff.length === 0,
      diff.length
        ? `differ at ${diff.map((i) => COMMITS[i].key)}`
        : `${COMMITS.length} trees`
    );
    const meta = COMMITS.map((c, i) => i).filter(
      (i) =>
        logs.none[i].subject !== logs[other][i].subject ||
        logs.none[i].who !== logs[other][i].who
    );
    check(
      `${other} and none have the same subjects, authors and dates`,
      meta.length === 0
    );
  }
  check(
    'the tips of all variants have the same code tree',
    new Set(Object.values(logs).map((l) => l.at(-1).code)).size === 1
  );

  // The none variant has no Proof at all.
  const none = logs.none;
  check(
    'none: no Proof: trailer in any commit',
    none.every((c) => !c.trailers.length)
  );
  check(
    'none: no .flatbread-proof/ or flatbread.config.js in any commit',
    none.every((c) => !c.graph.length) &&
      !git(o.none, ['log', '--all', '--format=%H', '--', CONFIG])
  );
  check('none: no record ids in its key map', !maps.none.records);
  const history = git(o.none, [
    'log',
    '-p',
    '--all',
    '--format=%B',
  ]).toLowerCase();
  const leaks = BANNED_IN_CODE.filter((p) => history.includes(p.toLowerCase()));
  check(
    'none: no proof-only rule wording anywhere in its history (code, tests, docs, messages)',
    leaks.length === 0,
    leaks.join(', ')
  );
  check(
    'none: no mention of Proof or flatbread in its history',
    !/flatbread|proof:/i.test(history)
  );

  // Trailers where the spec puts them, and nowhere else.
  for (const name of Object.keys(beds).filter((k) => k !== 'none')) {
    const l = logs[name];
    const ids = maps[name].records;
    const wrong = COMMITS.flatMap((c, i) => {
      const want = (PROOF[c.key]?.trailers ?? []).map((k) => ids[k]).sort();
      const have = [...l[i].trailers].sort();
      return want.join() === have.join() ? [] : [c.key];
    });
    check(
      `${name}: trailers match spec/proof.mjs`,
      wrong.length === 0,
      wrong.length
        ? wrong.join(', ')
        : `${l.filter((c) => c.trailers.length).length} commits with trailers`
    );
    for (const [key, d] of Object.entries(DRIFTS)) {
      const i = COMMITS.findIndex((c) => c.key === d.commit);
      const touched = git(beds[name], [
        'show',
        '--name-only',
        '--format=',
        l[i].sha,
      ]).split('\n');
      check(
        `${name}: ${key} (${d.commit} "${COMMITS[i].subject}") has no trailer and leaves the graph alone`,
        !l[i].trailers.length &&
          !touched.some((p) => p.startsWith(`${PROOF_DIR}/`))
      );
    }
    const after = COMMITS.findIndex((c) => c.key === 'c76');
    const graphTouched = l.slice(after).filter((c, j) => {
      const touched = git(beds[name], [
        'show',
        '--name-only',
        '--format=',
        c.sha,
      ]).split('\n');
      return (
        touched.some((p) => p.startsWith(`${PROOF_DIR}/`)) && name === 'proof'
      );
    });
    if (name === 'proof')
      check(
        'proof: no commit from the first drift on touches the graph',
        graphTouched.length === 0,
        graphTouched.map((c) => c.subject).join('; ')
      );
  }

  // The same record ids for the real Efforts in proof and x10.
  if (maps.x10) {
    const real = Object.keys(EFFORTS);
    const p = maps.proof.records;
    const x = maps.x10.records;
    const differ = Object.keys(p).filter((k) => p[k] !== x[k]);
    check(
      'x10 has every real record with the same id',
      differ.length === 0,
      differ.join(', ')
    );
    const extra = Object.keys(x).filter((k) => !(k in p));
    check(
      'x10 adds only filler Efforts',
      extra.every((k) => FILLER_KEYS.includes(k.split('.')[0])),
      `${extra.length} filler keys`
    );
    check(
      'x10 filler is outside the real Efforts',
      extra.every((k) => !real.includes(k.split('.')[0]))
    );
    const files = logs.x10.at(-1).graph.filter((f) => f.endsWith('.md')).length;
    const proofFiles = logs.proof
      .at(-1)
      .graph.filter((f) => f.endsWith('.md')).length;
    check(
      'x10 graph is about ten times the real one',
      files >= 8 * proofFiles,
      `${files} vs ${proofFiles} record files`
    );
  }
  for (const [name, dir] of Object.entries(beds))
    check(
      `${name}: working tree clean, main checked out`,
      !git(dir, ['status', '--porcelain']) &&
        git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']) === 'main' &&
        existsSync(dir)
    );
  if (failed) process.exitCode = 1;
}

main();
