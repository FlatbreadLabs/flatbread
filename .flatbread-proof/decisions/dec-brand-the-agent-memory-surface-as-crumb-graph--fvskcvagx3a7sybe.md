---
id: dec-brand-the-agent-memory-surface-as-crumb-graph--fvskcvagx3a7sybe
effort: eff-flatbread-product-branding--zt7b35sa05kyvhdz
title: Brand the agent memory surface as Crumb Graph
state: accepted
created_at: '2026-07-19T03:45:45.157Z'
derives_from:
  - fnd-workshop-shortlist-favors-crumb-graph-over-yeast--tv3ydt3wfb3n4y0g
superseded_by:
  - dec-brand-the-agent-memory-surface-as-crumb-trail--tngncepdbwjkh9jc
---

## Context

The persistent, queryable agent-memory system is currently marketed and documented as the Effort Graph. That name is accurate for the Effort-anchored reasoning graph but reads as a subsystem label, not a Flatbread-native product surface alongside Proof. A branding workshop shortlisted names that keep longform memory + relational structure while fitting unleavened Flatbread metaphors.

## Decision

Adopt **Crumb Graph** as the product/brand name for Flatbread's longform agent memory (journaled Efforts, Issues, Findings, Decisions, Constraints, Risks with bounded recall).

Keep **Effort Graph** as an allowed technical descriptor and disambiguation alias for the same system — useful when emphasizing Effort-scoped primitives, the graph of reasoning records, or continuity with existing dogfood language — not as a competing product name.

Code, package, CLI, path, and skill renames are **intentionally deferred**. This Decision commits branding and messaging only; implementation tracks as follow-up work.

## Alternatives considered

- **Leaven / Sourdough / Starter:** Strong living-culture metaphor and peer to Proof, rejected because Flatbread is unleavened — yeast metaphors fight the brand.
- **Pantry / Bake Log / Flat Memory:** On-brand storage or flat-files framing, but weaker at signaling trail + relational graph.
- **Keep Effort Graph only:** Clear and already shipped in dogfood, but underplays brandability and product-surface identity next to Proof.
- **Reasoning Graph / Memory Graph:** Accurate and sober, too generic and not Flatbread-native.

## Consequences

- New docs, skills copy, and product messaging should prefer Crumb Graph; Effort Graph may appear in parentheses or glossary-style disambiguation.
- The Effort primitive name stays; branding rename does not require renaming the Effort collection.
- Avoid yeast metaphors in Crumb Graph marketing.
- Package `@flatbread/effort-graph`, `flatbread effort`, `.flatbread-efforts/`, and related identifiers remain until a separate implementation Decision/Issue lands.

## Reversal criteria

Revisit if Crumb Graph confuses users (crumb ≈ UI breadcrumbs or leftover scraps), collides with another Flatbread surface, or fails external comprehension tests versus Effort Graph. Also revisit if a stronger unleavened, Proof-peer name emerges from broader launch naming.
