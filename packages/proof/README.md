# `@flatbread/proof`

Proof keeps coding agents and the people they work with aligned. It stores
the facts and reasons that must outlive one chat session as a lightweight,
portable, Git-tracked knowledge graph.

Each record is a Markdown file in your repository. The next agent session and
your coworkers read the same open questions, evidence, decisions,
constraints, and risks. Git supplies the collaboration tools you already
know: branches, diffs, reviews, history, and reverts.

Proof is built on [Flatbread](https://github.com/FlatbreadLabs/flatbread),
which turns files in Git into a typed relational graph. This package holds
the Proof record model, writer, reader, and packaged agent skill. End users
install the public `flatbread` package: it provides the `flatbread proof`
CLI and re-exports `proofContent()`.

Proof is not a transcript store, task tracker, hosted memory service, or
authoring interface. It keeps durable project knowledge — the small set of
reasons a future session or coworker would otherwise have to reconstruct.

## The record model

An **Effort** anchors one coherent thread of work — a feature, migration,
investigation, or refactor. Every other record belongs to exactly one Effort,
which keeps reads small and gives each piece of evidence a clear home.

| Record         | What it holds                                               |
| -------------- | ----------------------------------------------------------- |
| **Effort**     | One coherent thread of work                                 |
| **Issue**      | A question, defect, gap, or blocker that needs an answer    |
| **Finding**    | An observation grounded in code, users, or runtime behavior |
| **Decision**   | A commitment among alternatives                             |
| **Constraint** | A hard or soft boundary on the decision space               |
| **Risk**       | A possible negative outcome, with likelihood and severity   |
| **Citation**   | An external source or reference, often a URL                |
| **Blob**       | Attached content such as a document, JSON payload, or image |

Typed relations preserve the reasoning between records. A Decision can
`derive_from` the Findings, Constraints, and Issues it responds to. A Finding
can `invalidate` an older Finding or Decision. Records cite evidence through
`cites`, which names Citation records; a Citation can attach one Blob. Proof
validates every link and keeps it within one Effort. The
[Proof glossary](./skills/proof/glossary.md) gives the exact meanings.

## First success

Proof requires Node 20.19 or newer. Run its commands from the directory that
contains your project's one `flatbread.config.*` file.

### 1. Install the skill and the matching runtime

The skill and the `flatbread` package must use the same release. Read
[`skills/proof/release.json`](./skills/proof/release.json) for the current
`gitTag` and `flatbreadVersion` and use those
values exactly:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/v1.1.0/packages/proof/skills/proof --skill proof
npm install --save-dev flatbread@1.1.0
```

`npx skills add` runs the `skills` CLI, which copies the pinned skill folder
from that release tag into your project so agent tools can load it. The
[setup guide](./skills/proof/setup.md) gives the equivalent pnpm, Yarn, and
Bun commands.

### 2. Add the Proof content model

Create or update `flatbread.config.js`, keeping any content entries the
project already has:

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
  content: [
    // Keep existing entries here.
    ...proofContent(),
  ],
});
```

`proofContent()` adds eight collections under `.flatbread-proof/`. Pass a
path — `proofContent('path/to/graph')` — when the project needs another
root. Proof read and write commands require this complete preset in the
config; `bootstrap` reports when it is missing or incomplete.

### 3. Ignore the working state

Add two lines to `.gitignore`. Proof records stay tracked; only the write
journal and the derived read cache stay out of Git:

```gitignore
**/.flatbread-proof/.journal/
**/.flatbread/proof/read-cache/
```

For a custom graph root, replace `.flatbread-proof` in the first line. The
read cache path never changes.

### 4. Verify the setup

```bash
npx flatbread proof bootstrap
npx flatbread proof bootstrap --verify
```

The first command reports what is still missing — the config entry or either
ignore rule. The second prints one JSON object with `"status":"ready"` when
activation is complete, and exits nonzero when it is not, which makes it
usable in CI. Bootstrap is report-only: it never creates or edits project
files.

### 5. Write and read the first record

Create an Effort:

```bash
npx flatbread proof write '{"type":"CreateEffort","title":"Choose a search index","body":"Track evidence, constraints, decisions, and open work."}'
```

The command prints one JSON object. Save `artifacts[0].id` — later records
name this Effort by that ID. Then list active Efforts:

```bash
npx flatbread proof list --status active
```

Every read returns a bounded JSON envelope. Open the Markdown file named by
its `artifact_path` to read the digest.

## One session loop

An agent resuming work follows the same bounded loop each time.

1. **Resume.** `flatbread proof list --status active` finds the live
   Efforts. For each relevant one,
   `flatbread proof records <effortId> --kinds issue,decision --limit 10`
   summarizes its state, and
   `flatbread proof blocking-decisions <effortId>` narrows to proposed
   Decisions that derive from open blocker Issues.
2. **Zoom in only when needed.** Browse digests excerpt record bodies. Read
   one full body with `flatbread proof get <id>`, or follow a superseded
   record to its current head with `flatbread proof get <id> --resolve head`.
   Reads cap at 25 primary records, one relation hop, 50 displayed edges,
   and a 64 KiB digest; check `complete`, `page.has_more`, and `cap_reasons`
   in the envelope before treating a digest as the whole story.
3. **Write only durable knowledge.** All 16 typed mutations go through one
   command: `flatbread proof write '<json>'`. Before a create or a body edit
   adds a claim, the packaged skill applies a four-part gate — future need,
   durable effect, causal value, and unique signal — and writes only when
   all four hold. That gate is agent policy; the CLI does not enforce it.
   Routine progress notes belong in the pull request or issue instead.
4. **Read your own write when it matters.** Each mutation returns a
   `generation` token. Pass it back as
   `--strict-min-generation <generation>` to get data at or after that
   generation; Proof waits up to 3000 ms by default, then fails with
   `PROOF_GENERATION_WAIT_TIMEOUT`. Do not build a polling loop.
5. **Close the loop.** Use lifecycle mutations when the team commits to a
   choice or resolves an Issue. One default deserves care: `AcceptDecision`
   sets `rejectSiblings` to `true`, which rejects every other proposed
   Decision in the same Effort — pass `"rejectSiblings":false` unless that
   is what you mean. When a record should never have entered the graph, use
   `Retract`: the file and reason stay in history, but browse reads omit the
   record. Do not delete record files or hand-edit frontmatter.

## Files, the journal, and recovery

Tracked records live in eight directories under the graph root:

```text
.flatbread-proof/
├── efforts/
├── issues/
├── findings/
├── decisions/
├── constraints/
├── risks/
├── citations/
└── blobs/
```

A single mutation may touch several of these files, because Proof
materializes reverse links and lifecycle changes together. The writer
validates IDs, record kinds, and Effort boundaries first, then applies the
change through a journal at `<root>/.journal/`.

If a process stops mid-write, the journal makes the change safe — but
recovery has an exact timing: **a later `flatbread proof write` or a
Flatbread live-server start runs recovery; a read command alone does not.**
Recovery rolls back an uncommitted change or finishes publishing a committed
one. The generation token advances only after a write is published. Never
edit the journal directory.

Record bodies may be edited by hand — the reindexer validates and repairs
projections — but hand edits bypass the journal and do not advance its
generation token. Frontmatter must only change through `flatbread proof write`.

## Working with coworkers

Commit the tracked `.flatbread-proof/` records with the code they explain.
Reviewers then see the reasoning and the implementation in one pull request,
and the next agent session starts from the merged graph. Proof does not
create Git commits, resolve merge conflicts, or run a hosted multi-writer
service; your normal Git workflow decides when records are shared.

## Command map

| Goal                          | Command                                                             |
| ----------------------------- | ------------------------------------------------------------------- |
| Check setup                   | `flatbread proof bootstrap --verify`                                |
| Find active work              | `flatbread proof list --status active`                              |
| Browse one Effort             | `flatbread proof records <effortId>`                                |
| Read one full record          | `flatbread proof get <id>`                                          |
| Follow selected links         | `flatbread proof relations <effortId> <fromId> --relations <names>` |
| Find choices tied to blockers | `flatbread proof blocking-decisions <effortId>`                     |
| Apply a typed mutation        | `flatbread proof write '<json>'`                                    |
| Prune old derived digests     | `flatbread proof cache prune`                                       |

Every command prints one JSON object to standard output; errors print JSON
to standard error and exit with status 1. The
[full API reference](./skills/proof/reference.md) lists all 16 mutations,
read flags, lifecycle states, relation names, paging rules, and error codes.

## Optional explorer

With a complete `proofContent()` preset in config, the `flatbread` package
can serve a visual graph explorer:

```bash
npx flatbread start --watch --open
```

When the explorer's prebuilt assets are present, it serves at
`http://localhost:5057/` and the GraphQL endpoint stays at
`http://localhost:5057/graphql`. When those assets are missing, `--open`
opens the GraphQL path instead.

## Package and skill maintenance

The canonical Agent Skill lives in [`skills/proof/`](./skills/proof/):
[`SKILL.md`](./skills/proof/SKILL.md) for the agent workflow and write gate,
[`setup.md`](./skills/proof/setup.md) for activation,
[`reference.md`](./skills/proof/reference.md) for the full API, and
[`glossary.md`](./skills/proof/glossary.md) for record and relation
meanings. The repository copy at `.agents/skills/proof/` is generated from
these files — do not edit it by hand. After changing the canonical skill in
this monorepo, run `pnpm skills:sync`, then `pnpm skills:check` and
`pnpm skills:pack-check`.
