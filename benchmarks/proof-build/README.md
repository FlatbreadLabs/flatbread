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

Beds and hidden tests live outside the repository, in `<p4>` (the key
maps hold the answers). Builds are deterministic: a rebuild gives the same
hashes.

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
and 26 `dump10x` sessions, about $65 to $85 and 7.5 hours at 8 jobs:

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
