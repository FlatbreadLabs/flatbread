# `@flatbread/effort-graph`

**Durable, reviewable memory for coding agents — stored as markdown in your repo.**

Your agent makes hundreds of decisions during a session. When the session ends, those decisions evaporate. The next session re-derives them (badly), or worse, contradicts them without knowing they existed. The Effort Graph fixes this by making an agent's reasoning a first-class artifact you commit, diff, review, and query — just like code.

## What it gives you

1. **Structured record types.** An agent anchors its work to an **Effort**, then writes what it learns: **Issues**, **Findings**, **Decisions**, **Constraints**, **Risks**, **Citations**, and **Blobs**.
2. **Atomic write operations.** Mutations produce markdown files on disk. A journaled writer ensures multi-file changes either complete in full or leave nothing behind.
3. **A Flatbread content model.** `effortGraphContent()` plugs into your `flatbread.config.js`, so the same files come back as a typed, queryable graph.

Every record is a markdown file under `.flatbread-efforts/`. You review agent reasoning in pull requests the same way you review code.

## Quick start

```bash
# 1. Install
npm install --save-dev flatbread@1.0.0

# 2. Install the agent skill
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/v1.0.0/packages/effort-graph/skills/effort-graph --skill effort-graph

# 3. Add to your flatbread config
# (see Configuration below)

# 4. Verify everything is wired
npx flatbread effort bootstrap --verify
```

For `pnpm`, `yarn`, or `bun` equivalents, see [setup.md](./skills/effort-graph/setup.md).

## Configuration

Add `effortGraphContent()` to your Flatbread config alongside any existing content entries:

```js
import {
  defineConfig,
  sourceFilesystem,
  transformerMarkdown,
  effortGraphContent,
} from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown(),
  content: [
    // your existing collections...
    ...effortGraphContent(),
  ],
});
```

Pass a custom path to store the graph elsewhere: `effortGraphContent('path/to/graph')`.

Add these to `.gitignore`:

```gitignore
**/.flatbread-efforts/.journal/
**/.flatbread/effort-graph/read-cache/
```

Run `flatbread effort bootstrap` to check what's missing. Add `--verify` to fail in CI when something isn't wired.

## The domain model

The Effort Graph is persistent, queryable memory for long-horizon software work. Each primitive is a Flatbread collection; instances are records; cross-primitive references are relations in frontmatter.

### Primitives

| Record         | What it represents                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Effort**     | The anchor for one thread of work — a feature, migration, spike, or refactor. Every other record belongs to exactly one Effort.                        |
| **Issue**      | Something needing attention: a question, defect, gap, or blocker. Reactive — resolved by Decisions or Findings.                                        |
| **Finding**    | A grounded observation about code, users, or runtime. Cites evidence. Can resolve Issues, inform Decisions, surface Risks, or invalidate past records. |
| **Decision**   | A commitment among alternatives. Proposed → accepted → (possibly superseded or deprecated). Cites the Findings, Constraints, and Risks it weighed.     |
| **Constraint** | A hard or soft boundary limiting the decision space. Known limits, not prospective outcomes.                                                           |
| **Risk**       | A prospective negative outcome with likelihood and severity. Open → mitigated / realized / accepted.                                                   |
| **Citation**   | An external source or reference. Other records link here through `cites`. Body can be just a URL; optional `blob` attaches stored content.             |
| **Blob**       | Stored content of any format (markdown, JSON, images). Accessed via Citations, omitted from digests by default.                                        |

### Edges between records

- **`derives_from`** — causal upstream evidence or context
- **`supersedes`** — replaces a record of the same type
- **`invalidates`** — marks a record as wrong
- **`cites`** — links to Citations (which may point to Blobs)

All edges stay within the same Effort. Reverse edges (`superseded_by`, `invalidated_by`) are materialized automatically.

For the full glossary, see [`skills/effort-graph/glossary.md`](./skills/effort-graph/glossary.md).

## Write operations

Writes go through `flatbread effort write`. Version 1 supports:

| Action            | What it does                                |
| ----------------- | ------------------------------------------- |
| `CreateEffort`    | Start a new effort                          |
| `SetEffortStatus` | Mark an effort active, completed, or paused |
| `WriteIssue`      | Record a question, gap, or blocker          |
| `WriteFinding`    | Record a grounded observation               |
| `WriteDecision`   | Record a commitment among alternatives      |
| `WriteConstraint` | Record a known limit                        |
| `WriteRisk`       | Record a prospective negative outcome       |
| `WriteCitation`   | Record an external reference                |
| `WriteBlob`       | Store longform content                      |
| `Supersede`       | Replace one record with another             |
| `Invalidate`      | Mark a record as wrong                      |
| `ResolveIssue`    | Close an issue with a resolution            |
| `AcceptDecision`  | Commit a proposed decision                  |
| `MitigateRisk`    | Mark a risk as mitigated                    |
| `SetRiskState`    | Transition a risk's lifecycle               |

## Reading back: bounded queries

The Effort Graph is designed for context-efficient reads. Rather than dumping the entire graph into an agent's context window, it provides:

- **`flatbread effort list`** — index of efforts with status and keywords
- **`flatbread effort records`** — records for an effort, compact representation
- **`flatbread effort relations`** — follow edges between records
- **`flatbread effort blocking-decisions`** — surface what's blocking progress
- **`flatbread effort get <id>`** — full content of a single record

On query, the tools create minimal temporary markdown files the agent can grep — so it sees just enough to decide whether to dig deeper.

## The journaled writer

Multi-file writes are atomic. If a process dies mid-write, the next run restores the earlier state from the journal at `<root>/.journal/`. Nothing is half-written.

## The packaged skill

The agent skill lives in `skills/effort-graph/`. It teaches an agent the commands and when to use them. The repository copy at `.agents/skills/effort-graph/` is generated — run `pnpm skills:sync` from the repo root after editing the source skill.

## Explorer (optional)

With `effortGraphContent()` in config, the visual content-relation explorer serves automatically:

```bash
npx flatbread start --watch --open
```

- Explorer: `http://localhost:5057/`
- GraphQL sandbox: `http://localhost:5057/graphql`
