---
id: dec-lead-flatbread-1-0-with-effort-graph-agent-memor--nhxsqm8sd43s2avx
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Lead Flatbread 1.0 with Effort Graph agent memory
state: accepted
created_at: '2026-07-29T10:43:48.897Z'
supersedes:
  - dec-keep-effort-graph-secondary-with-a-primary-wedge--estattvqnhffm2dc
---

## Context

Flatbread 1.0 is the first stable npm release. The release brief asks the public docs and package copy to lead with the utility already shipped through Effort Graph, while keeping Flatbread useful for general static relational content.

## Decision

Lead Flatbread 1.0 positioning with Effort Graph as Git-native memory for coding agents. Present static relational content for sites, docs, and internal tools as a first-class general use. Keep GraphQL and generated TypeScript as read interfaces over the graph, not the product identity.

## Consequences

The root README, npm descriptions, positioning guide, and release notes use this hierarchy. The release does not add a hosted CMS, semantic search, general writes, or a new runtime contract. Proof remains workflow tooling rather than the memory product. Revisit this lead only when user evidence shows another use case explains Flatbread more clearly.
