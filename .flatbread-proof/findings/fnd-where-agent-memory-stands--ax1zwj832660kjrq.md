---
id: fnd-where-agent-memory-stands--ax1zwj832660kjrq
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Where agent memory stands
kind: compaction
created_at: '2026-10-17T08:59:05.871Z'
derives_from:
  - dec-adopt-a-bounded-status-briefing-fast-path-for-ef--kcw0rw39g3b2ym2h
  - dec-canonical-forward-edges-and-journaled-save-or-un--sv9x93svkfz4a98r
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
  - dec-distribute-the-effort-graph-as-a-versioned-agent--8as4sybr34zcqyqh
  - dec-lead-flatbread-1-0-with-effort-graph-agent-memor--nhxsqm8sd43s2avx
  - dec-make-the-effort-graph-the-planning-authority--gq4xegmc0hhbqjf7
  - dec-route-agent-reads-through-the-flatbread-query-en--476qb9qk878yfg62
  - dec-use-semantic-mutations-and-a-standalone-writer--2d0m3tkqhad4yyhr
  - iss-skill-scoped-records-filter-example-over-constra--vd0gcnpc9cm6jzjh
covers:
  - con-mutation-enum-stays-deliberately-small--3hw451bsedfj6khs@live
  - con-packaged-proof-skill-markdown-must-not-contain-m--a9gse08fkv7zcrxq@live
  - >-
    dec-adopt-a-bounded-status-briefing-fast-path-for-ef--kcw0rw39g3b2ym2h@proposed
  - dec-bridge-committed-generations-into-live-reads--mc3728t4w1kyqcqq@accepted
  - >-
    dec-canonical-forward-edges-and-journaled-save-or-un--sv9x93svkfz4a98r@accepted
  - >-
    dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a@accepted
  - dec-defer-shared-flatbread-write-extraction--xxa1ge2chw6x3xx0@accepted
  - >-
    dec-distribute-the-effort-graph-as-a-versioned-agent--8as4sybr34zcqyqh@accepted
  - >-
    dec-effort-get-digests-always-include-the-full-recor--xs7rnbha3zx8qdj9@accepted
  - >-
    dec-lead-flatbread-1-0-with-effort-graph-agent-memor--nhxsqm8sd43s2avx@accepted
  - dec-make-the-effort-graph-the-planning-authority--gq4xegmc0hhbqjf7@accepted
  - dec-name-citeable-longform-payloads-blob--9b11q14fgsx2ytve@accepted
  - dec-published-proof-skill-bytes-are-consumer-only--9frae0w0nq6wgqm3@accepted
  - dec-retract-noise-instead-of-deleting-proof-files--k6jk0d2bdp1m9jw9@accepted
  - >-
    dec-route-agent-reads-through-the-flatbread-query-en--476qb9qk878yfg62@accepted
  - dec-ship-citation-collection-with-optional-blob--fyga3x876n7rcnmn@accepted
  - >-
    dec-specify-blockingdecisions-over-effort-scoped-edg--pxwaenyra0aa365j@accepted
  - dec-store-graph-artifacts-in-repo-by-default--xxpgwm9sv25j07z7@accepted
  - dec-use-prefixed-random-ids-with-reviewable-slugs--xdg764ejat1kacd2@accepted
  - dec-use-profiles-not-separate-schemas--27p0wakkyxj0kfc1@accepted
  - >-
    dec-use-semantic-mutations-and-a-standalone-writer--2d0m3tkqhad4yyhr@accepted
  - fnd-adrs-created-a-second-planning-authority--j1waeg8qh900sqee@live
  - fnd-bounded-status-briefing-protocol-halves-effort-g--ht1jd1hsssf7mv2y@live
  - fnd-citation-and-blob-records-now-match-the-current--p6c37v29mx4jjfr2@live
  - fnd-citation-collection-keeps-flatbread-refs-intact--z33ar5vyjxzr7ys0@live
  - fnd-dogfooding-the-read-cli-surfaced-three-real-defe--g21hg77x72hdty56@live
  - fnd-filtered-retrieval-is-94-percent-smaller--qpvz4vch5hygye20@live
  - fnd-getrecord-digests-call-the-same-excerpt-as-brows--q5rbnhpxc697x2dv@live
  - fnd-one-canonical-schema-needs-mapping-profiles--k2yvq5e9rcpsm1s1@live
  - fnd-root-readme-roadmap-reference-is-already-removed--w56t43aa10v311hj@live
  - fnd-supersession-transitions-decision-state-on-the-r--2m807tcfjz2jz9gt@live
  - fnd-versioned-skill-distribution-passes-full-reposit--hm5cy9j2zts96dg4@live
  - iss-skill-scoped-records-filter-example-over-constra--vd0gcnpc9cm6jzjh@open
---

Proof is Git-native memory for coding agents, and Flatbread 1.0 leads with it;
static relational content stays a first-class use. Proof records are the only
durable authority for this project's decisions, and they live in the
repository beside the code.

Writes go through one standalone writer and a small, fixed set of typed
mutations. A hard Constraint keeps that set small: each addition needs
evidence from real use. The writer stores forward edges, adds the reverse
links itself, and saves each change through a journal that it can roll back
or finish. Ids carry a kind prefix, a readable slug, and a random suffix.
Wrong records are retracted, never deleted. Citations name sources and may
attach a Blob.

Reads run through the Flatbread query engine. Each returns a bounded JSON
envelope and a cached Markdown digest. Browse reads excerpt bodies; `get`
returns one full body; `blocking-decisions` finds proposals tied to open
blockers. `brief` returns this compaction and every record that changed
since.

The skill ships as a versioned package. Its published files are for
consumers and hold no maintainer-only notes.

Open work: the status-briefing fast path is still a proposed Decision,
although the skill already teaches it. The Issue about the over-constrained
filter example is still open, although the skill now tells agents to query
each kind separately. Both look done and wait only on a lifecycle change.
