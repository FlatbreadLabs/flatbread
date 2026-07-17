# Effort Graph glossary — reasoning primitives for `@flatbread/proof`

This glossary defines the **epistemic primitives** that make up the Effort Graph — a persistent, queryable memory layer over the reasoning and planning that happens during long-horizon software work, single-agent or multi-agent.

The Effort Graph is **built on top of** Flatbread's content-layer vocabulary (see [Flatbread glossary](../glossary.md) for `Collection`, `Record`, `Relation`, `Refs`, `ID`). Each primitive here is a Flatbread **Collection**; instances are **Records**; cross-primitive references are **Relations** wired through frontmatter `refs`.

**What this is not:** a CMS, an authoring UI, a hosted memory product, or a general task tracker. It is a relational substrate for capturing the **gray-area reasoning** that an ADR-only record loses: open questions, considered alternatives, sticky constraints, prospective risks, and post-hoc invalidations.

**Operational provenance** (which session produced this, which agent, which model, which DAG run) is captured as **frontmatter fields** on these primitives, not as peer collections. The durable transcript record lives next to the graph under `.flatbread/artifacts/` (see [`packages/proof/README.md`](../../packages/proof/README.md) §Artifact Output).

**Committed generation.** The opaque journal generation token returned by an Effort Graph mutation. It is published only after the full save group has produced a committed live schema (the `CommittedGenerationPublisher` seam — not to be confused with `EffortGraphIndex`, the plan-time read interface). It is a different counter from any process-local live-schema generation; the committed-generation bridge maps the former to the latter for strict readers.

---

### Effort

The **anchor** of the graph. One Effort represents a coherent, named thread of work — a feature, a migration, a spike, a research investigation, a refactor. Every epistemic primitive belongs to exactly one Effort.

An Effort is the stable filter (`effort: { eq: "<effort-id>" }`) that scopes every "what's still open / what did we conclude / what are we considering?" query. Loss of the Effort anchor is the failure mode that vault MCPs and flat memory stores cannot avoid; preserving it is the central wedge.

An Effort has its own lifecycle (active, paused, completed, abandoned) but carries **no reasoning content of its own** — its body is a short description; the reasoning lives in the primitives that ref back to it.

### Issue

A **tracked unit needing attention within an Effort**, in the GitHub-issue sense — broader than "something is wrong." Issues span open questions, observed defects, identified gaps, and explicit blockers. Each Issue carries a `kind` field that names the speech act (`question`, `defect`, `gap`, `blocker`, …) and a status (`open`, `resolved`, `deferred`, `wontfix`).

An Issue is resolved by a Decision (we'll do X) and/or one or more Findings (here's what we learned that closes this). The `kind` is open-ended (free-form string) so common values emerge from dogfooding rather than from schema enforcement.

Feature _proposals_ are not Issues — they are `Decision{state: proposed}`. Issues are reactive (something exists that needs attention); proposed Decisions are proactive (let's commit to doing X).

### Finding

A **grounded observation** — a claim about reality (the codebase, the user, the literature, the runtime) backed by cited evidence. Findings resolve Issues, support or contradict Decisions, surface Risks, and invalidate prior Findings or Decisions when reality refutes a prior belief.

The `Finding{kind: retrospective}` variant carries the additional semantic that the Finding was produced **after a Decision shipped** and may invalidate that Decision in light of new evidence. Other Finding kinds (e.g. `measurement`, `survey`, `dead-end`) may emerge from usage but are not load-bearing in the schema.

### Decision

A **commitment** — a chosen path among alternatives. Has a `state`: `proposed` (under consideration), `accepted` (committed), `rejected` (an alternative we chose not to take), `superseded` (replaced by a later Decision), or `deprecated` (no longer current but not replaced).

Multiple `state: proposed` Decisions under the same Effort represent **competing directions under exploration**. When one is `accepted`, the others should transition to `rejected` with a back-pointer to the accepted Decision. This is the schema's substitute for a separate `Proposal` primitive.

A Decision cites the Findings, Constraints, and Risks it weighed; it does not duplicate their content.

### Constraint

A **sticky boundary** that scopes the decision space for an Effort. May be hard (license incompatibility, regulatory rule, irreversible upstream choice) or soft (team preference, budget envelope, performance target). Constraints typically outlive individual Decisions and apply to many of them.

A Constraint is not a Risk: a Constraint is a known limit you must design within; a Risk is a possible outcome you might suffer.

### Risk

A **prospective negative outcome** with a likelihood and a severity. Risks attach to Decisions as part of the rationale for choosing among them. A Risk has a lifecycle: `open` (live, unmitigated), `mitigated` (an accepted Decision exists to reduce likelihood or severity), `realized` (it happened — usually triggers a Finding and possibly a retrospective Finding), or `accepted` (we knowingly proceed despite it).

---

## Cross-cutting edge vocabulary

These edges are **ubiquitous** — they live on every epistemic primitive. They are the type-agnostic semantic graph that lets a reader trace causality, evolution, and disagreement.

| Edge                             | Description                                                                                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `derives_from`                   | Causal upstream — what this artifact is responding to or built on. (A Finding `derives_from` an Issue; a Decision `derives_from` Findings + Constraints; a retrospective Finding `derives_from` the original Decision.)                      |
| `supersedes` / `superseded_by`   | Replaces an earlier artifact of the same primitive. The forward edge (`supersedes`) is canonical; `superseded_by` is a derived projection materialized to disk so any single record can answer "am I current?" in one access (see ADR-0004). |
| `invalidates` / `invalidated_by` | Stronger than `supersedes` — asserts the targeted artifact was _wrong_, not just outdated. Used primarily by retrospective Findings against shipped Decisions. Same forward-canonical / materialized-back-edge rule as `supersedes`.         |

**The edge vocabulary is permitted to grow** as dogfooding surfaces real omissions. Candidate additions to watch for: `refines` (soft non-replacing evolution), `contradicts` (explicit disagreement that doesn't yet rise to invalidation), `blocks` (an open Issue gating progress on another). Any addition must justify itself with a query the existing vocabulary cannot answer.

---

## What is intentionally not modeled

- **Session, Run, Plan, Artifact, Agent** as collections. These are operational provenance, captured as opaque-string frontmatter fields (`produced_in`, `created_by`, etc.) on the epistemic primitives above. Their durable log-grade record lives under `.flatbread/artifacts/` from `@flatbread/proof` runs.
- **Investigation** as a collection. An investigation is a Session-grouping of Findings (and possibly an Issue with `status: investigating`), not a noun in its own right.
- **Question** as a collection. Collapsed into `Issue{kind: question}` — the speech-act distinction does not warrant a separate primitive.
- **Proposal** as a collection. A Proposal is a `Decision{state: proposed}`.
- **Retrospective** as a collection. A Retrospective is a `Finding{kind: retrospective}`.
- **Branch** as a frontmatter field. Speculative exploration lives on git branches; cross-branch reasoning is preserved by promoting artifacts to the integration branch when an exploration closes (rejected or merged).

These collapses may be revisited if real usage proves the host primitive cannot carry the missing semantics; Flatbread's `refs` model permits later splitting without ID breakage.
