# `@flatbread/effort-graph`

Git-native memory for coding agents.

An agent closes its session and forgets why it chose what it chose. The next
session reopens a settled question, or quietly undoes a decision somebody made
for a good reason. This package fixes that by writing the reasoning down as
markdown files in your repository, next to the code it explains, where you can
commit it, diff it, review it in a pull request, and revert it.

Installing it gives you three things:

- **Eight record types.** An agent opens an **Effort** for the work it is doing,
  then writes what it learns against that Effort: **Issues**, **Findings**,
  **Decisions**, **Constraints**, **Risks**, **Citations**, and **Blobs**.
- **Fifteen typed writes.** Each one creates or updates markdown files on disk.
  The writer checks the links between records before it commits anything, and a
  write that touches several files either finishes in full or leaves nothing
  behind.
- **A Flatbread content model.** `effortGraphContent()` adds those eight record
  types to a Flatbread config, so the same files come back as a typed graph you
  can query and page through.

## Install

Add the skill so an agent knows the commands, then the package:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/v1.0.0/packages/effort-graph/skills/effort-graph --skill effort-graph
npm install --save-dev flatbread@1.0.0
```

The tag and version come from `gitTag` and `flatbreadVersion` in
[`skills/effort-graph/release.json`](./skills/effort-graph/release.json). See
[`skills/effort-graph/setup.md`](./skills/effort-graph/setup.md) for the
equivalent `pnpm`, `yarn`, and `bun` commands.

Add the content model to your config:

```js
// flatbread.config.js
import {
  defineConfig,
  sourceFilesystem,
  transformerMarkdown,
  effortGraphContent,
} from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown(),
  content: [...effortGraphContent()],
});
```

Then check the setup. `flatbread effort bootstrap` reports what is still
missing — the config entry, or either ignore rule below. It only reports; it
never edits your files. `--verify` exits nonzero when anything is missing, which
makes it usable in CI.

```bash
$ flatbread effort bootstrap
{"status":"ready","config_path":"flatbread.config.js","graph_root":".flatbread-efforts","requirements":[]}
```

Every command prints one JSON object to stdout. Errors print JSON to stderr and
exit 1.

## The eight record types

Every record except an Effort belongs to exactly one Effort. Ids carry their
kind, so `dec-…` is always a Decision.

| Record         | Id      | What it holds                                        | Lifecycle field and values                                              |
| -------------- | ------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| **Effort**     | `eff-…` | One thread of work: a feature, migration, or spike   | `status`: `active`, `paused`, `completed`, `abandoned`                  |
| **Issue**      | `iss-…` | A question, defect, gap, or blocker                  | `status`: `open`, `resolved`, `deferred`, `wontfix`                     |
| **Finding**    | `fnd-…` | A grounded observation about code, users, or runtime | none                                                                    |
| **Decision**   | `dec-…` | A commitment among alternatives                      | `state`: `proposed`, `accepted`, `rejected`, `superseded`, `deprecated` |
| **Constraint** | `con-…` | A boundary that limits the options                   | `kind`: `hard`, `soft`                                                  |
| **Risk**       | `rsk-…` | A prospective bad outcome                            | `state`: `open`, `mitigated`, `realized`, `accepted`                    |
| **Citation**   | `cit-…` | An external source, often just a URL                 | none                                                                    |
| **Blob**       | `blb-…` | Attached content: a document, JSON, an image         | none                                                                    |

A Risk also carries `likelihood` and `severity`, each `low`, `medium`, or
`high`.

Four edges connect them. `derives_from` names the upstream evidence or context a
record answers. `supersedes` replaces a record of the same kind. `invalidates`
says an earlier Finding or Decision was wrong. `cites` links an Issue, Finding,
Decision, Constraint, or Risk to a Citation. You write those forward edges; the
writer materializes `superseded_by` and `invalidated_by` for you.

A Citation body alone is valid. Its optional `blob` field attaches a long
payload, and its optional `role` says how it relates — `evidence`, `context`,
and so on. Records never cite a Blob directly; they cite a Citation that points
at one.

## Writing: one command, fifteen mutations

Pass the payload as a single JSON argument:

```bash
$ flatbread effort write '{"type":"CreateEffort","title":"Recipe search without a database","body":"Add search over the recipe collection using the files we already have."}'
{"generation":"1","artifacts":[{"id":"eff-recipe-search-without-a-database--bpbj5mecw93526df","path":"efforts/eff-recipe-search-without-a-database--bpbj5mecw93526df.md","operation":"created"}],"touched":[…]}
```

Keep two things from that response. `artifacts[0].id` is how the next write
links to this record. `generation` is how a read asks for data at least this
fresh.

| Mutation          | What it does                                                           |
| ----------------- | ---------------------------------------------------------------------- |
| `CreateEffort`    | Opens an Effort, `status: active`                                      |
| `SetEffortStatus` | Moves an Effort between statuses; `completed` and `abandoned` are ends |
| `WriteIssue`      | Opens an Issue, `status: open`; needs a `kind`                         |
| `WriteFinding`    | Records a Finding; needs a `kind`                                      |
| `WriteDecision`   | Proposes a Decision, `state: proposed`                                 |
| `WriteConstraint` | Records a `hard` or `soft` Constraint                                  |
| `WriteRisk`       | Opens a Risk with `likelihood` and `severity`                          |
| `WriteCitation`   | Records a source; optional `blob` and `role`                           |
| `WriteBlob`       | Stores attached content                                                |
| `Supersede`       | Replaces a record with a newer one of the same kind                    |
| `Invalidate`      | Has a Finding declare an earlier Finding or Decision wrong             |
| `ResolveIssue`    | Closes an Issue as `resolved`, `deferred`, or `wontfix`                |
| `AcceptDecision`  | Commits a proposed Decision                                            |
| `MitigateRisk`    | Points an open Risk at the accepted Decision that handles it           |
| `SetRiskState`    | Marks a Risk `realized` or `accepted`, with evidence                   |

Full payload shapes are in
[`skills/effort-graph/reference.md`](./skills/effort-graph/reference.md). Three
rules catch people out:

- **You cannot set a lifecycle state on create.** A Decision starts `proposed`,
  an Issue starts `open`, a Risk starts `open`. Use the lifecycle mutations to
  move them.
- **`AcceptDecision` defaults to `rejectSiblings: true`**, which rejects every
  other proposed Decision in the same Effort. Pass `false` unless you mean to
  close the competing proposals.
- **You cannot add a citation later.** Write the Citation first, then pass
  `cites: ["cit-…"]` when you create the record that uses it.

## Reading: five bounded queries

A read does not pour records into your context. It returns an envelope: a short
summary, page info, up to ten executable follow-up queries, and a path to a
rendered markdown digest. The digest holds the records — one file to read once or
grep.

```bash
$ flatbread effort blocking-decisions eff-recipe-search-without-a-database--bpbj5mecw93526df
{
  "summary": "1 record; proposed 1; complete",
  "artifact_path": ".flatbread/effort-graph/read-cache/3/c98912e9….md",
  "artifact_sha256": "55f72ee4…",
  "served_generation": "3",
  "consistency": { "mode": "eventual", "min_generation": null },
  "page": { "returned": 1, "has_more": false, "next_cursor": null },
  "hints": [
    "getRecord(\"dec-weight-ingredient-hits-above-title-hits--9bxx105d45e80s2b\")",
    "effortRecords(\"eff-recipe-search-…\", { kinds: [\"issue\"], where: { kind: [\"blocker\"], status: [\"open\"] } })"
  ]
}
```

| Command                                | Answers                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `effort list`                          | Which Efforts are live? Defaults to `--status active`                         |
| `effort records <effortId>`            | What is in this Effort? Filter by `--kinds`, `--status`, `--state`, `--since` |
| `effort relations <effortId> <fromId>` | What is one hop from this record along `--relations`?                         |
| `effort blocking-decisions <effortId>` | Which proposed Decisions answer an open `blocker` Issue?                      |
| `effort get <id>`                      | One record, full body; `--resolve head` follows supersession to the tip       |

Every read obeys the same caps, which is what keeps recall cheap:

| Cap                   | Value                                      |
| --------------------- | ------------------------------------------ |
| Records in one digest | 25                                         |
| Relation hops         | 1, and only along `--relations` you name   |
| Edges shown           | 50                                         |
| Digest size           | 64 KiB                                     |
| Body on a browse read | 600 characters or 12 lines, then truncated |
| Body on `effort get`  | full                                       |
| Summary               | 640 characters                             |
| Follow-up hints       | 10                                         |
| `--limit` on a page   | 1 to 25                                    |

`effort records` returns Issues, Findings, Decisions, Constraints, Risks, and
Citations by default. Blob bodies stay out of browse digests; read one with
`effort get <blb-id>`.

**Freshness.** Reads are eventual by default. Straight after a write, pass the
generation it returned as `--strict-min-generation 3`. You then get either fresh
data or an error — never a silently stale answer. The wait happens server-side,
so do not build a polling loop. `--timeout-ms` moves the 3000 ms default.

**Paging.** `next_cursor` is opaque and valid only for the same query at the same
generation. Pass it back as `--cursor`.

## Where records live

`effortGraphContent()` stores the graph under `.flatbread-efforts` in your
project root. Pass a path to choose another root:
`effortGraphContent('path/to/graph')`.

```text
.flatbread-efforts/
  efforts/  issues/  findings/  decisions/
  constraints/  risks/  citations/  blobs/
  .journal/            # working state, do not commit
```

Two paths hold working state Git should not track: the write journal at
`<root>/.journal`, and the derived read cache at
`.flatbread/effort-graph/read-cache`. Nothing adds them to `.gitignore` for you,
so add these lines yourself:

```gitignore
**/.flatbread-efforts/.journal/
**/.flatbread/effort-graph/read-cache/
```

For a custom root, replace `.flatbread-efforts` with that root. The read cache
path stays the same. `flatbread effort cache prune` drops digests older than 24
hours or above a 100 MiB ceiling.

## Durability

Writes go through a journal, so a change that touches several files either
finishes in full or leaves nothing behind. If the process dies mid-write, the
next run restores the earlier contents of the unfinished change. One writer holds
a lock at a time, and a `generation` number rises with every published write,
which is what `--strict-min-generation` compares against.

## What the writer refuses

The writer validates before it touches disk, so a broken graph never reaches
your working tree. It rejects an unknown id, a duplicate id, a malformed id, a
duplicate Effort slug, a `cites` entry that is not a Citation in the same
Effort, a `Citation.blob` that is not a Blob in the same Effort, a `supersedes`
across two different kinds, a target that is already superseded, a self-edge, a
duplicate edge, and any lifecycle move that does not apply — resolving an Issue
that is not open, accepting a Decision that is not proposed, mitigating a Risk
with a Decision that is not accepted, or marking a Risk `realized` without a
Finding in its evidence. Flatbread's own `refs` validation then checks the links
again when it indexes the files.

## The domain model and the packaged skill

Read [`skills/effort-graph/glossary.md`](./skills/effort-graph/glossary.md) for
the portable Effort Graph domain model, including what it deliberately does not
model.

The packaged Agent Skill is in `skills/effort-graph/`:

| File           | Covers                                                      |
| -------------- | ----------------------------------------------------------- |
| `SKILL.md`     | The session workflow an agent follows to journal and recall |
| `reference.md` | Every mutation payload, read flag, and cap                  |
| `glossary.md`  | The primitives, the edges, and the intentional non-models   |
| `setup.md`     | First activation, per-package-manager install               |
| `release.json` | The pinned git tag and Flatbread version                    |

The repository copy in `.agents/skills/effort-graph/` is generated from those
files. Run `pnpm skills:sync` from the repository root after changing the skill.

To look at a graph rather than read it, `flatbread start --open` serves the
[explorer](../explorer/README.md), which draws records and edges.
