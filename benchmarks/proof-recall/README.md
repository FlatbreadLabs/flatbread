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
counts the edges from there to the answer.

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

A check without `expect` must compute the answer itself. A check with
`expect` must return exactly that value. `record`, `records`, and `count`
answers need at least one computing check.

| `type`       | Fields                                                                                             | Returns                                            |
| ------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `field`      | `record`, `field` (or `standing`)                                                                  | that frontmatter value                             |
| `head`       | `start`                                                                                            | the newest version's key                           |
| `chain`      | `start`                                                                                            | every version's key, oldest first                  |
| `asof`       | `start`, `at`                                                                                      | the version current at `at`                        |
| `select`     | `kinds`, `where`, `live`, `retracted`, `derivesFrom`, `restsOn`, `bodyIncludes`, `count`, `effort` | matching keys, or their count                      |
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

1. Copy `.flatbread-proof/` (without `keymap.json`) and `flatbread.config.js`
   into an empty folder, and symlink the repository's `node_modules` into it
   so the config's imports resolve.
2. Give the agent that folder, the questions' `id` and `question` text only,
   and one read strategy: `brief` first, `records` only, or raw files.
3. Record each answer with its token and tool-call counts in
   `runs/<name>.json`, in the shape `scripts/grade.mjs` describes.
4. Run `node scripts/grade.mjs runs/<name>.json`.
