---
id: dec-separate-execution-and-display-planes--spm2ckxvdsch6h9m
effort: eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
title: Separate execution and display planes
state: proposed
created_at: '2026-07-18T19:43:33.002Z'
derives_from:
  - rsk-full-transcripts-can-overflow-prompts-and-leak-s--3p7ybk07jqe5w593
---

## Context

Proof's bounded stream buffer served as the canvas view, upstream prompt
context, convergence input, findings sidecar source, and persisted resume
state. It dropped the leading stream content, so execution decisions could
silently lose evidence while removing the cap would make canvases, prompts,
state files, and accidental sharing unsafe.

## Decision

Separate the execution plane from the display plane for `kind: "task"` output.
An execution-authoritative transcript drives upstream context, convergence
finding extraction and feedback, findings sidecars, artifacts, and resumed
runs. Canvas and persisted display state use explicitly bounded views with
visible truncation banners. Prompt policy remains named and bounded rather
than inheriting a display cap.

Artifact-backed restarts reconstruct transcripts from the same pinned
`--full-output-dir`; legacy bounded `resultText` is only a compatibility
fallback. Oracle stdout/stderr and advanced prompt-budget policy remain
separate follow-up work.

## Consequences

The runner must test transcript-to-prompt, convergence, sidecar, artifact, and
resume paths independently. Canvas size and privacy remain bounded; execution
logic no longer treats a UX cap as its source of truth.
