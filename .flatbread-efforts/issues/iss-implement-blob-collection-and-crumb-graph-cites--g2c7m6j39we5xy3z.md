---
id: iss-implement-blob-collection-and-crumb-graph-cites--g2c7m6j39we5xy3z
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Implement Blob collection and Crumb Graph cites
kind: gap
status: resolved
created_at: '2026-07-19T10:48:48.349Z'
derives_from:
  - con-mutation-enum-stays-deliberately-small--45v1ae3neq26g1rz
  - dec-name-citeable-longform-payloads-blob--9b11q14fgsx2ytve
resolved_by:
  - dec-ship-citation-collection-with-optional-blob--fyga3x876n7rcnmn
  - fnd-citation-collection-keeps-flatbread-refs-intact--z33ar5vyjxzr7ys0
---

Implement the accepted Blob decision so Crumb Graph records can cite longform/dynamic payloads.

## Scope

- Add a **Blob** content collection (non-epistemic; no proposed/accepted lifecycle).
- Allow Blobs to be backed by ordinary Flatbread sources (filesystem first; design for S3/CDN/other source plugins).
- Let Findings, Decisions, Issues (and other primitives as needed) ref Blob ids; keep epistemic bodies short.
- Bounded reads: digests cite Blob id/title/locator — do not inline Blob bodies by default.
- Update glossary (intentional non-models), preset/skills/CLI/mutations as needed; keep the mutation enum deliberately small (additive only with clear semantics).
- Dogfood: at least one Finding that cites a Blob (e.g. research markdown or JSON dump).

## Out of scope for first slice

- Full binary/media CMS features
- Renaming CLI write-result `artifacts` / digest `artifact_path`
- Bread-themed product rename of Blob
