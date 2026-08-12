---
id: dec-specify-blockingdecisions-over-effort-scoped-edg--pxwaenyra0aa365j
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Specify blockingDecisions over effort-scoped edges
state: accepted
created_at: '2026-07-18T19:42:57.783Z'
derives_from:
  - iss-define-blocking-decision-semantics--3bj9ph7ppab2c7g2
---

## Decision

A Decision is blocking for effort E when it belongs to E, remains `proposed`,
and its `derives_from` contains an Issue that also belongs to E with
`kind: blocker` and `status: open`. The relation is direct, results are
deduplicated and ordered by `created_at` then ID, and declared lifecycle state
is authoritative.

Accepted, rejected, superseded, or deprecated Decisions are excluded. So are
resolved, deferred, or non-blocker Issues, transitive dependencies,
cross-effort references, and prose mentions. The query deliberately answers
which proposed Decisions are gated by blockers; an open blocker with no
proposed response is discovered through the ordinary effort-records query.

## Consequences

The predicate is a frozen v1 contract. Widening it with transitive edges or
new edge semantics requires an explicit successor Decision with evidence from
dogfooding. Bounded one-hop digest expansion includes the matching blockers so
agents can inspect the gate without loading an entire Effort.
