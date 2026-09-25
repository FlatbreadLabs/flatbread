---
id: con-mutation-enum-stays-deliberately-small--3hw451bsedfj6khs
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Mutation enum stays deliberately small
kind: hard
created_at: '2026-09-25T09:56:29.313Z'
supersedes:
  - con-mutation-enum-stays-deliberately-small--0vf4ssfg2jmzxyn4
---

V1 has exactly seventeen named mutations. Every operation has a Zod schema, validates against a committed index generation, and owns a defined semantic transition. The seventeenth mutation exists because an Effort-wide Decision rejection could silently discard unrelated proposals and could not be undone through Proof.

The surface consists of Effort lifecycle (`CreateEffort`, `SetEffortStatus`); one creation mutation for each primitive (`WriteIssue`, `WriteFinding`, `WriteDecision`, `WriteConstraint`, `WriteRisk`, `WriteCitation`, `WriteBlob`); edge retro-linking (`Supersede`, `Invalidate`); lifecycle transitions (`ResolveIssue`, `AcceptDecision`, `ReopenDecision`, `MitigateRisk`, `SetRiskState`); and `Retract` for records that should not stay on the live graph.

`AcceptDecision` rejects only explicit alternatives: proposed Decisions derived from a shared question Issue, regardless of whether that Issue remains open, or proposed Decisions named in `rejects`. It names every changed and rejected Decision in the result, and a dry run previews the same changes without committing them. It must not accept a second answer to a shared question or a reopened Decision still rejected by an accepted alternative. `ReopenDecision` restores only a rejected Decision to proposed and retains the earlier rejection in history.

`Retract` remains the named archive operation. It tombstones a file in place, strips live relation references to that id, and drops the record from browse reads. It is not a generic frontmatter patch, hard delete, or fold into a survivor. Git is the undo path for Retract; there is no generic Restore mutation.

No generic frontmatter patch, hard delete, standalone `RejectDecision`, or body-edit mutation is part of v1. Bodies remain ordinary editable markdown while the platform owns frontmatter semantics. Additive mutations require dogfood evidence; removing or reshaping one is a breaking migration.
