# `@flatbread/effort-graph`

Git-native memory for coding agents.

An agent ends its session and forgets why it made the choices it made, so the
next session reopens a settled question or quietly undoes a decision that had a
perfectly good reason behind it. This package records that reasoning as markdown
documents inside your repository, right beside the code it explains, which means
you commit it, diff it, review it, and revert it like anything else you version.

Installing it gives you three things:

- **Eight record types.** An agent opens an **Effort** covering the work it is
  doing, then records whatever it learns against that Effort: **Issues**,
  **Findings**, **Decisions**, **Constraints**, **Risks**, **Citations**, and
  **Blobs**.
- **Fifteen typed writes.** Each one creates or updates markdown documents on
  disk, and the writer validates every relationship between records before
  saving anything. A write that touches several files either finishes completely
  or leaves nothing behind.
- **A Flatbread content model.** `effortGraphContent()` registers those eight
  record types in a Flatbread configuration, so the very same files return as a
  typed graph you can query and paginate through.

## Install

Add the skill so an agent knows the commands, and then add the package itself:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/v1.0.0/packages/effort-graph/skills/effort-graph --skill effort-graph
npm install --save-dev flatbread@1.0.0
```

The tag and version above come from `gitTag` and `flatbreadVersion` in
[`skills/effort-graph/release.json`](./skills/effort-graph/release.json), and
[`skills/effort-graph/setup.md`](./skills/effort-graph/setup.md) carries the
equivalent commands for anyone installing through `pnpm`, `yarn`, or `bun`
instead.

Then add the content model to your configuration:

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

Then check the setup, where `flatbread effort bootstrap` reports whatever is
still missing, whether that is the config entry or either ignore rule below. It
only reports and never edits your files, and adding `--verify` makes it exit
nonzero when something is missing, so you can run it in CI.

```bash
$ flatbread effort bootstrap
{"status":"ready","config_path":"flatbread.config.js","graph_root":".flatbread-efforts","requirements":[]}
```

Every command emits one JSON object to stdout, while errors emit JSON to stderr
and terminate with exit code 1.

## The eight record types

Every record except an Effort belongs to exactly one Effort, and every
identifier encodes its own kind, so `dec-…` always denotes a Decision.

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

A Risk additionally carries `likelihood` and `severity`, and each of those two
fields accepts exactly one of `low`, `medium`, or `high`.

Four kinds of link connect these records:

- `derives_from` points at the evidence or context a record answers.
- `supersedes` replaces a record of the same kind.
- `invalidates` says an earlier Finding or Decision was wrong.
- `cites` links an Issue, Finding, Decision, Constraint, or Risk to a Citation.

You write those four yourself, and the writer materializes the reverse
relationships, `superseded_by` and `invalidated_by`, on the opposite end for
you.

A Citation on its own is valid, and its body can be nothing more than a URL,
while its optional `blob` field attaches a bigger payload and its optional
`role` describes how it relates, such as `evidence` or `context`. Records never
cite a Blob directly, but instead cite a Citation that optionally points at one.

## Writing: one command, fifteen mutations

Pass the payload as a single JSON argument:

```bash
$ flatbread effort write '{"type":"CreateEffort","title":"Recipe search without a database","body":"Add search over the recipe collection using the files we already have."}'
{"generation":"1","artifacts":[{"id":"eff-recipe-search-without-a-database--bpbj5mecw93526df","path":"efforts/eff-recipe-search-without-a-database--bpbj5mecw93526df.md","operation":"created"}],"touched":[…]}
```

Keep two things from that response: `artifacts[0].id` is the identifier later
writes use to reference this record, and `generation` is the token a read passes
back to request data at least this fresh.

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

- **You cannot set a lifecycle state when you create a record.** A Decision
  starts `proposed`, an Issue starts `open`, a Risk starts `open`. Use the
  lifecycle mutations to move them along.
- **`AcceptDecision` rejects siblings by default.** It sets every other proposed
  Decision in the same Effort to `rejected`. Pass `"rejectSiblings": false` when
  you want to leave the competing proposals open.
- **You cannot add a citation later.** Write the Citation first, then pass
  `cites: ["cit-…"]` when you create the record that uses it.

## Reading: five bounded queries

A read does not return the records themselves, but rather a small JSON envelope
holding a short summary, page information, up to ten follow-up queries your
agent can run, and a path to a markdown digest. That digest contains the records
themselves, and your agent either spends a single read on it or greps it for
whatever it needs.

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

Every read obeys the same limits, which is precisely what keeps recall
inexpensive:

| Limit                 | Value                                      |
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
Citations by default, while Blob bodies remain excluded from browse digests
altogether, so retrieve one with `effort get <blb-id>`.

**Freshness.** Reads are eventual by default, so right after a write you pass
the generation it returned as `--strict-min-generation 3`, which gets you either
fresh data or an error rather than a stale answer wearing a fresh face. The wait
happens on the server, so don't build a polling loop around it, and
`--timeout-ms` overrides the 3000 ms default.

**Paging.** `next_cursor` is opaque and only works for the same query at the
same generation, so pass it straight back as `--cursor`.

## Where records live

`effortGraphContent()` stores the graph under `.flatbread-efforts` in your
project root, and passing a path chooses another root instead, as in
`effortGraphContent('path/to/graph')`.

```text
.flatbread-efforts/
  efforts/  issues/  findings/  decisions/
  constraints/  risks/  citations/  blobs/
  .journal/            # working state, do not commit
```

Two directories hold working state that Git should never track, namely the write
journal at `<root>/.journal` and the derived read cache at
`.flatbread/effort-graph/read-cache`. Nothing adds either one to `.gitignore`
for you, so add these lines yourself:

```gitignore
**/.flatbread-efforts/.journal/
**/.flatbread/effort-graph/read-cache/
```

For a custom root, replace `.flatbread-efforts` with that root, though the read
cache path stays the same either way, and `flatbread effort cache prune` deletes
digests older than 24 hours or exceeding a 100 MiB ceiling.

## Durability

Writes travel through a journal, so a change touching several files either
finishes completely or leaves nothing behind, and if the process dies partway
through, the following run restores the unfinished files to their previous
contents. Only one writer holds the lease at any moment, and a `generation`
counter increments with every published write, which is the number
`--strict-min-generation` compares against.

## What the writer refuses

The writer validates everything before it touches disk, so a broken graph never
reaches your working tree. It rejects:

- an id it doesn't know, a duplicate id, or an id in the wrong format
- two Efforts with the same slug
- a `cites` entry that isn't a Citation in the same Effort
- a `Citation.blob` that isn't a Blob in the same Effort
- a `supersedes` between two different record kinds, or a target that is already
  superseded
- a record that links to itself, or a link that already exists
- a lifecycle move that doesn't apply: resolving an Issue that isn't open,
  accepting a Decision that isn't proposed, mitigating a Risk with a Decision
  that isn't accepted, or marking a Risk `realized` with no Finding in its
  evidence

Flatbread then validates those relationships a second time through `refs` when
it indexes the files.

## The domain model and the packaged skill

Read [`skills/effort-graph/glossary.md`](./skills/effort-graph/glossary.md) for
the complete domain model, including the operational concepts it deliberately
declines to represent as records.

The packaged Agent Skill is in `skills/effort-graph/`:

| File           | Covers                                                       |
| -------------- | ------------------------------------------------------------ |
| `SKILL.md`     | The session workflow an agent follows to write and recall    |
| `reference.md` | Every mutation payload, read flag, and limit                 |
| `glossary.md`  | The record types, the links, and what is left out on purpose |
| `setup.md`     | First activation, and installs for each package manager      |
| `release.json` | The pinned git tag and Flatbread version                     |

The repository copy in `.agents/skills/effort-graph/` is generated from those
files, so run `pnpm skills:sync` from the repository root after changing the
skill.

For anyone who would rather look at a graph than read one, `flatbread start --open` serves the [explorer](../explorer/README.md), which draws the records
alongside the relationships connecting them.
