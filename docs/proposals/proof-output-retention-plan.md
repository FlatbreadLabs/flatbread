# Proposal: Proof rank/task output retention — fix execution fidelity without breaking the canvas

Status: Planning — replaces the prior draft.
Author: Opus 4.7
Scope: `@flatbread/proof` (`packages/proof`)

---

## TL;DR

Today, the runner in `packages/proof/src/run_dag.ts` stores each task's assistant output through a `BoundedTextBuffer(STREAM_CAP=4000)` that **drops the leading characters** as the stream grows past the cap. That bounded string is the **only** copy used for: the canvas `STATE` literal, the parent context stitched into child prompts (capped a second time at `UPSTREAM_SNIPPET_CAP=2000` by `buildUpstreamContext` / `truncateUpstreamSnippet`), the `--findings-dir` JSON sidecar payload, the convergence `extraContext` re-injection, and the persisted `--state-path` snapshot. Only the per-task `${taskId}.md` artifact, written from a separate uncapped `fullStreamChunks` array in `runTask`, ever retains the complete stream — and only when artifacts are enabled.

This is the "rank/task output truncation limitation" we are paying down. The fix is **not** "remove all caps". The fix is to **split the execution plane from the display plane** so that:

- Decisions the runner makes on a user's behalf — what to put in a child's prompt, what counts as a `## Blockers` finding, what convergence re-runs see, what resume hands back to a relaunched process — read from an **execution-authoritative full transcript** that the runner persists for the duration of the run.
- The `.canvas.tsx` file the IDE hot-recompiles, the persisted state JSON the supervisor reloads, and the `extraContext` that lands inside a model prompt each consume **explicit, named excerpts** of that transcript with documented size policies and visible truncation banners. No layer is permitted to feed a downstream consumer a silently-truncated string and pretend the rest never existed.

The work is staged across five phases. Phase 0 just nails the contracts. Phase 1 (the load-bearing one) rebuilds the runner's per-task storage and rewires the **four** existing consumers of `ts.resultText` so that "complete" sources stay complete and "bounded" sources are explicitly bounded with banners. Phase 2 handles upstream-prompt budgets honestly. Phase 3 covers resume/supervisor schema growth. Phase 4 aligns oracle evidence. Phase 5 refreshes docs.

---

## Ground truth (what the code actually does today)

These are the load-bearing facts the rest of this document is built on. Every claim points to a file/symbol in the package.

### 1. Two parallel buffers in `runTask`, only one is bounded

`packages/proof/src/run_dag.ts` `runTask` (the `kind: 'task'` path) maintains both:

- `const buffer = new BoundedTextBuffer(STREAM_CAP);` (`STREAM_CAP = 4000`). On `append`, when the cumulative chunk length exceeds the cap, `BoundedTextBuffer` does `this.data = this.data.slice(overflow)` and tracks `droppedChars`. `render()` returns either the raw data or `[...truncated ${droppedChars} earlier chars...]\n${data}`. This buffer feeds `ts.resultText` via `publishIfDue` (live) and the final assignments in the success and error branches of `runTask`.
- `const fullStreamChunks: string[] = [];` — every `block.text` from the assistant stream is appended verbatim. This array is only joined in the `finally` of `runTask` and written to `${taskId}.md` via `persistTaskMarkdownFile` when `options.fullOutputAbsoluteDir` is set.

Consequence: `ts.resultText` is **always the tail** (with an explicit banner when the prefix was dropped). The complete stream exists only as in-memory chunks for the lifetime of `runTask`, then on disk in `${taskId}.md` (and only when artifacts are not suppressed by `--no-artifacts`).

### 2. `buildUpstreamContext` reads the bounded buffer, then truncates it again

`buildUpstreamContext` (same file) walks `task.depends_on`, fetches each parent's `TaskState` from `stateById`, and inlines `dep.resultText` after passing it through `truncateUpstreamSnippet(text, UPSTREAM_SNIPPET_CAP)` with `UPSTREAM_SNIPPET_CAP = 2000`. `truncateUpstreamSnippet` is section-aware: when the text has two or more `## ` headings, it drops sections in `SECTION_DROP_PRIORITY` order; otherwise it falls back to `truncate(text, cap)` which does `s.slice(0, n - 1) + '…'`. The section-aware path can also fall through to that final hard slice when no eligible section is droppable.

Consequence: a child task's prompt is `framing + buildUpstreamContext(...) + extraContext + subtask_prompt`, where the upstream block is **a 2000-char view of the 4000-char tail of the parent's full stream**, glued together with **no visible banner** at the prompt level. The tail buffer's own `[...truncated N earlier chars...]` banner does travel into the upstream block when present, so the child does see a signal that the parent was capped — but the second 2000-char truncate that `truncateUpstreamSnippet` performs ends with `'…'` and no count, which a model will not reliably interpret as "the prompt above is itself truncated".

### 3. `findings_sidecar.ts` parses the bounded buffer, not the full stream

`writeFindingsSidecar(findingsDir, ts)` builds `sections: parseSections(ts.resultText ?? '')`. There is no path that reads `fullStreamChunks` or the artifact file. The header comment on `findings_sidecar.ts` correctly states "sidecar is captured at task completion", but "task completion" means after `BoundedTextBuffer` has already dropped the prefix.

Consequence: the sidecar **cannot** repair `STREAM_CAP` prefix loss. It can only stabilize parsing against in-flight canvas updates: by writing once at `dispatchTask` completion, it avoids the race where `extractConvergenceFindings` reads `ts.resultText` mid-stream. The earlier draft's "sidecars compensate for truncation" framing was incorrect on this point and is dropped here.

### 4. `runConvergenceLoop` reads the sidecar **for findings extraction only**, not for `extraContext`

In `run_dag.ts`, `runConvergenceLoop` calls `readFindingsSidecarAsText(...)` and feeds the result (falling back to `convergeTs.resultText`) into `extractConvergenceFindings`. But the very next call, `buildConvergenceContext(convergeOn, iter, convergeTs.resultText)`, is unconditionally passed `convergeTs.resultText`. The resulting string is threaded through `dispatchTask(task, { extraContext: convergenceContext })` for every re-executed ancestor.

Consequence: even with `--findings-dir` set, **ancestor re-runs still see only the bounded tail** of the reviewer's output as their "Convergence feedback from … (iteration N-1)" preamble. This is a second, independent truncation surface beyond the prompt-stitch issue in (2), and it is the precise bug the adversarial review identified.

### 5. Canvas inlines the full `RunState`

`canvas_writer.ts` `renderCanvasSource` builds the canvas with `const STATE: RunState = ${JSON.stringify(state, null, 2)};`. There is no compression, no externalization, no opt-out. Every `TaskState.resultText` value is embedded verbatim in the `.canvas.tsx` file the IDE recompiles. Today, this is tolerable specifically because `STREAM_CAP = 4000` caps each `resultText` value. Any plan that wants to make `ts.resultText` carry full streams must also redesign what goes into `STATE`, or the canvas will balloon to megabytes and stall the IDE.

### 6. Resume serializes whatever is in `state.tasks[].resultText`

`writePersistedRunState` (`self_hosting.ts`) does `JSON.stringify(payload, null, 2)` on `{ version: 1, writtenAt, reason, state }`. The state's task list includes `resultText`. `loadResumedRunState` (`run_dag.ts`) refreshes static metadata from the live DAG but leaves `resultText` untouched. So whatever the bounded buffer happens to hold at rank-boundary persistence — typically the tail of a finished task or the running tail of a `RUNNING` task that gets re-queued to `PENDING` — is what a relaunched process inherits.

### 7. Oracle evidence is bounded by the same number

`oracle_task.ts` declares `const ORACLE_TAIL_CAP = 4000;` and stamps `tail(outcome.stdout, ORACLE_TAIL_CAP)` / `tail(outcome.stderr, ORACLE_TAIL_CAP)` into the `## Stdout (tail):` / `## Stderr (tail):` sections of `ts.resultText`. There is no uncapped capture analog — full stdout/stderr exist only in the local strings inside `execShell` and are dropped at function exit. Unlike `kind: 'task'`, there is **no artifact path that preserves them**: `persistTaskMarkdownFile` writes `ts.resultText`, which is already tail-truncated for oracles.

### 8. The docs already describe `STREAM_CAP` and `UPSTREAM_SNIPPET_CAP`

`packages/proof/README.md` (Artifact Output, `dag.budget`, supervisor sections) and `.cursor/skills/proof/SKILL.md` ("Caveats": "Per-task streamed text is capped at `STREAM_CAP = 4000` chars to keep the canvas file modest. Upstream context passed to child tasks is capped at 2000 chars per parent, with section-aware truncation …") tell operators about both caps. They do **not** explain that those caps are reused as the execution-plane source of truth for sidecars, convergence `extraContext`, and resumed prompts. That gap is part of the limitation: callers who read the docs and reach for `--findings-dir` reasonably believe it is a backstop, when in fact it shares the same upstream loss.

---

## The split: execution plane vs display plane

The whole plan reduces to one rule:

> A consumer that influences what the runner does next must never read from a buffer that another consumer is bounding for size or UX reasons.

Concretely, after this work lands, each consumer of per-task output has a single, documented source:

| Consumer                                                     | Source after the project completes                                                                                                                                                                                                                                                                                | Plane                                          |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `buildUpstreamContext` (parent → child prompts)              | A new execution-authoritative per-task transcript (in-memory `string` during the run, mirrored to disk when artifacts are enabled), explicitly trimmed by an **upstream prompt policy** with a visible, counted banner when trimmed.                                                                              | Execution                                      |
| `extractConvergenceFindings` (`## Blockers` parsing)         | Same authoritative transcript. The `--findings-dir` sidecar continues to be written from the same source so external tooling has a stable JSON form, but it is no longer required for parser correctness inside the runner — it is required only when the **runner process** has restarted.                       | Execution                                      |
| `buildConvergenceContext` (reviewer feedback into ancestors) | Same authoritative transcript, trimmed by the **same** upstream prompt policy as `buildUpstreamContext` (so a convergence iteration is governed by one policy, not two implicit caps).                                                                                                                            | Execution                                      |
| `--findings-dir` JSON sidecar contents                       | Same authoritative transcript. Schema field `sectionsTruncated?: boolean` plus per-section length is added so consumers can detect when **policy** trimmed evidence, distinct from "no content".                                                                                                                  | Execution-mirrored-to-disk                     |
| `${taskId}.md` artifact                                      | Authoritative transcript, identical bytes (modulo header). The artifact is the canonical on-disk form of the execution-plane truth for the run.                                                                                                                                                                   | Execution-mirrored-to-disk                     |
| `--state-path` / `--resume-state` payload                    | Either a pointer into the artifact directory (when artifacts are enabled and the directory is stable across restarts — see Phase 3) or an inline-but-compressed body when artifacts are suppressed. Either way, the relaunched process reconstructs the same authoritative transcript before resuming.            | Execution                                      |
| Canvas `STATE.tasks[].resultText`                            | Display-only: a bounded tail (today's `STREAM_CAP` semantics, but renamed `CANVAS_DISPLAY_CAP`) with a visible `[...truncated N earlier chars...]` banner. The canvas may additionally surface a path/hash pointer to the full transcript so a user can open it from the IDE.                                     | Display                                        |
| Canvas `<pre>` block (today already `maxHeight: 320`)        | Same display string; UI continues to virtualize.                                                                                                                                                                                                                                                                  | Display                                        |
| Oracle `## Stdout (tail) / Stderr (tail)` in `resultText`    | Bounded by `ORACLE_TAIL_CAP` for display **and** the inline sidecar value, but a separate full-evidence path (`${taskId}.stdout.log` / `${taskId}.stderr.log`) is written under the artifact dir for forensics. Convergence and downstream tasks that need oracle evidence pull from artifacts, not `resultText`. | Mixed (display bounded, full evidence on disk) |

The five rows under "Execution" all read from one place. No more drift.

### Why not "just remove the caps"

A naïve "stream everything into `ts.resultText` and inline it in the canvas" approach breaks four things observed today in the code:

1. **Canvas reload UX**: `renderCanvasSource` writes the whole `RunState` JSON every debounce window (default 200ms). A multi-megabyte `resultText` per task × a 10-task DAG would push the file to tens of megabytes and re-trigger an IDE hot-recompile on every `publishIfDue` (default every 500ms). `debounce` and `stream-publish-ms` were tuned around a 4000-char ceiling.
2. **Prompt overflow**: `buildUpstreamContext` glues every parent's text into the child's prompt. Removing `UPSTREAM_SNIPPET_CAP` without a model-context-aware policy causes silent SDK rejections at runtime whose error messages do not mention "your DAG outputs grew too large".
3. **State file bloat**: `writePersistedRunState` writes one JSON file per rank boundary and per convergence iteration via `persistState(...)`. Resume reads the entire file synchronously. Long runs would dominate disk and slow restart.
4. **Privacy**: the canvas lives under `~/.cursor/projects/<workspace-slug>/canvases/` (per `.cursor/skills/proof/SKILL.md` Step 1 conventions). Casual sharing of a canvas TSX today exposes 4000 chars per task; uncapped, it could trivially exfiltrate secrets emitted by a misbehaving subagent (e.g. an oracle dumping env). The privacy posture is a function of "what's inlined in the canvas", not "what the runner saw".

The plan therefore treats each of these as a first-class layer with its own policy, not a side effect of a single shared buffer.

---

## Constraint matrix (where each cap lives after the project)

### Canvas safety (`canvas_writer.ts`)

| Constraint                   | Today                                                                                           | After                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.canvas.tsx` file size      | Bounded indirectly by `STREAM_CAP` × tasks.                                                     | Bounded directly by `CANVAS_DISPLAY_CAP` per task (default = 4000, same as today) plus an optional pointer field. No path emits a canvas larger than `CANVAS_DISPLAY_CAP × tasks + framing/header bytes`. A regression test asserts the size envelope on a "large output" fixture.                                    |
| Streaming write churn        | Every assistant text block triggers a `publishIfDue`.                                           | Unchanged. Canvas writes continue to consume the display buffer, which is appended to in the streaming loop. The new execution buffer is appended in the same loop but never triggers a canvas write on its own.                                                                                                      |
| Truncation banner visibility | `BoundedTextBuffer.render()` prepends `[...truncated N earlier chars...]`.                      | Preserved verbatim. The canvas template will be extended to optionally render a "View full transcript" affordance using a relative path inside the artifact dir (feasibility-gated — see Phase 1). If the IDE canvas runtime cannot fetch, the link degrades to a copy-able path. The plan never assumes fetch works. |
| Privacy posture              | Canvas inlines up to 4000 chars/task of raw stream — already a leak risk for secrets-in-stdout. | Display cap is unchanged in size; banner unchanged. The new execution transcripts live alongside the existing `${taskId}.md` artifacts and inherit their `.gitignore` story (already covered by `.flatbread/artifacts/` convention). Docs gain a "what gets persisted where" section.                                 |

### Prompt budget (`run_dag.ts`)

| Constraint                                   | Today                                                                                                     | After                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-parent excerpt in `buildUpstreamContext` | Hard `UPSTREAM_SNIPPET_CAP=2000` with section-aware-then-slice truncation, silent at the prompt boundary. | Explicit **upstream prompt policy** with three modes: `full`, `summarize` (today's section-aware behavior, but with a counted banner emitted into the prompt itself), and `maxChars: N` (operator-controlled). Default remains conservative (the current 2000-char section-aware path) but is now named, surfaced in logs, and tested.        |
| Convergence `extraContext`                   | `buildConvergenceContext(convergeOn, iter, convergeTs.resultText)` — bounded tail unconditionally.        | Reads the same authoritative transcript as `extractConvergenceFindings`. Trims via the same policy as `buildUpstreamContext`. The judge's finding #2 is the test case: a reviewer whose `## Blockers` lines appear past byte 4000 must produce ancestor prompts that contain those blockers.                                                  |
| `dag.framing`                                | Prepended verbatim. Counts against model context but not against any Proof cap.                           | Unchanged. Documented as "part of the prompt budget — author it deliberately."                                                                                                                                                                                                                                                                |
| Stitched prompt overflow handling            | None. The SDK may reject; the task ends as `ERROR` with whatever message comes back.                      | When `outputPolicy.upstream` is `full` and the policy estimator predicts a stitched prompt larger than `outputPolicy.maxPromptChars` (new), the runner marks the task `BUDGET-EXCEEDED` **before** dispatch with an actionable message naming the offending parent ids and char counts. This reuses the existing `BUDGET-EXCEEDED` exit path. |

### Artifact storage (README, `--full-output-dir`, `--no-artifacts`)

| Constraint                           | Today                                                                                   | After                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Default location                     | `<cwd>/.flatbread/artifacts/dag-<slug>-<ts>/` (timestamped per run).                    | Unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--no-artifacts`                     | Suppresses transcripts, `_index.md`, `_dag.json`. Findings sidecars are independent.    | Unchanged for the user-facing flag. Internally, when the runner is in execution-complete mode and artifacts are suppressed, the authoritative transcript is held in memory for the lifetime of the run with an **explicit RAM ceiling** (`--max-in-memory-output-bytes`, default 64 MiB across all tasks). Crossing the ceiling produces `BUDGET-EXCEEDED` on the next task to overflow, not silent loss. This resolves the judge's "policy decision deferred" finding by picking the policy up front. |
| Supervisor + timestamped directories | Each child runner picks a new timestamp unless the supervisor pins `--full-output-dir`. | Same. New guidance in `README.md` Self-Hosting Mode: when self-hosting is enabled, **pin** `--full-output-dir` so artifact-backed resume reads find the same transcripts the prior process wrote. The supervisor and runner both refuse to start if `--restart-on-runner-change` is set without either a pinned `--full-output-dir` or a non-default `--max-in-memory-output-bytes`.                                                                                                                   |
| Atomicity                            | Per-task `${taskId}.md` is written via `writeFile` once per terminal state.             | Unchanged for `${taskId}.md`. New per-task `${taskId}.stream.txt` (or `.bin` if we go content-addressed in a later phase) is written incrementally during the run via append-only writes from the stream loop, then closed in `runTask`'s `finally`. Failure to write the stream file does not abort the task; it is logged and the task is marked with a `streamPersisted: false` flag in state.                                                                                                      |

### Privacy

| Constraint                            | Today                                                            | After                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas as accidentally-shared surface | Up to 4000 chars/task of raw stream content.                     | Same display ceiling; the only new privacy surface is the pointer (relative path) to the transcript file. The pointer's path lives under `.flatbread/artifacts/`, which is already covered by Flatbread's convention to gitignore the artifacts root. The plan does **not** add new redaction hooks — that is deferred work, called out under Risks.                                              |
| Oracle stdout/stderr                  | Already tail-bounded at 4000 chars in `resultText`.              | Display unchanged. Full stdout/stderr written to `${taskId}.stdout.log` and `${taskId}.stderr.log` under the artifact dir **only when artifacts are enabled**. With `--no-artifacts`, oracle full evidence stays in memory subject to the same `--max-in-memory-output-bytes` ceiling.                                                                                                            |
| Persisted state JSON                  | Embeds `resultText` (bounded today; would be huge if unbounded). | Embeds the display string (small) plus a `transcript` discriminated union: either `{ kind: 'artifact'; path: string }` or `{ kind: 'inline'; gzippedBase64: string }`. The `inline` form is reserved for `--no-artifacts` runs and carries the new `streamCompression: 'gzip'` versioned field. Schema version bumps to `2` with a documented migration path from `1` (legacy `resultText`-only). |

### Resume / supervisor (`self_hosting.ts`, `loadResumedRunState`)

| Constraint                      | Today                                                                                                               | After                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `version: 1` schema             | Hard rejects anything else.                                                                                         | Adds `version: 2`. Reader accepts `1` and `2`; on `1`, the `resultText` value is promoted to both the display string and the inline transcript (because that's all the legacy run captured). Writer always emits `2`. The version bump is the migration.                                                                                   |
| `RUNNING → PENDING` on resume   | Re-queues the task; existing behavior.                                                                              | Unchanged. The relaunched task gets a fresh stream and a fresh transcript file (the prior partial transcript is preserved at `${taskId}.iter${N}.partial.stream.txt` for forensics).                                                                                                                                                       |
| Prompt parity across restart    | A relaunched run reconstructs `extraContext` and `buildUpstreamContext` from the bounded `resultText` it inherited. | A relaunched run reconstructs the **same stitched prompt string** that the original process would have produced for that rank, given the same DAG and the same authoritative transcripts. This is **input parity**, not output parity — LLM outputs are not deterministic, and the plan does not claim they are. Phase 3 test guards this. |
| `RUNNER_RUNTIME_FILES` snapshot | Triggers `EXIT_RUNNER_RESTART` (75) when `run_dag.ts` / `canvas_writer.ts` / etc. change.                           | Unchanged set. The new module(s) added in Phase 1 join `RUNNER_RUNTIME_FILES`.                                                                                                                                                                                                                                                             |

### Convergence semantics

| Constraint                            | Today                                                                             | After                                                                                                                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extractConvergenceFindings` source   | `readFindingsSidecarAsText(...)` or `convergeTs.resultText`.                      | Authoritative transcript, falling back to sidecar (across-process boundary, e.g. resume), falling back to `resultText` (legacy resume). The fallback chain is documented; tests cover each leg.                                                 |
| Reviewer payload size                 | Implicitly bounded by `STREAM_CAP`. Blockers past byte 4000 are invisible.        | Bounded only by `outputPolicy.maxPromptChars` for prompt-side stitching; bounded only by `--max-in-memory-output-bytes` or disk for storage. A reviewer can emit `## Blockers` near the end of a long evidence dump and the loop will see them. |
| `## Blockers` placeholder semantics   | `extractConvergenceFindings.filterMeaningful` already drops `(none)`, `n/a`, etc. | Unchanged.                                                                                                                                                                                                                                      |
| Mutual exclusion with `--converge-on` | Today's "no `DAG.loops` AND `--converge-on`" guard remains.                       | Unchanged.                                                                                                                                                                                                                                      |

### Oracle evidence

| Constraint                                 | Today                                    | After                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ORACLE_TAIL_CAP = 4000`                   | Applied to stdout and stderr separately. | Renamed `ORACLE_DISPLAY_TAIL_CAP` (semantically still 4000 by default) for clarity. The display-bound tail continues to land in `resultText` so the canvas and sidecar render identically to today.                                                                                                                                                     |
| Full oracle stdout/stderr persistence      | None.                                    | When artifacts are enabled, `${taskId}.stdout.log` and `${taskId}.stderr.log` capture full output. Sidecar gains optional `stdoutPath` / `stderrPath` fields when present so external tooling can resolve to the full evidence. `formatOracleResult` references these paths in a new `## Evidence` footer.                                              |
| `extraContext` references to oracle output | Bounded tail.                            | If a downstream task lists an oracle in `depends_on`, `buildUpstreamContext` follows the same policy as for `kind: 'task'`. Long stderr dumps that today are silently dropped will now either flow through to the child (`policy: 'full'`) or trigger `BUDGET-EXCEEDED` (`policy: 'summarize'` exceeding `maxPromptChars`). Either way, no silent drop. |

---

## Phased plan with acceptance criteria

Each phase is independently shippable. Phases 1 and 2 together carry the "remove the silent truncation" promise; the rest harden it.

### Phase 0 — Contracts, inventory, and feasibility spikes (no behavior change)

**Deliverables**

- **Consumer inventory document** committed alongside this proposal (or inlined as a stable section of the README's "Internal layout" appendix) that explicitly names every read site of `TaskState.resultText` in `packages/proof/src/**`:
  - `canvas_writer.ts` → canvas `STATE` literal.
  - `run_dag.ts` `buildUpstreamContext` → child prompts.
  - `run_dag.ts` `runConvergenceLoop` → `extractConvergenceFindings` source, `buildConvergenceContext` source.
  - `findings_sidecar.ts` `writeFindingsSidecar` → sidecar `sections`.
  - `self_hosting.ts` `writePersistedRunState` (indirectly via `state.tasks[].resultText`) → resume payload.
  - The implicit consumers in `persistTaskMarkdownFile` (uses `fullStreamChunks`, not `resultText` — noted to disambiguate).
- **Decision document** picking the canonical execution-authoritative store shape: in-memory `Map<string, string>` plus per-task append-only stream files under the artifact dir. (The plan does not pursue a content-addressed blob store in Phase 1 — that is called out in "Risks" as deferred work; per-task markdown remains the human-friendly form.)
- **Feasibility spike for canvas pointer affordance.** Open question from the prior draft: can a `.canvas.tsx` invoke runtime fetch of a workspace-relative file? A short spike against `cursor/canvas` answers yes/no. If no, the canvas affordance degrades to a click-to-copy path string. The Phase 1 design does not block on the result — the pointer is always written; only the UI shape changes.
- **Policy default decision.** `--no-artifacts` + execution-complete mode is resolved here: in-memory ceiling with `BUDGET-EXCEEDED` on overflow (see constraint matrix). Documented in this proposal already; Phase 0 lifts it into the package docs.

**Acceptance criteria**

- A `docs/proposals/proof-output-retention-plan.md` (this file) and a one-page consumer inventory appendix land. No code under `packages/proof/src/**` changes in Phase 0.
- `pnpm verify` continues to pass (it should, because nothing changed).
- A short feasibility note answers the canvas fetch question with either "feasible — example PR" or "not feasible — fall back to copy-path". The note is referenced from Phase 1's design.

### Phase 1 — Execution-authoritative transcript and rewired consumers

This is the load-bearing phase.

**Deliverables**

- New module `packages/proof/src/task_transcript.ts` (or equivalent — naming is implementation-detail) that owns the per-task authoritative store. Responsibilities:
  - In-memory `string` per task id, appended chunk-by-chunk from the stream loop.
  - Append-only mirror to `${fullOutputAbsoluteDir}/${taskId}.stream.txt` when artifacts are enabled (best-effort; errors logged but never abort the task).
  - A `read(taskId)` accessor that returns the in-memory string when present, falls back to reading the stream file (used by resume), and falls back to the legacy `ts.resultText` on Phase-1-pre-existing state.
- `runTask` updated so the stream loop pushes each `block.text` into both the existing `BoundedTextBuffer` (renamed semantically to "display buffer", same `CANVAS_DISPLAY_CAP = 4000`) **and** the new transcript store. `fullStreamChunks` is removed (the transcript store subsumes it). `persistTaskMarkdownFile` reads from the transcript store.
- `buildUpstreamContext` rewritten to read from the transcript store for each `depends_on` parent. The result passes through a new `applyUpstreamPolicy(text, policy)` that today defaults to the legacy section-aware-then-slice behavior at 2000 chars but emits a prompt-visible counted banner (`[...upstream excerpt: kept last 2000 of N chars, sections dropped: X, Y...]`) instead of a bare `…`.
- `runConvergenceLoop` updated so **both** `extractConvergenceFindings` and `buildConvergenceContext` read from the transcript store. The sidecar continues to be written, and continues to be used as a cross-process fallback (e.g. resumed runs), but is no longer the primary in-process source.
- Canvas `STATE.tasks[].resultText` continues to be the bounded display string. A new optional `STATE.tasks[].transcriptPath` field carries the relative path to the stream file when one was written. The canvas template renders a "View full transcript" affordance per the Phase 0 feasibility result.
- `findings_sidecar.ts` `writeFindingsSidecar` reads from the transcript store and emits `sections` keyed identically to today. A new sibling field `sectionsRaw?: Record<string, { body: string; length: number }>` is reserved for a future phase if downstream tooling asks for it; Phase 1 ships only `sections` to keep the on-disk schema stable.

**Acceptance criteria**

Each of the following is a named test that must pass; the test names below are mnemonic, not literal file paths.

1. **Late-region prompt content (no `--findings-dir`).** Fixture: a synthetic stream of 12 000 deterministic chunks for parent task `a` containing the marker string `MARKER_LATE` at byte ~10 000. Child task `b` depends on `a`. After the runner executes, the stitched prompt for `b` (captured via a test-only hook on `applyUpstreamPolicy`) contains `MARKER_LATE` **when** `outputPolicy.upstream` is `full`, and **does not** when `summarize` (with a visible counted banner in either case when trimmed).

2. **Convergence detects late blockers (no `--findings-dir`).** Fixture: reviewer task `r` emits a long preamble followed by `## Blockers\n- still broken` past byte 5000. The legacy runner would miss this because `STREAM_CAP=4000` drops the prefix and `## Blockers` lands at the cap boundary. The new runner detects it and schedules a re-run, regardless of `--findings-dir`.

3. **Convergence `extraContext` carries late reviewer content (no `--findings-dir`).** Fixture as in (2). When the ancestor `a` is re-executed, the captured `extraContext` substring of `a`'s stitched prompt contains the `## Blockers` line. This is the judge's explicit recommendation — pair the parsing test with a stitched-prompt assertion.

4. **Same with `--findings-dir` set.** Both (2) and (3) pass when `--findings-dir` is also set, proving that the sidecar pathway is consistent with the in-memory authoritative source (no drift between in-process and resumed extraction).

5. **Artifact `${taskId}.md` matches the stream file.** For a non-trivial fixture, `${taskId}.md` bytes equal the transcript store bytes (modulo the meta header). This catches a regression where `fullStreamChunks` was retired but `persistTaskMarkdownFile` was missed.

6. **Canvas size envelope.** For a fixture of 5 tasks × 12 000-char outputs, the generated `.canvas.tsx` file size remains below `5 * CANVAS_DISPLAY_CAP + 64 KiB` (the constant captures header, layout, types, and a generous slack). Today's behavior is preserved at the display layer.

7. **Visible truncation banner in the prompt.** When `applyUpstreamPolicy` trims, the **stitched prompt string** (not just the upstream block) contains a banner with a real character count. A grep-for-`…` test fails the legacy silent-ellipsis path.

8. **Existing bounded-loop suite.** `pnpm -F @flatbread/proof test` continues to pass. The plan does not invalidate `BoundedTextBuffer` tests — that helper still exists for the display buffer.

### Phase 2 — Upstream prompt policy with honest budgets

**Deliverables**

- `DAG.outputPolicy` (top-level, optional) added to `packages/proof/src/dag.ts` with `parseDAG` validation:
  ```ts
  outputPolicy?: {
    upstream?: 'full' | 'summarize' | { maxChars: number };
    maxPromptChars?: number;
  }
  ```
  Defaults: `upstream: 'summarize'` with the existing 2000-char section-aware policy (preserves today's behavior); `maxPromptChars: 200_000` (well under typical model context windows but generous enough that benign DAGs do not trip).
- `runTask` preflight: before `agent.send(stitched)`, compute the stitched prompt length and compare against `maxPromptChars`. On overflow, the task is marked `BUDGET-EXCEEDED` with a message listing the offending parents and their contribution.
- New CLI knobs (kept narrow — these are mostly DAG-driven):
  - `--output-policy-upstream <full|summarize|maxChars:N>`: overrides `outputPolicy.upstream` for ad-hoc runs.
  - `--max-prompt-chars <N>`: overrides `outputPolicy.maxPromptChars`.
- `BUDGET-EXCEEDED` exit code path (`EXIT_BUDGET_EXCEEDED = 4`) is reused so wrapper scripts already keyed on it continue to work.

**Acceptance criteria**

1. **Default is byte-for-byte the legacy behavior.** A DAG without `outputPolicy` produces identical stitched prompts to today (excluding the new visible-banner change from Phase 1, which is in effect from Phase 1 onward).
2. **`policy: 'full'` passes the late marker through** (covered already by Phase 1 test (1) when the fixture sets `upstream: 'full'`).
3. **`maxPromptChars` overflow surfaces `BUDGET-EXCEEDED` with an actionable message.** Fixture: two parents each contributing 60 000 chars with `policy: 'full'` and `maxPromptChars: 80 000`. The child task ends `BUDGET-EXCEEDED` and the message names both parent ids and total char count.
4. **CLI/DAG precedence test.** `--max-prompt-chars` overrides `outputPolicy.maxPromptChars`; `outputPolicy` in the DAG overrides defaults; `--models-file`-style precedence is documented and tested.

### Phase 3 — Resume, supervisor, and disk ergonomics

**Deliverables**

- `PersistedRunState` schema bumped to `version: 2` in `self_hosting.ts`:
  ```ts
  state.tasks[].transcript: { kind: 'artifact'; path: string }
                          | { kind: 'inline'; encoding: 'gzip-base64'; data: string }
                          | { kind: 'legacy'; resultText: string };
  ```
  - `kind: 'artifact'` is used when `--full-output-dir` is set and the stream file exists.
  - `kind: 'inline'` is used when `--no-artifacts` is set (or the stream file is missing); the body is gzipped to bound state size.
  - `kind: 'legacy'` is what `version: 1` readers see and what writers emit for the migration grace period; documented as removable in a future release.
- `loadResumedRunState` reconstructs the in-memory transcript store from `state.tasks[].transcript` before any rank executes, so subsequent ranks see the same `applyUpstreamPolicy` inputs the prior process would have produced.
- Supervisor (`run_dag_supervisor.ts`, not modified in source by this proposal but referenced) gains an early validation: if `--restart-on-runner-change` is forwarded and the runner is configured for `--no-artifacts` without `--max-in-memory-output-bytes` overrides, the supervisor logs a clear warning that resumed runs will pay the gzip cost for every transcript. (This is documentation + a log line, not a refusal.)
- README "Self-Hosting Mode" gains a "pin `--full-output-dir` for resumable runs" paragraph.

**Acceptance criteria**

1. **Input parity across restart.** Fixture: a 4-task DAG that finishes the first two ranks, persists state, exits via `EXIT_RUNNER_RESTART`, and resumes. The stitched prompt strings handed to the SDK in rank 3 are **bytewise identical** between (a) a non-restart full run and (b) the resumed second process, when the underlying assistant streams from rank 1–2 are deterministically replayed via fixtures. Output parity is **not** asserted (LLM determinism is out of scope; the test uses a fake `Agent.send` that replays canned chunks).
2. **State file size stays bounded.** For the same fixture above, `state-path` JSON size after rank 2 stays below `O(tasks × CANVAS_DISPLAY_CAP)` when artifacts are enabled (because transcripts are pointers), and below `O(tasks × gzipped_transcript_size)` when artifacts are disabled. Both ceilings are asserted as soft thresholds in the test.
3. **`version: 1` → `version: 2` migration.** A hand-crafted `version: 1` state file (i.e. legacy `resultText`-only) is loaded successfully and its `resultText` populates both the display buffer and `transcript: { kind: 'legacy', resultText: ... }`. The runner continues from there without error. Documented as a one-release grace period.
4. **Supervisor pin advice.** Running the supervisor with `--restart-on-runner-change` and no pinned `--full-output-dir` emits the warning line; the test greps stdout/stderr for it.

### Phase 4 — Oracle evidence alignment

**Deliverables**

- `oracle_task.ts` writes `${taskId}.stdout.log` and `${taskId}.stderr.log` under the artifact directory when artifacts are enabled. These are written atomically at task completion (oracle commands are short-lived; we can capture into in-memory strings, as today, and flush once).
- `formatOracleResult` adds an optional `## Evidence` footer listing the absolute paths when present; the canvas template renders them as "Open stdout / Open stderr" pointers analogous to the `kind: 'task'` "View full transcript" affordance.
- The new `--max-in-memory-output-bytes` ceiling (introduced in Phase 1's `--no-artifacts` handling) applies uniformly to oracle full evidence in `--no-artifacts` mode. Overflow produces `BUDGET-EXCEEDED` on the oracle task with an actionable message; this is consistent with how Phase 2 treats prompt overflow.
- `buildUpstreamContext` is unchanged for oracles in shape: if a child task depends on an oracle, the upstream excerpt follows `outputPolicy.upstream`. The `## Stdout (tail) / ## Stderr (tail)` headings in `resultText` survive untouched.

**Acceptance criteria**

1. **Oracle full evidence persists.** Fixture: an oracle command that emits 10 000 lines to stdout. After completion, `${taskId}.stdout.log` contains all 10 000 lines and `ts.resultText`'s `## Stdout (tail):` body matches today's tail-capped string.
2. **Oracle in `--no-artifacts` mode**. With `--no-artifacts` and a 10 000-line oracle, the in-memory store holds the full output; if the run's cumulative held bytes exceed `--max-in-memory-output-bytes`, the oracle is marked `BUDGET-EXCEEDED` (a deterministic test fixture sets the ceiling low to trip this on a small payload).
3. **Downstream task depending on oracle sees policy-bounded upstream.** With `policy: 'full'` and a long oracle stderr, the child task's prompt contains stderr lines past the legacy 4000-char tail. With `policy: 'summarize'`, the prompt sees the existing tail behavior and a visible banner.

### Phase 5 — Documentation and skill refresh

**Deliverables**

- `packages/proof/README.md` gains a new section "Where output lives" with a copy of the consumer-source table from this document, adapted for operator audience. The "Caveats" mentions of `STREAM_CAP = 4000` and "upstream context capped at 2000 chars" are rewritten to point at `outputPolicy` and `CANVAS_DISPLAY_CAP` / `ORACLE_DISPLAY_TAIL_CAP`.
- `.cursor/skills/proof/SKILL.md` Caveats section is rewritten in the same way. The "DAG quality bar" section is unchanged.
- The CLI options table in `SKILL.md` and `README.md` gains the new flags from Phase 2 (`--output-policy-upstream`, `--max-prompt-chars`) and Phase 1's `--max-in-memory-output-bytes`. The existing flag rows are unchanged.
- A short "What changed" migration paragraph in the README's release notes for the version that ships Phase 1/2.

**Acceptance criteria**

- A grep across `README.md` and `.cursor/skills/proof/SKILL.md` for the literal strings `STREAM_CAP`, `4000`, and `2000` finds them only where they document the **display** caps `CANVAS_DISPLAY_CAP` and `ORACLE_DISPLAY_TAIL_CAP`, not as execution-plane behavior.
- `pnpm verify` passes.

---

## Test strategy

The proof package's existing test infrastructure is the AVA bounded-loop suite plus the ava+vitest matrix surfaced by root `pnpm test` (per `AGENTS.md`). The plan adds tests at three layers.

### Unit-level (vitest under `packages/proof/__tests__/` or equivalent existing location)

- **`task_transcript`** (new module): append behavior, read fallback chain (in-memory → stream file → legacy `resultText`), write-failure logging without abort.
- **`applyUpstreamPolicy`**: full/summarize/maxChars modes; banner contents; section-aware drop order preserved when `summarize` is selected; counted banner replaces the bare `'…'`.
- **`extractConvergenceFindings`**: regression coverage for placeholder detection (existing) and a new case with blockers past the legacy 4000-char boundary.
- **`writeFindingsSidecar`** + **`readFindingsSidecarAsText`**: round-trip, including the case where the sidecar is written from the new authoritative transcript and consumed across a simulated process boundary.
- **Schema migration**: `version: 1` → `version: 2` `PersistedRunState` reader. The migration is a pure function and easy to test.

### Integration / golden-fixture (AVA bounded-loop suite, expanded)

These tests do not call the live Cursor SDK. They drive `runTask` through a fake `Agent.create` whose `send` returns a `RunnerTaskRun` with a scripted async iterator. Fixtures are checked-in JSON files describing scripted chunks per task plus expected stitched-prompt substrings.

- **Late marker prompt content** (Phase 1, criteria 1, 7).
- **Convergence detects late blockers** (Phase 1, criterion 2).
- **Convergence `extraContext` carries late blockers** (Phase 1, criterion 3) — explicitly asserts the substring of the captured stitched prompt for the re-executed ancestor task. This addresses the adversarial review's "tests should cover `buildConvergenceContext`, with and without `--findings-dir`" recommendation.
- **`--findings-dir` ↔ in-memory parity** (Phase 1, criterion 4).
- **Artifact / transcript byte equality** (Phase 1, criterion 5).
- **Canvas size envelope** (Phase 1, criterion 6) — reads the generated `.canvas.tsx` on disk after a fixture run and asserts the file size and the presence of the new `transcriptPath` field per task.
- **`maxPromptChars` overflow** (Phase 2, criterion 3) — uses the same scripted-chunks harness with deliberately large fixtures.
- **Resume input parity** (Phase 3, criterion 1) — runs the fake-agent harness through `EXIT_RUNNER_RESTART`, persists state, re-instantiates a second runner with `--resume-state`, and asserts identical stitched prompts in rank 3 between the resumed second process and a non-restart full run with the same fixtures.
- **Oracle full evidence persistence** (Phase 4, criterion 1) — `execShell` is exercised against `node -e 'for (let i=0;i<10000;i++) console.log(i)'` so the test does not depend on a system command beyond Node itself.

### Privacy and operator-facing smoke

- Canvas snapshot test: for a fixture that streams a synthetic "secret-shaped" token at byte 0, byte 3500, byte 4500, and byte 10 000, assert that the `.canvas.tsx` `STATE` contains only the byte-3500 and byte-4500 occurrences (i.e. the display tail), with the explicit `[...truncated N earlier chars...]` banner. The transcript file contains all four. Future redaction work plugs in here.
- A `pnpm verify` invocation continues to pass at every phase boundary. Failing `pnpm verify` blocks the phase.

### CI commands (from `AGENTS.md`)

- `pnpm -F @flatbread/proof test` — focused bounded-loop suite; should remain fast even with the added fixtures (no live SDK).
- `pnpm verify` — full lint + typecheck + build + test before any phase is considered shipped.

---

## Risks and mitigations

| Risk                                                                                              | Mitigation                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas pointer affordance is not feasible inside `cursor/canvas` runtime.                         | Phase 0 spike. Degrade to a copy-able path string with no fetch. The plan's execution-plane fix does not depend on the canvas displaying full output; it depends on the runner reading from a separate store.                                                                                                  |
| `outputPolicy: 'full'` users blow past the model context window and see SDK rejections.           | `maxPromptChars` preflight produces `BUDGET-EXCEEDED` with an actionable message before dispatch. Default policy remains `summarize`, so this only affects users who opt in.                                                                                                                                   |
| Append-only stream files multiply small writes and stress slow filesystems.                       | Writes are best-effort and behind the existing artifact dir gate; failures are logged and the task is flagged but not aborted. The display path continues to work without the stream file. We can add a "write-every-N-chunks" coalesce later if profiling warrants.                                           |
| State file growth even with pointers (the canvas state itself plus task metadata can still grow). | `--state-path` writes are already once per rank boundary plus per convergence iteration, not per chunk. The new `transcript` field is a tiny discriminated union when artifacts are enabled. Phase 3 acceptance test asserts a soft size ceiling.                                                              |
| Privacy regression via persisted `${taskId}.stream.txt` files capturing secrets.                  | Files live under the same `.flatbread/artifacts/` directory as today's `${taskId}.md`; the same `.gitignore` and review hygiene apply. A redaction hook (e.g. opt-in regex-based stripping in the stream loop) is **out of scope** for this proposal and called out as future work.                            |
| Resumed runs find a stale `${taskId}.stream.txt` written by a prior runner with different source. | The supervisor already restarts at rank boundaries — partial in-flight tasks are re-queued `PENDING` and get a new stream file (`${taskId}.iter${N}.partial.stream.txt` is preserved for forensics, new run writes `${taskId}.iter${N+1}.stream.txt`). The transcript store reads honor the iteration counter. |
| Schema version churn breaks downstream tooling that consumed `--findings-dir` sidecars by shape.  | The sidecar `sections` shape is preserved. New fields (`stdoutPath`, `stderrPath`, `sectionsRaw`) are optional. Existing schemas keep working.                                                                                                                                                                 |
| `--restart-on-runner-change` triggers mid-Phase-1 development as engineers edit the source.       | The new module(s) are added to `RUNNER_RUNTIME_FILES` only after their first stable commit. During development, contributors use ad-hoc CLI runs (without the supervisor) per `AGENTS.md`'s commands.                                                                                                          |
| Bounded-loop test suite slows down with the added fixtures.                                       | Fixtures use scripted-chunk fake agents (no LLM calls). Each fixture is at most a few tens of milliseconds. The aggregate budget for the proof test suite is monitored in CI; this proposal's tests target +20 cases at well under 1 s each.                                                                   |

---

## Backout / partial-ship considerations

Each phase is independently revertable:

- Phase 1 is the most invasive. If the new transcript module is rolled back, `BoundedTextBuffer` and `fullStreamChunks` are restored exactly as today and the consumer rewires unwind. The schema bump and CLI flags from later phases do not depend on Phase 1 source files existing.
- Phase 2 adds CLI flags and a parse step. Reverting them returns the defaults that match today's behavior.
- Phase 3 schema bump must be backed out alongside any field additions to `PersistedRunState`; the `version: 1` reader is kept long enough that an older runner can still read newer files via the legacy fallback (though the converse is not guaranteed and is documented).
- Phases 4 and 5 are nearly pure additions.

---

## Open questions deferred (and why)

1. **Redaction hooks in the stream loop.** Important enough to call out, not enough scoped runway to bundle in. Tracked as a follow-up that consumes the same `task_transcript` write boundary.
2. **Content-addressed blob storage.** Per-task markdown is human-friendly and gets reused by `_index.md`. A single content-addressed store (e.g. `<artifact-dir>/blobs/<sha256>.txt` plus a manifest) is a clean Phase 6 if disk duplication becomes painful, but premature today.
3. **Lazy canvas fetch vs path-only pointers.** Phase 0 spike decides. Either answer is consistent with the rest of the plan.
4. **Per-task summaries generated by a cheap model.** Some operators may want the canvas to show a 200-char LLM summary instead of a raw tail. That is purely a display-plane question and orthogonal to the execution-fidelity fix. Listed for future work.

---

## References (code, with line-ish landmarks)

- `packages/proof/src/run_dag.ts`: `BoundedTextBuffer`, `STREAM_CAP`, `UPSTREAM_SNIPPET_CAP`, `buildUpstreamContext`, `truncateUpstreamSnippet`, `runTask` (display buffer + `fullStreamChunks` + `persistTaskMarkdownFile`), `runConvergenceLoop` (sidecar fallback + `buildConvergenceContext` call site), `persistState`, `loadResumedRunState`.
- `packages/proof/src/canvas_writer.ts`: `renderCanvasSource`, `STATE` literal layout, the `<pre>` rendering for streaming output.
- `packages/proof/src/findings_sidecar.ts`: `writeFindingsSidecar` (reads `ts.resultText`), `readFindingsSidecarAsText`, `parseSections`, `FindingsSidecar`.
- `packages/proof/src/converge_loop.ts`: `extractConvergenceFindings`, `buildConvergenceContext`, `filterMeaningful`, `PLACEHOLDER_WORDS`.
- `packages/proof/src/oracle_task.ts`: `ORACLE_TAIL_CAP`, `tail`, `formatOracleResult`, `execShell`.
- `packages/proof/src/self_hosting.ts`: `PersistedRunState` (`version: 1`), `RUNNER_RUNTIME_FILES`, `EXIT_RUNNER_RESTART`.
- `packages/proof/README.md`: artifact defaults, supervisor pinning notes, the existing `dag.budget` story.
- `.cursor/skills/proof/SKILL.md`: operator caveats explicitly naming the 4000/2000 caps that this plan reframes.
