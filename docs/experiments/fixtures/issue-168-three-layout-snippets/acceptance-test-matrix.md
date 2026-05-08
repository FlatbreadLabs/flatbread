# Acceptance test matrix — Issue #168 (three harness layouts)

**Intent:** Executable **markdown contract** for the adversarial schema experiment: each layout row must map to the **same** canonical collections (`Effort`, `Plan`, `Session`, `Decision`) without changing collection names.

| TC       | Layout                         | Harness source (fixture or repo path)                                                    | Prove (design / review)                                                                                                                                                       |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TC-1** | **L1 — Claude-oriented**       | [`layout-claude-code/skill-stub-excerpt.md`](./layout-claude-code/skill-stub-excerpt.md) | At least one **`Plan`** or **`Artifact`** mapping rule is defined for skill-style markdown; **`Effort.id`** is chosen independently of frontmatter `name` if they differ      |
| **TC-2** | **L2 — Cursor rules + skills** | [`layout-cursor/rules-and-dag-excerpt.md`](./layout-cursor/rules-and-dag-excerpt.md)     | **Split sources**: `.mdc` maps to **`Artifact`** (or explicit exclude) **and** DAG JSON maps to **`Plan.source_artifact`**; refs remain valid across both                     |
| **TC-3** | **L3 — GCC branch tree**       | [`layout-gcc/representative-tree.md`](./layout-gcc/representative-tree.md)               | Profile documents **branch-scoped paths** → canonical repo paths; **identity risk** (`Effort.external_branch`) is enumerated; merge behavior marked **policy**, not automatic |

## Field stability assertions (must hold for all TCs)

- **Stable after ingest:** `Effort.id`, `Decision.blocking`, `refs` targets (`effort`, `plan`, `session`).
- **Layout-specific mapping:** paths in `Plan.source_artifact`, session runner labels, inclusion of rule files as graph rows.

## Pass / fail bar

- **Pass:** Report [issue-168](../../issue-168-adversarial-multi-layout-schema.md) documents per-TC outcomes and concludes on **single schema + mapping layer** viability.
- **Fail:** Any TC requires **renaming collections** or **forking schemas** without a bridging profile — escalate to roadmap.
