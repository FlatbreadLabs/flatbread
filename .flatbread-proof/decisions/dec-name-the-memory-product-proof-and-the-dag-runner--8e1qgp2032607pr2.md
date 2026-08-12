---
id: dec-name-the-memory-product-proof-and-the-dag-runner--8e1qgp2032607pr2
effort: eff-flatbread-product-branding--zt7b35sa05kyvhdz
title: Name the memory product Proof and the DAG runner Oven
state: accepted
created_at: '2026-08-12T17:27:32.577Z'
derives_from:
  - fnd-neither-proof-nor-effort-graph-has-been-released--w3ewcvmg3402bm5w
  - fnd-workshop-shortlist-favors-crumb-graph-over-yeast--tv3ydt3wfb3n4y0g
supersedes:
  - dec-keep-effort-graph-as-the-product-name--r5wr2vdjwjs9bs13
---

Supersedes “Keep Effort Graph as the product name.” Proof moves from the DAG runner to the auditable memory graph. The runner becomes Oven. Identifiers move in the same change. Effort stays the primitive.

## Context

Effort Graph is accurate for Effort-scoped records but reads as a subsystem label. Proof means evidence you can audit, which matches journaled Findings, Decisions, and bounded recall. The DAG runner took that name first (baking “proof” / a peer brand), so earlier workshops treated it as taken and tried Crumb Graph / Crumb Trail, then reversed those because the metaphor failed and the identifier rename was deferred.

The reversal criteria on the superseded Decision now hold: a candidate name wins, and this Decision commits to renaming packages, CLI, paths, and skills in the same sweep rather than branding-only. Neither product has been released, so the sweep is a clean cut, not a major migration.

## Decision

1. Brand Flatbread’s longform agent memory as **Proof**. Keep **Effort** as the record type, the `effort` field, `eff-*` ids, and the `efforts/` collection folder. Do not keep Effort Graph as a product name or documented alias.
2. Brand the DAG task runner as **Oven**. Do not leave “proof” in the runner’s package, bin, skill, log prefix, or default state directory.
3. Move identifiers in one sweep. Mapping: runner `@flatbread/proof` / `proof` / `proof-supervisor` / `FlatbreadLabs/proof` / skill `proof` / `.proof/` / `.flatbread/artifacts/` → `@flatbread/oven` / `oven` / `oven-supervisor` / `FlatbreadLabs/oven` / skill `oven` / `.oven/` / `.oven/artifacts/`. Memory `@flatbread/effort-graph` / `flatbread effort` / skill `effort-graph` / `effortGraphContent` / `EFFORT_GRAPH_*` / `.flatbread-efforts/` / `.flatbread/effort-graph/` → `@flatbread/proof` / `flatbread proof` / skill `proof` / `proofContent` / `PROOF_*` / `.flatbread-proof/` / `.flatbread/proof/`.
4. Vacate the runner’s `proof` identifiers before the memory product takes them. In this monorepo, rename `.cursor/skills/proof` (runner) to `oven` before the memory skill becomes `proof`.
5. Keep skills `effort-modeling` and `grill-with-efforts`. Keep `.journal/`. `git mv` the dogfood graph root; do not rewrite historical record ids.
6. GitHub: rename `FlatbreadLabs/proof` to `FlatbreadLabs/oven`. Memory stays in `FlatbreadLabs/flatbread`. Do not try to reuse the redirected GitHub name for memory. npm: publish Oven, then publish memory as `@flatbread/proof` — no deprecation window, because nothing has been released.

## Alternatives considered

- **Keep Effort Graph; leave the runner as Proof.** Rejected: Proof fits the memory product; Effort Graph underplays brandability.
- **Crumb Graph / Crumb Trail.** Already refuted; crumbs read as leftovers and collide with UI breadcrumbs.
- **Rank / Bake / restore dag-task-runner for the runner.** Rank collides with search ranking; Bake collides with JS “build”; the old skill name is accurate but not a peer brand. Oven is short, unleavened, and names the place work cooks.
- **Brand-only rename, defer packages/CLI/paths.** Rejected: that is how Crumb Graph failed. This Decision is the identifier map.
- **Treat the rename as a 1.0 major migration with npm cooling-off.** Rejected: neither product has been released.

## Consequences

- Docs, skills, CLI, packages, error codes, and on-disk roots say Proof for memory and Oven for the runner.
- Implementation is in scope now, not deferred. Follow the sweep handoff for touchpoints.
- Yeast names stay off the table. Weave stays the merge driver.

## Reversal criteria

Revisit if users read Proof as the DAG runner after the sweep, if Oven fails to be found by agents looking for a task DAG, or if Effort-as-primitive plus Proof-as-product still forces a second vocabulary. Any later rename must move identifiers in the same Decision.
