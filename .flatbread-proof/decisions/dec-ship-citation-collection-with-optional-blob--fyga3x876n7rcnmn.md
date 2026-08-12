---
id: dec-ship-citation-collection-with-optional-blob--fyga3x876n7rcnmn
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Ship Citation collection with optional Blob
state: accepted
created_at: '2026-07-19T11:21:07.225Z'
derives_from:
  - fnd-citation-collection-keeps-flatbread-refs-intact--z33ar5vyjxzr7ys0
  - iss-implement-blob-collection-and-crumb-graph-cites--g2c7m6j39we5xy3z
cites:
  - cit-local-blob-design-dump--pg7g6qy1td7yjqpy
---

## Context

Epistemic records need cite metadata without breaking Flatbread homogeneous refs (string ids only).

## Decision

Add Citation as a first-class collection. Epistemic records use cites→Citation. Citation body alone is valid (e.g. URL). Optional blob→Blob attaches longform payloads. No cite_meta sidecar.

## Alternatives considered

- cite_meta objects alongside cites→Blob: works but bypasses refs for annotations
- cites→Blob only: no place for relationship/URL-only cites

## Consequences

WriteCitation + WriteBlob mutations; digests omit Blob bodies by default.

## Reversal criteria

Revisit if Citation churn is too heavy for simple URL cites or if polymorphic cite targets become necessary.
