# Proposal: Proof output retention — remove truncation as an execution limitation

Status: Planning  
Scope: `@flatbread/proof` (`packages/proof`)

## Executive summary

Today Proof intentionally caps **live task output** stored in `TaskState.resultText` and caps **upstream excerpts** stitched into downstream prompts. Those caps keep the `.canvas.tsx` payload small and bound streaming churn, but they also mean **execution fidelity** can diverge from what the model actually produced: downstream tasks, convergence parsing, and resumed runs may see truncated text while artifacts (`${taskId}.md` under `--full-output-dir`) can remain complete.

This document plans a **responsible split**:

- **Execution plane** (what drives prompts, convergence decisions, resume semantics, and automated consumers) should not silently lose rank/task assistant output beyond limits imposed by the **model context window**, explicit **DAG/run budgets**, and **operator-controlled artifact paths**.
- **Presentation plane** (canvas file size, IDE hot-reload UX, optional summaries) may still impose **view-layer** caps as long as they do not change execution semantics without an explicit, documented contract.

Grounding references:

- Streaming buffer and caps: `packages/proof/src/run_dag.ts` (`BoundedTextBuffer`, `STREAM_CAP`, `UPSTREAM_SNIPPET_CAP`, `buildUpstreamContext`, `runConvergenceLoop` sidecar fallback commentary).
- Canvas embedding model: `packages/proof/src/canvas_writer.ts` (`JSON.stringify` inlined `STATE`).
- Product docs: `packages/proof/README.md` (artifacts vs canvas defaults).
- Operator-facing caveats: `.cursor/skills/proof/SKILL.md` (explicit mention of `STREAM_CAP` and upstream caps).

Related (mirrored tail cap for oracle gates): `packages/proof/src/oracle_task.ts` (`ORACLE_TAIL_CAP` mirrors `STREAM_CAP` rationale).

---

## Current behavior (ground truth)

### Live `resultText` cap (`STREAM_CAP`)

In `run_task`, assistant stream chunks append to:

1. A **`BoundedTextBuffer(STREAM_CAP)`** — feeds `ts.resultText` for canvas updates and final in-memory state.
2. An **uncapped `fullStreamChunks` array** — joined for `${taskId}.md` artifact bodies when artifacts are enabled.

So transcripts on disk can already be **full**, while **`RunState` carried in the canvas and persisted runner state repeats the bounded view**.

### Upstream prompt cap (`UPSTREAM_SNIPPET_CAP`)

`buildUpstreamContext` passes each parent’s `resultText` through `truncateUpstreamSnippet` (section-aware dropping + final slice). That is an **execution-level** limitation on what children see, independent of canvas size.

### Canvas payload

`CanvasWriter` renders `const STATE = …` via pretty-printed JSON of the entire `RunState`. Any growth in per-task output inlined here scales **disk**, **IDE compile**, and **privacy surface** for anyone who shares the canvas path.

### Convergence

`runConvergenceLoop` prefers `--findings-dir` JSON sidecars when present precisely because live `resultText` can be **truncated mid-section** relative to full output. That is evidence truncation is already treated as a **correctness hazard** unless sidecars compensate.

---

## Goals

1. **Remove silent truncation as an execution constraint**: downstream prompts and convergence extraction should consume **complete assistant output** for `kind: 'task'` (subject to prompt-budget and safety rules below), not an undocumented substring.
2. **Preserve intentional budgets**: `dag.budget.maxTokensTotal`, iteration ceilings, timeouts, and model context limits remain hard constraints — but they should fail loudly or degrade via **explicit policies**, not silent ellipsis.
3. **Keep canvas usable**: the `.canvas.tsx` file may still use summaries, virtualization, or **references** to full text elsewhere so IDE reload stays tractable.
4. **Keep resume and supervisor flows reliable**: persisted state growth and compatibility across versions must be planned (`--state-path`, `--resume-state`, `--restart-on-runner-change` per `run_dag.ts` header comments and `AGENTS.md`).

---

## Non-goals (for this initiative)

- Replacing Cursor SDK streaming or changing token accounting from provider usage fields.
- Guaranteeing unlimited **model context** — models have finite windows; the plan introduces **policy** for spill/fail behavior rather than pretending prompts can grow without bound.
- Redesigning the entire canvas UX beyond what is needed to avoid coupling execution fidelity to inlined megabytes of JSON.

---

## Constraint matrix (must stay explicit)

### UI / IDE (`canvas_writer.ts`)

| Constraint                   | Why it matters                                                                           | Planning implication                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Hot-recompiled `.canvas.tsx` | Full state is inlined (`renderCanvasSource`).                                            | Execution-complete text must not **require** megabyte literals; use summaries + links/paths or lazy-loaded attachments. |
| Task card `<pre>`            | Already scroll-limited visually (`maxHeight`) but still receives full string if inlined. | View layer can truncate **display** only if execution uses a separate store.                                            |
| Graph node labels            | Task id truncation exists for layout (`titleLimit`).                                     | Unrelated to output retention; keep as-is.                                                                              |

### Prompt budget (`run_dag.ts`)

| Constraint             | Why it matters                                                               | Planning implication                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Model context window   | Even without Proof caps, prompts cannot grow forever.                        | DAG-authored strategies: summaries, “read transcript at path”, chunking, or explicit `depends_on` sequencing for human-sized handoffs.                             |
| Upstream stitching     | Today `UPSTREAM_SNIPPET_CAP` forces lossy compression before the child runs. | Replacing it requires either **full passthrough** (until model rejects), **structured spill files** referenced from prompts, or **DAG-declared excerpt profiles**. |
| `dag.framing` + extras | Framing + convergence `extraContext` add overhead.                           | Budget estimation docs/tests should include worst-case convergence prompts.                                                                                        |

### Disk (`README.md`, artifact defaults)

| Constraint                                         | Why it matters                                                      | Planning implication                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Default artifact dir under `.flatbread/artifacts/` | Full outputs duplicated if canvas also embeds full text.            | Prefer **single authoritative transcript file** per task revision + pointers from canvas/state.                                                        |
| `--no-artifacts`                                   | Operators may suppress transcripts entirely.                        | Execution-complete mode must define behavior when artifacts disabled (e.g., require in-memory-only with explicit RAM ceiling, or refuse long outputs). |
| Supervisor timestamped dirs                        | README warns default artifact path changes per child unless pinned. | Full-output retention tests should cover supervisor + pinned `--full-output-dir`.                                                                      |

### Privacy

| Constraint                                            | Why it matters                                                                                    | Planning implication                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Canvas lives under user dirs (skill path conventions) | Easy to accidentally share in screenshots or copied TSX.                                          | Separate **summarized canvas STATE** from **raw transcripts**; document what gets committed vs ignored. |
| `.canvas.tsx` is rewritten continuously               | Sensitive stdout/stderr from oracle tasks already flows through bounded tails (`oracle_task.ts`). | Align oracle tail policy with task output policy or document divergence.                                |

### Resume (`run_dag.ts`, `loadResumedRunState`)

| Constraint                              | Why it matters                            | Planning implication                                                                                                                  |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `structuredCloneState` JSON persistence | Larger `resultText` balloons state files. | Versioned schema: optional external transcript URIs, chunked storage, or gzip — with backward compatibility for legacy capped states. |
| RUNNING → PENDING on resume             | Mid-task loss semantics already defined.  | Output retention must not assume partially streamed tasks are recoverable from state alone.                                           |

### Convergence (`runConvergenceLoop`, `README.md` loops)

| Constraint                                     | Why it matters                                                                                       | Planning implication                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Findings extraction                            | Parser expects stable `##` sections; truncation can hide headings (`runConvergenceLoop` commentary). | After removing execution truncation, `--findings-dir` remains valuable for tooling but should not be the **only** reliable source for loops. |
| `buildConvergenceContext` uses reviewer output | Must reflect complete reviewer remarks when iterations decide rerun sets.                            | Acceptance tests must prove large reviewer payloads still trigger reruns correctly.                                                          |

### Testing (`AGENTS.md`)

| Constraint                                         | Why it matters        | Planning implication                                                                                                                         |
| -------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm -F @flatbread/proof test` bounded-loop suite | Fast CI expectations. | Add targeted fixtures for large-output behaviors without blowing timeouts; prefer synthetic streaming payloads over live API where possible. |

---

## Architecture directions (choose explicitly in implementation)

These are mutually compatible building blocks; an RFC should pick one primary strategy per layer.

1. **Dual storage in `TaskState`**: `resultSummary` (for canvas) + `resultRef` / `resultDigest` pointing at artifact file or blob dir; **`resultTextFull`** retained only in runner heap until flushed — or stored exclusively on disk for resume.
2. **Canvas references, not payloads**: Canvas inlines transcript **paths** (relative to workspace or artifact dir) and optional hashes; expands in UI via fetch if Cursor canvas runtime allows — otherwise render “Open transcript” paths only.
3. **Configurable excerpt policy in DAG**: e.g., `outputPolicy: { upstream: 'full' | 'summarize' | { maxChars } }` so authors opt into bounded prompts consciously — avoids silent truncation while preserving cheap DAGs.
4. **Oracle alignment**: Decide whether oracle stdout/stderr tails participate in the same retention policy as LLM tasks (`ORACLE_TAIL_CAP`).

---

## Phased plan with acceptance criteria

### Phase 0 — Instrumentation & contracts

**Deliverables**

- Written contract for what fields are **execution-authoritative** vs **display-only**.
- Telemetry/logging hooks (counts of chars dropped today vs post-change) behind a debug flag if appropriate.

**Acceptance criteria**

- Document lists every consumer of `TaskState.resultText` (canvas template, upstream builder, convergence, findings writer, persistence) and its intended source after the project completes.
- No user-visible behavior change yet (optional metrics only).

### Phase 1 — Execution fidelity for `kind: 'task'` without canvas explosion

**Deliverables**

- Runner retains **complete assistant stream text** for execution paths (upstream stitching + convergence parsing), independent of canvas formatting.
- Canvas/state inlined JSON stops embedding unbounded raw streams **or** switches to summarized/pointer representation — chosen approach documented.

**Acceptance criteria**

- Golden-file test: synthetic task whose assistant output exceeds legacy `STREAM_CAP`; downstream task prompt contains content from **both** early and late regions (proved via fixture snapshot of stitched prompt or hash markers).
- Convergence test without `--findings-dir`: reviewer emits blockers only after the legacy cap boundary; loop still detects issues and schedules rerun.
- Artifact `${taskId}.md` continues to match full stream (regression guard).

### Phase 2 — Upstream prompt policy & budgets

**Deliverables**

- Replace implicit `UPSTREAM_SNIPPET_CAP` truncation with explicit DAG/runner policy (including explicit failure modes when exceeding safe limits).

**Acceptance criteria**

- When policy demands full upstream inclusion and the stitched prompt exceeds a configurable ceiling, runner surfaces **`ERROR`** or **`BUDGET-EXCEEDED`** with actionable message — never silent mid-section loss without logging.
- Section-aware truncation remains available **only** as an opt-in DAG flag (default honors new policy).

### Phase 3 — Resume, supervisor, and disk ergonomics

**Deliverables**

- Persisted `--state-path` files remain bounded or compressed; resume validates schema version.
- Supervisor README scenarios (`README.md` self-hosting) verified with pinned `--full-output-dir`.

**Acceptance criteria**

- Resume after runner restart preserves enough data to reconstruct prompts identically to a non-resumed run for the same DAG (parity test).
- State file size stays within documented limits or spills to side files deterministically.

### Phase 4 — Oracle + findings alignment

**Deliverables**

- Decide unified story for oracle tails vs LLM transcripts; update docs (`README.md`, `SKILL.md` caveats).

**Acceptance criteria**

- Oracle tasks needing long evidence either write full logs to artifact files or lift tail caps under the same explicit policy framework — documented for DAG authors.

### Phase 5 — Documentation & skill refresh

**Deliverables**

- Update operator docs to remove stale “4000 / 2000 char caps” language once behavior changes — replaced with policy tables (`README.md`, `.cursor/skills/proof/SKILL.md`).

**Acceptance criteria**

- Skill caveat section accurately describes Where Full Text Lives (artifacts vs canvas vs state) and privacy implications.

---

## Test strategy

### Unit-level

- **`truncateUpstreamSnippet` / section parser**: Keep coverage if retained as opt-in path; add tests proving opt-out passes full text through `buildUpstreamContext` fixtures.
- **`BoundedTextBuffer`**: Either retire from execution paths or restrict tests to display-only buffers.

### Integration / golden

- **Large-output DAG fixture** checked into `packages/proof` test fixtures with deterministic pseudo-stream chunks (avoid live API dependency where feasible).
- **Convergence extraction**: Cases where blocker headings appear near start vs near end of megabyte-scale output.

### Resume / parity

- Serialize/deserialize `RunState` round-trip with large outputs using new schema; compare hashes of reconstructed prompts vs ephemeral reference run.

### Canvas contract smoke

- Assert generated `.canvas.tsx` file size stays under a threshold for a “large output” fixture **after** presentation-layer changes (or explicitly document new expected sizes if pointers only).

### CI commands (per `AGENTS.md`)

- `pnpm -F @flatbread/proof test` for focused suite.
- `pnpm verify` before merge when touching cross-package assumptions.

---

## Risks & mitigations

| Risk                             | Mitigation                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Massive prompts → model failures | Explicit DAG policies, preflight size estimates, spill-to-file references.                                             |
| Canvas / IDE instability         | Pointer-first canvas state; keep scroll UI but not full JSON payloads.                                                 |
| State file bloat                 | Externalized transcript storage + content addressing.                                                                  |
| Privacy leaks via paths          | Document `.gitignore` expectations; optional redaction hook for secrets in streams (future work if not in scope).      |
| Backward compatibility           | Version field in persisted state; migration that keeps capped `resultText` as legacy fallback while adding new fields. |

---

## Open questions

1. Should the canvas ever contain **full** raw output, or is “path + preview + open artifact” the long-term UX?
2. Is **gzip of persisted state** acceptable for all platforms where Proof runs?
3. Do we need **content-addressed blobs** (single store) vs per-task markdown (human-friendly) as dual views?
4. How should `--no-artifacts` interact with execution-complete guarantees — hard error, degraded mode, or automatic temp store?

---

## References (code)

- `packages/proof/src/run_dag.ts` — `STREAM_CAP`, `UPSTREAM_SNIPPET_CAP`, `BoundedTextBuffer`, `buildUpstreamContext`, `runTask`, `runConvergenceLoop`, persistence hooks.
- `packages/proof/src/canvas_writer.ts` — inlined `STATE`, task output rendering.
- `packages/proof/README.md` — artifacts, supervisor notes.
- `.cursor/skills/proof/SKILL.md` — operational caveats on caps.
