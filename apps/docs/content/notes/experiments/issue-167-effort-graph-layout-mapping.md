# Experiment: Issue #167 — Effort Graph reference layout (agent artifacts → indexed graph)

**Scope:** Map one real in-repo agent artifact layout to the [Effort Graph sketch](../../../../../flatbread-agent-artifact-opportunity.md) (§8): `Effort` → `Plan`, `Session`, `Decision` with `refs`. Demonstrate a **single retrieval surface** query—here, **GraphQL**—that returns **blocking decisions** for a chosen effort with **nested plan and session context**. This satisfies the “reference layout indexed + validated” bar from the [PMF decision rubric](../../docs/pmf-decision-rubric.md) as an **experiment**, not a shipped preset.

**Non-goals (explicit):** Full **Session** / **Run** fidelity, importer scripts, or turning this repo’s proof harness into production artifact storage. GraphQL is **one** interface; the same filter object is intended to work against codegen-backed TypeScript or MCP when those surfaces expose the shared filter DSL ([§9 agent artifact opportunity](../../../../../flatbread-agent-artifact-opportunity.md)).

---

## 1. Source layout mapped (agent artifacts)

**Canonical folder:** [`.agents/skills/proof/`](../../../../../.agents/skills/proof/) — agent **Skill** for DAG-style proof runs.

| Existing path                                | Role in harness                                      | Effort Graph mapping                                                                                              |
| -------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                   | Human + agent docs for the skill                     | **Unindexed narrative** in v1; optional later **`Artifact`** row body or symlinked markdown                       |
| `examples/dag-flatbread-flow-pmf-audit.json` | Machine-authored **DAG spec** (title, tasks, models) | **`Plan`** row: `title` + provenance; body summarizes DAG; `source_artifact` frontmatter points back to this path |
| _(synthetic)_ proof CLI invocation           | One **multi-step run** with canvas streaming         | **`Session`** row: `runner`, `effort` ref, short body describing the run surface                                  |
| _(synthetic)_ governance row                 | **Blocking** acceptance check                        | **`Decision`** row: `blocking`, `effort` / `plan` / `session` refs                                                |

This is **incremental adoption**: only new markdown under a dedicated tree needs frontmatter; harness files **stay in place** ([agent artifact opportunity §9.6](../../../../../flatbread-agent-artifact-opportunity.md)).

---

## 2. Target tree (preset-shaped)

Representative fixtures live under:

[`fixtures/cursor-proof-skill-effort-graph/`](./fixtures/cursor-proof-skill-effort-graph/)

Suggested production mirror (from §8 sketch):

```text
.flatbread-efforts/
  efforts/
  plans/
  sessions/
  decisions/
```

---

## 3. Minimal `flatbread` config excerpt

Wire the content arrays to the fixture paths (or to `.flatbread-efforts/*` once copied into a consumer repo):

```javascript
import { defineConfig, transformerMarkdown, sourceFilesystem } from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown({ markdown: { gfm: true } }),
  content: [
    {
      path: 'docs/experiments/fixtures/cursor-proof-skill-effort-graph/efforts',
      collection: 'Effort',
    },
    {
      path: 'docs/experiments/fixtures/cursor-proof-skill-effort-graph/plans',
      collection: 'Plan',
      refs: { effort: 'Effort' },
    },
    {
      path: 'docs/experiments/fixtures/cursor-proof-skill-effort-graph/sessions',
      collection: 'Session',
      refs: { effort: 'Effort' },
    },
    {
      path: 'docs/experiments/fixtures/cursor-proof-skill-effort-graph/decisions',
      collection: 'Decision',
      refs: { effort: 'Effort', plan: 'Plan', session: 'Session' },
    },
  ],
});
```

**Validation story:** Today, **broken `refs`** (typos in `effort` / `plan` / `session`) surface as missing relations at query time; duplicate `id` values within a collection remain a **roadmap** hardening item ([PMF audit §4](../../../../../flatbread-flow-pmf-audit.md), [rubric](../../docs/pmf-decision-rubric.md)).

---

## 4. Example query — one retrieval surface (GraphQL)

**Intent:** “All **blocking** decisions for effort `pmf-audit-dag`, with **plan title** and **session** context.”

```graphql
query BlockingDecisionsForEffort {
  allDecisions(
    filter: { effort: { eq: "pmf-audit-dag" }, blocking: { eq: true } }
    sortBy: "decided_at"
    order: DESC
  ) {
    id
    title
    status
    blocking
    decided_at
    plan {
      id
      title
      source_artifact
    }
    session {
      id
      runner
    }
  }
}
```

**Expected shape (illustrative):** One row for the #167 **reference layout** decision, with nested `Plan` matching the DAG JSON title and `Session` describing a proof-cli style run. **TS / MCP parity:** use the same `filter` JSON against the list resolver the app exposes ([agent artifact opportunity §9](../../../../../flatbread-agent-artifact-opportunity.md)).

---

## 5. Friction observed (concrete follow-ups)

### Issue draft: **[Preset] Effort Graph field naming and codegen**

**Problem:** GraphQL and docs benefit from **one canonical naming** policy (`blocking` vs `severity`, `decided_at` vs `decidedAt`). Today’s default `fieldNameTransform` only normalizes **spaces**, not snake_case→camelCase.

**Acceptance criteria:** Document preset field names; optionally ship `fieldNameTransform: lodash.camelCase` for Effort Graph preset only; regenerate example GraphQL operations.

---

### Issue draft: **[Core] Ref integrity diagnostics for agent presets**

**Problem:** Missing `plan` / `session` on a blocking decision is a **product risk** ([rubric integrity bar](../../docs/pmf-decision-rubric.md)); today users discover gaps via empty nested selections, not necessarily a validator error.

**Acceptance criteria:** Configurable **hard fail** (or structured diagnostic) when `Decision.blocking: true` and `plan` ref does not resolve; integration test from `diag-query-surface` notes.

---

### Issue draft: **[MCP] Single-call “blocking decisions + context” for effort id**

**Problem:** Agents should not re-learn GraphQL shapes per repo.

**Acceptance criteria:** MCP tool accepts `effortId`, returns the same object shape as the query above (or executes the shared filter internally).

---

### Project note (no issue number)

**Canonical effort identity** (branch vs slug vs GitHub `#167`) is still a **human checkpoint**; this fixture uses **`pmf-audit-dag`** as a stable slug and **`external_issue: "167"`** on the Effort row for traceability.

---

## 6. How to extend without migration day one

1. Add **one** `Effort` row per research thread or feature.
2. When a DAG JSON exists, add a **Plan** row pointing at the file path in `source_artifact`.
3. For each proof run worth querying later, add a **Session** row.
4. Add **Decision** rows only for gates that must be machine-queryable (blocking / open decisions).

---

## References

- [flatbread-agent-artifact-opportunity.md §8 sketch](../../../../../flatbread-agent-artifact-opportunity.md)
- [flatbread-flow-pmf-audit.md — Effort Graph positioning](../../../../../flatbread-flow-pmf-audit.md)
- [pmf-decision-rubric.md](../../docs/pmf-decision-rubric.md)
- Proof DAG example: [`.cursor/dags/flatbread/dag-flatbread-flow-pmf-audit.json`](../../../../../.cursor/dags/flatbread/dag-flatbread-flow-pmf-audit.json)
