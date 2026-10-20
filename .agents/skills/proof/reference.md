# Proof — full API reference

Ground truth: the installed `flatbread` CLI and this reference (mutations),
reads, and configuration examples. Repository implementation files are not
consumer ground truth.

## IDs

Generated as `<prefix>-<slug>--<16-char-crockford>` with prefixes `eff`,
`iss`, `fnd`, `dec`, `con`, `rsk`, `cit`, `blb`. Filenames never define
identity. Let the writer generate ids; capture them from mutation results
(`artifacts[0].id` for creates).

## The 18 mutations (`flatbread proof write '<json>'`)

Common optional fields on all creates: `id`, `created_at` (ISO with offset),
`produced_in`, `created_by` (opaque provenance strings). Forward edge fields
on all creates except `CreateEffort`, `WriteCitation`, and `WriteBlob`:
`derives_from[]`, `supersedes[]`, `invalidates[]` (arrays of existing ids).
`derives_from` can name a live record in any Effort. It records a cause but
changes no target. `supersedes` and `invalidates` change targets and must stay
in the new record's Effort. An Effort record counts as belonging to itself, so
a record may `derives_from` its own governing Effort.

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

### Compaction

```json
{
  "type": "WriteCompaction",
  "effort": "<eff-id>",
  "title": "...",
  "body": "...",
  "derives_from": ["<id>"],
  "cites": ["<cit-id>"]
}
```

A compaction is a Finding with `kind: compaction`: one short, current account
of where an Effort stands. Only `WriteCompaction` creates one; `WriteFinding`
rejects `kind: compaction`. The writer does two things the payload cannot:

- It stores `covers`, a sorted list of `<id>@<standing>` entries for every
  live Issue, Finding, Decision, Constraint, and Risk in the Effort, plus each
  `derives_from` target. A standing is a Decision's or Risk's `state`, an
  Issue's `status`, or `live` for a Finding or Constraint. `retracted`,
  `superseded`, and `invalidated` take precedence over all of these. Live means
  an open Issue, a proposed or accepted Decision, an open or realized Risk,
  or a Finding or Constraint that nothing has superseded or invalidated.
  Compactions are never live records.
- It sets `supersedes` to every head compaction (a live compaction that
  nothing supersedes) and adds the new id to each head's `superseded_by`. A
  Git merge can bring in two heads, one from each branch; the next
  `WriteCompaction` supersedes both.

The payload rejects `supersedes`, `invalidates`, `covers`, and `kind`.
`derives_from` holds at most 10 ids from the same Effort: the records the
body's sentences rest on. None may be another compaction; compactions link to
earlier compactions only through `supersedes`. `Supersede` can neither start
from nor target a compaction, and a compaction cannot `Invalidate` anything.
A Finding may `Invalidate` a compaction that was wrong.

Write the body from the live records, never from the previous compaction, and
make it complete on its own. To correct a compaction, write a new one. Edit
its body by hand only to fix wording, or while the branch is unmerged: a hand
edit cannot update `covers` and does not advance `generation`.

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
{"type":"AcceptDecision","decisionId":"<dec-id>","rejects":["<other-dec-id>"],"dryRun":true}
{"type":"ReopenDecision","decisionId":"<rejected-dec-id>","reason":"Rejected by mistake"}
{"type":"MitigateRisk","riskId":"<rsk-id>","decisionId":"<accepted-dec-id>"}
{"type":"SetRiskState","riskId":"<rsk-id>","state":"realized|accepted","evidence":["<fnd-id>"]}
```

`AcceptDecision` with `rejectSiblings: true` (the default) rejects only proposed
Decisions that derive from the same Issue whose `kind` is `question`, even
once it closes. Use `rejects` to name other alternatives. The result lists `changedDecisionIds`
and `rejectedIds`. Set `dryRun: true` or pass `--dry-run` to `proof write` to see the same planned changes without
saving them or advancing `generation`. A preview fails if an earlier journal
transaction still needs recovery. `ReopenDecision` returns a rejected
Decision to `proposed`, clears its live `rejected_by` link, and keeps the old
link and reason in `reopen_history`. Acceptance fails if a shared question
already has an accepted Decision, or if the proposed Decision was reopened
after rejection by a still-accepted Decision. Commits run in one journal
transaction.

### Retract a record that should not stay on the live graph

```json
{ "type": "Retract", "recordId": "<id>", "reason": "..." }
```

`Retract` is for session noise and other records that should never have been
written. It is not a hard delete and not a fold into a survivor:

- Retract throws when the target is the last remaining value of
  `resolved_by`, `mitigated_by`, `evidence`, `rejected_by`, or
  `superseded_by` on a live same-Effort record. It also throws when the
  target is the last live Finding-kind id on a realized Risk's `evidence`,
  even if other non-Finding ids remain. Supersede or retract those
  dependent records first. Do not `git rm`, and do not hand-edit
  frontmatter to strip the pointer.
- The file stays. Frontmatter gains `retracted: true`, `retracted_at`, and
  `retracted_reason`. The body is unchanged so `proof get` can still explain
  what was removed.
- On a successful Retract, the writer clears that record's relation fields
  and strips its id from every other record across all Efforts in the same
  journal transaction.
- Browse reads (`list`, `records`, `blocking-decisions`) omit retracted
  records. `proof get` still returns them, and `records --retracted include|only` lists them on request. Every digest marks a retracted
  record: its index line ends in `(retracted)`, a **RETRACTED** banner with
  the date and reason sits under its heading, and the envelope summary
  counts `retracted N`. `relations` follows stored edges
  that remain; after a successful Retract, survivors should have none.
- Efforts cannot be retracted. Set status to `abandoned` instead.
- Later creates, `Supersede`, `Invalidate`, and lifecycle mutations reject
  retracted ids. Git is the undo path for Retract; `ReopenDecision` only
  returns a rejected Decision to proposed. There is no generic Restore
  mutation.

Folding several noisy records into one survivor is a body edit on the
survivor (score 4/4 if it adds claims) plus `Retract` on the rest.

### Mutation result

```json
{
  "generation": "57",
  "dryRun": false,
  "changedDecisionIds": ["dec-..."],
  "rejectedIds": ["dec-..."],
  "artifacts": [
    { "id": "...", "path": "decisions/....md", "operation": "created|updated" }
  ],
  "touched": [{ "id": "...", "path": "..." }]
}
```

`generation` is a durable, monotonic journal token — the input to strict reads.

## The 8 read queries

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
  Blob payloads and Citation bodies (URLs / short notes). For a code
  Citation, the code Citations a record `cites`, and paths a body names,
  `## Code anchors at HEAD` lists each one HEAD no longer bears out (see
  [Code anchors at HEAD](#code-anchors-at-head)), and the summary repeats
  the first. Other digests list the code Citations on their page the same
  way.
- **`proof brief`:** full body of the head compaction only. Every other
  record appears as one line.
- **`proof find`:** the hit cards (below) under `## Find hits`, and each hit's
  record with the browse excerpt. The envelope also carries the cards inline.
- **`proof state`:** no bodies at all. The state (below) under
  `## Effort state`; the envelope also carries it inline as `markdown`.
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
   `displayed_edges`, `bytes`, `find_limit` (`proof find` matched more
   records than it shows), and `state_limit` (`proof state` cut at least one
   list short; each cut list says how many it left out).
4. A hard cap alone leaves `page.has_more: false` and `next_cursor: null`.
   Paging and hard caps can occur together, but caps never create a cursor.

Programs must read these fields from the JSON envelope; do not parse the
digest or `summary` as a data feed.

### Commands

```bash
flatbread proof get <id> [--resolve exact|head] [consistency flags]
flatbread proof list [--status active,paused,...] [--limit n] [--cursor c] [consistency flags]
flatbread proof records <effortId> [--kinds k1,k2] [--state s1,s2] [--status s1,s2] [--standing s1,s2] [--rests-on s1,s2] [--kind k1,k2] [--since iso] [--until iso] [--retracted exclude|include|only] [--limit n] [--cursor c] [consistency flags]
flatbread proof relations <effortId> <fromId> --relations r1,r2 [--limit n] [--cursor c] [consistency flags]
flatbread proof blocking-decisions <effortId> [consistency flags]
flatbread proof brief <effortId> [consistency flags]
flatbread proof find "<words>" [--effort <effortId> | --all] [--kinds k1,k2] [--as-of iso] [--retracted exclude|include|only] [--limit n] [consistency flags]
flatbread proof find ["<words>"] --path <file|dir|symbol|file#symbol> [--refs r1,r2|all] [find flags]
flatbread proof find ["<words>"] --refs <r1,r2|all> [find flags]
flatbread proof branches [--refresh-prs]
flatbread proof state <effortId> [consistency flags]
flatbread proof cache prune
flatbread proof serve [--socket .flatbread/proof/serve.sock]
```

- `proof serve` keeps the graph loaded in one process and answers the eight
  reads above (`list`, `records`, `get`, `relations`, `blocking-decisions`,
  `brief`, `find`, `state`); it keeps the `find` index with the graph and serves nothing that writes. Set `FLATBREAD_PROOF_SERVER` to its
  socket and those read commands go to it, in any folder whose graph root
  resolves to the same files. Each later read then takes a fraction of a
  second instead of rebuilding the graph. A write bumps the journal
  generation, and the next served read rebuilds from disk. If the socket is
  unreachable, reads run locally as before.

- `--kinds`: `effort|issue|finding|decision|constraint|risk|citation|blob`.
  `records` includes every non-Effort kind except Blob by default. Add
  `--kinds blob` when you need Blob records.
- `list --status`: defaults to `active`; valid values are exactly `active`,
  `paused`, `completed`, and `abandoned`. Values are ORed and results are
  ordered by `created_at` ascending, then `id`.
- Filter semantics: AND across different flags, OR within a comma list.
  `--since`/`--until` bound `created_at` (gte/lte, ISO strings).
- `--state` and `--status` match the stored field only. `--state` takes
  `proposed`, `accepted`, `rejected`, `superseded`, `deprecated`, `open`,
  `mitigated`, `realized`; `--status` takes `open`, `resolved`, `deferred`,
  `wontfix`. Any other value is refused with `PROOF_INVALID_ARGUMENT`,
  never answered with an empty page.
- `--standing` matches the standing cards and `proof state` print, which
  links decide before the stored field: `retracted`, then `superseded`,
  then `invalidated`, else the Issue's status, the Decision's or Risk's
  state, or `live`. Asking for `retracted` shows retracted records.
- `--rests-on` takes `superseded`, `invalidated`, `rejected`, `retracted`.
  It lists live records, compactions left out, that derive from, cite, or
  give as evidence a record in one of those standings, in any Effort. The
  record that overturned it does not count. This is the rule behind the
  count in `proof state`'s Dead evidence.
- `--relations` values: `derives_from`, `supersedes`, `superseded_by`,
  `invalidates`, `invalidated_by`, `rejected_by`, `mitigated_by`,
  `resolved_by`, `evidence`, `cites` (one hop, explicit only). Missing targets
  never produce a partial success. For `derives_from`, `invalidates`,
  `invalidated_by`, `resolved_by`, and `evidence`, the CLI returns
  `PROOF_DANGLING_RELATION`. Flatbread's core reference check rejects missing
  targets for the other relations. A stored target from another Effort returns
  `PROOF_CROSS_EFFORT_RELATION` for state-changing or `cites` edges. A foreign
  `derives_from` target appears as one checkpoint line with its Effort id,
  kind, and current state. Its body is not expanded. Page through more targets
  with `--cursor`; `proof get <targetId>` opens one explicitly.
- `MitigateRisk` still links a Risk to an accepted Decision in the same Effort.
  For a feature Decision in another Effort, write and accept a Decision in the
  Risk's Effort that `derives_from` the feature Decision, then use that local
  Decision to mitigate the Risk.
- `--resolve head`: follow `superseded_by` to the current tip; ancestors
  render as checkpoint lines (max 5, then a count).
- `get` on a compaction adds `## Compaction`: whether it is its Effort's
  head (or what superseded it), `Stale: yes|no` with the reason and the
  rule, and the exact number of records that differ from the live set it
  covers. `## Changes since compaction` then lists them as `brief` does,
  up to 25 lines; past that, `- … N more` ends the list, and nothing pages
  the rest (on the head, `brief` lists up to 50). For the head, these match
  `brief`'s `compaction` field.
- `blocking-decisions` membership (frozen): Decision in the effort with
  `state: proposed` whose `derives_from` directly contains an Issue in the
  same effort with `kind: blocker` and `status: open`. For "what blockers
  are open at all", use
  `records <effortId> --kinds issue --kind blocker --status open`.
- `brief`: where an Effort stands. The digest holds the head compaction with
  its full body, then up to 5 older compactions as one-line
  `## Lineage checkpoints`, then `## Changes since compaction`: one line per
  record that was `added` to the live set, `changed` standing, or `left` it
  since `covers` was taken, written as
  `- <change> | <id> | <kind> | <before> -> <now> | <title>`.
  `## Stale derivations` lists `derives_from` targets whose standing moved.
  With no compaction yet, `## Live records (no compaction yet)` lists every
  live record instead. Digests never print `covers`. The envelope adds
  `compaction`: `{"head_id","heads","stale","changes","recompact"}`.
  `stale` is true when a `derives_from` target moved or a Finding invalidated
  the head. `recompact` is true when there is no head, more than one head, a
  stale head, or at least 5 changes. Programs read these fields, not the
  digest.

### `proof find`

`find` locates records by what they say. Quoted or not, every word after
`find` is part of the query, locally and through `proof serve`.

- **Scope:** `--effort <effortId>` searches one Effort. Without it, or with
  `--all`, it searches every Effort. `--kinds` narrows to some of `issue`,
  `finding`, `decision`, `constraint`, `risk`, `citation`, `blob` (default:
  all seven; Efforts are never hits). `--retracted` works as on `records`:
  retracted records are left out unless you pass `include` or `only`, and a
  shown one is marked `RETRACTED`. Every version a card scores, quotes, or
  shows passes this scope; other versions appear only on the chain line.
- **Ranking:** BM25 keyword scoring (k1 1.2, b 0.75) over the title (counted
  twice), the full body, `kind`, `state`, `status`, `role`, `created_by`, and
  Blob payloads. Rare words weigh more, measured over the whole graph. Words
  are lowercased, apostrophes dropped, hyphenated words indexed joined and
  split, and plurals, `-ed`, `-ing`, and a final `-e` folded (`added` meets
  `add`, `using` meets `use`). Numbers with units
  (`4.7 ms` is `4.7ms`), people (`created_by`), and code references (file
  paths, `symbol()` names, commit SHAs, `#123`) count 1.5 times. Ties break by
  id. The index is rebuilt from the record files; nothing derived is stored.
- **Chains:** all versions linked by `supersedes` / `superseded_by` form one
  hit, scored by its best in-scope version. Versions are numbered `v1`,
  `v2`, … in link order: each comes after the versions it supersedes, and
  created time, then id, orders fork branches. The card shows the chain head,
  or the newest in-scope version when the head is out of scope (for example,
  retracted under the default `exclude`). If an older version matched, the
  card says which (`matched: v1 <id>`).
- **As of:** `--as-of <date>` takes `YYYY-MM-DD` (UTC midnight) or a
  date-time with `Z` or an offset, such as `2026-03-01T00:00:00Z`; other
  forms are refused, so the answer does not depend on the machine's time
  zone. Only versions created at or before that moment are scored, quoted,
  and shown. The card shows the last such version in link order, and chains
  with no such version drop out.
- **Grouping:** without `--effort`, Efforts are ranked by the summed score
  of their best 3 hits (`efforts by match`), and hits are grouped under each
  Effort. Unless the top Effort's sum is at least 1.5 times the next one's,
  at most 3 hits come from one Effort at first; slots still empty then go to
  the next hits by score.
- **Passages:** a card quotes up to two passages of the matched version's
  body, each about 160 characters. The first is the best: the window whose
  query words weigh most, counting rare words more (by the same inverse
  document frequency that ranks hits) and counting words the card's title
  already shows only to break ties. The matches sit in the middle of the
  window, and the passage runs a little past 160 characters to finish a
  short word right after the last match, so a value after a matched label
  (`"fuse_ms": 42`) is not cut off. A second passage appears only when
  another part of the body holds a query word the first passage and the
  title lack; it may come from earlier in the body, as its offsets show.
  When the shown version carries a Blob (a Citation's `blob`), or cites a
  Citation that does, and that payload holds a query word, the card also
  quotes the payload's best passage on a `blob <id>:` line. A Blob that is a
  hit itself, or that an earlier card already quotes, is not quoted again.
  The Citation and the Blob must be current: not superseded, not written
  after `--as-of`, and not retracted unless `--retracted include` or `only`
  lets retracted records in; then the line reads `blob <id> (retracted):`.
  Query words found only in a quoted Blob count as matched, not missing.
- **Caps:** `--limit` 1 to 10, default 5. Each card holds at most 4 chain
  versions (the head and the shown and matched versions always appear), 3
  links per relation, and 6 code references. The cards aim for 300
  characters plus 600 per card, plus the length of every passage they
  quote: about 4,000 characters for five cards with one passage each.
  Passages are never cut, so quoting more never pushes out a chain or a
  link. Past the aim, the cards shrink in this order: link titles, the
  `efforts by match` line, the middle of each chain, then link entries. A
  relation with no entry left shows its count, as `cited_by +4`. When more
  records matched than are shown, the envelope has `complete: false` and
  `cap_reasons: ["find_limit"]`; there is no cursor, so narrow the query or
  raise `--limit`.

Each card has these lines:

```text
1. <id> | <kind>[:<kind field>] | <standing> [(head)] | <created date> | score <n>
   "<title>"
   matched: v<n> <id>                       (only when an older version matched)
   "…<best passage of the matched version>…" [chars <from>-<to> of <length>]
   "…<second passage, when the body matches in a second place>…" [chars <from>-<to> of <length>]
   blob <id> [(retracted)]: "…<passage of an attached Blob payload>…" [chars <from>-<to> of <length>]
   chain: v1 <id> <standing> <date> -> (n more) -> v4 <id> <standing> <date> (head)
   out: <relation> <id> "<title, 60 chars>" (<standing>), … +n more; <relation> +n
   in: <resolves|rejects|mitigates|evidence_for|cited_by|blob_of|derived_by> <id> "<title>" (<standing>)
   code: <paths, symbol() names, SHAs, #numbers the chain's records name>
```

The card header reads `find "<words>" in <effortId|all Efforts> (<searched> records searched, <matched> matched, <shown> shown)`, then `matched: … | missing: …`. The envelope adds `cards` (that Markdown) and `find`:
`{"query","effort_id","searched","matched","shown","terms":{"matched","missing"},"efforts"?,"hits":[{"id","matched_id"?,"score","via"?,"branch"?}],"path"?,"refs"?,"conflicts"?,"conflicts_total"?}`.
`find` shows only the top hits; use `state` or `records` to count.

### `proof find --path`: the records that govern a piece of code

`--path <target>` returns the records that govern that code, without
reading the code or the whole graph. Words are optional. The target is a
file or folder (relative to the current folder when it exists there, else
to the repository root), a symbol (`startFrame`, `startFrame()`,
`Planner.plan`), or both (`src/fuse.ts#budget`). A folder matches the files
under it. The repository root itself (`.`) is refused. Three sources tie a record to code, strongest first:

1. **Code Citations:** a Citation with `role: code` whose body names the
   code as `<path>`, `<path>#<symbol>`, or `<path>#<symbol>@<sha>`. The
   records that cite it govern the code, and so do the records it
   `derives_from`; a code Citation nothing cites stands for itself. A file
   anchor with no symbol covers every symbol in the file. Write one when a
   Decision or Constraint is about specific code:
   `{"type":"WriteCitation","effort":"<eff-id>","title":"Fuse budget","body":"src/fuse.ts#budget@1a2b3c4","role":"code"}`,
   then put its id in the record's `cites`.
2. **Commit trailers:** commits that touch the path and carry one or more
   `Proof: <id>` trailers (`git log` from the Proof root's repository;
   skipped quietly outside git, and for a bare symbol).
3. **Body text:** a record body that names the path as a whole token
   (`src/a.ts` does not match `src/a.tsx`), or the symbol as `name(`,
   `obj.name(`, or `#name`.

Each governed record resolves to its chain head, as `find` shows chains;
retracted records follow `--retracted`. With words, BM25 ranks the
governed set (records no word matches still list, after the matches).
Without words, the strongest tie ranks them, then the newest; the header
drops `score` and the `matched:` line. Default 5 cards, `--limit` up to 10.
Each card adds, after its title:

```text
   via: cites <cit-id>: src/fuse.ts#budget@1a2b3c4; commit 1a2b3c4 "<subject>" (on <older version id>); body names src/fuse.ts
```

The header reads `find ["<words>"] --path <target> in <scope> (<n> governing, <shown> shown)`.

**Renames and moves.** `--path` reads git history at HEAD with rename
detection, and the three ties above also count on the code's other names:

- a file at HEAD: its former names (`git log --follow -M`), back to the
  commit that added it, so a path reused after a move does not inherit the
  old file's names. A copy counts only as a split, when the same commit
  took lines out of the source; it reads `split into`;
- a folder at HEAD: the files and folders renamed into it, from the commits
  that added files under it. A folder move counts when the old folder is
  gone at HEAD and most of its files moved, and is followed back through
  earlier folder moves;
- a path HEAD lacks: its records as before, plus those on the name a rename
  gave it, and a `note:` that says where it went: `note: src/old.ts is not at HEAD: renamed to src/new.ts in 1a2b3c4 "<subject>".` or `deleted in …`;
- a symbol: with a file, the name it had before a rename (or, when the
  file lacks it, the name a rename gave it); a bare symbol HEAD's code
  lacks gets the name a rename in the last 500 commits gave it, and a note.
  An old name counts only if it is gone from the file and the commit that
  introduced the new one is where it first appears, so swapping a call from
  one function to another is no rename.

A tie on another name says how it connects:

```text
   via: cites <cit-id>: src/old.ts#run@1a2b3c4; anchored at src/old.ts, renamed to src/new.ts in 5d6e7f8 "Rename old.ts"
   via: commit 9a8b7c6 "<subject>", on src/old.ts, renamed to src/new.ts in 5d6e7f8 "Rename old.ts"
   via: body names lib/parser/, moved to lib/lang/parser/ in 0a1b2c3 "Move the parser"
```

A former name governs only code from before the move: a trailer counts
only before the commit that moved the code off it, an anchor whose sha is
at or after that commit does not count, and when HEAD has the old name
again, a body counts only if it was written before the move. For a split
whose source HEAD still has, an anchor on a symbol the target lacks stays
with the source.

### Code anchors at HEAD

Every find card, `get`, and digest that prints a code Citation checks the
first 2 anchors in its body against HEAD and the working tree, and prints
a line only for one that no longer holds. Code on disk that is not
committed yet is never stale.

```text
   anchor <cit-id> src/old.ts#run@1a2b3c4 is stale: file renamed to src/new.ts in 5d6e7f8 "Rename old.ts"; #run renamed to start in 2b3c4d5 "Rename run"; 3 commits touched it since 1a2b3c4: 7e8f9a0 "Retry 5 times", 2b3c4d5 (above), 5d6e7f8 (above)
   anchor <cit-id> src/a.ts#budget@1a2b3c4 changed since: 1 commit touched it since 1a2b3c4: 4c5d6e7 "Cap the fuse"
   path lib/parser/reader.py is stale: renamed to lib/lang/parser/reader.py in 0a1b2c3 "Move the parser"
```

- **Path:** not at HEAD or on disk: where it went after the anchor's sha
  (renamed, then renamed again; or deleted in which commit), or `not at HEAD or in its history`.
- **Symbol:** no longer a whole word in the file at HEAD or on disk: the
  commit that took its last use out (pickaxe on the file and its former
  names), and the name that replaced it on otherwise identical lines, or
  the files that commit added it to (`moved to …`), or `removed`.
- **Since:** with a sha, when the file at HEAD differs from the file at the
  sha: how many commits touched it, under any of its names, after the sha,
  and up to 3 of them; `(above)` marks one already named. A commit that
  touched another part of the file counts too, so this line says the file
  changed, not that the anchored code did. The record may describe the
  code as it was: read those commits first. A sha HEAD's history lacks
  (rebased or squashed) reads `the file at HEAD differs from <sha>, which is not in HEAD's history`.

The card's other lines are about the record; these are about the code. A
`path` line flags a path a body names that HEAD and the working tree lack.
A card shows at most 3 such lines. One read checks at most 8 anchors and 6
paths, and runs at most 60 local git commands (no fetch), trailer reads on
former names included; past that, it says nothing. Pickaxe searches cover
the last 500 commits. Path-limited walks have no cap on length, as for
any `git log -- <path>`: `--follow` on the target file, trailer reads, and
the deletion lookup for a path HEAD lacks.

### `proof find --refs`: what other branches propose

`--refs feat/a,origin/feat/b` or `--refs all` overlays records from other
git refs without checking them out (`git ls-tree` and `git cat-file`,
cached by commit). No git command it runs fetches: in a partial clone, a
record whose blob is not on disk is left out, and the `refs:` line says
`N records not available locally`. `all` skips local and remote branches
whose Proof folder HEAD's history already had, looks at the 50 others with
the newest commits (the `refs:` line says so when there are more), and
keeps those that change a Proof record, at most 12. Of a local branch and
its remote-tracking ref, `all` keeps only the newer one when one contains
the other. A ref counts only for the records it changed since its merge
base with HEAD, so a branch that is merely behind adds nothing, and a
version already in HEAD's history does not count, so a branch left behind
after a squash merge adds nothing. When two refs hold different versions
of a record and one is the version at the two refs' own merge base, as
with a branch stacked on another, the older version is dropped. With no
merge base (a shallow clone), HEAD stands in for it, the `refs:` line says
`no merge base: shallow clone?`, and `git fetch --deepen=200` finds one.
The base is the working tree. In the combined graph, supersession and invalidation come
from the forward edges (`supersedes`, `invalidates`) of every version; the
stored `superseded_by` and `invalidated_by` on either side are ignored. An
Issue's `resolved_by` is the union over every version, so a Decision that
resolves a question only on a branch still shows `in: resolves`. With
words, `find` searches the combined graph; without words or `--path`, the
cards are the records the refs add or change, newest first. Each card adds
a `branch:` line:

```text
   branch: main                                     (same as the working tree)
   branch: only on feat/a (draft #12 by ana)        (draft PR from prs.json)
   branch: differs on feat/a: proposed vs accepted  (<base standing> vs <ref standing>)
   branch: deleted on feat/a                        (the ref removed the record file)
   branch: only on feat/b; rival heads: <id> (only on feat/a)
```

The last form is a chain that two branches each supersede: the chain line
marks every head `(head)`, and no head replaces the other.

A `refs:` line after the header names each ref, its commit, and how many
records it adds, changes, or deletes (Efforts counted apart). The cards end
with `CONFLICTS (<n>)` and one `- ` line each (at most 12, then
`+n more`), or `CONFLICTS: none`. With `--effort`,
only that Effort's conflicts show. A conflict names its refs (`base` is the
working tree) and ids:

- two accepted Decisions on one question Issue, tied to it by
  `derives_from` or by the Issue's `resolved_by` on any side (a ref that
  accepted one and rejected the base's accepted one is a proposal, not a
  conflict);
- one Issue resolved by different records on two sides, when the line
  above does not already name it;
- one record superseded by two different records;
- one id with a different stored `state` or `status` on two sides that
  both changed it since they split (a change only one ref made shows on its
  card's `branch:` line instead);
- a retraction on one side of a record another side relies on
  (`derives_from`, `cites`, `evidence`), when that side added or changed
  the relying record since they split;
- two head compactions for one Effort.

`--refs` composes with `--path`, `--effort`, and `--all`; with `--path`,
commit trailers on the refs count too. The envelope's `find` adds `refs`
(`[{"name","sha","changed","pr"?}]`), `conflicts` (the same 12 the cards
list), and `conflicts_total`. Narrow with `--effort` or fewer refs to see
the rest.

`proof branches` lists the refs `--refs all` would overlay, with their
pull requests. Pull requests come from a gitignored
`.flatbread/proof/prs.json` (an array of
`{number, headRefName, isDraft, author}`). A ref matches a pull request
whose `headRefName` is its branch, or is its branch with a remote name in
front (`origin/feat/a`). `proof branches --refresh-prs`
rewrites it from `gh pr list --json number,headRefName,isDraft,author`, the
only step that uses the network; it fails with a plain message when `gh` is
missing or not signed in, and warns when the file is not gitignored.

### `proof state`

`state` shows where one Effort stands, in one read of at most about 4,000
tokens. It is built from frontmatter and links only, never from body text,
so it holds no facts or measurements: use `find` for those. It takes no
query and no `--as-of` (it refuses one); its lines date each change, and
`find --as-of` shows the version current at a date.

The envelope adds `markdown` (the state, read it inline) and `state`:
`{"effort_id","records","live","sections":[{"heading","total","shown"}],"capped"}`.
The Markdown has these sections, in order:

- **Counts:** every record in the Effort by kind and standing, with Issues,
  Findings, and Constraints also by their own `kind` (`blocker`, `question`,
  `hard`, …), how many Decisions were ever reopened, and how many records
  are live or retracted. Exact numbers, never cut.
- **Open Issues and blockers:** each open Issue, blockers first, with the
  live Decisions that derive from it (`gates`), other live records built on
  it, and what it comes from.
- **Risks:** realized and open Risks with their evidence, mitigation, and
  source; then mitigated and accepted ones, one line each.
- **Constraints in force:** the live Constraints, by kind.
- **Contested topics:** one entry per question Issue with more than one
  Decision (every version counted, retracted ones left out), and per record
  with more than one version. Letters (`[a]`, `[b]`) name the records
  shown: the live ones (`now`), then each replaced, rejected, or disproved
  one with what did it and when, and any reopening, each group newest
  first. Open contests come first, then the most recently changed.
- **Closed without a fix:** Issues closed `deferred` or `wontfix`, or
  resolved by no Decision or Finding.
- **Dead evidence:** each superseded, invalidated, rejected, or retracted
  record that live records still derive from, cite, or give as evidence,
  with those live records and, for every dead record but a replaced
  version, the live records one link further. The record that overturned it is not counted as
  resting on it.
- **Head compaction:** shown when the Effort has one. Whether it is stale
  and why, with the rule, and the exact number of records that differ from
  the live set it covers, then up to 10 of them as `id (new)` or
  `id (before -> now)`. A large Effort cuts that list first, to 5 and then
  none; the count stays, and the line names `proof get <id>`, which lists
  up to 25 of them.
- **Lifecycle:** dated changes no section above shows, the most recently
  changed first:
  closed Issues other than settled questions, proposed or reopened
  Decisions, and records shown wrong or replaced.
- **Retractions:** each retracted record with its date and reason. None is
  live.

A date on a change is the `created_at` of the record that made it, since
standings carry no dates of their own. When that record already existed,
as when a Supersede links two old records, the change came on or after
that date. Records with nothing to report, such
as a question Issue resolved by its one accepted Decision, appear only in
the counts. Citations and Blobs have no live or dead standing, so the live
total leaves them out. On a large Effort the lists shrink to fit, cutting
lifecycle, retractions, and the head compaction's list first and counts
never. Any cut list, a whole
section's or one inside an entry, ends with `… N more` or `and N more`,
and then `cap_reasons` holds `state_limit`. In `state.sections`, `total`
counts a section's entries in full and `shown` those it prints; for
Constraints in force and Dead evidence an entry is one Constraint or one
dead record.

### Consistency flags

- `--strict-min-generation <token>`: serve at or after that journal
  generation, or fail. `--timeout-ms <ms>` bounds the wait (default 3000).
- Errors (stderr JSON, exit 1): `PROOF_GENERATION_WAIT_TIMEOUT`,
  `PROOF_INVALID_CURSOR` (cursor reused across a different query or
  generation), `PROOF_DANGLING_RELATION` (a stored relation target is missing),
  and `PROOF_CROSS_EFFORT_RELATION` (a stored state-changing or `cites`
  target belongs to another Effort).

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
- Do not `git rm` Proof records to correct the graph. Use `Retract`.
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
