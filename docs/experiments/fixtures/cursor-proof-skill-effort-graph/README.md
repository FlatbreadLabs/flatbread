# Fixture: Cursor `proof` skill → Effort Graph rows

**Purpose:** Representative markdown files showing how **existing** agent harness paths under [`.cursor/skills/proof/`](../../../../.cursor/skills/proof/) map to **Effort Graph** collections without moving or rewriting the harness.

| File here                                    | Collection | Maps from                                                         |
| -------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| `efforts/pmf-audit-dag.md`                   | Effort     | Logical thread for the PMF audit DAG work                         |
| `plans/flatbread-flow-pmf-audit-dag.md`      | Plan       | Title + provenance ↔ `examples/dag-flatbread-flow-pmf-audit.json` |
| `sessions/proof-cli-session-20260508.md`     | Session    | Synthetic “one run” of the proof skill / CLI                      |
| `decisions/167-blocking-reference-layout.md` | Decision   | Issue #167 acceptance: layout indexed + queryable context         |

Use with the config excerpt in [issue-167-effort-graph-layout-mapping.md](../../issue-167-effort-graph-layout-mapping.md).
