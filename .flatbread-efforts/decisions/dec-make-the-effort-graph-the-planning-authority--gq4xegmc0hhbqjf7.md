---
id: dec-make-the-effort-graph-the-planning-authority--gq4xegmc0hhbqjf7
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Make the Effort Graph the planning authority
state: accepted
created_at: '2026-07-19T00:41:19.716Z'
---

## Decision

For Flatbread product and engineering work, Effort Graph records are the sole durable authority for decisions, constraints, findings, risks, and open issues. Keep CONTEXT.md only as a glossary. Decision bodies carry the context, alternatives, consequences, and reversal criteria previously preserved in ADRs.

## Consequences

Migrate the former ADR rationale into the corresponding graph records, retire
the duplicate documents, and replace ADR-oriented agent guidance with Effort
Graph journaling. Working notes may remain when useful, but must cite graph
record IDs and cannot establish a competing decision authority.
