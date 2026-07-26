---
id: dec-name-citeable-longform-payloads-blob--9b11q14fgsx2ytve
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Name citeable longform payloads Blob
state: accepted
created_at: '2026-07-19T10:48:32.005Z'
derives_from:
  - con-mutation-enum-stays-deliberately-small--45v1ae3neq26g1rz
---

## Context

Crumb Graph primitives (Effort, Issue, Finding, Decision, Constraint, Risk) are epistemic and deliberately bounded. Longform plans, research troves, JSON dumps, and media do not fit record bodies or digest caps, and Artifact/Plan were intentional non-models in v1. Agents and humans still need a place to put bulky, experimental content in git (or another Flatbread source) and cite it from a short Finding or Decision.

## Decision

Adopt **Blob** as the name for a citeable, non-epistemic payload collection that Crumb Graph records can reference.

A Blob is opaque content of any format (markdown, JSON, images, etc.). It has no proposed/accepted lifecycle — it is storage, not judgment. Epistemic records stay short and point at Blobs via refs (e.g. `derives_from` / evidence-style edges).

Blobs are ordinary Flatbread content: they may live in the filesystem source or in another source plugin (S3, CDN, file host, …). The graph stores ids/refs; the configured source resolves bytes.

## Alternatives considered

- **Bread-themed names (Annex, Loaf, Sheet, Bannock, Grist, …):** Brand-fun but obscure; agents and humans need an obvious noun first.
- **File:** Obvious for disk, misleading when the collection is backed by S3/CDN.
- **Artifact / Asset / Document:** Generic SaaS; also collides with CLI write-result `artifacts` and digest `artifact_path`.
- **Keep stuffing longform into Finding/Decision bodies:** Rejected — fights digest caps and bounded recall.

## Consequences

- Glossary intentional non-models must drop or rewrite Artifact once Blob ships (Blob is the citeable payload; Artifact remains a non-model for run/build outputs).
- Preset, mutations, skills, and digests need an additive Blob surface; bounded reads must not inline Blob bodies by default.
- Multi-source Blob backing is in scope for the design, even if filesystem-first lands first.
- Brand poetry can wait; clarity for agents wins.

## Reversal criteria

Revisit if Blob confuses with binary-only storage, if a clearer storage-agnostic noun wins dogfood, or if treating payloads as ordinary untyped content refs (no Blob collection) proves sufficient.
