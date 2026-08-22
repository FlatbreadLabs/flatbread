# Proof — full API reference

Ground truth: the installed `flatbread` CLI and this reference (mutations),
reads, and configuration examples. Repository implementation files are not
consumer ground truth.

## IDs

Generated as `<prefix>-<slug>--<16-char-crockford>` with prefixes `eff`,
`iss`, `fnd`, `dec`, `con`, `rsk`, `cit`, `blb`. Filenames never define
identity. Let the writer generate ids; capture them from mutation results
(`artifacts[0].id` for creates).

## The 15 mutations (`flatbread proof write '<json>'`)

Common optional fields on all creates: `id`, `created_at` (ISO with offset),
`produced_in`, `created_by` (opaque provenance strings). Forward edge fields
on all creates except `CreateEffort`, `WriteCitation`, and `WriteBlob`:
`derives_from[]`, `supersedes[]`, `invalidates[]` (arrays of existing ids;
targets are validated and must stay in the new record's Effort). An Effort
record counts as belonging to itself, so a record may `derive_from` its own
governing Effort.

Optional `cites[]` on Issue, Finding, Decision, Constraint, and Risk creates:
existing **Citation** ids in the **same Effort**. Create Citations first, then
add their ids when creating Findings, Decisions, Issues, and other records.
`CreateEffort` does not accept `cites`.

### Effort lifecycle

```json
{"type":"CreateEffort","title":"...","body":"...","slug":"optional"}
{"type":"SetEffortStatus","effortId":"<eff-id>","status":"active|paused|completed|abandoned"}
```

### Creation (required: effort, title, body; initial state is derived)

```json
{"type":"WriteIssue","effort":"<eff-id>","title":"...","body":"...","kind":"question|defect|gap|blocker|<free-form>"}
{"type":"WriteFinding","effort":"<eff-id>","title":"...","body":"...","kind":"measurement|survey|dead-end|retrospective|<free-form>"}
{"type":"WriteDecision","effort":"<eff-id>","title":"...","body":"..."}
{"type":"WriteConstraint","effort":"<eff-id>","title":"...","body":"...","kind":"hard|soft"}
{"type":"WriteRisk","effort":"<eff-id>","title":"...","body":"...","likelihood":"low|medium|high","severity":"low|medium|high"}
{"type":"WriteCitation","effort":"<eff-id>","title":"...","body":"https://example.com/...","role":"evidence|context|<free-form>","blob":"<blb-id>"}
{"type":"WriteBlob","effort":"<eff-id>","title":"...","body":"...","kind":"markdown|json|<free-form>"}
```

Initial states: Issue `status: open`; Decision `state: proposed`; Risk
`state: open`. Citation and Blob have no lifecycle state.

A Citation body alone is valid (commonly a URL). `blob` is optional; use it
only when you need to attach stored content such as a document or JSON. When
provided, `blob` must be the id of a Blob in the same Effort as the Citation.

### Add links between existing records

```json
{"type":"Supersede","supersederId":"<id>","targetId":"<same-kind-id>"}
{"type":"Invalidate","findingId":"<fnd-id>","targetId":"<finding-or-decision-id>"}
```

`Supersede` is same-primitive and same-Effort only, and rejects an
already-superseded target. `Invalidate` is same-Effort only and asserts the
target was wrong (stronger than superseded).

### Lifecycle transitions

```json
{"type":"ResolveIssue","issueId":"<iss-id>","resolution":"resolved|deferred|wontfix","resolvedBy":["<dec-or-fnd-id>"]}
{"type":"AcceptDecision","decisionId":"<dec-id>","rejectSiblings":false}
{"type":"MitigateRisk","riskId":"<rsk-id>","decisionId":"<accepted-dec-id>"}
{"type":"SetRiskState","riskId":"<rsk-id>","state":"realized|accepted","evidence":["<fnd-id>"]}
```

`AcceptDecision` with `rejectSiblings: true` (the default!) also sets every
other `proposed` Decision in the Effort to `rejected` with a back-pointer.
All mutations run in one journal transaction (save-or-undo).

### Mutation result

```json
{
  "generation": "57",
  "artifacts": [
    { "id": "...", "path": "decisions/....md", "operation": "created|updated" }
  ],
  "touched": [{ "id": "...", "path": "..." }]
}
```

`generation` is a durable, monotonic journal token — the input to strict reads.

## The 5 read queries

All reads execute through Flatbread's query engine (in-process GraphQL over
the generated schema) and return a `ReadEnvelope`:

```json
{
  "summary": "2 records; proposed 2; complete",
  "artifact_path": ".flatbread/proof/read-cache/<generation>/<query-hash>.md",
  "artifact_sha256": "...",
  "served_generation": "55",
  "consistency": { "mode": "eventual|strict", "min_generation": null },
  "complete": true,
  "cap_reasons": [],
  "page": { "returned": 2, "has_more": false, "next_cursor": null },
  "hints": ["getRecord(\"dec-...\")"]
}
```

The digest at `artifact_path` is deterministic markdown: YAML query header,
anchor index, per-record sections (selected frontmatter, body, relation
lists), one-hop related records, and an edge table. Body policy:

- **`proof get`:** full record body (the normal zoom-in path), including
  Blob payloads and Citation bodies (URLs / short notes).
- **`list` / `records` / `relations` / `blocking-decisions`:** body excerpt
  capped at 600 chars / 12 lines (`[…truncated]`). **Blob bodies are omitted**
  from these digests — use `proof get` for the payload. Citation bodies
  (usually short) still excerpt normally.

Caps: 25 primary records, one hop, 50 edges, 64 KiB. Hitting a cap sets
`complete: false` with named `cap_reasons`. Page only when `page.has_more` is
true. Non-empty hard `cap_reasons` that paging cannot clear mean narrow the
query or fail closed. `primary_records` is a defensive in-process signal after
the CLI pre-slices to at most 25 primary records; `proof list` and
`proof records` do not emit it. If a `get` body alone exceeds the 64 KiB
digest byte cap, the digest fails closed with a byte-cap banner (it does **not**
fake a full body via the 600/12 excerpt).

Every read envelope carries `complete` and `cap_reasons`. Read it in this
order:

1. If `complete` is true, the artifact is complete.
2. If `page.has_more` is true, fetch `page.next_cursor`. A null cursor is an
   error; do not retry the same page.
3. If `cap_reasons` is not empty, narrow the query or fail closed. It can hold
   several sorted, duplicate-free values from `primary_records`,
   `displayed_edges`, and `bytes`.
4. A hard cap alone leaves `page.has_more: false` and `next_cursor: null`.
   Paging and hard caps can occur together, but caps never create a cursor.

Programs must read these fields from the JSON envelope; do not parse the
digest or `summary` as a data feed.

### Commands

```bash
flatbread proof get <id> [--resolve exact|head] [consistency flags]
flatbread proof list [--status active,paused,...] [--limit n] [--cursor c] [consistency flags]
flatbread proof records <effortId> [--kinds k1,k2] [--state s1,s2] [--status s1,s2] [--kind k1,k2] [--since iso] [--until iso] [--limit n] [--cursor c] [consistency flags]
flatbread proof relations <effortId> <fromId> --relations r1,r2 [--limit n] [--cursor c] [consistency flags]
flatbread proof blocking-decisions <effortId> [consistency flags]
flatbread proof cache prune
```

- `--kinds`: `effort|issue|finding|decision|constraint|risk|citation|blob`.
  `records` includes every non-Effort kind except Blob by default. Add
  `--kinds blob` when you need Blob records.
- `list --status`: defaults to `active`; valid values are exactly `active`,
  `paused`, `completed`, and `abandoned`. Values are ORed and results are
  ordered by `created_at` ascending, then `id`.
- Filter semantics: AND across different flags, OR within a comma list.
  `--since`/`--until` bound `created_at` (gte/lte, ISO strings).
- `--relations` values: `derives_from`, `supersedes`, `superseded_by`,
  `invalidates`, `invalidated_by`, `rejected_by`, `mitigated_by`,
  `resolved_by`, `evidence`, `cites` (one hop, explicit only). Missing targets
  never produce a partial success. For `derives_from`, `invalidates`,
  `invalidated_by`, `resolved_by`, and `evidence`, the CLI returns
  `PROOF_DANGLING_RELATION`. Flatbread's core reference check rejects missing
  targets for the other relations. A stored target from another Effort returns
  `PROOF_CROSS_EFFORT_RELATION`; it never becomes a successful empty page.
- `--resolve head`: follow `superseded_by` to the current tip; ancestors
  render as checkpoint lines (max 5, then a count).
- `blocking-decisions` membership (frozen): Decision in the effort with
  `state: proposed` whose `derives_from` directly contains an Issue in the
  same effort with `kind: blocker` and `status: open`. For "what blockers
  are open at all", use
  `records <effortId> --kinds issue --kind blocker --status open`.

### Consistency flags

- `--strict-min-generation <token>`: serve at or after that journal
  generation, or fail. `--timeout-ms <ms>` bounds the wait (default 3000).
- Errors (stderr JSON, exit 1): `PROOF_GENERATION_WAIT_TIMEOUT`,
  `PROOF_INVALID_CURSOR` (cursor reused across a different query or
  generation), `PROOF_DANGLING_RELATION` (a stored relation target is missing),
  and `PROOF_CROSS_EFFORT_RELATION` (a stored relation target belongs to another
  Effort).

## Configuration surface

| Option           | Where                                         | Default                              | Notes                                                                                                           |
| ---------------- | --------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Graph root       | `proofContent(root)` in `flatbread.config.js` | `.flatbread-proof`                   | All eight collection paths + refs derive from it; the preset must appear complete and unmodified for detection. |
| Config discovery | cwd of the CLI invocation                     | —                                    | Exactly one `flatbread.config.*` must exist in cwd.                                                             |
| Digest cache     | fixed                                         | `<cwd>/.flatbread/proof/read-cache/` | Generation-keyed; gitignore it. `cache prune`: >24h old deleted, then oldest-first to ≤100 MiB.                 |
| Journal          | fixed                                         | `<root>/.journal/`                   | Writer-owned; gitignored. Never edit.                                                                           |
| Strict timeout   | `--timeout-ms` per read                       | 3000 ms                              |                                                                                                                 |
| Page limit       | `--limit` per read                            | 25                                   | Hard max 25.                                                                                                    |

## What not to do

- Do not hand-edit record frontmatter or `.journal/`; bodies are freely
  editable (the reindexer validates and repairs projections).
- Do not parse digest files or `summary` as data feeds for other programs —
  the digest is evidence for you to read or search; the envelope is the
  machine surface.
- Do not build polling loops around generations; strict reads wait
  server-side.
- Do not model sessions/plans/agents as records — put provenance in
  `produced_in` / `created_by` fields.
- Do not put citation metadata objects into `cites` — use Citation records
  (body/role/optional blob) and bare Citation ids in `cites`.
- Do not expect Blob bodies in list/records digests; zoom with `proof get`.
