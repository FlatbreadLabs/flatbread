---
id: dec-brand-the-agent-memory-surface-as-crumb-trail--tngncepdbwjkh9jc
effort: eff-flatbread-product-branding--zt7b35sa05kyvhdz
title: Brand the agent memory surface as Crumb Trail
state: accepted
created_at: '2026-07-19T03:54:22.436Z'
derives_from:
  - fnd-postable-brand-names-favor-trail-over-graph--zzpgaw0kvqtaqmxt
  - fnd-workshop-shortlist-favors-crumb-graph-over-yeast--tv3ydt3wfb3n4y0g
supersedes:
  - dec-brand-the-agent-memory-surface-as-crumb-graph--fvskcvagx3a7sybe
superseded_by:
  - dec-keep-effort-graph-as-the-product-name--r5wr2vdjwjs9bs13
---

Supersedes Crumb Graph as the product name. Same system and deferred implementation; product brand is now Crumb Trail, with Crumb Graph retained as the datamodel explainer.

## Context

We accepted Crumb Graph as the product/brand name with Effort Graph as a technical descriptor. A follow-up pass weighed postable brandability: names that land online are metaphor-first and easy to say. That pressure favors Trail for the product surface while Graph still names the relational memory model accurately.

## Decision

Adopt **Crumb Trail** as the product/brand name for Flatbread's longform agent memory.

Use **Crumb Graph** as the explainer for the datamodel (Effort-scoped relational records, edges, bounded digests) — glossary/docs language, not a competing product name.

Keep **Effort Graph** as an allowed technical descriptor and disambiguation alias for continuity with dogfood language and Effort-anchored primitives.

Code, package, CLI, path, and skill renames remain **intentionally deferred**. This Decision commits branding and messaging only.

## Alternatives considered

- **Crumb Graph as product name (prior Decision):** Strong datamodel honesty; weaker as a postable brand next to metaphor-first agent tools. Retained as explainer instead.
- **Crumb Trail only, drop Graph language:** Maximizes brand simplicity; loses a clear noun for the relational structure. Rejected — keep Graph as explainer.
- **Effort Graph only:** Already shipped in dogfood; underplays brandability.
- **Yeast metaphors (Leaven / Starter):** Still rejected — Flatbread is unleavened.

## Consequences

- Product messaging, launch copy, and skill intros prefer Crumb Trail.
- Architecture/glossary copy may say Crumb Graph when explaining the relational model; Effort Graph remains valid disambiguation.
- The Effort primitive name stays.
- Package/CLI/path identifiers stay until a separate implementation plan lands.

## Reversal criteria

Revisit if Crumb Trail collapses into UI-breadcrumb confusion, if Graph-as-explainer creates two-name fatigue, or if external comprehension tests prefer a single public noun.
