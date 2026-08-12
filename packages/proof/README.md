# `@flatbread/proof`

Git-native memory for coding agents. Installing this package gives you three
things:

- **Record types.** An agent records the work it is doing as an **Effort**,
  then writes what it learns against that Effort: **Issues**, **Findings**,
  **Decisions**, **Constraints**, **Risks**, **Citations**, and **Blobs**.
- **Write operations.** A typed mutation turns into Markdown files on disk, and
  the writer checks the links between records before it commits them.
- **A Flatbread content model.** `proofContent()` adds those eight record
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

`proofContent()` stores the graph under `.flatbread-proof` in your
project root. Pass a path to choose another root:
`proofContent('path/to/graph')`.

Two paths hold working state that Git should not track: the write journal at
`<root>/.journal`, and the derived read cache at
`.flatbread/proof/read-cache`. Nothing adds them to `.gitignore` for
you, so add these lines yourself:

```gitignore
**/.flatbread-proof/.journal/
**/.flatbread/proof/read-cache/
```

For a custom root, replace `.flatbread-proof` with that root. The read cache
path stays the same.

`flatbread proof bootstrap` reports what is still missing — the config entry
or either ignore rule. `flatbread proof bootstrap --verify` reports the same
and exits nonzero when anything is missing, which makes it usable in CI.

## The domain model and the packaged skill

Read [`skills/proof/glossary.md`](./skills/proof/glossary.md) for
the portable Proof domain model.

The packaged Agent Skill is in `skills/proof/`. The repository copy in
`.agents/skills/proof/` is generated from those files. Run
`pnpm skills:sync` from the repository root after changing the skill.

## Install the Proof skill

Install from a release tag, then activate the skill for setup:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/proof/skills/proof --skill proof
npm install --save-dev flatbread@<flatbreadVersion>
```

The tag and version come from `gitTag` and `flatbreadVersion` in
`skills/proof/release.json`. See `skills/proof/setup.md` for the
equivalent `pnpm`, `yarn`, and `bun` commands.
