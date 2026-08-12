---
id: dec-keep-effort-graph-as-the-product-name--r5wr2vdjwjs9bs13
effort: eff-flatbread-product-branding--zt7b35sa05kyvhdz
title: Keep Effort Graph as the product name
state: accepted
created_at: '2026-07-26T03:27:20.788Z'
derives_from:
  - fnd-crumb-rebrand-refuted-in-review-effort-graph-is--n8kb269z7vz8jhyk
supersedes:
  - dec-brand-the-agent-memory-surface-as-crumb-trail--tngncepdbwjkh9jc
superseded_by:
  - dec-name-the-memory-product-proof-and-the-dag-runner--8e1qgp2032607pr2
---

Supersedes Crumb Trail (and, transitively, Crumb Graph). The rebrand line is refuted: **Effort Graph** is the product name for Flatbread's longform agent memory, and crumb naming is dropped entirely rather than retained as a datamodel explainer.

## Context

Two prior Decisions moved the brand from Effort Graph to Crumb Graph and then to Crumb Trail, each time deferring the package, CLI, path, and skill renames. Review of the accumulated naming stack found the crumb metaphor works against the product: crumbs connote leftovers in a system whose pitch is durable, trustworthy reasoning, and _crumb trail_ is already taken by breadcrumb navigation in UI vocabulary. Meanwhile every identifier a user touches — `@flatbread/effort-graph`, `flatbread effort`, `.flatbread-efforts/`, the `effort-graph` skill — still said Effort.

## Decision

Adopt **Effort Graph** as the product name, not merely an allowed technical descriptor. Retire **Crumb Graph** and **Crumb Trail**; neither is a product name, a datamodel explainer, nor a documented alias.

Describe the datamodel in plain terms — Effort-scoped relational records with typed edges and bounded digests — instead of coining a second branded layer for it.

No rename work is required or deferred: code, packages, CLI, paths, and skills already match the product name, and that alignment is now the point rather than a coincidence.

## Alternatives considered

- **Keep Crumb Trail as the brand and finally execute the renames.** Rejected: it pays a full breaking-rename cost to buy a metaphor that review judged actively misleading.
- **Keep Crumb Trail for marketing, Effort Graph in code.** Rejected: this is the status quo the prior Decisions created, and it is the failure mode — a permanent gap between what the docs call the product and what every command and import path calls it.
- **Keep Crumb Graph as a datamodel explainer only.** Rejected: a second branded vocabulary for the same graph adds a translation step without adding precision over saying Effort-scoped records and edges.
- **Pick a third unleavened, Proof-peer name.** Rejected for now: naming churn has already cost two Decisions and two stale Issues, and no candidate beats the name that the API already teaches.

## Consequences

- Docs, skills copy, and product messaging use Effort Graph with no crumb aliases; existing crumb references are wording bugs to fix, not variants to preserve.
- The rename Issues under this Effort close as wontfix — the work is cancelled, not postponed.
- Brand and implementation vocabulary are unified, so future naming pressure has to argue for renaming real identifiers rather than only marketing copy.
- Flatbread gives up a bread-metaphor peer to Proof for this surface. That is accepted: primitive fidelity beats metaphor symmetry here.

## Reversal criteria

Revisit only if Effort Graph measurably fails external comprehension — for example if users read Effort as project-management effort tracking or story points rather than a thread of work — and a candidate name wins while committing to rename the packages, CLI, and paths in the same Decision rather than deferring them again.
