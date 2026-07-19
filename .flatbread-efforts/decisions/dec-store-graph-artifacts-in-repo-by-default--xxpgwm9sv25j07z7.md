---
id: dec-store-graph-artifacts-in-repo-by-default--xxpgwm9sv25j07z7
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Store graph artifacts in-repo by default
state: accepted
created_at: '2026-07-18T19:42:32.811Z'
---

## Context

Effort Graph artifacts must branch with the code they explain, yet teams also
need an escape hatch when exploration spans repositories or abandoned branches
are common.

## Decision

Use branch-coupled, in-repository storage under `.flatbread-efforts/` by
default. Keep the schema and write API identical for all storage modes so a
team can use a sibling repository by changing the configured `path`, without
application code changes.

Defer an automated promote-on-close workflow. Until dogfooding proves it
necessary, teams can cherry-pick artifacts and transition their lifecycle
state when promoting an exploration.

## Alternatives considered

- **In-repo with promote-on-close tooling:** adds brittle semantics around
  squash merges, rebases, deleted branches, and what it means for an
  exploration to close.
- **Sibling repository or submodule:** preserves reasoning independently of a
  branch and remains the supported alternative, but should not be the default.
- **Cross-branch record refs:** rejected because indexing another branch
  requires mutating the worktree or maintaining per-branch indexes, obscures
  staleness, and weakens reviewability.

## Consequences

Reasoning on an unmerged branch is intentionally lost unless promoted. The
schema does not encode branch or git-ref fields: branching is git behavior,
while the graph records the epistemic lifecycle and causal edges.
