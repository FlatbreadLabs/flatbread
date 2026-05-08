# Experiment: Issue #168 — Adversarial Effort Graph schema across three harness layouts

**Scope:** Execute [agent artifact opportunity §12.2](../../flatbread-agent-artifact-opportunity.md) — stress one **Effort Graph**–shaped model against **three** representative tool trees. Document which **entities and fields** stay stable, which need **tool-specific mapping**, and whether **one canonical schema + a mapping layer** remains a viable product bet.

**Product framing:** Flatbread is **Git-native relational content** for TypeScript apps, materialized from flat files. **GraphQL** is **one** query adapter alongside generated TypeScript and MCP; it does not define the whole product.

**Related:** Issue [#167 reference layout](./issue-167-effort-graph-layout-mapping.md) (single Cursor `proof` skill → indexed rows). This report generalizes that pattern across layouts.

**Non-goals:** Importers, core validator code, or moving production harness files. **Fixtures are snippets** under [`fixtures/issue-168-three-layout-snippets/`](./fixtures/issue-168-three-layout-snippets/).

---

## 1. Harness layouts under test

| ID     | Layout                                            | Representative paths (this repo or synthetic)                                                                                          | Role in adversarial test                                                                             |
| ------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **L1** | **Claude Code–oriented** (skills / agent packets) | [`.agents/skills/*/SKILL.md`](../../.agents/skills/)                                                                                   | YAML frontmatter + narrative body; skills as discoverable units without a single DAG file per effort |
| **L2** | **Cursor rules + skills**                         | [`.cursor/rules/*.mdc`](../../.cursor/rules/), [`.cursor/skills/proof/`](../../.cursor/skills/proof/)                                  | Split between **rules** (policy) and **skills** (workflows + JSON DAG examples)                      |
| **L3** | **GCC-style branch context** (synthetic)          | [`fixtures/issue-168-three-layout-snippets/layout-gcc/`](./fixtures/issue-168-three-layout-snippets/layout-gcc/representative-tree.md) | Per-branch knowledge tree; identity and merge semantics are the stressor                             |

The machine-readable **acceptance matrix** (checkbox test contract) lives in [`acceptance-test-matrix.md`](./fixtures/issue-168-three-layout-snippets/acceptance-test-matrix.md).

---

## 2. Canonical schema (held constant across layouts)

Collections (names align with [#167](./issue-167-effort-graph-layout-mapping.md) and opportunity §8):

- `Effort` — thread of work; stable slug `id`; optional `external_issue`, `external_branch`
- `Plan` — structured intent; `title`, `source_artifact`, `effort` ref
- `Session` — one run / invocation; `runner`, `effort` ref
- `Decision` — gate; `blocking`, `status`, `effort` / `plan` / `session` refs
- `Artifact` _(optional in v1)_ — indexed file bodies (rules, manifests) when teams choose not to treat them as narrative-only

---

## 3. Entity and field stability

### 3.1 Stable across layouts (same semantic column in the graph)

| Entity          | Fields / behavior                                                                    | Why stable                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `Effort`        | `id` (slug), optional `external_*`                                                   | Chosen **canonical identity**; tools do not agree on branch vs issue — the row **declares** the slug                          |
| All row types   | `refs` to other collections (`effort`, `plan`, `session`)                            | Relational shape is the product promise                                                                                       |
| `Decision`      | `blocking`, `status`, temporal fields (e.g. `decided_at`)                            | Gate semantics are layout-agnostic once ingested                                                                              |
| Query surfaces  | Filter object over the same field names (GraphQL / TS / MCP)                         | One mental model for consumers                                                                                                |
| **Disk policy** | New markdown under `.flatbread-efforts/` (or preset path); harness files **unmoved** | Matches [#167 incremental adoption](./issue-167-effort-graph-layout-mapping.md) and migration notes from upstream diagnostics |

### 3.2 Requires tool-specific mapping (profile / ingest rules)

| Concern                        | L1 Claude-oriented                                                         | L2 Cursor                                                                    | L3 GCC                                                                |
| ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Where “the plan” lives**     | Often **narrative** `SKILL.md` or distributed docs; may lack one JSON DAG  | **Split**: rules vs `SKILL.md` vs `examples/*.json`                          | Session / design files per branch; path encodes **branch**            |
| **Plan row `source_artifact`** | Globs on skill roots; may need **multi-file** summary or primary file pick | Point to **JSON** for machine title; optional second row for skill narrative | Map branch-relative path → repo-relative at ingest time               |
| **Session identity**           | CLI / agent-reported run id varies                                         | proof CLI / IDE session labels                                               | GCC **run** or commit-scoped ids (tool-defined)                       |
| **Rules / manifests**          | Less central in stub skills                                                | `.mdc` with `alwaysApply` — candidate **`Artifact`** or excluded             | Policy files may mirror branch                                        |
| **Effort identity collision**  | Skill name vs GitHub issue                                                 | Branch name vs `pmf-audit-dag` slug                                          | **Branch name vs slug** — highest duplication risk when branches fold |

---

## 4. Where a single schema breaks (unless mapping layer exists)

1. **Identity:** Without a documented **canonical `Effort.id`** and `external_*` fields, the same work is forked across tools ([§5 human checkpoint #167](./issue-167-effort-graph-layout-mapping.md)).
2. **Partial graphs:** Blocking `Decision` rows with missing `plan` / `session` refs are worse when three layouts multiply ingest paths — **validation / diagnostics** become product-critical (per upstream **diag-stability-mapping**).
3. **Noise:** Promoting every rule file to `Artifact` explodes row count; needs **`kind`** + **`always_on`** (or equivalent) filtering policy.
4. **GCC lifecycle:** Branch merge does not imply graph merge — **Sessions**, **Efforts**, and **links** need team policy (no automatic semantics in core).

None of these require **abandoning** a unified collection schema; they require **profiles** (globs, field extraction, optional joins) and **integrity rules**.

---

## 5. Recommendation

**Verdict: One canonical Effort Graph schema + an explicit mapping / profile layer is viable.** The opportunity is **not** too fragmented for a single relational model: the fragmentation is in **harness conventions and identity policy**, not in the core nouns (`Effort`, `Plan`, `Session`, `Decision`).

- **Ship** a small set of **layout profiles** (at minimum: Claude-oriented skills tree, Cursor rules+skills, GCC branch tree) as **configuration**, not separate schemas.
- **Invest** early in **ref integrity diagnostics** and **blocking-decision invariants** so multi-layout ingest cannot silently degrade.
- **Defer** promising automatic merge semantics for GCC branches until a human policy is written.

If the team cannot commit to **canonical slugs** and **validation**, the same schema technically works but **operational** fragmentation will **feel** like multiple products — that is a **process** failure mode, not a schema impossibility.

---

## 6. Traceability and human gate

- Align this experiment with the real tracker issue **#168** (scope, acceptance criteria, and whether it stays distinct from **#167** documentation).
- Before scaling fixtures: approve **`Effort.id`** scheme and whether `.mdc` / root manifests are **`Artifact` rows** vs narrative-only ([#167 §5](./issue-167-effort-graph-layout-mapping.md)).

---

## References

- [flatbread-agent-artifact-opportunity.md §12](../../flatbread-agent-artifact-opportunity.md)
- [issue-167-effort-graph-layout-mapping.md](./issue-167-effort-graph-layout-mapping.md)
- [PMF decision rubric](../pmf-decision-rubric.md)
