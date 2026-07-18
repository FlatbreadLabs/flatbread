# 0005 — v1 semantic mutation enumeration

Status: Accepted

## Context

ADR-0002 requires the set of semantic mutations to be enumerated and kept small — each mutation is versioned API surface that must be taught to agents. ADR-0004 settled edge authority (forward edges canonical) and the atomicity boundary (journaled save-or-undo), so each mutation's file-expansion footprint is now specifiable.

## Decision

Ship exactly thirteen mutations in v1. Each has its own Zod schema; validation runs against a committed generation of the index (targets must exist, state transitions must be legal, e.g. `Supersede` rejects an already-`superseded` target).

**Effort lifecycle (2)**

- `CreateEffort` — creates the anchor record.
- `SetEffortStatus` — `active | paused | completed | abandoned`.

**Creation (5)** — one per epistemic primitive; single-file writes that accept forward edges at creation (`effort` is required; `derives_from`, `supersedes`, `invalidates` as applicable), expanding to back-edge materialization per ADR-0004:

- `WriteIssue`, `WriteFinding`, `WriteDecision`, `WriteConstraint`, `WriteRisk`.

**Edge retro-linking (2)** — for wiring records that already exist:

- `Supersede(supersederId, targetId)` — same-primitive only (per `CONTEXT.md`); validates the target is not already superseded.
- `Invalidate(findingId, targetId)` — a Finding asserting a prior Finding or Decision was wrong.

**Lifecycle transitions (4)**

- `ResolveIssue(issueId, resolution: resolved | deferred | wontfix, resolvedBy: refs)` — resolvedBy cites the closing Decision and/or Findings.
- `AcceptDecision(decisionId, rejectSiblings = true)` — the irreducibly multi-authoritative mutation: sets the target `accepted` and sibling `proposed` Decisions under the same Effort to `rejected` with a back-pointer to the accepted Decision (the `CONTEXT.md` proposal-collapse contract). Runs inside one journal transaction.
- `MitigateRisk(riskId, decisionId)` — flips the Risk to `mitigated`, citing the accepted Decision.
- `SetRiskState(riskId, state: realized | accepted, evidence: refs)` — the remaining Risk transitions; `realized` should cite the triggering Finding.

## Consequences

- Deliberately absent from v1: generic frontmatter patch (reintroduces the α surface ADR-0002 rejected), delete/archive mutations (git is the undo story), `RejectDecision` as a standalone (covered by `AcceptDecision` sibling-reject; a lone rejection without an accepted alternative is `SetRiskState`-style scope creep until dogfooding demands it), and body-edit mutations (edit the markdown body directly; only frontmatter semantics are platform-owned).
- Freeform body edits and hand edits to forward edges remain legal — the reindexer validates and repairs projections per ADR-0004. The mutation surface is the supported path, not the only physical path.
- Every mutation returns the RYW payload from ADR-0003: written/changed artifacts, touched ids and paths, and the generation token.
- Adding a mutation later is additive API surface; removing or reshaping one is a breaking change subject to the major-migration process.
