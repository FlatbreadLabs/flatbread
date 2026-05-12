# Adversarial review: `proof-output-retention-plan.md`

This note reviews the retention proposal **as a planning document**: factual grounding, internal consistency, implementability, and acceptance criteria. Spot checks were done against `packages/proof/src/run_dag.ts`, `canvas_writer.ts`, `findings_sidecar.ts`, `converge_loop.ts`, and `oracle_task.ts`.

---

## Blockers

None.

---

## High-severity findings

1. **Findings sidecars do not repair `STREAM_CAP` prefix loss.** The proposal implies that `--findings-dir` sidecars are a correctness backstop when live `resultText` is incomplete relative to the full assistant stream. In the current implementation, `writeFindingsSidecar` parses `ts.resultText` after the task finishes — the same field populated from `BoundedTextBuffer(STREAM_CAP)`, which **drops the prefix** and keeps the tail (see `BoundedTextBuffer.append` in `run_dag.ts`). The artifact path uses `fullStreamChunks.join('')`, which can still be full; the JSON sidecar cannot recover headings or evidence that were truncated out of `resultText`. That weakens the “sidecars compensate” narrative in the Convergence section and any conclusion that execution fidelity is mainly a canvas vs. runner split; the gap is also **artifact/sidecar vs. bounded `resultText`**.

2. **`buildConvergenceContext` never uses sidecar text.** `runConvergenceLoop` calls `extractConvergenceFindings(sidecarText ?? convergeTs.resultText)` but passes **`convergeTs.resultText` only** into `buildConvergenceContext` for `extraContext` on re-runs (`converge_loop.ts`). So even when parsing benefits from a sidecar read path, **ancestor prompts** still see the bounded tail buffer string. The proposal’s convergence bullet (“complete reviewer remarks when iterations decide rerun sets”) understates this second bug-shaped surface; Phase 1 acceptance tests should assert prompt contents for re-execution, not only “downstream task prompt” on the main DAG edge.

3. **Phase 3 resume parity criterion is likely overstated.** “Reconstruct prompts identically to a non-resumed run” reads like bitwise identity of model outputs or full traces. Even with identical inputs, LLM calls are not generally deterministic. The criterion should be narrowed (e.g., same stitched prompt strings and same scheduling decisions under **deterministic** fixtures, or hash of prompt inputs only).

---

## Medium-severity findings

1. **Vocabulary: “mid-section” vs. actual buffer behavior.** `BoundedTextBuffer` drops **early** characters and inserts an explicit truncation preamble before the retained tail. Calling that “mid-section” (mirroring an in-repo comment) can mislead test design — e.g., placing markers only “after the cap boundary” should distinguish **prefix dropped** vs. middle of an in-flight snapshot.

2. **Phase 1 tests should cover `buildConvergenceContext`, with and without `--findings-dir`.** A test that only turns off `--findings-dir` does not catch regressions where extraction uses sidecar text but re-run prompts remain truncated. Pair it with assertions on `extraContext` / stitched prompts for convergence iterations.

3. **Architecture direction “Canvas references + fetch” needs a feasibility gate.** The plan correctly flags uncertainty (“if Cursor canvas runtime allows”). Without a short spike or a hard fallback (“path + open file only”), Phase 1 could stall on platform limits.

4. **`--no-artifacts` + execution-complete mode** is listed in the constraint matrix and open questions but not tied to a default policy decision; delaying that risks incompatible Phase 1–2 implementations (in-memory growth vs. hard error).

5. **Phase 0 consumer inventory** should explicitly name `findings_sidecar.ts` (read/write), `converge_loop.ts` (`extractConvergenceFinding` / `buildConvergenceContext`), and any CLI or external consumers of findings JSON so “execution-authoritative” fields are not ambiguous.

6. **“Silent truncation” vs. explicit banner.** The runner already surfaces dropped character counts in `resultText` via `[...truncated N earlier chars...]`. Phase 2 wording should separate **undocumented loss in stitched prompts** from **explicit, counted tail retention**.

---

## Recommended adjustments

1. **Rewrite the convergence / findings-dir subsection** to state precisely: sidecars mirror `resultText` at completion; they stabilize parsing relative to **in-flight** canvas updates per `findings_sidecar.ts` commentary, but they **do not** substitute for full transcript storage. Full fidelity should point at **artifacts** (`fullStreamChunks` / `${taskId}.md`) or a new execution-authoritative buffer, not the sidecar alone.

2. **Add an explicit work item** to feed **the same full text used for findings extraction** into `buildConvergenceContext` (or to reconstruct reviewer context from artifacts when enabled), with tests that fail on today’s behavior.

3. **Tighten Phase 3 acceptance** to **input parity** (prompt hash / serialized inputs) under controlled conditions, and document that model output parity is out of scope.

4. **Align Phase 4 oracle story** with whether oracle evidence is expected to remain tail-bounded for canvas while full logs live only under artifact paths — the plan already gestures here; make the split explicit to avoid another `resultText`-vs-disk mismatch like convergence.

5. **In Phase 1**, add a **with-`--findings-dir`** integration case that proves downstream **and** convergence re-run prompts see late-region content that is currently only guaranteed in `${taskId}.md`.

6. **Reserve a short “feasibility” subsection** for canvas lazy-load or patch Cursor canvas constraints before locking “pointer-first” as the only strategy.
