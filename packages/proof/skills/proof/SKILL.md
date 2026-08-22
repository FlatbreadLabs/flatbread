---
name: proof
description: Read and update Flatbread Proof, the repository's durable project memory, through bounded queries and typed mutations. Use for recall when resuming a known effort, checking blockers, or when the user mentions Proof or journaling. Use the write path only for a decision-relevant turning point that outlives the current PR or session and adds unique causal rationale. Never journal routine progress, handoffs, review notes, temporary gaps, implementation steps, or journal corrections.
---

# Proof — agent journaling and recall

The Proof stores durable project memory as markdown records in the
repository. It has eight record types: **Effort**, **Issue**, **Finding**,
**Decision**, **Constraint**, and **Risk** capture the work and reasoning;
**Citation** stores a source or reference; and **Blob** stores attached
content such as a document, JSON, or image. Every record belongs to one
Effort. Create and update records through 15 typed mutations, and read them
through 5 bounded queries. Do not hand-edit record frontmatter, although you
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

Proof is a map of durable reasons, not a work log. Before any mutation or body
edit, score the information being added — not the record that would receive
it. Answer each test in private reasoning:

1. **Future need:** Would losing it make a future agent materially
   misunderstand why the project is shaped this way?
2. **Durable effect:** Will it outlive the current PR or session and change a
   product principle, public contract, architecture, constraint, risk, or docs
   direction?
3. **Causal value:** Does it explain why that change happened or what evidence
   could reverse it?
4. **Unique signal:** Does it add a reason or link that code, docs, Git, the PR
   or tracker issue, and retained records do not already make clear?

Do not use a write tool unless the information scores **4/4**. An existing or
open record does not bypass this gate; appending low-value text still consumes
bounded reads. Keep failed candidates in the PR, tracker issue, commit, or run
artifact. Citations and Blobs persist only when they support a 4/4 record.

One command for all 15 mutations — pass the payload as a single JSON argument:

```bash
flatbread proof write '{"type":"WriteDecision","effort":"<eff-id>","title":"...","body":"...","derives_from":["<id>"]}'
```

Response: `{"generation":"<token>","artifacts":[{"id","path","operation"}],"touched":[...]}`.
**Capture `artifacts[0].id`** to wire later edges, and **keep `generation`**
for strict read-your-writes.

Full payload shapes for all 15 mutations: read [reference.md](./reference.md).
Critical semantics:

- Creates always start in the initial lifecycle state: `WriteDecision` →
  `proposed`, `WriteIssue` → `open`, `WriteRisk` → `open`. You cannot pass a
  state; use lifecycle mutations (`AcceptDecision`, `ResolveIssue`,
  `MitigateRisk`, `SetRiskState`) to transition. `WriteCitation` and
  `WriteBlob` have no lifecycle state.
- `AcceptDecision` defaults `rejectSiblings: true`, which rejects ALL other
  proposed Decisions in the same Effort. Pass `"rejectSiblings": false`
  unless you deliberately want the competing proposals closed.
- Edges are forward-only in payloads (`derives_from`, `supersedes`,
  `invalidates`); back-edges are materialized automatically.
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

## Reading (recall)

Every read returns a bounded envelope, not records: a ≤160-token `summary`,
an `artifact_path` to a rendered markdown digest (the evidence — spend one
Read on it, or grep it), `served_generation`, page info, and ≤10 executable
`hints`. Digests cap at 25 records / one-hop expansion / 50 edges / 64 KiB.

Browse digests (`list`, `records`, `relations`, `blocking-decisions`) excerpt
each body at 600 chars / 12 lines (`[…truncated]`). **`proof get` digests
always include the full record body** (still subject to the 64 KiB digest
byte cap). Zoom in with `get`, then Read/grep that digest — do not open
`.flatbread-proof/**/*.md` for normal full-body recall.

```bash
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
```

Flags shared by reads: `--strict-min-generation <token>` (with optional
`--timeout-ms <ms>`, default 3000) and, on `list`/`records`/`relations`, `--limit`
(≤25) and `--cursor` (opaque `next_cursor` from a prior page; only valid for
the same query at the same generation).

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
   otherwise. Do not open raw `.flatbread-proof/**/*.md` for briefing;
   browse digests are authoritative for status/state. Budget ≈ (1 + number
   of active Efforts) digest reads. A 12-run experiment across three model
   families showed this roughly halves recall tool calls with no loss of
   answer quality (Decision
   `dec-adopt-a-bounded-status-briefing-fast-path-for-ef--kcw0rw39g3b2ym2h`).
2. **When a browse digest shows `[…truncated]` and you need the body:** run
   `flatbread proof get <id>`, then Read/grep that digest (`artifact_path`)
   for the full body. Reserve opening `.flatbread-proof/**/*.md` for rare
   cases (e.g. digest byte-cap miss on an oversized record), not normal
   zoom-in.
3. **During work:** when outside material supports a record, save large
   content with `WriteBlob` if needed, then create a `WriteCitation`, then
   create the Issue, Finding, Decision, Constraint, or Risk with
   `cites: ["<cit-id>"]`. You cannot add a citation later, so create the
   Citation first. Open Issues for real gaps or blockers, and use
   `derives_from` on Decisions to link the Findings, Constraints, and Issues
   they respond to.
4. **On commitment:** `AcceptDecision` (mind `rejectSiblings`), `ResolveIssue`
   with `resolvedBy` citing the closing Decision/Findings.
5. Maintenance: `flatbread proof cache prune` deletes digests older than
   24h / over the 100 MiB ceiling.
