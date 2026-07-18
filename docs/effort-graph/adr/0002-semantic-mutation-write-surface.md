# 0002 — Semantic-mutation write surface

Status: Accepted

## Context

Storing edges bidirectionally (`supersedes`/`superseded_by`, `invalidates`/`invalidated_by`) so that any single record can answer "am I current?" in one access (ADR-adjacent decision captured in `CONTEXT.md`) means a single conceptual change — "Decision X supersedes Decision A" — must update **two files atomically**: write X with `supersedes: [A]`, and patch A with `superseded_by: X`. A half-applied edge (X claims supersession, A does not know) is a corruption mode.

Two stances for the write API the agent calls:

- **(α) Narrow create-only surface.** Ship only `WriteIssue` / `WriteFinding` / `WriteDecision` / `WriteConstraint` / `WriteRisk` create mutations plus a generic frontmatter patch. The agent is responsible for issuing both halves of a bidirectional edge; the read shim warns about half-applied edges during a validation pass.
- **(β) Semantic-mutation surface.** Each schema-level concept (supersede, invalidate, resolve-issue, mitigate-risk) gets a dedicated typed mutation that atomically updates both ends of the edge. The platform owns bidirectional consistency; the agent does not.

## Decision

Adopt **β — a semantic-mutation write surface**. Mutations are validated and expanded at the level of **semantic edits**, not file edits. Each mutation:

- has its own Zod schema and validation rules (e.g. `SupersedeDecision` requires the target Decision to exist in the index and not already be `superseded`),
- expands into the full set of file writes its semantics imply, and
- completes all of those writes or none (transaction semantics — partial-failure handling is specified separately).

## Consequences

- The agent-facing write contract is a set of named mutations, not "validate this YAML and write it." This is a larger design and implementation surface than α.
- Bidirectional-edge integrity is guaranteed by the platform, mirroring how `@flatbread/proof` put convergence-loop semantics in the DAG primitive rather than in agent prompts.
- A transaction/rollback primitive is now required (what happens when the second of two writes fails). This is a new capability for the write path.
- Flatbread has no mutation support today; β raises the question of whether mutations are exposed through GraphQL resolvers in core or through a standalone write library that does not touch the read layer. That fork is decided separately.
- The set of semantic mutations must be enumerated and kept small; each new mutation is API surface that must be versioned and taught to agents.
