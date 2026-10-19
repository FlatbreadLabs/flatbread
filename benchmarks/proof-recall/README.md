# Proof recall benchmark

This benchmark measures how well an agent recalls project decisions from a
Proof graph, and what that recall costs in tokens and tool calls. It answers
the open Proof Issue "Proof has no recall benchmark to test reads against".

The graph describes a fictional game, set out in [WORLD.md](./WORLD.md). It
holds hundreds of records across five Efforts. Decisions change, evidence is
proved wrong, alternatives are rejected and reopened, and noise is retracted.
Each question has a known answer and a stated path through the graph.

## Layout

| Path                       | What it holds                                            |
| -------------------------- | -------------------------------------------------------- |
| `WORLD.md`                 | The shared facts every Effort must agree on              |
| `spec/<effort>.mjs`        | One Effort's history, as an ordered list of mutations    |
| `questions/<effort>.json`  | That Effort's questions and answers                      |
| `questions/cross.json`     | Questions that need two or more Efforts                  |
| `questions/ambiguous.json` | Questions that name no Effort, asked only on request     |
| `scripts/build.mjs`        | Replays every spec through the Proof writer              |
| `scripts/check.mjs`        | Proves each answer against the built graph               |
| `scripts/grade.mjs`        | Scores one run                                           |
| `scripts/run.mjs`          | Runs one headless agent session per question             |
| `scripts/task.mjs`         | The task text each session reads                         |
| `scripts/compare.mjs`      | Compares two runs question by question                   |
| `scripts/find-recall.mjs`  | Checks offline whether `proof find` reaches the evidence |
| `scripts/state-recall.mjs` | Checks offline whether `proof state` shows the answer    |
| `scripts/read-recall.mjs`  | Checks offline what `get` and `records` add for a reader |
| `runs/`                    | Answers and costs from each pilot and full run           |
| `.flatbread-proof/`        | The built graph, committed so runs need no build         |
| `flatbread.config.js`      | Lets `flatbread proof …` read the graph from this folder |

## Build and check

Run these from this folder after `pnpm build` at the repository root:

```bash
node scripts/build.mjs        # rebuild .flatbread-proof/ from spec/
node scripts/check.mjs        # validate every question; exits 1 on error
```

While authoring one Effort, build it alone into a scratch folder:

```bash
node scripts/build.mjs --only render --out /tmp/bench-render
node scripts/check.mjs --only render --graph /tmp/bench-render
```

To read the graph the way a benchmark agent does:

```bash
../../node_modules/.bin/flatbread proof list --status active,paused,completed,abandoned
```

## How a spec works

A spec is an ES module whose default export describes one Effort:

```js
export default {
  key: 'render', // the Effort's key; prefixes every record key
  effort: {
    title: 'Lantern renderer overhaul',
    body: '…',
    created_at: '2025-09-01T09:00:00Z',
  },
  events: [
    {
      at: '2025-09-04T10:00:00Z',
      key: 'dec-vsm', // local key; only create events take one
      type: 'WriteDecision',
      title: 'Use virtual shadow maps',
      body: '…',
      created_by: 'Ines Okafor',
      derives_from: ['iss-shadows', 'fnd-csm-cost'],
    },
    {
      at: '2025-09-05T09:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-vsm',
    },
  ],
};
```

The builder replays events in order through the real Proof writer, so every
rule in [the Proof reference](../../packages/proof/skills/proof/reference.md)
applies. In particular:

- Every event needs `at`. Times must never go backwards.
- Create events (`WriteIssue`, `WriteFinding`, `WriteDecision`,
  `WriteConstraint`, `WriteRisk`, `WriteCitation`, `WriteBlob`,
  `WriteCompaction`) need a unique local `key`. The builder fills in `effort`,
  `id`, and `created_at`.
- Fields that name records take local keys: `derives_from`, `supersedes`,
  `invalidates`, `cites`, `blob`, `supersederId`, `targetId`, `findingId`,
  `issueId`, `resolvedBy`, `decisionId`, `rejects`, `riskId`, `evidence`,
  `recordId`, `effortId`. The key `effort` names the spec's own Effort.
- `SetEffortStatus` needs only `status`.
- The writer's clock is set to `at`, so lifecycle timestamps match the story.
- A spec may be a folder with `index.mjs` if one file grows too long.

The writer enforces Proof's rules. The ones authors trip on most:

1. `AcceptDecision` rejects every other proposed Decision that derives from
   the same `question` Issue. It fails if that question already has an
   accepted Decision. Supersede the old answer first.
2. A reopened Decision can be accepted only after the Decision that rejected
   it stops being accepted, for example by being superseded.
3. `Supersede` and a create's `supersedes` need the same kind, and the target
   must not already be superseded.
4. `Invalidate` needs a Finding as its source and a Finding or Decision as
   its target.
5. `Retract` fails if the target is the last record in another live record's
   `resolved_by`, `mitigated_by`, `evidence`, `rejected_by`, or
   `superseded_by`.
6. `MitigateRisk` needs an accepted Decision. `SetRiskState` with `realized`
   needs at least one Finding in `evidence`.
7. `WriteCompaction` takes at most 10 `derives_from` ids and never names
   another compaction. The writer records `covers` and supersedes the old
   head.

## How a question works

Each question file holds one Effort's questions:

```json
{
  "effort": "render",
  "questions": [
    {
      "id": "render-017",
      "tier": 2,
      "hops": 2,
      "categories": ["supersession", "temporal"],
      "question": "Which shadow technique did Lantern use at the vertical slice?",
      "answer": { "kind": "record", "value": "dec-csm-4" },
      "evidence": ["dec-csm-4", "dec-csm-3", "dec-vsm"],
      "path": [
        ["dec-csm-3", "superseded_by", "dec-csm-4"],
        ["dec-csm-4", "superseded_by", "dec-vsm"]
      ],
      "checks": [
        { "type": "asof", "start": "dec-vsm", "at": "2025-12-15T00:00:00Z" }
      ],
      "traps": ["The current head is VSM, adopted after the slice."]
    }
  ]
}
```

| Field        | Meaning                                                         |
| ------------ | --------------------------------------------------------------- |
| `id`         | Unique: `<effort>-NNN`                                          |
| `tier`       | Difficulty, 0 to 4 (below)                                      |
| `hops`       | Edges walked from the entry record to the answer                |
| `categories` | One or more from the list in `scripts/check.mjs`                |
| `question`   | Plain English; never contains an id or a key                    |
| `answer`     | `kind` and `value`; `text` answers carry a `rubric` instead     |
| `evidence`   | Every record a careful reader must open                         |
| `path`       | The edges walked, as `[from, relation, to]`; tiers 1-3 need one |
| `checks`     | Machine checks that compute or confirm the answer               |
| `traps`      | The wrong answers a careless reader gives, and why              |
| `scoped`     | `true` when wording other than the title pins the Effort down   |
| `from`       | In `ambiguous.json` only: the question it was rewritten from    |
| `rivals`     | In `ambiguous.json` only: near-miss records in other Efforts    |

### Answer kinds

| Kind      | `value`                  | Graded by                       |
| --------- | ------------------------ | ------------------------------- |
| `record`  | one key                  | exact match (id or key)         |
| `records` | a list of keys           | exact set match                 |
| `value`   | a short string or number | exact match, or one of `accept` |
| `boolean` | `true` or `false`        | exact match                     |
| `count`   | a whole number           | exact match                     |
| `text`    | none; uses `rubric`      | share of rubric items found     |

A `rubric` is a list of items. Each item is a phrase or a list of phrases; it
counts when the answer contains any one of them. Keep `text` answers under 15
percent of an Effort's questions.

When the graph does not answer a question, its answer is the `value`
`"unknown"`. Benchmark agents are told to reply `unknown` in that case.

### Tiers and hops

The **entry record** is the record a reader reaches first: one the question
names, or one a single filtered `proof records` listing turns up. `hops`
counts the edges from there to the answer, along the shortest route a reader
can follow. A reader sees only the links stored on the record in hand:
supersession and invalidation links run both ways, but `derives_from`,
`rejected_by`, `resolved_by`, and `cites` run only from the record that
stores them. `check.mjs` warns when a shorter route exists than the stated
path; treat that warning as a mistake to fix.

| Tier | Meaning                                                                                       |
| ---- | --------------------------------------------------------------------------------------------- |
| 0    | One record holds the answer (0 hops)                                                          |
| 1    | One edge away                                                                                 |
| 2    | Two or three edges                                                                            |
| 3    | Four to six edges, or two branches that must be joined                                        |
| 4    | Needs a set or count across the Effort, a timeline, or a lifecycle rule, rather than one path |

The `path` relations are the stored edge names (`derives_from`, `supersedes`,
`superseded_by`, `invalidates`, `invalidated_by`, `resolved_by`,
`rejected_by`, `mitigated_by`, `evidence`, `cites`, `blob`, `effort`) plus
three reverse readings: `supports` (the next record derives from this one),
`cited_by`, and `reopen_history` (a reopened Decision's earlier rejecter).

### Checks

A check without `expect` must compute the answer itself. A `select` scans the question file's Effort; set its `effort` to a list of Effort keys, or to `"*"`, to scan several. A check with
`expect` must return exactly that value. `record`, `records`, and `count`
answers need at least one computing check.

| `type`       | Fields                                                                                                                             | Returns                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `field`      | `record`, `field` (or `standing`)                                                                                                  | that frontmatter value                             |
| `head`       | `start`                                                                                                                            | the newest version's key                           |
| `chain`      | `start`                                                                                                                            | every version's key, oldest first                  |
| `asof`       | `start`, `at`                                                                                                                      | the version current at `at`                        |
| `select`     | `kinds`, `where`, `live`, `retracted`, `derivesFrom`, `restsOn`, `invalidates`, `bodyIncludes`, `titleIncludes`, `count`, `effort` | matching keys, or their count                      |
| `efforts`    | `where`, `count`                                                                                                                   | matching Efforts' keys, or their count             |
| `compaction` | `field`: `head`, `heads`, `stale`, `changes`, `changed`, `staleTargets`                                                            | the Effort's compaction state                      |
| `body`       | `record`, `includes`, `afterExcerpt`                                                                                               | whether the text is present (and past the excerpt) |
| `edge`       | `edge`                                                                                                                             | whether the edge exists                            |

`bodyIncludes` and `titleIncludes` take one phrase or a list, and a record
must contain every phrase. `invalidates` keeps records that invalidate the
named record.

A record's **standing** is its state or status, or `live`, overridden by
`retracted`, `superseded`, or `invalidated`. `select` with `live: true` keeps
open Issues, proposed and accepted Decisions, open and realized Risks, and
Findings and Constraints that nothing has superseded or invalidated.
`restsOn: ["invalidated"]` keeps records with at least one `derives_from`
support of that standing.

## Authoring rules

1. **Answers come from the graph alone.** A reader with only Proof reads must
   be able to reach every answer. Never rely on WORLD.md, the spec, or general
   knowledge.
2. **One right answer.** If two records could fairly answer a question, fix
   the graph or the question.
3. **Questions never leak.** No ids or keys, and no wording that names the
   answer.
4. **Plant edge cases on purpose, then ask about them.** Design questions
   first and build the history that makes them hard, or build the history and
   ask about every turn. Record in `traps` the wrong answer each one invites.
5. **Write like real engineers.** Bodies hold numbers, captures, trade-offs,
   and doubts. Most are 2 to 8 sentences; some are long on purpose.
6. **Keep to WORLD.md.** Names, dates, platforms, and shared facts must agree
   across Efforts.

## Running the benchmark

A benchmark agent must never see `spec/`, `questions/`, or `keymap.json`.

1. Build the workspace (`pnpm build` at the repository root), so the
   `flatbread` binary exists.
2. Before a paid run that tests `proof find`, run the free offline gate:
   `node scripts/find-recall.mjs --graph <x10 build> [--out <json>]`.
   The gate verdict that counts is the one on the 10x graph; with no
   `--graph` the script checks the committed 1x graph and says so. It asks
   the real `proof find` every question three ways: the raw text with
   `--all`; the text with Effort titles, the words that name an Effort right
   before "Effort" (as in "the co-op netcode Effort"), the code names
   Kestrel and Lantern, and the platform names removed, with `--all`; and
   the raw text with `--effort` set to the question's own Effort. Topic
   words that an Effort title also uses, such as "build farm", stay in the
   stripped text by design. The plan's third set, queries taken from pilot
   transcripts, does not exist yet, because no pilot ran `proof find`; the
   scoped set stands in for it.

   For each query the script records whether a top-5 hit, or the version it
   matched, is an evidence or answer record; whether the answer appears on
   the cards; and whether the right Effort ranks first. A value answer
   counts only as a whole token, never as its number without its unit
   ("61" for "61 MB/s"), and one that matches more than 10% of the
   other questions' cards (such as "2" or "accepted", which dates, counts,
   and standings print everywhere) is set aside, since a card shows it by
   chance. The script prints a table and writes per-question rows to
   `--out` (default `runs/find-recall.json`), with `find_hash`, a hash of
   the `find` source. The gate passes when, on the stripped set, the
   evidence is in the top 5 for at least 75% of questions and the answer is
   on a card for at least 60% of those it applies to; if it fails, do not
   pay for sessions. `--split tune` or `--split holdout` asks only half the
   questions, chosen by a hash of each id. Read tune misses to decide what
   to change in `find`; run holdout once the change is done.

   Before a paid run of the `findstate` strategy, run the free gate for
   `proof state` too:
   `node scripts/state-recall.mjs --graph <x10 build> --split holdout [--out <json>]`.
   For each question it reads `proof state` for the question's Effort, or,
   for a cross-Effort question, for every Effort its evidence and answer
   records belong to, joined. It scores the answer in that output two ways.
   The loose rule is the card rule above: every answer id appears anywhere,
   or the value appears as a whole token. The strict rule scores values the
   same way, but a record answer counts only when a reader could pick it
   out: each answer id shares a list entry with an evidence id that is not
   an answer, or some section that lists it lists no other record of the
   same kind, standing, and Issue or Constraint kind. The strict rule
   exists because `state` prints about 90 ids on a large Effort, so an id
   somewhere in it is not yet the answer. Count, boolean, text, and
   "unknown" answers are not scored. A value is set aside when it appears
   in more than 10% of the outputs for questions about other Efforts,
   since `state` takes no query and prints the same text for every
   question about one Effort. The script prints a table by category, with
   both rates, the rates for value and record answers apart, and the mean
   and largest output in characters, measured with the temporary folder's
   path removed so the size does not depend on the machine. It writes
   `state_hash`, a hash of the `state` source (`state.ts` and
   `compaction.ts`). Its bar for the paid Run D:
   on holdout, the strict rule finds the answer for at least 60% of the
   aggregate, lifecycle, blocker, and dead-evidence questions taken
   together, and the mean output is at most 16,000 characters. `--split`
   works as above.

   After a change to `get` or `records`, run the third free check:
   `node scripts/read-recall.mjs --graph <x10 build> --split tune`. It first
   checks three invariants on every Effort and fails if any does not hold:
   each `records --standing <s>` total equals that standing's total in
   `state`'s Counts; the `records --rests-on` total over all four dead
   standings equals `state`'s "N live records rest directly on"; and `get`
   on the head compaction gives the same count and stale verdict as
   `brief`'s `compaction` field. It then scores two groups of questions.
   For `compaction` questions it runs `get` on each evidence record that
   is a compaction: a count answer scores when it is the number on the
   "differ" line, a boolean when it matches the `Stale:` line, and a record
   answer when every id is in the change list. A boolean question with the
   word "stale" wants the verdict, one with "still" ("does that still
   hold?") wants its opposite, and any other boolean question is not
   scored. For
   `dead-evidence` and `invalidation` questions with record or count
   answers it pages through `records --rests-on` with each dead standing
   and with all four, and `records --standing invalidated`: a record answer
   scores when all its ids fall inside one read's set, a count when it
   equals one read's total. It prints how often a count matches a total
   for another Effort by chance. `--split` works as above, and questions
   outside the split are not read. Run files record `read_hash`, a hash of
   `read.ts`, `state.ts`, and `compaction.ts`, the sources of `get`,
   `records`, and `brief`. From this change on, `state_hash` covers
   `state.ts` and `compaction.ts`; older run files hash `state.ts` alone.

3. Run the benchmark:

   ```bash
   node scripts/run.mjs /tmp/recall --name <run> --model haiku --jobs 12
   ```

   `run.mjs` gives every question its own folder and its own fresh,
   headless `claude -p` session, once per strategy. `--strategies` picks
   them from `brief` (start from `proof brief`), `nobrief`, `find`
   (start from `proof find`), and `findstate` (the `find` text plus one line
   that says what `proof state` holds: exact counts, open Issues and
   blockers, Risks, Constraints in force, contested topics, Issues closed
   without a fix, dead evidence, other dated changes, and retractions, with
   long lists cut); the default is `brief,nobrief`. A server started before
   `proof state` existed refuses it, so stop the server and let the run
   start a new one after rebuilding. Each folder
   holds the graph without the key map, the config, a `./flatbread`
   wrapper, `TASK.md`, and, afterwards, the agent's `answer.json` and
   `transcript.jsonl`. Sessions get only the
   Bash, Read, and Write tools, no MCP servers, and no settings files.
   Runs share one read-only copy of each built graph and one
   `flatbread proof serve` process, both under
   `<tmp>/flatbread-proof-recall/`. The server keeps each graph loaded
   and answers every session's reads; on the 10x graph a read drops from
   about 7 seconds to under 1. The first run that finds no server starts
   one and leaves it running for later or parallel runs. Stop it with
   `node scripts/run.mjs --stop-server`, and restart it that way after
   rebuilding the CLI, since it keeps running the code it started with.
   `--no-serve` makes reads run locally.
   Keep the work folder outside the repository. A rerun skips finished
   sessions. When every session ends, `run.mjs` writes
   `runs/<run>-<strategy>.json` for each strategy, taking tokens and tool
   calls from the transcripts. Each run file records the same `find_hash`
   as the gate, so you can check that both used the same search, and the
   same `state_hash` as the `state` gate.

4. Score each run with `node scripts/grade.mjs runs/<run>-brief.json`.
   Its `bySplit` field scores the tune and holdout halves apart, and
   `--split holdout` scores only holdout.
5. Compare two strategies question by question with
   `node scripts/compare.mjs runs/<run>-brief.json runs/<run>-nobrief.json`.
   It reports both scores, the questions only one got right, a sign test
   on those, and read tokens, which leave out each session's fixed first
   turn. `--split holdout` compares only holdout questions. Judge a read
   that was changed after reading tune misses, such as `proof state`, on
   holdout.
6. To pool repeated runs, give each side a comma-separated list of run
   files, in the same order:
   `node scripts/compare.mjs runs/r1-find.json,runs/r2-find.json runs/r1-nobrief.json,runs/r2-nobrief.json`.
   Run i of one side is paired with run i of the other, and each question
   in each pair is one row, named `<id>#<i>` in the lists of one-side wins.
   `signTestP` counts every disagreement across all the runs. That treats
   repeats as independent, which holds only for separate runs of fresh
   sessions, so the script refuses a file listed twice; and it says how
   sure we can be about these questions, not about new ones.
   `questionSignTest` counts each question once, as a win for the side
   with more right answers over the runs, and is the stricter reading. The
   script warns when the run files record different `find_hash` values.

**Question sets kept outside the repository.** A set about a private
graph must never enter Git. Set `PROOF_RECALL_QUESTIONS` to a folder of
question files and `PROOF_RECALL_RUNS` to a folder for run files; every
script then reads questions and writes runs there, and `--graph` points at
the graph, whose `keymap.json` maps `<effort>.<key>` to record ids. With
neither set, nothing changes. Use such a set only as a held-out check:
never read its cards or outputs to choose a change.

**Ambiguous-Effort questions.** `questions/ambiguous.json` holds 24
questions rewritten from tier 0-2 questions so that they name no Effort and
use words several Efforts share, such as "shader cache", "the
retrospective", "refraction", or "Skiff". Each names its source question in
`from`. Each lists in `rivals` at least one record from another Effort that
the wording also fits, and a trap says why that record is wrong. Checks over
every Effort (`effort: "*"`) prove that only one record or value fits.
`check.mjs` also refuses a question that names an Effort or one of its code
names, or uses a platform word that mostly one Effort's records use, such
as "handheld". It cannot prove that every other word in a question is
shared, so a reader who knows the subject may still guess the Effort.

No script asks these questions by default, so every default stays on the
original 246: pass `--only ambiguous` to `run.mjs`, `grade.mjs`,
`compare.mjs`, or `find-recall.mjs`, or `--only default,ambiguous` for both
sets in one run, or name their ids with `--ids`. `check.mjs` always checks
them.

**Adversarial filler.** This build makes 30% of the filler reuse real
subsystem names from the specs, such as Tern, VSM, and saltglass refraction:

```bash
node scripts/build.mjs --scale 10 --filler-overlap 0.3 --out <dir>
```

These records still link to no real record and measure only housekeeping,
such as warning counts. The builder redraws any that would match a
question's check or state one of its answers, so `check.mjs --graph <dir>`
gives the same result as on the plain 10x graph. Filler outside that 30% is
the same as in a plain build. The overlap records are the same on every
build with the same fraction and the same question files. The redraws read
every file in `questions/`, so editing any question can change them. The
build prints a hash of those files; rebuild an adversarial graph after any
question edit before you compare runs on it.

Three rules shaped this protocol, each learned from a pilot below:

- **One session per question.** A session that answers many questions
  loads the graph once and spreads that cost across all of them, which
  hides both the cost and the difficulty.
- **One graph command per tool call.** A shell loop that dumps every
  Effort turns a recall test into a reading test.
- **Cost from the harness, never from the agent.** In pilot 1, agents'
  own tallies were 2.4 and 4.5 times the harness counts.

`scripts/prepare-run.mjs` and `scripts/collect.mjs` remain for runs
driven by hand.

## Pilot results

The first pilot (`runs/pilot-1-*.json`) drew a stratified sample of 46
questions: 8 at each of tiers 0 to 3 and 14 at tier 4, from every Effort. Two
fresh agents answered all 46 in one session each, from clean run folders.
Audits of their tool calls found no access to answers.

| Strategy      | Correct  | Tool calls | Tokens  | Time    |
| ------------- | -------- | ---------- | ------- | ------- |
| `brief` first | 46 of 46 | 46         | 203,004 | 7.3 min |
| no `brief`    | 45 of 46 | 27         | 239,556 | 5.2 min |

What it showed:

1. **One session per batch puts the benchmark at its ceiling.** Both agents
   read most of the graph early, then answered from it. Tiers stopped
   mattering. The protocol above now asks for one session per question.
2. **The one miss was an exact count.** The no-`brief` agent counted 6 records
   changed since the world compaction; there are 7. The `brief` envelope
   reports that count directly.
3. **The grader was too strict.** Four answers carried the right value plus
   detail ("46 player-proximity reads"). `grade.mjs` now accepts those.
4. **One run per strategy proves nothing about strategies.** The token gap is
   a single pair of runs.

### Pilot 2: one session per question

The second pilot (`runs/pilot-2-*.json`) asked the same 46 questions, one
fresh Sonnet session per question and per strategy: 92 sessions. Costs come
from each session's transcript (`scripts/collect.mjs`). Every session ran on
Sonnet and wrote its answer.

Five questions did not name their Effort, so agents could not tell which
Effort they meant, and both strategies missed all five. They now name it, and
`check.mjs` warns when an Effort-wide check would also find answers in
another Effort. Results on the other 41:

| Strategy      | Correct  | Read tokens, mean | Read tokens, median | Tool calls, mean |
| ------------- | -------- | ----------------- | ------------------- | ---------------- |
| `brief` first | 38 of 41 | 15,365            | 14,786              | 12.3             |
| no `brief`    | 39 of 41 | 18,624            | 18,014              | 12.1             |

Read tokens leave out the roughly 19,300 tokens each session spent before
its first read.

What it showed:

1. **One session per question moves the benchmark off its ceiling, but not
   far.** Accuracy fell from 98 to 100 percent in pilot 1 to 93 to 95
   percent. Tier 4 questions used about two-thirds more context tokens than
   the rest. Both strategies missed the same two questions, `cross-017` and
   `render-040`. Pilot 3 showed that both were flawed questions, not fair
   traps (see below). Without them, `brief` scored 38 of 39 and no `brief`
   39 of 39.
2. **`brief` did not change accuracy.** Its one extra miss gave the right
   record's id where the question asked for the title.
3. **`brief` cut read tokens by 17.5 percent on average, but not reliably.**
   The median question saved about 1,000 tokens, and `brief` was cheaper on
   only 22 of 41.

### Pilot 3: Haiku

The third pilot (`runs/pilot-3-*.json`) repeated pilot 2 on Haiku: the same
46 questions, one fresh session per question and per strategy. Every session
ran on Haiku and wrote its answer.

Two questions were flawed, and are left out of the results below:

- `render-040` did not name its Effort. Across all Efforts, the ports
  compaction of 2026-03-10 really was newer than "Lantern at alpha" on beta
  day, so that answer was a fair reading. `check.mjs` missed it because its
  scope warning only tests Effort-wide checks, and this question's check
  starts from one record.
- `cross-017` asked whether a quoted title was the Decision another Effort
  names. Browse reads hide the retracted record with that exact title, so a
  reader can fairly take the quote as a paraphrase of the live title. All
  four runs across pilots 2 and 3 answered `true`.

Both questions now say what they mean. One graph fact was wrong too: the
Skiff beta retrospective put the 6-week cost on a span the record dates make
about 18 weeks. It now says the beta slipped 6 weeks, and the answer is
unchanged.

| Strategy      | Correct  | Read tokens, mean | Read tokens, median | Tool calls, mean |
| ------------- | -------- | ----------------- | ------------------- | ---------------- |
| `brief` first | 44 of 44 | 31,918            | 29,250              | 15.0             |
| no `brief`    | 41 of 44 | 43,391            | 30,548              | 15.0             |

Read tokens here leave out each session's own first turn, which varied more
on Haiku (median 12,200, mean 19,800) than the fixed 19,300 used for pilot 2.

What it showed:

1. **`brief` helped where the model was weaker.** The three questions that
   only the no-`brief` arm missed were:

   - `world-069`, which asks how many records changed since the head
     compaction. The agent counted 6; there are 7. It said itself that a
     record changed in place leaves no dated trace in browse reads. The
     `brief` envelope reports this count directly, and pilot 1 missed the
     same question the same way.
   - `tools-015` and `world-053`, where the agent gave up and answered
     "unknown". On `world-053` it did so after 37 tool calls.

   That is 3 to 0 on the paired questions, still too few to rule out chance
   (a two-sided sign test gives p = 0.25).

2. **`brief` cut read tokens by 26 percent on average.** The median question
   saved about 4,000 tokens, and `brief` was cheaper on 25 of 44. The mean
   gap is larger than the median because the no-`brief` arm had a few very
   long sessions, which is the cost `brief` is meant to remove.
3. **Haiku agents called tools they had no reason to call.** Most were
   `send_message` calls to sessions that do not exist. One created an empty
   cloud session and one scheduled a reminder, then deleted it. Midway
   through the run, task files began to say "Use only the Bash, Read, and
   Write tools". That cut the share of sessions making such calls from 24 of
   38 to 25 of 54, but did not stop them. Future runs should start agents
   without session-control tools at all.

All three steps this pilot called for are done: the scope warning covers
single-record checks, `run.mjs` starts agents without session-control
tools, and the full run below asks every question.

### Full run: every question on Haiku

The full run (`runs/full-haiku-*.json`) asked all 246 questions, one fresh
headless session per question and per strategy, through `run.mjs`: 492
sessions, all on Haiku, all of which wrote an answer. No session could call
anything but Bash, Read, and Write.

| Strategy      | Correct      | Read tokens, mean | Read tokens, median | Tool calls, mean |
| ------------- | ------------ | ----------------- | ------------------- | ---------------- |
| `brief` first | 221.4 of 246 | 25,949            | 20,848              | 13.0             |
| no `brief`    | 226.3 of 246 | 33,703            | 29,233              | 13.0             |

Fractions come from the rubric scores of text answers. Read tokens leave
out each session's first turn, about 1,200 tokens here: a headless session
carries a much smaller system prompt than the subagents of pilots 2 and 3.
That also changes how hard agents try, so accuracy here should not be
compared with the earlier pilots; compare the two strategies within a run.

What it showed:

1. **`brief` does not raise accuracy.** Twelve questions were right only
   without `brief` and six only with it (two-sided sign test p = 0.24). Nine
   of the twelve were "unknown" answers, where the `brief` agent gave up on
   a fact the other agent found. Pilot 3's 3-to-0 edge for `brief` came
   from which 46 questions it drew. On the 44 sound questions both runs
   asked, each strategy changed its result on only 1 or 2, so the reversal
   comes from the 200 questions pilot 3 left out, not from run-to-run
   noise.
2. **`brief` cuts reading, reliably.** Read tokens fell by 23 percent on
   average and 5,300 on the median question, and `brief` was cheaper on 157
   of 246. The gain is largest where `brief` was built to help: on the 20
   compaction questions it read 13,100 tokens against 44,000 and answered
   all 20, against 19.
3. **Eight questions ask what no read command can show.** They ask about
   retracted records: how many there are, or what one said. Browse reads
   hide retracted records, and `get` needs an id the agent has no way to
   learn. Every run in every pilot answered "unknown" to all eight
   (`cross-003`, `cross-017`, `ports-032`, `render-011`, `render-074`,
   `world-010`, `world-074`, `world-075`). They do not separate the
   strategies, but they hold the retraction category at 38 percent. Proof
   now lists them on request (see below).
4. **The runner ran every `brief` session first.** It now alternates
   strategies question by question, so a change in API speed over a run
   falls on both alike.

### Retracted records become readable

`proof records <effortId> --retracted only` now lists an Effort's retracted
records, and `--retracted include` lists them beside live ones. Every digest
marks each one: its index line ends in `(retracted)`, and a **RETRACTED**
banner with the date and reason sits under its heading. The task text tells
agents about the flag.

A rerun of the eight retraction questions (`runs/retracted-haiku-*.json`)
scored 7 of 8 in each strategy, up from 0 of 8. Each strategy missed a
different question: `brief` answered "unknown" to `cross-017`, and no
`brief` did the same on `world-010`.

### A graph ten times larger

If the original graph were small enough to read whole, `brief` could only
save reading. A graph too large to read should let it help agents answer.
The 10x run (`runs/x10-haiku-*.json`) tested that.

`node scripts/build.mjs --scale 10 --out <dir>` grew the graph from 498
records to 4,980. The filler is routine measurements, captures, and small
question-to-decision threads about subsystems no question names. It never
links to a real record, and the head compaction of each Effort covers it.
`check.mjs --graph <dir>` showed every answer unchanged but one:
`world-077` counts question Issues, and filler adds 242. The run asked all
246 questions on Haiku, once per strategy, through one read server.

On the 237 questions comparable with the full run (all but `world-077` and
the eight retraction questions, whose task text changed between runs):

| Graph | Strategy      | Correct | Read tokens, mean | Tool calls, mean | "unknown" |
| ----- | ------------- | ------- | ----------------- | ---------------- | --------- |
| 1x    | `brief` first | 220.4   | 25,699            | 13               | 27        |
| 1x    | no `brief`    | 225.3   | 33,728            | 13               | 22        |
| 10x   | `brief` first | 197.4   | 26,050            | 17               | 49        |
| 10x   | no `brief`    | 198.7   | 36,238            | 21               | 43        |

What it showed:

1. **A larger graph costs both strategies about ten points.** Accuracy fell
   from 93 to 83 percent with `brief` and from 95 to 84 percent without. Most
   new misses were give-ups: "unknown" answers nearly doubled. Agents named a
   filler record once in 474 sessions, so noise hid answers rather than
   misled agents.
2. **`brief` still does not raise accuracy.** Its deficit shrank from 4.8
   questions to 1.3, but per question it held up better on 26 and worse on
   22 (sign test p = 0.67). On render, the largest Effort, `brief` fell from
   75 to 69 against 77 to 66; on ports it fell further. The first theory,
   that the graph was small enough to read whole, does not explain the
   missing gain.
3. **Agents read about the same amount whatever the graph's size.** Read
   tokens barely moved (26,000 and 36,000); tool calls rose from 13 to 17
   and 21. With roughly fixed reading, more noise means more misses. The
   limit is finding a record by what it says, which neither a summary nor
   paging through records does well.
4. **`brief` keeps its saving.** It read 28 percent less than no `brief`,
   used 17 tool calls against 21, and was cheaper on 166 of 237.
5. **Reads were slow at this size.** Each read built the whole graph: 6 to
   9 seconds. `flatbread proof serve` now keeps it loaded, and a later read
   takes 0.2 to 0.4 seconds. The first 29 sessions ran before the server
   existed; that changes speed, not what an agent sees. A rebuild during the
   run broke 22 sessions' reads; their answers were discarded and rerun.

Next steps, in order:

1. Test a read that finds records by their text, such as
   `proof search <effortId> <words>`, against both strategies on the 10x
   graph. Give-ups, not wrong answers, are what grew.
2. Look at the questions `brief` agents gave up on, to see whether the
   summary steers agents away from records they should read.

### The first offline gate for `proof find`

`proof find` now exists, and `scripts/find-recall.mjs` checks it for free
before any paid run. On the 10x graph, with Effort titles and platform
names removed from each question:

| Check                                   | Result           | Bar |
| --------------------------------------- | ---------------- | --- |
| An evidence record is in the top 5 hits | 81% (200 of 246) | 75% |
| The answer itself appears on a card     | 56% (102 of 182) | 60% |
| The right Effort is ranked first        | 81%              |     |

The gate fails on the second check, so no paid run tested `find` yet. The
1x graph gives the same numbers within a point, which fits the worry that
filler is easy to tell apart from real records.

Where cards miss the answer:

- **Blob payloads (22%).** `find` reaches the record every time (100%),
  but the value sits in the attached payload, which the card does not quote.
- **Aggregates (24%) and lifecycle (46%).** These ask for counts or states
  across many records, which a search cannot give.
- **Retraction (40%).** `find` leaves retracted records out by default.

Next steps, in order:

1. Quote the matching passage of a linked Blob payload on the card, and
   rerun the gate.
2. Decide whether counting and lifecycle questions need their own read,
   such as the `proof state` view the design review proposed, instead of
   search.

#### Cards that quote more

`find-recall.mjs --split tune|holdout|all` now keeps half the questions
back. A question is in `tune` when the first byte of the SHA-256 of its id
is even, and in `holdout` when it is odd: 130 and 116 questions. Only tune
misses were read to decide what to change in this step; holdout was scored
once the code was done. Holdout is unseen only question by question, though:
the plan to quote Blob payloads came from the diagnosis of all 246
questions in the step before, made before the split existed.

On the 10x graph, 43 tune questions missed the answer on the cards. Why:

| Where the answer was                                        | Misses |
| ----------------------------------------------------------- | ------ |
| Not a hit, and not one link from a hit                      | 20     |
| In a hit's body, outside the passage or cut off at its edge | 3      |
| In a Blob that is a hit, outside its passage                | 3      |
| In a Blob attached to a hit, which the card did not quote   | 2      |
| A record linked from a hit, cut by the per-line link cap    | 3      |
| A chain version the card left out as `(n more)`             | 3      |
| A retracted record, which `find` leaves out by default      | 3      |
| In a linked record's text or author                         | 2      |
| Not written anywhere; it must be worked out                 | 2      |
| A hit's author, which cards do not show                     | 1      |
| On the card, but as a bare number the gate does not count   | 1      |

The 1x graph gave 42 misses with the same causes. The cards changed in
four ways:

1. The best passage is the window whose query words weigh most, rare words
   more, and words the title already shows count only to break ties. It
   comes first on the card.
2. The matches sit in the middle of the window, and the passage runs on to
   finish a short word right after the last match, so a value after its
   label stays.
3. A second passage appears when another part of the body holds a query
   word the first lacks, and a card quotes the best passage of a Blob that
   the hit carries or cites through a Citation. Only a current, unretracted
   Citation and Blob count, and a Blob quoted on one card is not quoted
   again on a later one. Passages add their length to the size aim, so they
   never push out a chain or a link.
4. Reverse links list `resolves`, `rejects`, and the like before
   `derived_by`, which on a much-used record fills the line.

Showing each card's author was tried and dropped: it pushed chains off the
cards and put a name on every card, so name answers matched by chance.

The chance rates now come from every question's cards, even with
`--split`, so each split's figures below are its part of the `all` run.
The tables also print the largest reply next to the mean.

Holdout is the clean measure. Stripped set, answer on a card, before and
after (`find_hash`
`e5be653299abe9b2329822d98ffe09e90ee7cfe96f8711c813a51dc6500b887f`):

| Graph | Split   | Evidence in top 5 | Answer before | Answer after  | Mean reply chars | Largest reply  |
| ----- | ------- | ----------------- | ------------- | ------------- | ---------------- | -------------- |
| 10x   | holdout | 85% (98/116)      | 58% (51/88)   | 66% (58/88)   | 6,084 to 6,365   | 6,509 to 7,112 |
| 10x   | tune    | 79% (102/130)     | 54% (51/94)   | 59% (53/90)   | 6,080 to 6,369   | 6,700 to 7,360 |
| 10x   | all     | 81% (200/246)     | 56% (102/182) | 62% (111/178) | 6,082 to 6,368   | 6,700 to 7,360 |
| 1x    | holdout | 84% (97/116)      | 57% (50/88)   | 65% (57/88)   | 6,093 to 6,411   | 6,502 to 7,056 |
| 1x    | tune    | 79% (102/130)     | 55% (52/94)   | 59% (54/91)   | 6,085 to 6,403   | 6,698 to 7,358 |
| 1x    | all     | 81% (199/246)     | 56% (102/182) | 62% (111/179) | 6,089 to 6,407   | 6,698 to 7,358 |

Search ranking did not change, so evidence in the top 5 is the same before
and after. On the 10x holdout, which the code was not tuned on, the answer
is on a card for 7 more questions and for none fewer: 66% against the 60%
bar. On the 1x holdout it is also 7 more and none fewer. The gate on all
246 questions of the 10x graph passes by two points, but that figure
includes the 130 tune questions, which four rounds of changes were measured
against (55%, 56%, 57%, then 59% on the 10x tune split).

The tune gain is small partly because longer cards match more answers by
chance. On the 10x graph, 3 tune answers that were on a card are now set
aside as chance matches (ports-001, render-003, world-065), and on the 1x
graph 2 are. One tune miss, world-052, also left the count the same way,
which nudges the rate up. To check that the set-aside list did not make
the gain, one list, the union of both runs' set-asides, was applied to
before and after: on the 10x graph the answer is on a card for 99/178 (55.6%) before
and 111/178 (62.4%) after; holdout 51/88 to 58/88; tune 48/90 to 53/90. On
the 1x graph, all goes from 100/179 (55.9%) to 111/179 (62.0%). One 1x tune
answer, ports-026, was lost when two equally good passages of a Blob
swapped places. Most misses left are records no hit reaches, mainly
counting and lifecycle questions, which a `proof state` read should answer
instead.

The largest reply grew by about 700 characters, to 7,360. That is close
to 7,500 characters, the most this step allowed for the mean reply. A later
change that adds passage lines should watch the largest reply, not only the
mean.

#### Questions that name no Effort, and filler that looks real

The 24 ambiguous-Effort questions were frozen before `find` was run on
them. With the cards above (same `find_hash`), the stripped set on the 10x
graph gives:

| Graph                       | Questions | Evidence in top 5 | Answer on a card | Right Effort first | Mean reply chars |
| --------------------------- | --------- | ----------------- | ---------------- | ------------------ | ---------------- |
| 10x                         | 24        | 96%               | 87%              | 88%                | 6,448            |
| 10x, `--filler-overlap 0.3` | 24        | 96%               | 87%              | 92%                | 6,433            |
| 10x, `--filler-overlap 0.3` | 246       | 80%               | 62% (gate PASS)  | 80%                | 6,326            |
| 10x (from the table above)  | 246       | 81%               | 62%              | 81%                | 6,368            |

Two things follow. First, search finds the right record even when the
question names no Effort. These questions were rewritten from tier 0-2
lookups, though, so they are easier than the full set, and they test
`find` more than they test an agent. Second, filler that reuses real
subsystem names cost the gate one point of evidence and no answers, so the
10x result is not only a sign that filler is easy to tell apart. The paid
runs (Runs A to C in the plan) still have to show that agents gain from it.

### `proof find` against no-brief on the 10x graph

The plan's Run A and Run B, on Haiku, twice: `run.mjs --strategies find,nobrief --only default,ambiguous --graph <x10 build>`, 540 sessions per
run. The `find` arm's task text starts with `proof find`, then `get` for a
hit's full text, and `records` only to count. Both runs used the cards above
(`find_hash` `e5be6532…`). Run files: `runs/x10-find-r1-*.json` and
`runs/x10-find-r2-*.json`.

On the 245 original questions (all but `world-077`, whose count includes
filler), pooled over both runs:

| Measure                                    | `find` | no-brief |
| ------------------------------------------ | ------ | -------- |
| Correct, run 1                             | 231.1  | 210.9    |
| Correct, run 2                             | 229.1  | 210.7    |
| Runs of a question only this arm got right | 48     | 12       |
| Mean read tokens                           | 13,019 | 33,839   |
| Median read tokens                         | 8,888  | 29,680   |
| Mean tool calls                            | 9      | 21       |

The sign test over the pooled disagreements gives p < 0.0001. Counting each
question once, `find` did better on 37 and worse on 10 (p = 0.0001). It read
fewer tokens than no-brief in 447 of 490 sessions.

Against the plan's pass marks, on its 232 comparable questions (the 245
less the 13 retraction questions):

| Mark                                       | Result                                             | Pass |
| ------------------------------------------ | -------------------------------------------------- | ---- |
| (a) Pooled sign test p < 0.05              | 46 wins, 9 losses, p = 4e-7                        | yes  |
| (b) Read tokens at most 0.65 of no-brief's | 13,260 against 34,313: 0.39                        | yes  |
| (c) "Unknown" falls by at least 10 per run | 32 to 14 and 35 to 12                              | yes  |
| No category loses more than 2 questions    | No category loses any; `negative` 30 of 32 in both | yes  |

Seven sessions hit the 10-minute limit, six of them in the no-brief arm.
Setting those questions aside leaves the result in place: 45 wins, 9
losses. The gain also holds on the questions the cards were not tuned on:
26 wins and 6 losses on the holdout half (p = 0.0005), against 23 and 6 on
the tune half. The largest gains are in `lookup` (+13.8 over two runs) and
`truncation` (+13), where the fact sits past the 600-character cut that
`records` applies; the smallest are in `temporal`, `negative`, `rationale`,
and `dead-evidence` (0 to +1).

**The ambiguous-Effort set (Run B).** On the 24 questions that name no
Effort, pooled: `find` 46 of 48, no-brief 31 of 48. `find` did better on 10
questions and worse on none (p = 0.002), and read 9,914 tokens to
no-brief's 42,017.

What this does not show:

- The `brief` arm was not run, so this says nothing new about compaction.
- Haiku only, and on a fictional graph whose filler is easier to tell apart
  than real records. Run C, on the `--filler-overlap 0.3` graph, tests that.
- The ambiguous questions come from tiers 0 to 2. They show that search
  finds the right Effort, not that agents handle a hard question without a
  named Effort.

### Look-alike filler, and Sonnet

Two more single runs of `find` against no-brief, with the same task texts
and `find_hash` as above, on 270 questions each (the 246 and the 24
ambiguous-Effort ones). Figures are for the 245 comparable questions.

**Run C: Haiku on the look-alike graph** (`--scale 10 --filler-overlap 0.3`,
where 30% of filler records reuse real subsystem names). Run files:
`runs/x10adv-find-r1-*.json`.

| Measure                           | `find` | no-brief |
| --------------------------------- | ------ | -------- |
| Correct                           | 233.7  | 214.7    |
| Questions only this arm got right | 19     | 1        |
| Mean read tokens                  | 13,835 | 36,891   |
| Mean tool calls                   | 9      | 22       |
| "Unknown" answers                 | 18     | 33       |

The gap is 19 questions (p < 0.0001), the same as on the plain graph
(about 19 per run), and `find` read 0.38 of no-brief's tokens. The plan's
pass mark for Run C was half the Run A gain and at most 0.75 of the
tokens, so it passes easily: filler that looks real did not hurt search.
On the ambiguous set `find` got 22 of 24 and no-brief 15 (7 to 0,
p = 0.016).

**Sonnet on the plain 10x graph.** Run files: `runs/x10-sonnet-r1-*.json`.

| Measure                           | `find` | no-brief |
| --------------------------------- | ------ | -------- |
| Correct                           | 233.4  | 226.7    |
| Questions only this arm got right | 11     | 5        |
| Mean read tokens                  | 9,280  | 16,674   |
| Mean tool calls                   | 7      | 18       |
| "Unknown" answers                 | 16     | 27       |

Sonnet without `find` does far better than Haiku without it (226.7
against about 211), so the accuracy gap shrinks to 6.8 questions and is
not significant in one run (p = 0.21). `find` still read 44% fewer tokens
and made fewer than half the calls. On the ambiguous set, where the
question names no Effort, the gap stays large: `find` 24 of 24, no-brief
17 (7 to 0, p = 0.016).

So a stronger model gains less accuracy from search and keeps most of the
saving; a weaker one gains both. Timeouts (10 minutes) hit 3 Haiku and 5
Sonnet sessions, all but one in the no-brief arm.

### The offline gate for `proof state`

`proof state <effortId>` is one read, built from frontmatter and links,
that shows what search cannot: exact counts by kind and standing, open
blockers with the Decisions they gate, Risks and their mitigation,
Constraints in force, contested topics with each rejected or replaced
alternative, Issues closed without a fix, live records that rest on dead
ones, dated lifecycles, and retractions. Settled records, such as the
filler's question Issues and their one accepted Decision, show only in the
counts. `scripts/state-recall.mjs` scores it as the find gate scores cards,
and adds the strict rule described under "Running the benchmark".

Only tune misses were read. On the 10x graph, 12 tune questions in the
four bar categories missed the answer. Why:

| Where the answer was                                           | Misses |
| -------------------------------------------------------------- | ------ |
| A value in a record body, or worked out from two body values   | 5      |
| A value in a Blob payload                                      | 4      |
| A record's author                                              | 1      |
| A record three or more links from any record `state` lists     | 1      |
| A list of the Constraints in force, which `state` only counted | 1      |

`state` reads no bodies by design, so 10 of the 12 are `find`'s to answer.
One change came from this list: a `Constraints in force` section, made for
the tune question that asks which hard Constraints are in force. Two came
from reading the output for size, before the gate: a live record that
overturned a support (by replacing, disproving, or rejecting it) no longer
counts as resting on it, and dead evidence is grouped by the dead record,
so the record that overturned it is named once. On a large Effort the
lists shrink to fit 15,000 characters of Markdown, cutting lifecycle and
retractions first and counts never.

Tune questions shaped `state` in two more ways. The Constraints section
answers that tune question outright. The head-compaction line first used
the exact words of a tune count question about records that joined or
left the live set; it now says "differ from the live set it covers" in
the code's own terms, but it still prints that count. A paid Run D asks
every question, tune ones included, so judge it with
`grade.mjs --split holdout` and `compare.mjs --split holdout`.

How the strict rule came about. A review found that the loose rule's
holdout pass rested on record ids appearing anywhere: of 19 holdout hits,
18 were record answers. The strict rule was first written as "shares an
entry with a non-answer evidence id" alone. On holdout that gave 52% of
27 scored. On tune it rejected three answers that `state` plainly gives,
such as the `hard 4:` line that lists exactly the hard Constraints a
question asks for, because those questions' other evidence ids are
distractors, not the record the question is about. The "set apart" test
was added after reading those tune cases, and holdout was then scored
once more. The four tune answers it still rejects are real misses: in
each, the id shows only in a role the question does not ask about.

Answer in the output, 10x graph (`state_hash`
`b73c82ecb0649c1db200b189b827c76250569b75327ba5847d9939352dcf1679`).
Count, boolean, text, and "unknown" answers are not scored; 18 of the 98
bar-category questions are counts.

| Group                                 | Tune        | Holdout     | All          |
| ------------------------------------- | ----------- | ----------- | ------------ |
| Bar categories, strict rule           | 53% (18/34) | 55% (17/31) | 54% (35/65)  |
| Bar categories, loose rule            | 65% (22/34) | 61% (19/31) | 63% (41/65)  |
| Bar categories, record answers strict | 74% (17/23) | 67% (16/24) | 70% (33/47)  |
| Bar categories, record answers loose  | 91% (21/23) | 75% (18/24) | 83% (39/47)  |
| Bar categories, value answers         | 9% (1/11)   | 14% (1/7)   | 11% (2/18)   |
| aggregate, strict                     | 88% (7/8)   | 67% (6/9)   | 76% (13/17)  |
| lifecycle, strict                     | 50% (9/18)  | 56% (10/18) | 53% (19/36)  |
| blocker, strict                       | 38% (3/8)   | 44% (4/9)   | 41% (7/17)   |
| dead-evidence, strict                 | 75% (6/8)   | 80% (4/5)   | 77% (10/13)  |
| Every question, strict                | 49% (47/95) | 44% (38/86) | 47% (85/181) |
| Mean output, characters               | 15,171      | 14,981      | 15,081       |
| Largest output                        | 28,058      | 58,681      | 58,681       |

**The holdout does not clear the Run D bar.** The strict rule finds the
answer for 55% against the 60% bar; the mean output, 14,981 characters,
is within its 16,000. The loose rule's 61% is one question above the bar,
and two of its 19 holdout hits fail the strict rule. One Effort's output runs from 6,876
characters (tools) to 16,127 (world), so a single read of the world
Effort is above 16,000; the bar is on the mean. The largest outputs are
cross-Effort questions, which join two to five Efforts.

The value hits in the bar categories are Effort status answers. The
chance check sets aside standing words that `state` prints in the right
place and short numbers, so for values it errs toward missing hits, not
toward finding them.

On the bar-category questions both gates score, the stripped `find` cards
hold the answer for 15 of 31 holdout questions, `state` for 17 by the
strict rule (19 by the loose one), and one of the two for 24 (25 loose).
The find gate, rerun with the same `find_hash` (`e5be6532…`), still gives
81% evidence in the top 5 and 62% answers on a card on the stripped set.

The paid Run D compares `findstate` against `find` on these questions.
It was run anyway, because `find` and `state` together cover more than
either alone; see below.

### `find` plus `state` against `find` (Run D)

Haiku on the 10x graph, twice, on the 97 questions in the aggregate,
dead-evidence, lifecycle and blocker categories (all but `world-077`):
`run.mjs --strategies findstate,find --ids <those 97>`. The `findstate`
arm adds one line to the `find` task text: use `proof state <effortId>` for
counts, open and closed sets, status history, blockers and dead evidence.
Run files: `runs/x10-rund-r{1,2}-*.json`.

Pooled over both runs (194 question-runs per arm):

| Measure                              | `findstate` | `find` |
| ------------------------------------ | ----------- | ------ |
| Correct                              | 181         | 171    |
| Runs of a question only this arm got | 15          | 5      |
| Mean read tokens                     | 15,578      | 18,907 |
| Mean tool calls                      | 9           | 12     |

The pooled sign test gives p = 0.041; counting each question once, 9 to 4
(p = 0.27). The plan kept `state` only if it gained at least 4 questions
per run on this subset with no rise in tokens. It gained 5 per run and read
18% fewer tokens, so it passes.

`state` was shaped on the tune questions, so the holdout half is the clean
measure: there `findstate` got 83 and `find` 79 of 88 (5 to 1, p = 0.22),
against 98 and 92 of 106 on tune (10 to 4). The direction holds on
holdout, but two runs on 44 questions cannot show it alone. Two sessions
timed out, both in the `find` arm.

### Two private project graphs, as a held-out check

Two real Proof graphs from private projects (200 records across 11 Efforts,
and 134 across 6) tested whether the gains above hold on memory nobody tuned
against. An author who never saw `find` or `state` output wrote 39 and 41
machine-checked questions about them. The questions, answers, graph copies
and run files live outside this repository (see "Question sets kept outside
the repository"); only these totals are published. Before any paid run,
only category totals of the offline gates were read, never a card.

Haiku, two runs per graph, three arms each, pooled:

| Graph | `find`     | no-brief | `findstate` | Read tokens, `find` / no-brief |
| ----- | ---------- | -------- | ----------- | ------------------------------ |
| A     | 71.7 of 78 | 66.3     | 71.3        | 12,488 / 27,975                |
| B     | 75 of 82   | 71       | 74          | 12,230 / 24,389                |

- `find` against no-brief: 7 to 1 on A and 6 to 2 on B; 13 to 3 over both
  (sign test p = 0.021). `find` read about half the tokens on both.
- `findstate` against `find`: 1 to 2 on A and 3 to 4 on B, with the same
  tokens. On these small graphs `state` neither helps nor costs.

So the search gain carries over to real memory at about half the reading.
The gain from `state` on the 10x graph's counts and blockers does not show
on graphs a twenty-fifth
that size or less, where paging `records` is cheap.

### `get` on a compaction, and `records` by standing

The tune failures of Runs A, C, D and the Sonnet run fell mostly into two
groups. In 16 failed runs the agent could not tell whether a compaction
(the Finding that sums up an Effort) was stale or how many records had
changed since it was written: only `brief` printed that, and the `find`
arms never call `brief`. In 8 more the agent asked for
`records --state invalidated`, which no record stores, and got an empty,
complete page. Two reads changed; the task texts and `find` did not, so
`find_hash` is unchanged.

- `proof get` on a compaction adds `## Compaction`: whether it is its
  Effort's head or what superseded it, `Stale: yes|no` with the records
  that moved and the rule ("A compaction is stale when a record it derives
  from changed standing after it was written, or when a Finding
  invalidated it."), and the exact number of records that differ from the
  live set it covers. `## Changes since compaction` lists them, up to 25;
  past that, `- … N more; the count above is exact` ends the list, and on
  the head it points to `brief`, which lists up to 50.
  `brief`, `get`, and `state` all take these from one function,
  `compactionReport`. `get` on any other record prints what it printed
  before.
- `proof state` moves the compaction line out of Dead evidence into its own
  section, `Head compaction`, with the same verdict and count and up to 10
  changed records. A large Effort cuts that list to 5 along with lifecycle
  and retractions, and to none along with the replaced-support lists; the
  count stays.
- `proof records` takes `--standing <s>` (the standing cards print, links
  included, so `invalidated` and `retracted` work) and `--rests-on <dead standings>` (live records that derive from, cite, or give as evidence a
  record in that standing, by the rule `state` uses for Dead evidence). A
  `--state` or `--status` value that no record stores is refused with an
  error that names both new flags.

`scripts/read-recall.mjs` checks these reads offline. On every Effort of
the 10x graph, all 85 invariants hold: each `--standing` total matches
`state`'s Counts, the `--rests-on` total matches Dead evidence, and `get`
on the head compaction matches `brief`.

Free gates on the 10x graph, before and after. `find` output is the same
on every question (`find_hash` `e5be6532…`):

| `find-recall.mjs`, stripped set | Tune, before | Tune, after | Holdout, before | Holdout, after |
| ------------------------------- | ------------ | ----------- | --------------- | -------------- |
| Evidence in the top 5           | 79%          | 79%         | 85%             | 85%            |
| Answer on a card                | 59%          | 59%         | 66%             | 66%            |
| Mean reply, characters          | 6,369        | 6,369       | 6,365           | 6,365          |

| `state-recall.mjs`      | Tune, before | Tune, after | Holdout, before | Holdout, after |
| ----------------------- | ------------ | ----------- | --------------- | -------------- |
| Bar categories, strict  | 53% (18/34)  | 53% (18/34) | 55% (17/31)     | 55% (17/31)    |
| Bar categories, loose   | 65% (22/34)  | 65% (22/34) | 61% (19/31)     | 61% (19/31)    |
| Every question, strict  | 50% (47/95)  | 50% (47/95) | 44% (38/86)     | 44% (38/86)    |
| Mean output, characters | 15,171       | 15,652      | 14,981          | 15,474         |
| Largest output          | 28,058       | 29,130      | 58,681          | 61,797         |

The new section finds no answer `state` did not already find, and costs
about 3% more output (`state_hash` `be19faeb…`, which now covers
`state.ts` and `compaction.ts`). The mean stays under the 16,000 bar. Every
"after" figure in this section comes from the final build.

`read-recall.mjs` on the 10x graph. Before this change no read printed the
count or the verdict, so the baseline is 0 by construction for counts and
booleans; it was not run. The boolean rule was changed once after reading
tune rows: a question with "still" ("does that still hold?") wants the
opposite of the `Stale:` verdict. That raised tune booleans from 2/4 to
4/4, so the tune boolean figure measures the scorer as much as the read.
Holdout has no boolean compaction questions. Holdout was scored from the
script totals only.

| Group                                                         | Tune        | Holdout    |
| ------------------------------------------------------------- | ----------- | ---------- |
| Compaction, all                                               | 92% (12/13) | 14% (1/7)  |
| Compaction, counts                                            | 3/3         | 1/2        |
| Compaction, booleans (after the scorer change)                | 4/4         | none       |
| Compaction, records                                           | 3/4         | 0/3        |
| Compaction, values                                            | 2/2         | 0/2        |
| Dead evidence and invalidation, `--rests-on` and `--standing` | 39% (5/13)  | 30% (3/10) |

The holdout result is weak, and its totals do not say why. On tune, the
one compaction miss asks which compaction was the newest on a past date.
Of the 8 tune misses with `--rests-on` and `--standing`, 3 ask for the
Finding that overturned a support, which neither flag lists, and 5 need a
second hop or a date past the record that rests on dead evidence (for
example, the open Risk that derives from a Decision that rests on an
invalidated Finding). The paid run, not this check, has to show whether the agents who failed
on staleness and on `--state invalidated` now get them right.

Read size. Every `proof` read in the tune transcripts of
`x10-find-r{1,2}`, `x10adv-find-r1`, `x10-sonnet-r1` and `x10-rund-r{1,2}`
(`find` and `findstate` arms, 3,807 reads) was replayed against the old
and the new build, each from its own `proof serve`, measuring the JSON
envelope plus the digest:

| Read      | Calls | Old mean | New mean | Old max | New max | Output changed |
| --------- | ----- | -------- | -------- | ------- | ------- | -------------- |
| All       | 3,807 | 9,201    | 9,243    | 32,503  | 32,503  | 216            |
| `find`    | 1,201 | 14,752   | 14,752   | 32,503  | 32,503  | 0              |
| `get`     | 1,346 | 2,154    | 2,259    | 3,435   | 7,120   | 68             |
| `records` | 774   | 13,533   | 13,456   | 24,683  | 24,683  | 72             |
| `state`   | 76    | 24,825   | 25,851   | 31,292  | 31,757  | 76             |
| Other     | 410   | same     | same     | same    | same    | 0              |

The new mean is 1.005 times the old (the new sizes are from the final
build, replayed on its own `proof serve`). Every changed `get` is on a
compaction (2,898 to 4,974 characters on average); every changed
`records` call is a refused value: `invalidated` as a state or status
in 42 calls, `reopened` in 26, and 4 others. Each of those calls used to
get an empty, complete page; the error that replaces it is shorter (569
characters against 1,396). No read reaches `reopen_history` yet, so the
`reopened` calls learn only that the value is not stored. `brief` prints the same bytes on all
ten Efforts of both 10x graphs, and `get` on each of their 24 compactions
prints the old digest once the two new sections are taken out. The
`state` calls grow by the new section, about 1,000 characters.

On the two private graphs (totals only), the find and state gates give the
same figures before and after on graph A and graph B, neither graph holds a
compaction question, and the read invariants hold on every Effort (165 on
A, 90 on B). The `--rests-on` reads hold the answer for 1 of 3 scored
questions on A and 1 of 1 on B.
