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

There are 34 tasks: 24 build tasks graded by hidden tests and 10 plan
tasks scored by a blind rubric. Each task belongs to one category:

| Category        | What makes a solution right                                                       | Build | Plan |
| --------------- | --------------------------------------------------------------------------------- | ----- | ---- |
| proof-only      | a rule that only Proof states (the code's patterns turned out to teach it)        | 6     | 3    |
| proof-only-hard | a product decision Proof recorded before the feature existed; nothing hints at it | 6     | 2    |
| code-visible    | a rule Proof states and the code also shows                                       | 5     | 1    |
| stale           | the code, where Proof is out of date                                              | 4     | 2    |
| control         | nothing about Proof; measures the cost of carrying it                             | 3     | 2    |

The proof-only-hard tasks were added for v2 of the bed, after the first full
run showed that the proof-only rules can be copied from the code:

| Id   | Kind  | Request (gist)                                                                         | The rule only Proof holds                                                                                                  |
| ---- | ----- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| B-H1 | build | a `layerrename` plugin event with `{ id, before, after }`                              | layer names reach only plugins with the `export` capability; the others get `{ id }` (a customer's security review)        |
| B-H2 | build | Increase font size and Decrease font size in the palette                               | a step goes to the next size on the type scale (16 to 18, 13 to 14), not 1 px (a deferred customer request)                |
| B-H3 | build | Frame selection: wrap the selection in a new frame that fits it                        | the new frame has no fill and does not clip (a usability finding: the white fill hid layers)                               |
| B-H4 | build | Replace colour: swap one colour for another across the document                        | locked layers and their contents keep their colour; hidden layers change (agreed with two customers)                       |
| B-H5 | build | Select same fill: select the layers with the selected layer's fill colour              | the search stays inside the selected layer's top-level frame (a usability finding: edits on screens nobody saw)            |
| B-H6 | build | Round to pixels: X, Y, W and H of the selection become whole numbers                   | edges are rounded, not sizes, so shapes that touched still touch (a finding on the prototype's seams)                      |
| L-H1 | plan  | review comments pinned to points or layers, with threads, resolving and a plugin event | comments live outside the document file, are never undo steps, outlive their layer; comment text only for `export` plugins |
| L-H2 | plan  | export a frame as SVG for developers                                                   | exporters are plugins on the export capability; no layer names and no hidden layers in the output                          |

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

### v2: the proof-only-hard tasks on Sonnet

Pre-registered in DESIGN.md §8: the eight proof-only-hard tasks on
`claude-sonnet-5-5` in the six primary arms (build 3 runs, plan 2,
`dump10x` once per build task), 138 sessions, about $170 with judging.
L-H1 and L-H2 skip `dump10x` (`skipArms` in their task.json), since the
10x filler has Efforts on comments and on export. Rebuild the beds
first (the proof beds changed in v2; the none bed did not), pilot on B-H1
and B-H4, then:

```sh
node scripts/run.mjs $P4/runs --name h1 --bed $P4/bed --only proof-only-hard \
  --model claude-sonnet-5-5 --jobs 8
node scripts/run.mjs $P4/runs --name h2 --bed $P4/bed --only proof-only-hard \
  --model claude-sonnet-5-5 --jobs 8
node scripts/run.mjs $P4/runs --name h3 --bed $P4/bed --only proof-only-hard \
  --ids B-H1,B-H2,B-H3,B-H4,B-H5,B-H6 --model claude-sonnet-5-5 --jobs 8
node scripts/run.mjs $P4/runs --name h1 --bed $P4/bed --only proof-only-hard \
  --arms dump10x --model claude-sonnet-5-5 --jobs 4
```

then grade, judge and compare `h1,h2,h3` as above.

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

## Results: v2 (2026-10-21)

Two runs on bed v2. Per-session rows and `compare.mjs` output are in
`results/` (`sonnet-hard-*`, `haiku-suspect-*`).

### Proof-only-hard tasks on Sonnet 5.5

6 build tasks × 3 runs and 2 plan tasks × 2 runs in the six primary arms,
`dump10x` once per build task except B-H1, plus a 12-session pilot: 149
sessions on `claude-sonnet-5-5`. No session timed out; one `none` session
was flagged and its pair dropped.

| Arm        | B-H1 | B-H2 | B-H3 | B-H4 | B-H5 | B-H6 | builds all-green | plans (L-H1, L-H2) | context tokens |
| ---------- | ---- | ---- | ---- | ---- | ---- | ---- | ---------------- | ------------------ | -------------- |
| `none`     | 0/3  | 0/3  | 2/3  | 0/3  | 0/3  | 1/3  | **3 of 18**      | 0.25, 0.25         | 20k            |
| `skill`    | 3/3  | 3/3  | 3/3  | 2/3  | 1/3  | 3/3  | 15 of 18         | 0.88, 1.00         | 24k            |
| `find`     | 3/3  | 3/3  | 3/3  | 3/3  | 0/3  | 3/3  | 15 of 18         | 1.00, 1.00         | 26k            |
| `findcode` | 3/3  | 0/3  | 2/3  | 3/3  | 0/3  | 3/3  | 11 of 18         | 1.00, 1.00         | 26k            |
| `brief`    | 1/3  | 2/3  | 1/3  | 2/3  | 2/3  | 3/3  | 11 of 18         | 1.00, 1.00         | 34k            |
| `dump`     | 3/3  | 3/3  | 3/3  | 3/3  | 3/3  | 3/3  | **18 of 18**     | 0.94, 1.00         | 59k            |
| `dump10x`  | -    | 1/1  | 1/1  | 1/1  | 1/1  | 1/1  | 5 of 5           | -                  | 239k           |

- **When the rule lives only in Proof, Proof decides the outcome.** Without it
  Sonnet built the feature and broke the recorded rule (names sent to every
  plugin, 1 px font steps, locked layers recoloured, a page-wide search).
  Every Proof arm beats `none` on the pre-registered primary test after Holm
  correction: `dump` p = 0.0005, `skill` and `find` 0.002, `brief` and
  `findcode` 0.043. Counted per task, `skill` and `dump` win 6 tasks to 0
  (p = 0.031).
- **Pasting every record wins here** (18 of 18), the reverse of the stale
  tasks, where it did worst. Search arms miss when the query does not reach
  the record: `findcode` searched "increase decrease font size palette" and
  never met the type-scale Issue (0 of 3 on B-H2, where `find` got 3 of 3), and
  B-H5's frame rule was found by few arms.
- **Plans:** every Proof arm scores 0.88 to 1.00 against 0.25 for `none`
  (Wilcoxon p = 0.25 with four pairs).

### The suspect warning on Haiku

The stale and code-visible tasks (9 build × 3 runs, 3 plan × 2 runs) in the
six primary arms on bed v2 with the suspect reads: 216 sessions on
`claude-haiku-5-5`, set against v1 (old reads, bed v1). Build all-green of
27:

| Arm        | v1 (old reads) | v2 (suspect reads) | B-S3 v1 → v2 |
| ---------- | -------------- | ------------------ | ------------ |
| `none`     | 24             | 23                 | 3/3 → 3/3    |
| `skill`    | 17             | 17                 | 0/3 → 1/3    |
| `find`     | 16             | 16                 | 0/3 → 1/3    |
| `findcode` | 17             | **20**             | 0/3 → 3/3    |
| `brief`    | 13             | **18**             | 0/3 → 2/3    |
| `dump`     | 12             | 12                 | 0/3 → 0/3    |

- **It works when the agent reads the record.** `findcode` sessions on B-S3
  opened the stale Decision, read the warning, followed the code and passed
  all three runs; `findcode` stale tasks went from 9 to 12 of 12.
- **It does not when the record is peripheral.** On B-V4, where the shortcut
  is a side detail, sessions saw only the summary line of `find` and still
  edited the frozen table (0 of 3).
- **Pasted in full, it is lost.** One warning inside 89k characters of
  records changed nothing for `dump`, and one stale plan got worse (L-S1
  `dump` 0.64 to 0.29).
- Bed v2 carries 18 more records than v1, so brief and dump are slightly
  larger; the none bed is the same.

So Proof's value turns on whether its record is right. Where it holds a rule
the code cannot teach, any way of reading it lifts builds from 3 to 11–18 of
18; where it is out of date, the more of it is pasted in, the worse builds
get. The warning recovers the cost only for agents that open the record.

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
| `hidden/<id>/`          | hidden tests and reference and naive patches; `hidden/_global/` invariants    |
| `scripts/gen-bed.mjs`   | builds a bed                                                                  |
| `scripts/check-bed.mjs` | checks built beds against each other and the design                           |
| `scripts/gate.mjs`      | the offline gate                                                              |
| `scripts/run.mjs`       | runs or prepares sessions (`arms.mjs` arm texts, `inject.mjs` brief and dump) |
| `scripts/grade.mjs`     | grades sessions, or one patch                                                 |
| `scripts/judge.mjs`     | blinds and judges plans; the rubric gate                                      |
| `scripts/compare.mjs`   | compares each arm with `none`                                                 |

Hidden tests and the reference and naive patches are in `hidden/<id>/`
(committed since the first full run) and are copied to `<p4>/hidden/<id>/`
for a run, so no session needs a path into this repository.
`FLATBREAD_PROOF_SERVER` must stay unset; Proof reads run locally against
each clone's own graph.
