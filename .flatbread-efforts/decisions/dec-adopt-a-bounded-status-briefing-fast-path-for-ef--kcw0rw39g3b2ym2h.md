---
id: dec-adopt-a-bounded-status-briefing-fast-path-for-ef--kcw0rw39g3b2ym2h
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Adopt a bounded status-briefing fast-path for Effort Graph recall
state: proposed
created_at: '2026-07-19T02:03:45.865Z'
derives_from:
  - fnd-bounded-status-briefing-protocol-halves-effort-g--ht1jd1hsssf7mv2y
  - iss-skill-scoped-records-filter-example-over-constra--vd0gcnpc9cm6jzjh
---

## Context

Recall-style questions ("what is open / in flight / resume") are a common agent entry point. A controlled 12-run experiment (see the derives_from Finding) showed the current skill lets agents roughly double their tool calls versus a bounded protocol, with no quality gain and complete distribution separation.

## Decision

Add an explicit "status briefing / resume" fast-path to the effort-graph skill: (1) `list --status active` and trust the returned digest; (2) for each active Effort, `records --kinds issue,decision` and read status/state from the digest without opening source markdown; (3) `blocking-decisions` only for an Effort that has an open blocker Issue; (4) do not open raw .flatbread-efforts/\*_/_.md unless a digest truncated a body that must be quoted. Also correct the over-constrained `--status open --state proposed` filter example (see the derives_from Issue).

## Alternatives considered

- Leave guidance as-is: rejected; the experiment shows a consistent ~52 percent tool-call waste from blocking-decision fan-out and re-querying.
- Build a new aggregate CLI command (e.g. `effort briefing`): deferred; a guidance-only change captured the full effect with no new code surface. Revisit only if guidance proves insufficient.

## Consequences

Recall becomes cheaper and lower-latency with unchanged answer quality, and the prescriptive path doubles as a forcing function (Treatment tool-call variance was near zero). Requires editing the canonical skill in packages/effort-graph/skills and re-running `pnpm skills:sync`.

## Reversal criteria

Revisit if answer quality regresses on richer recall questions, if the fast-path causes agents to miss records that need source-body detail, or if a measured task type shows no benefit.
