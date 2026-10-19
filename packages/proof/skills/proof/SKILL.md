---
name: proof
description: Read and update Flatbread Proof, the repository's durable project memory, through bounded queries and typed mutations. Use for recall when resuming a known effort, checking blockers, or when the user mentions Proof or journaling. Use the write path only for a decision-relevant turning point that outlives the current PR or session and adds unique causal rationale. Never journal routine progress, handoffs, review notes, temporary gaps, implementation steps, or journal corrections.
---

# Proof — agent journaling and recall

Proof stores durable project memory as markdown records in the
repository. It has eight record types: **Effort**, **Issue**, **Finding**,
**Decision**, **Constraint**, and **Risk** capture the work and reasoning;
**Citation** stores a source or reference; and **Blob** stores attached
content such as a document, JSON, or image. Every record belongs to one
Effort. Create and update records through 18 typed mutations, and read them
through 7 bounded queries. Do not hand-edit record frontmatter, although you
may edit record bodies freely.

Read [glossary.md](./glossary.md) for the primitive and edge semantics before
inventing a new record kind or relation.

All commands run from the project root via the `flatbread` CLI (`pnpm exec flatbread`, `npm exec -- flatbread`, `yarn flatbread`, or `bunx flatbread`).
Commands print one JSON object to stdout;
errors print JSON to stderr and exit 1.

## First activation

Read [setup.md](./setup.md), make the reviewed config and gitignore edits, then
run `flatbread proof bootstrap` followed by `flatbread proof bootstrap --verify`. Bootstrap is report-only and never edits project files.

## Prerequisites

Your `flatbread.config.*` must include the preset:

```js
import {
  defineConfig,
  sourceFilesystem,
  transformerMarkdown,
  proofContent,
} from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown(),
  content: [...proofContent()],
});
```

Records live under `<root>/{efforts,issues,findings,decisions,constraints,risks,citations,blobs}/`.
The write journal is `<root>/.journal/`; read digests cache under
`.flatbread/proof/read-cache/` (both gitignored).

## Writing (journaling)

### Mandatory write gate

Proof is a map of durable reasons, not a work log. How to use Proof lives in
this skill; do not journal the process itself as a Decision.

Score only new retained information: create mutations and body text that add
claims. Lifecycle transitions (`AcceptDecision`, `ReopenDecision`, `ResolveIssue`,
`SetEffortStatus`, `MitigateRisk`, `SetRiskState`), `Retract`, and
`proof cache prune` do not add retained claims and do not need a 4/4 score.
`Supersede` and `Invalidate` write retained edges; score the reason for the
edge the same as a create. Body edits that only drop claims stay out of the
gate.

Before a create or a body edit that adds claims, score the information being
added — not the record that would receive it. Answer each test in private
reasoning:

1. **Future need:** Would losing it make a future agent materially
   misunderstand why the project is shaped this way?
2. **Durable effect:** Will it outlive the current PR or session and change a
   product principle, public contract, architecture, constraint, risk, or docs
   direction?
3. **Causal value:** Does it explain why that change happened or what evidence
   could reverse it?
4. **Unique signal:** Does it add a reason or link that code, docs, Git, the PR
   or tracker issue, and retained records do not already make clear?

`WriteCompaction` restates claims that live records already hold, so it
skips the unique-signal test. The other three tests still apply to its body.

Do not create a record or add body claims unless the information scores
**4/4**. An existing or open record does not bypass this gate; appending
low-value text still consumes bounded reads. Keep failed candidates in the
PR, tracker issue, commit, or run artifact. Citations and Blobs persist only
when they support a 4/4 record.

One command for all 18 mutations — pass the payload as a single JSON argument:

```bash
flatbread proof write '{"type":"WriteDecision","effort":"<eff-id>","title":"...","body":"...","derives_from":["<id>"]}'
```

`AcceptDecision` response: `{"generation":"<token>","dryRun":false,"artifacts":[{"id","path","operation"}],"touched":[...],"changedDecisionIds":["dec-..."],"rejectedIds":["dec-..."]}`.
For creates, **capture `artifacts[0].id`** to wire later edges. Keep the
returned `generation` for strict read-your-writes.

Full payload shapes for all 18 mutations: read [reference.md](./reference.md).
Critical semantics:

- Creates always start in the initial lifecycle state: `WriteDecision` →
  `proposed`, `WriteIssue` → `open`, `WriteRisk` → `open`. You cannot pass a
  state; use lifecycle mutations (`AcceptDecision`, `ResolveIssue`,
  `MitigateRisk`, `SetRiskState`) to transition. `WriteCitation` and
  `WriteBlob` have no lifecycle state.
- `Retract` removes a record from browse reads without deleting the file.
  Pass a reason. The writer strips that id from records in every Effort,
  including foreign `derives_from` links, so reads do not fail closed. Use it
  for session noise that should never have been journaled. Do not `git rm`
  records or hand-edit frontmatter. `proof get` still returns a retracted
  record, and `proof records <effortId> --retracted only` lists an Effort's
  retracted records, each marked **RETRACTED** with its date and reason.
  Efforts cannot be retracted; abandon them instead.
- `AcceptDecision` defaults `rejectSiblings: true`, which rejects only
  proposed Decisions derived from the same `question` Issue, even if the
  Issue is closed. Use
  `rejects: ["<dec-id>"]` to name other alternatives. The result lists
  `changedDecisionIds` and `rejectedIds`; pass `dryRun: true` to preview
  without saving. Use `ReopenDecision` with a reason to restore a rejected
  Decision to proposed while keeping its rejection in `reopen_history`.
- A Decision may use `derives_from` to link to a live record in another
  Effort. The link records a cause without changing that record. `proof relations`
  shows each foreign target as one checkpoint with its Effort id, kind, and
  current state. Use `proof get` on a target id to read its full record.
  `supersedes`, `invalidates`, and lifecycle links stay within one Effort.
- Edges are forward-only in payloads. `supersedes` and `invalidates` write
  `superseded_by` and `invalidated_by` reverse projections; `derives_from`
  writes no reverse edge.
- External sources: create a `WriteCitation` record (its body may be a URL,
  with optional `blob` and `role` fields), then add
  `cites: ["<cit-id>"]` when creating an Issue, Finding, Decision,
  Constraint, or Risk. Both the Citation in `cites` and the Blob in
  `Citation.blob` must belong to the same Effort as the record that links to
  them. Bounded digests omit Blob bodies; use `proof get <blob-id>` to read
  one.
- When superseding, open the new record's body with a short rollup of what
  changed and why — reads render ancestors only as one-line checkpoints.
- For a hard-to-reverse, surprising decision made after a real trade-off, use
  the Decision body as the durable rationale: include context, alternatives,
  consequences, and reversal criteria. Do not create a parallel ADR; use
  [effort-modeling](../effort-modeling/SKILL.md) when the decision is still
  being grilled.

### Compactions

A compaction is a Finding that gives one short, current account of an Effort
and names the records behind it. Write one with `WriteCompaction` when
`proof brief <effortId>` reports `compaction.recompact: true`. Do not write
one after every mutation; between compactions, `brief` lists what changed.

1. Read the live records, not the previous compaction, and write a body that
   stands on its own: what is accepted, what is still open or proposed, and
   which constraints and risks bind the work.
2. Put in `derives_from` only the records its sentences rest on, at most 10.
   Never name another compaction there.
3. Let the writer do the rest. It records which records were live (`covers`)
   and supersedes the previous compaction, so the history stays one
   `--resolve head` or `brief` away.

To correct a compaction, write a new one. Edit its body by hand only to fix
wording, or while the branch is unmerged.

## Reading (recall)

Every read returns a bounded envelope, not records: a ≤160-token `summary`,
an `artifact_path` to a rendered markdown digest (the evidence — spend one
Read on it, or grep it), `served_generation`, page info, and ≤10 executable
`hints`. Digests cap at 25 records / one-hop expansion / 50 edges / 64 KiB.

Pick the read by what you need, in this order:

1. **Locate a record by what it says: `proof find "<words>"`.** It ranks
   records by their title, full body, and Blob payload, and prints the hit
   cards inline in the JSON, so you need no second Read. Each card shows the
   newest version of the record (or, with `--as-of`, the version current
   then), its standing, the passages that matched (up to two, plus one
   from an attached Blob payload such as a capture or table), its
   supersession chain with dates, and its links in both directions. Leave
   out `--effort` when you do not know the Effort: hits then group by
   Effort, at most 3 each unless one Effort clearly leads. The `missing`
   terms name query words no hit contains. Ordinary words often land there;
   a missing distinctive term, such as a name, a number, or a code
   reference, is the cue that the answer may not be recorded.
2. **Counts, lists, and status history: `proof state <effortId>`.** One
   read, built from frontmatter and links, that shows exact counts by kind
   and standing; open blockers and what they gate; Risks with their
   mitigation; contested topics, with each rejected or replaced alternative,
   what rejected or replaced it, and when; Issues closed without a fix;
   live records that rest on superseded, disproved, rejected, or retracted
   ones; dated lifecycles; and retractions. It holds no facts from record
   bodies: use `find` for those.
3. **Read one record in full: `proof get <id>`.** On a compaction, `get`
   also says whether it is stale, and why, gives the exact number of
   records that changed since it was written, and lists up to 25 of them.
4. **Page through records: `proof records`.** `find` shows only the top
   hits, so never count from it; count from `state`. `--state` and
   `--status` match only the stored field. `--standing invalidated` (or
   `superseded`, `retracted`, any standing a card prints) lists records by
   where they stand, links included. `--rests-on invalidated` lists the live
   records that derive from, cite, or give as evidence a record in that
   standing.

Browse digests (`list`, `records`, `relations`, `blocking-decisions`) excerpt
each body at 600 chars / 12 lines (`[…truncated]`). **`proof get` digests
always include the full record body** (still subject to the 64 KiB digest
byte cap). Zoom in with `get`, then Read/grep that digest — do not open
`.flatbread-proof/**/*.md` for normal full-body recall.

```bash
# Find records by what they say (one Effort, or all when --effort is left out)
flatbread proof find "tern history buffer precision" --effort <effortId>
flatbread proof find "shadow pool overflow" --as-of 2026-03-01T00:00:00Z

# Counts, open blockers, Risks, contested topics, dead evidence, lifecycles
flatbread proof state <effortId>

# What's gating this effort? (proposed Decisions deriving from open blocker Issues)
flatbread proof blocking-decisions <effortId>

# Resume: discover active Efforts first
flatbread proof list --status active

# Scoped listing with filters (AND across flags, OR within comma lists).
# --status filters Issues and --state filters Decisions, so combining them in
# one call ANDs across kinds and matches nothing — query each kind separately.
flatbread proof records <effortId> --kinds issue --status open --since 2026-07-01T00:00:00Z --limit 10
flatbread proof records <effortId> --kinds decision --state proposed --limit 10

# One-hop neighbors of a record
flatbread proof relations <effortId> <fromId> --relations derives_from,superseded_by

# Single record with full body; --resolve head follows supersession to the tip
flatbread proof get <id> [--resolve head]

# Where an Effort stands: head compaction in full, then what changed since
flatbread proof brief <effortId>
```

Flags shared by reads: `--strict-min-generation <token>` (with optional
`--timeout-ms <ms>`, default 3000) and, on `list`/`records`/`relations`, `--limit`
(≤25) and `--cursor` (opaque `next_cursor` from a prior page; only valid for
the same query at the same generation). `find` takes `--limit` 1 to 10
(default 5) and has no cursor.

`proof list` is bounded Effort discovery. It defaults to `active`; valid
statuses are exactly `active`, `paused`, `completed`, and `abandoned`.
Comma-separated statuses are ORed. Results use the shared `created_at`, then
`id` ordering. After discovery, use bounded effort-scoped reads.

**Consistency:** reads are eventual by default. Immediately after a write,
pass the returned generation as `--strict-min-generation` — you get either
fresh data or a `PROOF_GENERATION_WAIT_TIMEOUT` error (exit 1),
never silently stale results. Do not build polling loops; the wait is
server-side.

## Recommended session workflow

1. **Resume / status briefing (bounded fast-path):** `proof list --status active`
   and trust the returned digest. For each active Effort, run
   `proof records <effortId> --kinds issue,decision` and read each record's
   status/state from that one digest. Run `proof blocking-decisions <effortId>`
   only for an Effort whose digest shows an open `blocker` Issue — skip it
   otherwise. When `proof brief <effortId>` returns a head compaction that is
   not stale (`compaction.head_id` set, `compaction.stale` false), its digest
   can stand in for the `records` read: it holds the current account and
   every change since. Do not open raw `.flatbread-proof/**/*.md` for briefing;
   browse digests are authoritative for status/state. Budget ≈ (1 + number
   of active Efforts) digest reads. A 12-run experiment across three model
   families showed this roughly halves recall tool calls with no loss of
   answer quality (Decision
   `dec-adopt-a-bounded-status-briefing-fast-path-for-ef--kcw0rw39g3b2ym2h`).
2. **When you need a particular record or fact:** run `proof find` first,
   then `proof get` the hit whose card fits. Do not page through `records`
   to look for it. **When you need a count, a list of open, closed, or
   rejected records, a status history, the blockers, or what rests on dead
   evidence:** run `proof state <effortId>` instead.
3. **When a browse digest shows `[…truncated]` and you need the body:** run
   `flatbread proof get <id>`, then Read/grep that digest (`artifact_path`)
   for the full body. Reserve opening `.flatbread-proof/**/*.md` for rare
   cases (e.g. digest byte-cap miss on an oversized record), not normal
   zoom-in.
4. **During work:** apply the write gate above before any create or body
   edit that adds claims. When outside material supports a 4/4 record, save
   large content with `WriteBlob` if needed, then create a `WriteCitation`,
   then create the Issue, Finding, Decision, Constraint, or Risk with
   `cites: ["<cit-id>"]`. You cannot add a citation later, so create the
   Citation first. Open Issues for real gaps or blockers, and use
   `derives_from` on Decisions to link the Findings, Constraints, and Issues
   they respond to.
5. **On commitment:** preview `AcceptDecision` with `dryRun: true`, inspect
   its `rejectedIds`, then commit the acceptance. Use `ResolveIssue` with
   `resolvedBy` citing the closing Decision/Findings. These lifecycle
   transitions do not need a 4/4 score. Retract session noise with `Retract`
   rather than deleting files.
6. Maintenance: `flatbread proof cache prune` deletes digests older than
   24h / over the 100 MiB ceiling. Prune does not need a 4/4 score.
