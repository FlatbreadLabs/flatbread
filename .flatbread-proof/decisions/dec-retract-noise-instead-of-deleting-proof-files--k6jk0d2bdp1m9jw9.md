---
id: dec-retract-noise-instead-of-deleting-proof-files--k6jk0d2bdp1m9jw9
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Retract noise instead of deleting Proof files
state: accepted
created_at: '2026-08-22T20:28:28.832Z'
derives_from:
  - con-mutation-enum-stays-deliberately-small--02k06bxbjwrjfp9x
  - con-mutation-enum-stays-deliberately-small--0vf4ssfg2jmzxyn4
---

## Context

PR 260 cleaned session noise from an Effort by deleting record files and stripping ids on the kept Decision. Review refused that path: Proof has no delete mutation, the skill forbids hand-edits of frontmatter, and leftover stored ids fail closed with PROOF_DANGLING_RELATION.

Supersede keeps both records. Invalidate adds a Finding that says a target was wrong. Leaving junk in place fills the 25-record / 50-edge browse caps. Git rm is the wrong tool.

## Decision

Add Retract as a sixteenth named mutation. Tombstone the file in place with retracted, retracted_at, and retracted_reason. Strip that id from other records in the same Effort in the same journal transaction. Browse reads omit retracted records. proof get still returns the file. Later writes refuse retracted ids. Efforts cannot be retracted; abandon them.

This is not a hard delete and not a Collapse that folds bodies into a survivor. Folding N noisy records into one survivor is a body edit on the survivor plus Retract on the rest.

## Alternatives considered

- **Git rm plus a frontmatter-edit exception:** rejected because it makes agents responsible for reverse projections and dangling ids. The writer already owns multi-file transactions.
- **Leave noise forever:** rejected because bounded reads are the recall surface; session debris crowds out turning points.
- **Supersede or Invalidate the junk:** rejected because both keep the bad record visible and, for Invalidate, add another record to say so.
- **Hard delete that unlinks the file:** rejected because the journal has no content unlink, missing ids fail closed, and other branches that still store the id would dangle.

## Consequences

Eval 3 can teach Retract. Cleanup PRs no longer need to strip frontmatter by hand. The mutation enum grows to sixteen with dogfood from the #260 review trail.

## Reversal criteria

Revisit if tombstones still crowd raw-file grep, if agents Retract durable rationale, or if a Restore mutation becomes necessary because git revert is too costly in concurrent workflows.
