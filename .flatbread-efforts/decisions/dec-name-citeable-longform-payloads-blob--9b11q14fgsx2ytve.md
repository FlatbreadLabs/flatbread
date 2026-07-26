---
id: dec-name-citeable-longform-payloads-blob--9b11q14fgsx2ytve
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Name citeable longform payloads Blob
state: accepted
created_at: '2026-07-19T10:48:32.005Z'
derives_from:
  - con-mutation-enum-stays-deliberately-small--45v1ae3neq26g1rz
---

Update: records use `cites[]` to link to Citations. A Citation can optionally
point to a Blob that stores large content. Records cannot cite Blobs directly,
and Blobs are not used with `derives_from` or evidence links in the first
release.

## Context

Crumb Graph records (Effort, Issue, Finding, Decision, Constraint, and Risk)
capture work and reasoning in deliberately small records. Long plans, research
material, JSON dumps, and media do not fit well in record bodies or digest
limits. Artifact and Plan are not record types in the first release. Agents
and humans still need a place to store large, experimental content in git (or
another Flatbread source) and link to it from a Finding or Decision.

## Decision

Adopt **Blob** as the name for a collection of stored content that Crumb Graph
records reach through Citations.

A Blob stores content of any format (markdown, JSON, images, and more). It has
no proposed/accepted lifecycle because it is storage, not a judgment. Records
stay short and cite **Citation** ids in `cites[]`. A Citation body alone is
valid (for example, a URL), and its optional `blob` field attaches saved
content.

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
