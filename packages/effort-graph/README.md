# `@flatbread/effort-graph`

This package writes Flatbread Effort Graph records to Markdown files in your
repository. It uses a journal so a change that affects several files either
finishes completely or is undone.

Version 1 supports these actions: `CreateEffort`, `SetEffortStatus`,
`WriteIssue`, `WriteFinding`, `WriteDecision`, `WriteConstraint`, `WriteRisk`,
`Supersede`, `Invalidate`, `ResolveIssue`, `AcceptDecision`, `MitigateRisk`,
and `SetRiskState`.

The journal is stored in `<root>/.journal` and is ignored by Git. Use
`effortGraphContent()` to add Efforts, Issues, Findings, Decisions,
Constraints, and Risks to a Flatbread configuration. The writer checks links
between those record types.

Read [`skills/effort-graph/glossary.md`](./skills/effort-graph/glossary.md) for
the portable Effort Graph domain model.

The packaged Agent Skill is in `skills/effort-graph/`. The repository copy in
`.agents/skills/effort-graph/` is generated from those files. Run
`pnpm skills:sync` from the repository root after changing the skill.

## Install the Effort Graph skill

Install from a release tag, then activate the skill for setup:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/vX/packages/effort-graph/skills/effort-graph --skill effort-graph
npm install --save-dev flatbread@X
```

Replace the placeholders with `gitTag` and `flatbreadVersion` from
`skills/effort-graph/release.json`. See `skills/effort-graph/setup.md` for
equivalent `pnpm`, `yarn`, and `bun` commands.
