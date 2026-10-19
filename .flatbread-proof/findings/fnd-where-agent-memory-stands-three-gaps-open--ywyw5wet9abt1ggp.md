---
id: fnd-where-agent-memory-stands-three-gaps-open--ywyw5wet9abt1ggp
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: 'Where agent memory stands: three gaps open'
kind: compaction
created_at: '2026-10-18T09:37:15.540Z'
derives_from:
  - con-mutation-enum-stays-deliberately-small--996zbtny5gv21ngy
  - dec-adopt-a-bounded-status-briefing-fast-path-for-ef--kcw0rw39g3b2ym2h
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
  - dec-lead-flatbread-1-0-with-effort-graph-agent-memor--nhxsqm8sd43s2avx
  - dec-route-agent-reads-through-the-flatbread-query-en--476qb9qk878yfg62
  - dec-use-semantic-mutations-and-a-standalone-writer--2d0m3tkqhad4yyhr
  - iss-proof-has-no-recall-benchmark-to-test-reads-agai--a63fn3b7vskv3psy
  - iss-proof-memory-reaches-an-agent-only-when-the-agen--xzk3cfypamafeqag
  - iss-records-are-not-tied-to-the-code-they-govern--zke3s5f2rhz8kqnd
  - iss-skill-scoped-records-filter-example-over-constra--vd0gcnpc9cm6jzjh
supersedes:
  - fnd-where-agent-memory-stands--ax1zwj832660kjrq
covers:
  - con-mutation-enum-stays-deliberately-small--996zbtny5gv21ngy@live
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
  - fnd-brief-is-84-percent-smaller-than-the-status-brie--qhgmcvqdma6rq4rq@live
  - fnd-citation-and-blob-records-now-match-the-current--p6c37v29mx4jjfr2@live
  - fnd-citation-collection-keeps-flatbread-refs-intact--z33ar5vyjxzr7ys0@live
  - fnd-dogfooding-the-read-cli-surfaced-three-real-defe--g21hg77x72hdty56@live
  - fnd-filtered-retrieval-is-94-percent-smaller--qpvz4vch5hygye20@live
  - fnd-getrecord-digests-call-the-same-excerpt-as-brows--q5rbnhpxc697x2dv@live
  - fnd-one-canonical-schema-needs-mapping-profiles--k2yvq5e9rcpsm1s1@live
  - fnd-root-readme-roadmap-reference-is-already-removed--w56t43aa10v311hj@live
  - fnd-supersession-transitions-decision-state-on-the-r--2m807tcfjz2jz9gt@live
  - fnd-versioned-skill-distribution-passes-full-reposit--hm5cy9j2zts96dg4@live
  - iss-proof-has-no-recall-benchmark-to-test-reads-agai--a63fn3b7vskv3psy@open
  - iss-proof-memory-reaches-an-agent-only-when-the-agen--xzk3cfypamafeqag@open
  - iss-records-are-not-tied-to-the-code-they-govern--zke3s5f2rhz8kqnd@open
  - iss-skill-scoped-records-filter-example-over-constra--vd0gcnpc9cm6jzjh@open
---

Proof is Git-native memory for coding agents, and Flatbread 1.0 leads with it;
static relational content stays a first-class use. Proof records are the only
durable authority for this project's decisions, and they live in the
repository beside the code.

Writes go through one standalone writer and a fixed set of eighteen typed
mutations. A hard Constraint keeps that set small: each addition needs
evidence from real use. The eighteenth, `WriteCompaction`, exists so that the
writer, not the agent, records which records a compaction covers and
supersedes the one before it. The writer stores forward edges, adds the
reverse links itself, and saves each change through a journal that it can
roll back or finish. Wrong records are retracted, never deleted.

Reads run through the Flatbread query engine. Each returns a bounded JSON
envelope and a cached Markdown digest. `brief` returns the current compaction
and every record that changed since; on this Effort it is 84 percent smaller
than the status-briefing `records` read. Nobody has yet measured whether
answers stay as good.

Open work:

1. No recall benchmark exists, so no change to reads can show that answers
   stay correct. This blocks judging `brief` against its reversal criteria.
2. Records are not tied to the code they govern, so a Decision can describe
   code that has changed without anyone noticing.
3. Memory reaches an agent only when the agent asks for it.
4. The status-briefing fast path is still a proposed Decision, and the Issue
   about the over-constrained filter example is still open. The skill already
   follows both; each waits only on a lifecycle change.
