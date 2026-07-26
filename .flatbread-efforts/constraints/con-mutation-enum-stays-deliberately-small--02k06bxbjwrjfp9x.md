---
id: con-mutation-enum-stays-deliberately-small--02k06bxbjwrjfp9x
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Mutation enum stays deliberately small
kind: hard
created_at: '2026-07-24T08:08:23.938Z'
derives_from:
  - dec-ship-citation-collection-with-optional-blob--fyga3x876n7rcnmn
  - fnd-skill-and-hard-constraint-still-teach-13-mutatio--gvg2btns0q7rp0eq
supersedes:
  - con-mutation-enum-stays-deliberately-small--45v1ae3neq26g1rz
---

V1 has exactly fifteen named mutations. Every operation has a Zod schema,
validates against a committed index generation, and owns a defined semantic
transition.

The surface consists of Effort lifecycle (`CreateEffort`, `SetEffortStatus`);
one creation mutation for each primitive (`WriteIssue`, `WriteFinding`,
`WriteDecision`, `WriteConstraint`, `WriteRisk`, `WriteCitation`, `WriteBlob`);
edge retro-linking (`Supersede`, `Invalidate`); and lifecycle transitions
(`ResolveIssue`, `AcceptDecision`, `MitigateRisk`, `SetRiskState`).

`WriteCitation` and `WriteBlob` have no lifecycle state — Citation body alone
is valid (e.g. URL); optional `blob` ref attaches longform payloads.

No generic frontmatter patch, delete/archive operation, standalone
`RejectDecision`, or body-edit mutation is part of v1. Git is the undo story;
Decision sibling rejection is part of accepting an alternative; and bodies
remain ordinary editable markdown while the platform owns frontmatter
semantics. Additive mutations require dogfood evidence; removing or reshaping
one is a breaking migration.
