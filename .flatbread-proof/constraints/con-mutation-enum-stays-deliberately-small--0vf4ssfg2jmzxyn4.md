---
id: con-mutation-enum-stays-deliberately-small--0vf4ssfg2jmzxyn4
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Mutation enum stays deliberately small
kind: hard
created_at: '2026-08-22T20:28:27.386Z'
supersedes:
  - con-mutation-enum-stays-deliberately-small--02k06bxbjwrjfp9x
---

V1 has exactly sixteen named mutations. Every operation has a Zod schema, validates against a committed index generation, and owns a defined semantic transition.

The surface consists of Effort lifecycle (`CreateEffort`, `SetEffortStatus`); one creation mutation for each primitive (`WriteIssue`, `WriteFinding`, `WriteDecision`, `WriteConstraint`, `WriteRisk`, `WriteCitation`, `WriteBlob`); edge retro-linking (`Supersede`, `Invalidate`); lifecycle transitions (`ResolveIssue`, `AcceptDecision`, `MitigateRisk`, `SetRiskState`); and `Retract` for records that should not stay on the live graph.

`Retract` is the named archive operation. It tombstones a file in place, strips that id from other records in the same Effort, and drops the record from browse reads. It is not a generic frontmatter patch, not a hard delete, and not a fold into a survivor.

No generic frontmatter patch, hard delete, standalone `RejectDecision`, or body-edit mutation is part of v1. Git is the undo story; Decision sibling rejection is part of accepting an alternative; and bodies remain ordinary editable markdown while the platform owns frontmatter semantics. Additive mutations require dogfood evidence; removing or reshaping one is a breaking migration.
