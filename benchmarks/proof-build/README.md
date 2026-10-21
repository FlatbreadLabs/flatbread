# Proof build benchmark

When an agent builds a feature from a product-level request ("the
properties panel should also…"), does having Proof records in its context
make the work better, worse, or just more expensive? The pre-registered
design, hypotheses and change log are in [DESIGN.md](DESIGN.md).

## What it measures

The test bed is Tessera core, a small zero-dependency TypeScript design
editor with 84 commits of history. In the proof variant, 7 Efforts of
records written the way real agents write them (Decisions with rejected
alternatives, Constraints, Findings, Risks, code Citations) sit in the
graph. The none variant has the same code and no Proof at all. The 10x
variant adds 9 filler Efforts, about ten times the records.

There are 26 tasks: 18 build tasks graded by hidden tests and 8 plan tasks
scored by a blind rubric. Each task belongs to one category:

| Category     | What makes a solution right                           | Build | Plan |
| ------------ | ----------------------------------------------------- | ----- | ---- |
| proof-only   | a rule that only Proof states                         | 6     | 3    |
| code-visible | a rule Proof states and the code also shows           | 5     | 1    |
| stale        | the code, where Proof is out of date                  | 4     | 2    |
| control      | nothing about Proof; measures the cost of carrying it | 3     | 2    |

Every session gets the same code and the same request. The arms differ in
how Proof reaches the agent:

| Arm        | Proof in the session                                           |
| ---------- | -------------------------------------------------------------- |
| `none`     | none: no records, no trailers, no CLI, no skill                |
| `skill`    | available through the proof skill and `./flatbread proof`      |
| `find`     | as `skill`, plus "run `proof find` on the request first"       |
| `findcode` | as `find`, plus `find --path <file>` before edits and `--refs` |
| `brief`    | as `skill`, plus `proof brief` of every Effort pasted in       |
| `dump`     | as `skill`, plus every live record pasted in                   |
| `dump10x`  | `dump` on the 10x graph (the burden ceiling, one run)          |

A build session is all-green when its acceptance, constraint and
regression tests all pass. The primary endpoints are all-green on the
proof-only tasks (does Proof help?) and on the stale tasks (does stale
Proof hurt?), each arm against `none`, with Holm correction. Cost (first
turn, context and processed tokens, turns, wall time) answers the burden
question. Leakage flags drop sessions that read outside their clone or
reach the hidden tests.

## Build the beds

Beds are built outside the repository, in `<p4>` (the key maps hold the
answers). Builds are deterministic: a rebuild gives the same hashes. The
hidden tests and the reference and naive patches are committed in `hidden/`
since the first full run; copy them to `<p4>/hidden` before running, so a
session never needs a path into this repository, and pass `--out` to
`gate.mjs` (it refuses to rebuild `tasks/` in place). `grade.mjs` flags any
session that reads `hidden/` or `tasks/` here.

```sh
node scripts/gen-bed.mjs --out <p4>/bed
node scripts/gen-bed.mjs --variant none --out <p4>/bed-none
node scripts/gen-bed.mjs --scale 10 --out <p4>/bed-x10
node scripts/check-bed.mjs --proof <p4>/bed --none <p4>/bed-none --x10 <p4>/bed-x10
```

`--check-each` runs the bed's suite at every commit.

## Offline gate (free)

```sh
node scripts/gate.mjs --hidden <p4>/hidden --none <p4>/bed-none \
  --bed <p4>/bed --x10 <p4>/bed-x10
```

It assembles `<p4>/tasks/`, runs the static checks (no feature word in
Proof, no Proof-only rule anywhere in the none bed, prompts name no file or
symbol), and grades each build task's base tree, reference patch and naive
patch: base fails acceptance, reference passes everything, naive fails the
group it is meant to fail. It exits 1 on any failure.

## Run

Prepare first and read what a session would see (no model is called):

```sh
node scripts/run.mjs <p4>/runs --name r1 --bed <p4>/bed --prepare-only --ids B-P1
```

Then run for real (`--arms`, `--ids`, `--only <kind or category>`,
`--jobs`, `--model`):

```sh
node scripts/run.mjs <p4>/runs --name r1 --bed <p4>/bed --model claude-haiku-5-5 --jobs 8
```

Each session gets a fresh clone and the whole task text on stdin. A rerun
skips finished sessions and retries transient API errors.

## Grade, judge, compare

```sh
node scripts/grade.mjs <p4>/runs --name r1 --tasks <p4>/tasks \
  --none <p4>/bed-none --bed <p4>/bed [--bed10x <p4>/bed-x10]
node scripts/judge.mjs <p4>/runs --name r1 --tasks <p4>/tasks [--dry-run]
node scripts/compare.mjs <p4>/runs --runs r1,r2,r3 --out <p4>/runs/compare.json
```

`grade.mjs` applies each session's diff to the none bed, restores the
bed's own tests, adds the hidden tests and runs them without network.
`judge.mjs` strips Proof ids and wording from each PLAN.md so the judge
cannot tell the arm, then scores it against the rubric twice;
`--dry-run` prints the blinded prompt. `compare.mjs` pairs each arm with
`none` by task and run.

Before the full run, the rubric gate checks that the rubrics separate the
hand-written good, trap and plausible plans (it calls the judge):

```sh
node scripts/judge.mjs --gate --tasks <p4>/tasks --out <p4>/gate-judge.json
```

## Pilot and full run

The pilot is one build task per category in the six primary arms, once,
on Haiku: 24 sessions, about $1.40 (range $1 to $4), plus about $3 for
the rubric gate. With `P4` set to the `<p4>` folder:

```sh
node scripts/run.mjs $P4/runs --name pilot --bed $P4/bed \
  --ids B-P1,B-S3,B-V4,B-K1 --model claude-haiku-5-5 --jobs 8
node scripts/grade.mjs $P4/runs --name pilot --tasks $P4/tasks \
  --none $P4/bed-none --bed $P4/bed
node scripts/compare.mjs $P4/runs --runs pilot --out $P4/runs/pilot.json
node scripts/judge.mjs --gate --tasks $P4/tasks --out $P4/gate-judge.json
```

The full run is 420 primary sessions (build tasks 3 runs, plan tasks 2)
and 26 `dump10x` sessions, about 6 hours of wall time at 8 jobs:

```sh
for r in r1 r2; do
  node scripts/run.mjs $P4/runs --name $r --bed $P4/bed --model claude-haiku-5-5 --jobs 8
done
node scripts/run.mjs $P4/runs --name r3 --bed $P4/bed --only build --model claude-haiku-5-5 --jobs 8
node scripts/run.mjs $P4/runs --name r1 --bed $P4/bed --arms dump10x --model claude-haiku-5-5 --jobs 4
for r in r1 r2 r3; do
  node scripts/grade.mjs $P4/runs --name $r --tasks $P4/tasks \
    --none $P4/bed-none --bed $P4/bed --bed10x $P4/bed-x10
  node scripts/judge.mjs $P4/runs --name $r --tasks $P4/tasks
done
node scripts/compare.mjs $P4/runs --runs r1,r2,r3 --out $P4/runs/compare.json
```

## Results: Haiku, full run (2026-10-21)

18 build tasks × 3 runs and 8 plan tasks × 2 runs in each of the six primary
arms, plus `dump10x` once per task: 446 sessions on `claude-haiku-5-5`, after
a 30-session pilot. Per-session rows are in `results/haiku-sessions.json`
(no transcripts); the `compare.mjs` output is `results/haiku-compare.json`.
No session timed out or hit an API error. 23 sessions were flagged for leaving
their folder (scratch files, `cd /tmp`, reading the prettier binary), none for
reading hidden tests, and no `none` session found Proof. The tables keep the
flagged sessions; dropping their pairs gives the same picture.

**Build tasks: all-green, of 54 per arm** (proof-only 18, code-visible 15,
stale 12, control 9; `dump10x` ran each task once: 6, 5, 4 and 3):

| Arm        | proof-only | code-visible | stale  | control | all          | context tokens | processed tokens |
| ---------- | ---------- | ------------ | ------ | ------- | ------------ | -------------- | ---------------- |
| `none`     | 17         | 12           | **12** | 6       | **47** (87%) | 42k            | 594k             |
| `skill`    | 18         | 9            | 8      | 6       | 41 (76%)     | 51k            | 781k             |
| `find`     | 18         | 7            | 9      | 6       | 40 (74%)     | 46k            | 668k             |
| `findcode` | 18         | 8            | 9      | 6       | 41 (76%)     | 53k            | 798k             |
| `brief`    | 18         | 6            | 7      | 6       | 37 (69%)     | 60k            | 901k             |
| `dump`     | 18         | 6            | 6      | 6       | 36 (67%)     | 78k            | 1,197k           |
| `dump10x`  | 6 of 6     | 2 of 5       | 2 of 4 | 2 of 3  | 12 of 18     | 255k           | 3,887k           |

- **One stale Decision did almost all the harm.** It says shortcuts are
  registered in `keys/keymap.ts`. A later refactor moved registration to the
  scope bindings and left that file as the frozen table plugins read, with no
  Proof update. Every task that adds a shortcut met it: B-S3 (`none` 3 of 3,
  every Proof arm 0 of 3), B-V4 (Proof arms 0 to 1 of 3) and B-V3 (0 to 2 of
  3). In B-S1 a second stale record, on group opacity, also caught `dump` (0 of
  3). The sessions edited the frozen table and broke plugin API v1.
- **A stale-anchor note did not stop it.** `findcode` sessions read
  `#registerBinding renamed to legacyAction in bc1c5b5; 4 commits touched it since` and still followed the accepted Decision.
- **More forced Proof, more harm and more cost.** All-green falls from 74–76%
  (`skill`, `find`, `findcode`) to 69% (`brief`) and 67% (`dump`), while
  processed tokens rise to 1.1–1.3×, 1.5× and 2.0× those of `none`.
- **Proof-only tasks showed no gain.** `none` passed 17 of 18. Haiku inferred
  one undo step per gesture, unedited shipped migrations and frozen plugin
  payloads from the patterns already in the code, so these tasks cannot yet
  show a benefit.
- **Two tasks fail in every arm.** B-K2 breaks a colour-parsing regression and
  B-V2 fails exact round-trip scaling, so neither says anything about Proof.
- **Statistics.** Pooled all-green against `none`, pair level and
  Holm-corrected: `dump` p = 0.059, `brief` 0.086, the others 0.21 to 0.29.
  The pre-registered primary tests (proof-only and stale, Holm-corrected) are
  not significant (best: stale `dump`, 0.31). Counting each task once gives
  1 task against 4 (p = 0.375): the harm sits in a few tasks that share one
  stale record, so pair-level p-values overstate it.

**Plan tasks: mean rubric score** (proof-only 6, code-visible 2, stale 4 and
control 4 plans per arm; `dump10x` half as many):

| Arm        | proof-only | code-visible | stale | control | all  |
| ---------- | ---------- | ------------ | ----- | ------- | ---- |
| `none`     | 0.90       | 0.57         | 1.00  | 1.00    | 0.91 |
| `skill`    | 0.91       | 0.86         | 0.94  | 0.93    | 0.91 |
| `find`     | 0.89       | 0.79         | 1.00  | 0.93    | 0.91 |
| `findcode` | 0.91       | 0.86         | 0.93  | 1.00    | 0.93 |
| `brief`    | 0.98       | 0.79         | 0.91  | 0.96    | 0.93 |
| `dump`     | 1.00       | 0.86         | 0.76  | 0.96    | 0.91 |
| `dump10x`  | 0.96       | 0.71         | 0.52  | 0.93    | 0.81 |

Plans show both edges. Pasted Proof lifts proof-only plans (`dump` 1.00 and
`brief` 0.98, against 0.90) and drags down stale ones (`dump` 0.76 and
`dump10x` 0.52, against 1.00), so overall they cancel. No plan difference is
significant (Wilcoxon p ≥ 0.30).

So on this bed Proof in context never raised build quality, and an
out-of-date record lowered it wherever its area was touched, most when Proof
was pasted in. A plan gains from rules it is told, but the code already
teaches a builder most of them. The changes this points to are a read that
marks a Decision itself as suspect when the code it rests on has moved, and
proof-only tasks whose rules the code does not hint at.

## Layout

| Path                    | What it holds                                                                 |
| ----------------------- | ----------------------------------------------------------------------------- |
| `spec/app/`             | the bed's code at the tip: sources, tests, fixtures, docs                     |
| `spec/history.mjs`      | the 84 commits and the change each one makes                                  |
| `spec/versions/`        | whole earlier files for the two changes too large for text pairs              |
| `spec/proof.mjs`        | the 7 Efforts and every Proof mutation, by commit                             |
| `spec/filler.mjs`       | the 9 filler Efforts of the 10x graph                                         |
| `spec/banned.mjs`       | words no record or commit may hold, so Proof never names a task               |
| `tasks/<id>/`           | `task.json`; plan tasks also `rubric.json` and `plans/`                       |
| `scripts/gen-bed.mjs`   | builds a bed                                                                  |
| `scripts/check-bed.mjs` | checks built beds against each other and the design                           |
| `scripts/gate.mjs`      | the offline gate                                                              |
| `scripts/run.mjs`       | runs or prepares sessions (`arms.mjs` arm texts, `inject.mjs` brief and dump) |
| `scripts/grade.mjs`     | grades sessions, or one patch                                                 |
| `scripts/judge.mjs`     | blinds and judges plans; the rubric gate                                      |
| `scripts/compare.mjs`   | compares each arm with `none`                                                 |

Hidden tests and the reference and naive patches are in
`<p4>/hidden/<id>/`, never in this repository. `FLATBREAD_PROOF_SERVER`
must stay unset; Proof reads run locally against each clone's own graph.
