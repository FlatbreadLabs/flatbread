# Representative L3: GCC-style `.GCC/` tree (synthetic)

**Note:** This repository does not ship a live `.GCC/` directory; this file describes the **expected shape** for adversarial mapping (per [Git Context Controller](https://arxiv.org/html/2508.00031v2) style branch knowledge).

## Example tree (conceptual)

```text
.GCC/
  branches/
    feature-pmf-audit/
      CONTEXT.md
      DECISIONS.yaml
      sessions/
        2026-05-08-run.md
```

## Example `DECISIONS.yaml` fragment

```yaml
decisions:
  - id: gcc-decision-001
    blocking: true
    status: open
    effort_slug: pmf-audit-dag
    relates_to_plan: ../CONTEXT.md
```

## Mapping stressors

- **`Effort.external_branch`:** `feature-pmf-audit` vs canonical `Effort.id: pmf-audit-dag`.
- **Path relativity:** ingest must normalize branch-relative paths to repo anchors for `source_artifact`.
- **Merge:** closing or linking efforts when a branch merges is a **human / team policy** — core should not assume automatic row merges.
