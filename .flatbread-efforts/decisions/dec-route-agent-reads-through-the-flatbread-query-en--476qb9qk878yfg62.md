---
id: dec-route-agent-reads-through-the-flatbread-query-en--476qb9qk878yfg62
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Route agent reads through the Flatbread query engine
state: accepted
created_at: '2026-07-18T20:42:15.423Z'
derives_from:
  - fnd-dogfooding-the-read-cli-surfaced-three-real-defe--g21hg77x72hdty56
  - iss-define-blocking-decision-semantics--3bj9ph7ppab2c7g2
---

## Context

Agents need compact, evidence-backed recall without putting a complete
reasoning graph in context. A second bespoke record-filtering implementation
would drift from Flatbread's own ID, relation, and filter semantics.

## Decision

Agent reads return a bounded envelope: deterministic summary, digest path and
hash, served generation, consistency echo, paging information, and executable
hints. The rendered digest is the evidence surface. It is atomically cached by
generation and canonical query hash, contains selected frontmatter, relations,
and a 600-character/12-line body excerpt, and never inlines unrestricted graph
content.

The product surface is five named, effort-scoped reads: record lookup, effort
records, one-hop relations, blocking decisions, and active-effort discovery.
The closed filters compile to Flatbread filter objects and execute through
`FlatbreadProvider` against the generated schema. The digest renderer, cache,
and envelope remain engine-agnostic; CLI and future MCP are thin transports.

Reads are eventual by default. Strict reads wait for the caller's durable
generation token or fail explicitly; they never silently degrade.

## Alternatives considered

- **A general agent query language:** rejected because canonical cache keys,
  cap enforcement, and a teachable API require a closed vocabulary.
- **Bespoke filesystem snapshot filtering:** rejected because it recreates
  Flatbread semantics and accumulates a second query-engine debt.
- **Full graph responses:** rejected because they overflow context and expose
  unrelated reasoning.

## Consequences

Digests cap primary records, relation expansion, displayed edges, and bytes;
callers narrow or page incomplete responses. Full bodies remain available from
the source record or single-record lookup. The exact read contract lives in
this Decision and its supporting findings, not in a parallel ADR.

`get`, effort-scoped records, relations, blocking decisions, and active-Effort
discovery are the complete named v1 reads. Their digests cap at 25 primary
records, one hop, 50 edges, and 64 KiB; summaries cap at 160 tokens and
excerpts at 600 characters or 12 lines. Supersession reads resolve to the head
and render prior records as deterministic checkpoints; semantic rollups belong
in the superseding record's body, never in an LLM read path.
