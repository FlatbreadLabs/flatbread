---
id: con-mutation-enum-stays-deliberately-small--45v1ae3neq26g1rz
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Mutation enum stays deliberately small
kind: hard
created_at: '2026-07-18T19:42:47.759Z'
derives_from:
  - dec-use-semantic-mutations-and-a-standalone-writer--2d0m3tkqhad4yyhr
---

V1 has exactly thirteen named mutations. Every operation has a Zod schema,
validates against a committed index generation, and owns a defined semantic
transition.

The surface consists of Effort lifecycle (`CreateEffort`, `SetEffortStatus`);
one creation mutation for each primitive (`WriteIssue`, `WriteFinding`,
`WriteDecision`, `WriteConstraint`, `WriteRisk`); edge retro-linking
(`Supersede`, `Invalidate`); and lifecycle transitions (`ResolveIssue`,
`AcceptDecision`, `MitigateRisk`, `SetRiskState`).

No generic frontmatter patch, delete/archive operation, standalone
`RejectDecision`, or body-edit mutation is part of v1. Git is the undo story;
Decision sibling rejection is part of accepting an alternative; and bodies
remain ordinary editable markdown while the platform owns frontmatter
semantics. Additive mutations require dogfood evidence; removing or reshaping
one is a breaking migration.
