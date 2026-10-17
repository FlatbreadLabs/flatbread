---
id: con-mutation-enum-stays-deliberately-small--996zbtny5gv21ngy
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Mutation enum stays deliberately small
kind: hard
created_at: '2026-10-17T09:00:12.814Z'
derives_from:
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
  - fnd-brief-is-84-percent-smaller-than-the-status-brie--qhgmcvqdma6rq4rq
supersedes:
  - con-mutation-enum-stays-deliberately-small--3hw451bsedfj6khs
---

Changed: the set grows from seventeen to eighteen mutations with
`WriteCompaction`. It exists because a compaction is only trustworthy when
the writer, not the agent, records which records were live (`covers`) and
supersedes the previous head. A `WriteFinding` payload could not guarantee
either.

V1 has exactly eighteen named mutations. Every operation has a Zod schema, validates against a committed index generation, and owns a defined semantic transition. The seventeenth mutation exists because an Effort-wide Decision rejection could silently discard unrelated proposals and could not be undone through Proof.

The surface consists of Effort lifecycle (`CreateEffort`, `SetEffortStatus`); one creation mutation for each primitive (`WriteIssue`, `WriteFinding`, `WriteDecision`, `WriteConstraint`, `WriteRisk`, `WriteCitation`, `WriteBlob`); `WriteCompaction`, which creates a compaction Finding; edge retro-linking (`Supersede`, `Invalidate`); lifecycle transitions (`ResolveIssue`, `AcceptDecision`, `ReopenDecision`, `MitigateRisk`, `SetRiskState`); and `Retract` for records that should not stay on the live graph.

`AcceptDecision` rejects only explicit alternatives: proposed Decisions derived from a shared question Issue, regardless of whether that Issue remains open, or proposed Decisions named in `rejects`. It names every changed and rejected Decision in the result, and a dry run previews the same changes without committing them. It must not accept a second answer to a shared question or a reopened Decision still rejected by an accepted alternative. `ReopenDecision` restores only a rejected Decision to proposed and retains the earlier rejection in history.

`Retract` remains the named archive operation. It tombstones a file in place, strips live relation references to that id, and drops the record from browse reads. It is not a generic frontmatter patch, hard delete, or fold into a survivor. Git is the undo path for Retract; there is no generic Restore mutation.

No generic frontmatter patch, hard delete, standalone `RejectDecision`, or body-edit mutation is part of v1. Bodies remain ordinary editable markdown while the platform owns frontmatter semantics. Additive mutations require dogfood evidence; removing or reshaping one is a breaking migration.
