# Flatbread Flow Agentic Workflows

This playbook turns `flatbread-flow-pmf-audit.md` into an execution workflow for agents working on Flatbread. Use it when planning or implementing product changes that affect the relational content model, GraphQL schema, generated TypeScript, CLI, examples, docs, or release process.

## Product Direction

Keep the product framed as:

> Git-native relational content for TypeScript apps, backed by flat files, with GraphQL and generated types when teams want them.

Use this framing to resolve scope questions:

- Lead with local flat-file content, relations, type safety, validation, and a fast edit/query loop.
- Treat GraphQL as an important interface, not the entire product identity.
- Avoid database-replacement claims until writes, constraints, migrations, import/export, and operational guarantees exist.
- Prefer improvements that make `posts -> authors -> tags` easy to model, validate, query, and type.

## Execution Model

Work in four phases. Do not skip the contract and validation phases for schema or API changes.

### Phase 1: Read-Only Diagnosis

Inspect the current behavior before changing files:

- `flatbread.config.*` and content model definitions.
- `packages/core/src/generators/schema.ts`, `packages/core/src/resolvers/arguments.ts`, and `packages/core/src/types.ts`.
- `packages/flatbread/src/cli/index.ts` and GraphQL server wiring.
- `packages/codegen` schema/document/type generation.
- `examples/nextjs`, generated GraphQL artifacts, and example GraphQL documents.
- README examples and positioning language.

Diagnosis output should state:

- Current contract: IDs, refs, filters, root query names, generated type names, config shape, and CLI behavior.
- Proposed contract: what changes, what stays stable, and what becomes deprecated or removed.
- Migration impact: affected packages, examples, docs, generated output, release notes, and rollback path.

### Phase 2: Architecture Plan

Before implementation, write a short plan that answers:

- Does this strengthen Git-native relational content, or drift toward a general flat-file database?
- Which public contracts change?
- Which runtime contracts change internally because filters or resolvers depend on GraphQL behavior?
- Which packages need coordinated changes?
- Which tests, snapshots, examples, and docs prove the new contract?

Escalate to a human before proceeding when the change alters IDs, refs, filters, query names, generated TypeScript, config shape, publish scripts, or example app behavior.

### Phase 3: Implementation

Keep implementation scoped to the approved contract.

- Change shared schema/types before downstream CLI, codegen, examples, and docs.
- Prefer explicit validation and diagnostics over permissive fallbacks.
- Preserve shipped user-facing behavior unless the plan explicitly approves a breaking migration.
- Replace unshipped branch behavior directly rather than layering compatibility shims around it.
- Update examples and README snippets in the same change when developer-facing APIs change.

### Phase 4: Validation And Release Gate

Schema-breaking work is blocked until all relevant checks are accounted for:

- GraphQL schema snapshots or equivalent before/after inspection.
- Generated TypeScript output for `packages/codegen` and `examples/nextjs`.
- CLI codegen and server behavior, including `flatbread start`, `/graphql`, and port `5057` where applicable.
- Example app behavior for Next.js and any touched framework example, preferably verified with `pnpm exec agent-browser`.
- README and package README examples.
- Version train across `flatbread`, `@flatbread/core`, `@flatbread/config`, `@flatbread/codegen`, transformers, and examples.
- Dist-tag strategy for prereleases; do not accidentally publish breaking prereleases as `latest`.
- Migration docs and rollback notes.

## Suggested Agent Flow

Use focused agents when the task is large enough to benefit from separation:

- `flatbread-architecture-planner`: read-only contract diagnosis and implementation plan.
- `flatbread-adversarial-reviewer`: review planned or completed changes for regressions and missing validation.
- `flatbread-migration-executor`: implement approved migration steps only after a contract exists.
- `flatbread-browser-verifier`: verify examples and dev loop behavior from a user-facing browser perspective using the repo-pinned `agent-browser` CLI.

For schema-breaking work, use the `flatbread-major-migration` project skill and follow its checkpoints.

## DAG Topology

When running this workflow under the `proof` skill (the `@flatbread/proof` package; legacy alias `dag-task-runner`), map phases to ranks. The runner executes a rank concurrently, then proceeds to the next.

### Constraints (read before authoring a Flatbread DAG)

- **No sub-sub-agents in DAG runs.** Each DAG node is a Cursor SDK local agent. It cannot reliably delegate to `.cursor/agents/*` via `Task(subagent_type=…)`. Inline the relevant agent identity into the `subtask_prompt` instead — start the prompt with `You are acting as <agent-name>. Follow its responsibilities and output schema.` and **paste the full output-schema heading list verbatim into every prompt**, not just the first per identity. The runner only forwards `apiKey`/`model`/`cwd` to `Agent.create` (proof: `packages/proof/src/run_dag.ts`), so `.cursor/agents/*` system prompts do not propagate.
- **`readonly: true` and `tools:` frontmatter are advisory in DAG mode.** A subagent acting as `flatbread-architecture-planner` can still write files because the runner does not pass agent frontmatter to `Agent.create`. `Do not edit files.` is purely a prompt-level instruction; reinforce it in the prompt body for read-only tasks.
- **Project skills do auto-attach.** `proof` and `flatbread-major-migration` are visible to subagents via description, so subtask prompts can reference them by name without re-explaining their contents.
- **Same-rank file-write safety for Flatbread.** The coupled chain `packages/core` → `packages/codegen` → `examples/nextjs` is the most common contention. Treat the safe parallel cuts list below as the source of truth.
- **Same-rank port-5057 safety.** `flatbread start` binds port `5057` over plain HTTP. Never put two tasks that invoke `flatbread start`, `pnpm dev`, `pnpm build`, or `agent-browser` against `examples/nextjs` in the same rank.
- **2000-char upstream stitch cap on a 4000-char `STREAM_CAP`.** Each child sees at most 2000 chars of each parent's `resultText`, and the parent's output is itself capped at 4000 chars. Subagent output must lead with the structured headings the downstream task needs and group related entries (e.g. `packages/core/src/{generators,resolvers,types}.ts`) to fit in the window.

### Default DAG shape per phase

"Rank" is computed by the runner via Kahn topo-sort over `depends_on`. Author the DAG by `depends_on` only and let the runner derive ranks. Run `pnpm exec proof --init-only --dag <path>` after editing to confirm the rank count didn't regress.

The schema-migration starter (`.cursor/skills/proof/examples/flatbread/dag-schema-migration.json`, 21 tasks) collapses to 7 ranks:

| Phase                             | Rank | Tasks                                                                                                          | Identity                         |
| --------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1. Read-only diagnosis            | 1    | `diag-{schema,resolvers,types,codegen,cli,examples,docs,transformers,source-plugins,config}`                   | `flatbread-architecture-planner` |
| 2. Contract synthesis             | 2    | `contract-synth`                                                                                               | `flatbread-architecture-planner` |
| Human checkpoint 1                | —    | Pause; the runner has no native pause — open the canvas, ctrl-C, approve, re-run with the same `--canvas-path` | —                                |
| 3. Core + docs impl               | 3    | `impl-core`, `impl-docs`                                                                                       | `flatbread-migration-executor`   |
| 3. Codegen + CLI + early verify   | 4    | `impl-codegen`, `impl-cli`, `verify-schema-snap`, `verify-readme`                                              | executor + reviewer              |
| 3. Example regen + codegen verify | 5    | `impl-examples`, `verify-codegen`                                                                              | executor + reviewer              |
| 4. CLI runtime smoke              | 6    | `verify-cli` (binds port `5057`)                                                                               | `flatbread-adversarial-reviewer` |
| 4. Browser verify                 | 7    | `browser-verify` (binds port `5057`)                                                                           | `flatbread-browser-verifier`     |

The two port-5057 tasks (`verify-cli`, `browser-verify`) must occupy distinct ranks. The runner enforces this only via `depends_on` — there is no native port-collision detection.

### Safe parallel cuts

Same-rank-safe (do not write the same files):

- Reads against any package or example.
- `packages/transformer-*` that don't extend shared types.
- `docs/`, `README.md`, package READMEs, migration notes, changelog.
- Validation tasks (each owns a different command and produces a separate report).

Must serialize (cannot share a rank):

- `packages/core/src/generators/schema.ts`, `packages/core/src/resolvers/arguments.ts`, `packages/core/src/types.ts` (schema → resolver → types is a chain).
- `packages/core/*` → `packages/codegen/*` (codegen consumes core types).
- `packages/codegen/*` → `examples/nextjs/**/generated*` (generated artifacts).
- Anything that runs `flatbread start` against the same port (`5057`).

### Browser verification is not optional

Any DAG that touches `examples/nextjs`, the GraphQL endpoint, generated documents, or the dev loop must include a terminal `browser-verify` rank task using `flatbread-browser-verifier` and the repo-pinned `agent-browser` CLI.

### PMF framing assertion

Every DAG subtask whose work touches positioning, docs, README, examples, or roadmap must include this verbatim line in its prompt so the framing survives parallel runs:

> Treat Flatbread as Git-native relational content for TypeScript apps, backed by flat files. GraphQL is one interface, not the whole product identity.

### Templates

Reusable DAG JSONs live at `.cursor/skills/proof/examples/flatbread/`. Start from the closest template and edit task-level details rather than re-deriving the rank structure each time.

## Failure Recovery

DAG runs fail in predictable ways. Have a recovery move ready for each.

- **A rank-1 diagnosis fails.** The synthesizer (`contract-synth`) will skip with `Skipped: upstream task(s) … failed`. Re-queue only the failed diagnosis tasks against the same DAG file via a fresh runner invocation rather than rerunning the whole DAG.
- **`contract-synth` fails.** No implementation runs. Inspect upstream diagnoses (look for empty or truncated `## Current contract` sections) and re-queue the synth alone with a tightened prompt that cites the missing inputs.
- **A rank-3+ implementer fails partway.** The runner skips downstream dependents but leaves edits on disk. Default to revert (`git restore -SW packages/core packages/codegen examples/nextjs`) before re-queueing; only fix-forward when the failure is in `impl-docs` (no generated artifacts at risk).
- **`browser-verify` reports `BROWSER UNAVAILABLE`.** Run `pnpm browser:install` and `pnpm browser:doctor` from repo root, then re-queue only the `browser-verify` node. Do not approve the release gate until a passing browser run exists.
- **Runner SIGINT/SIGTERM.** The runner finalizes the canvas with `INTERRUPTED` status and cancels in-flight subagents (`run_dag.ts:328-338`). Resume by re-running with the same `--dag` and `--canvas-path`; the canvas is rewritten, and tasks that were not yet `FINISHED` will re-execute.
- **Same-port collision deadlock.** If two tasks land in the same rank and both bind port 5057, one will fail with `EADDRINUSE`. Move one task to a later rank via `depends_on` and re-queue.

## Human Checkpoints

Checkpoint 1: Schema Contract

- Required before editing `packages/core/src/generators/schema.ts`, `packages/core/src/resolvers/arguments.ts`, or `packages/core/src/types.ts`.
- Must include before/after contract and migration impact.

Checkpoint 2: DevEx Validation

- Required before considering implementation complete.
- Must include CLI, codegen, examples, generated GraphQL documents/types, and README examples.

Checkpoint 3: Release Approval

- Required before release work.
- Must include version strategy, migration docs, package coordination, dist-tag behavior, and rollback path.
