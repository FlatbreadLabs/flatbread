---
id: dec-defer-shared-flatbread-write-extraction--xxa1ge2chw6x3xx0
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Defer shared Flatbread write extraction
state: accepted
created_at: '2026-07-18T19:43:20.362Z'
derives_from:
  - dec-bridge-committed-generations-into-live-reads--mc3728t4w1kyqcqq
  - dec-use-semantic-mutations-and-a-standalone-writer--2d0m3tkqhad4yyhr
---

## Context

Flatbread remains valuable as a read-only query layer for static content.
Effort Graph already proves a narrowly scoped semantic write path, but
generalizing it before another writable system needs it would speculate on
sources, lifecycle, permissions, and GraphQL mutation behavior.

## Decision

Finish and dogfood the Effort Graph writer as its own system. Do not add
general-purpose GraphQL create/update/delete operations or redesign Flatbread
around writes yet. Treat its writer, recovery, and committed-generation bridge
as the first working example of a future shared save-and-refresh layer.

Begin extraction before copying this machinery when Flatbread needs a second
writable source, a CMS needs drafts/revisions/conflicts/media/permissions,
another feature would duplicate writer recovery or live refresh, or ordinary
collections need GraphQL mutations. Sources remain the persistence authority;
transformers must explain how to save writable records; shared writes must
commit multi-record changes atomically and publish only validated graphs.

## Consequences

Effort Graph commands remain the supported write API and GraphQL stays
read-only for ordinary collections. Any future Effort Graph GraphQL surface
delegates to the existing writer. The current read-only static use case stays
simple, while the writer's journal and generation tests become behavioral
contracts for a later extraction.
