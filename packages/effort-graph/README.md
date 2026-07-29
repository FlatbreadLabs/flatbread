# `@flatbread/effort-graph`

Git-native memory for coding agents. Installing this package gives you three
things:

- **Record types.** An agent records the work it is doing as an **Effort**,
  then writes what it learns against that Effort: **Issues**, **Findings**,
  **Decisions**, **Constraints**, **Risks**, **Citations**, and **Blobs**.
- **Write operations.** A typed mutation turns into Markdown files on disk, and
  the writer checks the links between records before it commits them.
- **A Flatbread content model.** `effortGraphContent()` adds those eight record
  types to a Flatbread configuration, so the same files come back as a typed
  graph you can query and page through.

Every record is a Markdown file in your repository, so you commit, diff,
review, and revert an agent's reasoning the same way you handle code, and the
next session can read it back.

Writes go through a journal, so a change that touches several files either
finishes in full or leaves nothing behind: if the process dies mid-write, the
next run restores the earlier contents of the unfinished change.

Version 1 supports these actions: `CreateEffort`, `SetEffortStatus`,
`WriteIssue`, `WriteFinding`, `WriteDecision`, `WriteConstraint`, `WriteRisk`,
`WriteCitation`, `WriteBlob`, `Supersede`, `Invalidate`, `ResolveIssue`,
`AcceptDecision`, `MitigateRisk`, and `SetRiskState`.

An Issue, Finding, Decision, Constraint, or Risk may name Citation ids in
`cites` (Flatbread `refs`). A Citation body alone is valid (e.g. a URL); an
optional `blob` ref attaches a long payload such as a document, JSON, or image.

## Where records live, and what to ignore

`effortGraphContent()` stores the graph under `.flatbread-efforts` in your
project root. Pass a path to choose another root:
`effortGraphContent('path/to/graph')`.

Two paths hold working state that Git should not track: the write journal at
`<root>/.journal`, and the derived read cache at
`.flatbread/effort-graph/read-cache`. Nothing adds them to `.gitignore` for
you, so add these lines yourself:

```gitignore
**/.flatbread-efforts/.journal/
**/.flatbread/effort-graph/read-cache/
```

For a custom root, replace `.flatbread-efforts` with that root. The read cache
path stays the same.

`flatbread effort bootstrap` reports what is still missing — the config entry
or either ignore rule. `flatbread effort bootstrap --verify` reports the same
and exits nonzero when anything is missing, which makes it usable in CI.

## The domain model and the packaged skill

Read [`skills/effort-graph/glossary.md`](./skills/effort-graph/glossary.md) for
the portable Effort Graph domain model.

The packaged Agent Skill is in `skills/effort-graph/`. The repository copy in
`.agents/skills/effort-graph/` is generated from those files. Run
`pnpm skills:sync` from the repository root after changing the skill.

## Install the Effort Graph skill

Install from a release tag, then activate the skill for setup:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/effort-graph/skills/effort-graph --skill effort-graph
npm install --save-dev flatbread@<flatbreadVersion>
```

The tag and version come from `gitTag` and `flatbreadVersion` in
`skills/effort-graph/release.json`. See `skills/effort-graph/setup.md` for the
equivalent `pnpm`, `yarn`, and `bun` commands.
