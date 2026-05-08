# Representative L2: Cursor rule frontmatter + DAG JSON shape (excerpt)

## Rule file (`.cursor/rules/*.mdc` pattern)

```yaml
---
description: typescript, .tsx
alwaysApply: false
---
# TypeScript Best Practices
```

**Mapping note:** `alwaysApply` + path are **tool-specific** metadata; if indexed, use **`Artifact`** with `kind: cursor-rule` (conceptual) or exclude from graph per team policy.

## DAG JSON (proof skill example — truncated)

```json
{
  "title": "Flatbread flow — PMF audit DAG",
  "tasks": [{ "id": "t1", "subtask_prompt": "Plan the audit scope." }]
}
```

**Mapping note:** **`Plan.title`** and **`Plan.source_artifact`** point here; **`Effort`** slug is **not** implied by the JSON filename — declare explicitly on the Effort row (see [#167](../../cursor-proof-skill-effort-graph/) fixtures).
