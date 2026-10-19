# Proof recall benchmark

This benchmark measures how well an agent recalls project decisions from a
Proof graph, and what that recall costs in tokens and tool calls. It answers
the open Proof Issue "Proof has no recall benchmark to test reads against".

The graph describes a fictional game, set out in [WORLD.md](./WORLD.md). It
holds hundreds of records across five Efforts. Decisions change, evidence is
proved wrong, alternatives are rejected and reopened, and noise is retracted.
Each question has a known answer and a stated path through the graph.

## Layout

| Path                      | What it holds                                            |
| ------------------------- | -------------------------------------------------------- |
| `WORLD.md`                | The shared facts every Effort must agree on              |
| `spec/<effort>.mjs`       | One Effort's history, as an ordered list of mutations    |
| `questions/<effort>.json` | That Effort's questions and answers                      |
| `questions/cross.json`    | Questions that need two or more Efforts                  |
| `scripts/build.mjs`       | Replays every spec through the Proof writer              |
| `scripts/check.mjs`       | Proves each answer against the built graph               |
| `scripts/grade.mjs`       | Scores one run                                           |
| `scripts/run.mjs`         | Runs one headless agent session per question             |
| `scripts/task.mjs`        | The task text each session reads                         |
| `scripts/compare.mjs`     | Compares two runs question by question                   |
| `scripts/find-recall.mjs` | Checks offline whether `proof find` reaches the evidence |
| `runs/`                   | Answers and costs from each pilot and full run           |
| `.flatbread-proof/`       | The built graph, committed so runs need no build         |
| `flatbread.config.js`     | Lets `flatbread proof …` read the graph from this folder |

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

| `type`       | Fields                                                                                             | Returns                                            |
| ------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `field`      | `record`, `field` (or `standing`)                                                                  | that frontmatter value                             |
| `head`       | `start`                                                                                            | the newest version's key                           |
| `chain`      | `start`                                                                                            | every version's key, oldest first                  |
| `asof`       | `start`, `at`                                                                                      | the version current at `at`                        |
| `select`     | `kinds`, `where`, `live`, `retracted`, `derivesFrom`, `restsOn`, `bodyIncludes`, `count`, `effort` | matching keys, or their count                      |
| `efforts`    | `where`, `count`                                                                                   | matching Efforts' keys, or their count             |
| `compaction` | `field`: `head`, `heads`, `stale`, `changes`, `changed`, `staleTargets`                            | the Effort's compaction state                      |
| `body`       | `record`, `includes`, `afterExcerpt`                                                               | whether the text is present (and past the excerpt) |
| `edge`       | `edge`                                                                                             | whether the edge exists                            |

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

3. Run the benchmark:

   ```bash
   node scripts/run.mjs /tmp/recall --name <run> --model haiku --jobs 12
   ```

   `run.mjs` gives every question its own folder and its own fresh,
   headless `claude -p` session, once per strategy. `--strategies` picks
   them from `brief` (start from `proof brief`), `nobrief`, and `find`
   (start from `proof find`); the default is `brief,nobrief`. Each folder
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
   as the gate, so you can check that both used the same search.

4. Score each run with `node scripts/grade.mjs runs/<run>-brief.json`.
5. Compare two strategies question by question with
   `node scripts/compare.mjs runs/<run>-brief.json runs/<run>-nobrief.json`.
   It reports both scores, the questions only one got right, a sign test
   on those, and read tokens, which leave out each session's fixed first
   turn.
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
