---
id: dec-use-semantic-mutations-and-a-standalone-writer--2d0m3tkqhad4yyhr
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Use semantic mutations and a standalone writer
state: accepted
created_at: '2026-07-18T19:42:37.770Z'
derives_from:
  - dec-store-graph-artifacts-in-repo-by-default--xxpgwm9sv25j07z7
---

## Context

An edge such as `supersedes` changes more than one file once its materialized
reverse projection is updated. Asking an agent to patch generic frontmatter
would make it responsible for maintaining that invariant and would leave
partial writes as a corruption mode. Flatbread's core is deliberately a
read-only, in-memory GraphQL projection over source files.

## Decision

Expose a small set of typed, semantic mutations. Each mutation owns its Zod
validation, expands a conceptual edit into every required file change, and
completes the group or leaves it unchanged. The standalone Effort Graph writer
owns this logic; Flatbread's GraphQL read layer remains read-only. A future
GraphQL mutation facade may delegate to this writer, but is not its home.

The writer returns affected IDs and paths plus a monotonic generation token.
Reads are eventual by default; callers can request a strict read at that
generation where a concurrent workflow requires it.

## Alternatives considered

- **Create-only mutations plus a generic patch:** rejected because agents
  would need to coordinate both sides of semantic edits and recover from
  partial application.
- **GraphQL mutations in core:** rejected because it would impose write-back
  and cache-coherence concerns on Flatbread's read-only core.

## Consequences

The agent-facing API is a versioned set of named operations, not a YAML editing
protocol. Multi-file transaction and recovery semantics are writer concerns.
The mutation enum remains deliberately small, while watch/reindex work and
strict read support are tracked independently rather than being silently
assumed complete.
