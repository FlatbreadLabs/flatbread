/**
 * DAG schema parsing, validation, and topological ranking for the runner.
 *
 * The DAG file shape is intentionally tiny — see ../examples/example_dag.json.
 */

export type Complexity = 'HIGH' | 'MED' | 'LOW';
export interface ModelParameterValue {
  id: string;
  value: string;
}

export interface ModelSelection {
  id: string;
  params?: ModelParameterValue[];
}

export type ModelSpec = string | ModelSelection;
export type ModelMap = Record<Complexity, ModelSelection>;
export type ModelMapOverride = Partial<Record<Complexity, ModelSpec>>;
export type ResolvedModelMap = Record<Complexity, ModelSelection>;

export interface ModelCatalogItem {
  id: string;
  displayName: string;
  parameters?: Array<{
    id: string;
    displayName?: string;
    values: Array<{ value: string; displayName?: string }>;
  }>;
  variants?: Array<{
    params: ModelParameterValue[];
    displayName: string;
    description?: string;
    isDefault?: boolean;
  }>;
}

/**
 * Discriminator separating LLM-backed work from non-LLM gate nodes.
 *
 * - `task`   (default) — a normal subagent invocation; uses `complexity` to
 *   select a model and treats `subtask_prompt` as the LLM prompt.
 * - `pause`  — a no-LLM rendezvous node. The runner blocks downstream tasks
 *   until an out-of-band signal (sentinel file removal, timeout, etc.) is
 *   observed. `complexity` is irrelevant and rejected at parse time;
 *   `subtask_prompt` is optional and surfaced as the canvas description.
 * - `oracle` — a no-LLM deterministic gate. The runner executes `command`
 *   and pass/fails on whether stdout/stderr matches `expect` (regex,
 *   defaults to `'.*'`). `complexity`, `subtask_prompt`, and any explicit
 *   `model` field are rejected at parse time because no model is invoked.
 */
export type TaskKind = 'task' | 'pause' | 'oracle';

export interface RawTask {
  id: string;
  depends_on: string[];
  complexity: Complexity;
  subtask_prompt: string;
  /**
   * Optional discriminator. Absent in legacy DAG JSON, in which case the
   * parser treats the task as `'task'` so every existing template keeps
   * parsing untouched. Non-LLM kinds (`'pause'`, `'oracle'`) get a synthetic
   * `complexity` (`'LOW'`) attached so the structural type is satisfied —
   * the runner must branch on `kind` before consuming `complexity` or
   * `subtask_prompt`.
   */
  kind?: TaskKind;
  /**
   * Required for `kind: 'oracle'`. Shell command the runner executes to
   * decide pass/fail. Ignored on every other kind and rejected at parse
   * time if set on a non-oracle task.
   */
  command?: string;
  /**
   * Optional for `kind: 'oracle'`. Regex applied to the command's combined
   * stdout/stderr; a match is required for pass. Defaults to `'.*'` (any
   * output, even empty, matches). Rejected on every other kind.
   *
   * Note: by default the pass predicate ALSO requires `exit code === 0`.
   * Set `allowNonZeroExit: true` to opt out of that requirement (only useful
   * when asserting on the output of an intentionally failing command).
   */
  expect?: string;
  /**
   * Optional for `kind: 'oracle'`. When `true`, an oracle passes on regex
   * match alone, regardless of the command's exit code. Defaults to `false`
   * — exit 0 is required by default because the historical regex-only
   * contract silently passed `&&`-chained commands that exited non-zero.
   * Rejected on every other kind.
   */
  allowNonZeroExit?: boolean;
}

/**
 * Optional per-DAG policy for how parent task output is excerpted into child
 * prompts and convergence `extraContext`. Phase 1 defaults match historical
 * behavior (`summarize` with a 2000-char section-aware cap plus explicit banners).
 */
export interface DAGOutputPolicy {
  /** When `full`, upstream snippets are not structurally capped (still subject to model context). */
  upstream?: 'full' | 'summarize';
}

export interface DAG {
  title: string;
  models?: ModelMapOverride;
  framing?: string;
  budget?: DAGBudget;
  /** How much of each parent transcript is stitched into downstream prompts. */
  outputPolicy?: DAGOutputPolicy;
  tasks: RawTask[];
  /**
   * Optional first-class bounded convergence loops. Each entry generalizes
   * the legacy CLI `--converge-on`/`--max-iterations` pair into a DAG-native
   * declaration so the same JSON file is reproducibly runnable without
   * remembering the right flags.
   *
   * Loops execute sequentially in declaration order after the main rank loop
   * completes. `--converge-on` may not be combined with `loops`; the runner
   * errors at startup if both are set. Loop re-execution sets must also be
   * disjoint so one loop cannot silently invalidate another loop's already
   * converged outcome.
   */
  loops?: DAGConvergenceLoop[];
}

export interface DAGBudget {
  maxIterations?: number;
  maxTokensTotal?: number;
}

/**
 * Selector for which tasks a convergence loop re-executes per iteration.
 *
 * - `{ kind: 'ancestors' }` — default, mirrors the legacy CLI behavior:
 *   re-runs every transitive ancestor of `convergeOn` plus `convergeOn`
 *   itself.
 * - `{ kind: 'tasks'; tasks: [...] }` — explicit allow-list. Every id must
 *   be a known task, must lie inside the convergence ancestor cone
 *   (`transitiveAncestors(convergeOn) ∪ {convergeOn}`); ids outside that
 *   cone are rejected at parse time because re-running them would break
 *   topological ordering of the filtered re-execution ranks. The explicit
 *   list must also be dependency-closed for every non-`convergeOn` task it
 *   names so the runner never mixes a fresh task with stale upstream inputs.
 */
export type LoopReexecute =
  | { kind: 'ancestors' }
  | { kind: 'tasks'; tasks: string[] };
/**
 * First-class bounded convergence loop. Generalizes the singleton CLI
 * `--converge-on`/`--max-iterations` pair into a DAG-native config so a
 * single run can stack multiple convergence tasks (e.g. one for the
 * implementation reviewer, one for the docs reviewer) and so DAG-emitting
 * tooling can declare loop intent reproducibly.
 */
export interface DAGConvergenceLoop {
  /** Stable id for canvas/log display. Defaults to `loop-${convergeOn}` when omitted. */
  id?: string;
  /** Task whose `## Blockers` / `## High-severity findings` drive the loop. */
  convergeOn: string;
  /** Iteration ceiling. Iteration 0 is the original main-rank run. */
  maxIterations: number;
  /** What to re-execute per iteration. Defaults to `{ kind: 'ancestors' }`. */
  reexecute?: LoopReexecute;
}

/** Loop config with all defaults filled in — what the runner actually consumes. */
export interface ResolvedConvergenceLoop {
  id: string;
  convergeOn: string;
  maxIterations: number;
  reexecute: LoopReexecute;
}

const LOOP_REEXECUTE_KINDS = new Set<LoopReexecute['kind']>([
  'ancestors',
  'tasks',
]);
const COMPLEXITY_VALUES = new Set<Complexity>(['HIGH', 'MED', 'LOW']);
export const COMPLEXITY_KEYS: readonly Complexity[] = [
  'HIGH',
  'MED',
  'LOW',
] as const;
const TASK_KIND_VALUES = new Set<TaskKind>(['task', 'pause', 'oracle']);
/** Synthetic placeholder so non-LLM tasks (pause, oracle) satisfy the existing structural type. The runner must branch on `kind` before consuming this. */
const NON_LLM_SYNTHETIC_COMPLEXITY: Complexity = 'LOW';
/** Default `expect` regex for `kind: 'oracle'` — any output (even empty) matches. */
const DEFAULT_ORACLE_EXPECT = '.*';

/** Type guard — pause tasks must be detected by `kind` before any model-bound code path runs. */
export function isPauseTask(task: RawTask): boolean {
  return task.kind === 'pause';
}

/** Type guard — oracle tasks must be detected by `kind` before any model-bound code path runs. */
export function isOracleTask(task: RawTask): boolean {
  return task.kind === 'oracle';
}

/**
 * Model IDs are validated at runtime by the Cursor SDK (NOT the `cursor-agent`
 * CLI). The two catalogs differ: the CLI exposes reasoning-effort suffixes
 * like `gpt-5.4-low` and `claude-opus-4-7-thinking-medium`; the SDK only
 * accepts base slugs and rejects suffixed variants with
 * `ConfigurationError: Cannot use this model`.
 *
 * The defaults below were cross-checked against the SDK's own error-message
 * catalog (which `assertModelIdInList` enumerates verbatim) on 2026-05-07:
 *
 *   default, composer-2, composer-1.5, gpt-5.3-codex, claude-sonnet-4-6,
 *   gpt-5.5, claude-opus-4-7, gpt-5.4, claude-opus-4-6, claude-opus-4-5,
 *   gpt-5.2, gemini-3.1-pro, gpt-5.4-mini, gpt-5.4-nano, claude-haiku-4-5,
 *   gpt-5.3-codex-spark, grok-4.3, claude-sonnet-4-5, gpt-5.2-codex,
 *   gpt-5.1-codex-max, gpt-5.1, gemini-3-flash, gpt-5.1-codex-mini,
 *   claude-sonnet-4, gpt-5-mini, gemini-2.5-flash, kimi-k2.5
 *
 * To re-validate: trigger any LOW task with a deliberately-bad model id and
 * read the SDK's error-message catalog; do NOT trust `cursor-agent --list-models`.
 */
export const DEFAULT_MODEL_MAP: ModelMap = {
  HIGH: { id: 'claude-opus-4-7' },
  MED: { id: 'composer-2' },
  LOW: { id: 'gpt-5.4-nano' },
};

export function parseDAG(raw: unknown): DAG {
  if (!raw || typeof raw !== 'object') {
    throw new Error('DAG file must be a JSON object.');
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== 'string' || obj.title.trim() === '') {
    throw new Error('DAG.title must be a non-empty string.');
  }
  if (!Array.isArray(obj.tasks) || obj.tasks.length === 0) {
    throw new Error('DAG.tasks must be a non-empty array.');
  }

  const tasks: RawTask[] = obj.tasks.map((t, i) => validateTask(t, i));
  const ids = new Set<string>();
  for (const t of tasks) {
    if (ids.has(t.id)) {
      throw new Error(`Duplicate task id: ${t.id}`);
    }
    ids.add(t.id);
  }
  for (const t of tasks) {
    for (const dep of t.depends_on) {
      if (!ids.has(dep)) {
        throw new Error(`Task ${t.id} depends_on unknown id: ${dep}`);
      }
      if (dep === t.id) {
        throw new Error(`Task ${t.id} depends on itself.`);
      }
    }
  }

  detectCycle(tasks);

  const models =
    obj.models === undefined
      ? undefined
      : validateModelMap(obj.models, 'DAG.models');
  const framing =
    obj.framing === undefined ? undefined : validateFraming(obj.framing);
  const budget =
    obj.budget === undefined ? undefined : validateBudget(obj.budget);
  const outputPolicy =
    obj.outputPolicy === undefined
      ? undefined
      : validateOutputPolicy(obj.outputPolicy);
  const loops =
    obj.loops === undefined ? undefined : validateLoops(obj.loops, tasks);

  return {
    title: obj.title,
    models,
    framing,
    budget,
    outputPolicy,
    tasks,
    loops,
  };
}

function validateOutputPolicy(raw: unknown): DAGOutputPolicy {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('DAG.outputPolicy must be a JSON object when set.');
  }
  const obj = raw as Record<string, unknown>;
  const allowedKeys = new Set(['upstream']);
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `DAG.outputPolicy.${key} is not supported. Supported keys: upstream.`
      );
    }
  }
  const upstream = obj.upstream;
  if (upstream === undefined) {
    return {};
  }
  if (upstream !== 'full' && upstream !== 'summarize') {
    throw new Error(
      'DAG.outputPolicy.upstream must be "full" or "summarize" when set.'
    );
  }
  return { upstream };
}

/**
 * Returns the closed set of transitive ancestor ids for `taskId` in the
 * given task list (the union of `depends_on` reached by repeated
 * traversal). Canonical transitive-ancestor traversal shared with
 * `converge_loop.ts`. Defined here (takes `RawTask[]` not a full `DAG`
 * object) so `parseDAG` can validate `loops.reexecute.tasks` without a
 * circular module import; `converge_loop.ts:transitiveAncestors` delegates
 * to this function.
 */
export function transitiveAncestorIds(
  taskId: string,
  tasks: RawTask[]
): Set<string> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const start = byId.get(taskId);
  if (!start) return visited;
  const stack: string[] = [...start.depends_on];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const t = byId.get(id);
    if (!t) continue;
    for (const dep of t.depends_on) stack.push(dep);
  }
  return visited;
}

function validateLoops(raw: unknown, tasks: RawTask[]): DAGConvergenceLoop[] {
  if (!Array.isArray(raw)) {
    throw new Error('DAG.loops must be an array of loop config objects.');
  }
  const taskIds = new Set(tasks.map((t) => t.id));
  const loops: DAGConvergenceLoop[] = [];
  const seenConvergeOn = new Set<string>();
  const seenResolvedIds = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const loop = validateLoop(raw[i], i, taskIds, tasks);
    if (seenConvergeOn.has(loop.convergeOn)) {
      throw new Error(
        `DAG.loops[${i}]: duplicate convergeOn "${loop.convergeOn}" — each loop must drive a distinct task.`
      );
    }
    seenConvergeOn.add(loop.convergeOn);
    const resolvedId = loop.id ?? `loop-${loop.convergeOn}`;
    if (seenResolvedIds.has(resolvedId)) {
      throw new Error(
        `DAG.loops[${i}]: duplicate loop id; resolved loop id "${resolvedId}" collides with a previous loop's id. ` +
          `Set an explicit \`id\` on one of the colliding loops to disambiguate.`
      );
    }
    seenResolvedIds.add(resolvedId);
    loops.push(loop);
  }
  validateLoopInteractions(loops, tasks);
  return loops;
}

function validateLoop(
  raw: unknown,
  index: number,
  taskIds: Set<string>,
  tasks: RawTask[]
): DAGConvergenceLoop {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`DAG.loops[${index}] must be a JSON object.`);
  }
  const obj = raw as Record<string, unknown>;
  const convergeOn = obj.convergeOn;
  if (typeof convergeOn !== 'string' || convergeOn.trim() === '') {
    throw new Error(
      `DAG.loops[${index}].convergeOn must be a non-empty string.`
    );
  }
  if (!taskIds.has(convergeOn)) {
    throw new Error(
      `DAG.loops[${index}].convergeOn "${convergeOn}" is not a task id in this DAG.`
    );
  }
  const maxIterations = obj.maxIterations;
  if (
    typeof maxIterations !== 'number' ||
    !Number.isSafeInteger(maxIterations) ||
    maxIterations <= 0
  ) {
    throw new Error(
      `DAG.loops[${index}].maxIterations must be a positive integer.`
    );
  }
  let id: string | undefined;
  if (obj.id !== undefined) {
    if (typeof obj.id !== 'string' || obj.id.trim() === '') {
      throw new Error(
        `DAG.loops[${index}].id must be a non-empty string when set.`
      );
    }
    id = obj.id;
  }
  let reexecute: LoopReexecute | undefined;
  if (obj.reexecute !== undefined) {
    reexecute = validateReexecute(
      obj.reexecute,
      index,
      taskIds,
      convergeOn,
      tasks
    );
  }
  const loop: DAGConvergenceLoop = { convergeOn, maxIterations };
  if (id !== undefined) loop.id = id;
  if (reexecute !== undefined) loop.reexecute = reexecute;
  return loop;
}

function validateReexecute(
  raw: unknown,
  loopIndex: number,
  taskIds: Set<string>,
  convergeOn: string,
  tasks: RawTask[]
): LoopReexecute {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(
      `DAG.loops[${loopIndex}].reexecute must be a JSON object when set.`
    );
  }
  const obj = raw as Record<string, unknown>;
  const kind = obj.kind;
  if (
    typeof kind !== 'string' ||
    !LOOP_REEXECUTE_KINDS.has(kind as LoopReexecute['kind'])
  ) {
    throw new Error(
      `DAG.loops[${loopIndex}].reexecute.kind must be one of: ${[
        ...LOOP_REEXECUTE_KINDS,
      ].join(' | ')}.`
    );
  }
  if (kind === 'ancestors') {
    return { kind: 'ancestors' };
  }
  const list = obj.tasks;
  if (
    !Array.isArray(list) ||
    list.length === 0 ||
    list.some((t) => typeof t !== 'string' || t.trim() === '')
  ) {
    throw new Error(
      `DAG.loops[${loopIndex}].reexecute.tasks must be a non-empty array of task id strings.`
    );
  }
  const requested = list as string[];
  for (const id of requested) {
    if (!taskIds.has(id)) {
      throw new Error(
        `DAG.loops[${loopIndex}].reexecute.tasks contains unknown task id "${id}".`
      );
    }
  }
  // The re-execution set must be a subset of the convergence ancestor cone
  // (ancestors of convergeOn ∪ convergeOn itself). Re-running a task that
  // is not a transitive dependency of the convergence task would break the
  // filtered topological order: the runner re-executes ranks in the
  // convergence task's downward causal chain, so an unrelated task would
  // either run out of order or not at all.
  const cone = transitiveAncestorIds(convergeOn, tasks);
  cone.add(convergeOn);
  for (const id of requested) {
    if (!cone.has(id)) {
      throw new Error(
        `DAG.loops[${loopIndex}].reexecute.tasks contains "${id}" which is not the convergeOn task and is not a transitive ancestor of "${convergeOn}".`
      );
    }
  }
  const selected = new Set(requested);
  for (const id of requested) {
    if (id === convergeOn) continue;
    const missingAncestors = [...transitiveAncestorIds(id, tasks)].filter(
      (ancestorId) => cone.has(ancestorId) && !selected.has(ancestorId)
    );
    if (missingAncestors.length > 0) {
      throw new Error(
        `DAG.loops[${loopIndex}].reexecute.tasks must be dependency-closed. Task "${id}" also requires its ancestor(s): ${missingAncestors.join(
          ', '
        )}. Add them or remove "${id}".`
      );
    }
  }
  // Always include the convergence task itself so the loop body can re-run
  // it after upstream re-execution. De-dupe while preserving caller order.
  const seen = new Set<string>();
  const tasksOut: string[] = [];
  for (const id of [...requested, convergeOn]) {
    if (seen.has(id)) continue;
    seen.add(id);
    tasksOut.push(id);
  }
  return { kind: 'tasks', tasks: tasksOut };
}

/**
 * Fills in defaults (`id`, `reexecute`) for each declared loop so the runner
 * can consume a single canonical shape regardless of which fields the DAG
 * author left implicit. Pure function — does not access the DAG task list.
 * Defaults align with the legacy `--converge-on` behavior: re-execute the
 * full ancestor cone and stop when the convergence task's `## Blockers` /
 * `## High-severity findings` are both empty.
 */
export function resolveConvergenceLoops(
  loops: readonly DAGConvergenceLoop[]
): ResolvedConvergenceLoop[] {
  return loops.map((loop) => ({
    id: loop.id ?? `loop-${loop.convergeOn}`,
    convergeOn: loop.convergeOn,
    maxIterations: loop.maxIterations,
    reexecute: loop.reexecute ?? { kind: 'ancestors' },
  }));
}

function validateLoopInteractions(
  loops: readonly DAGConvergenceLoop[],
  tasks: RawTask[]
): void {
  const reExecSets = loops.map((loop) => ({
    id: loop.id ?? `loop-${loop.convergeOn}`,
    taskIds: computeLoopReexecuteIds(loop, tasks),
  }));
  for (let i = 0; i < reExecSets.length; i++) {
    for (let j = i + 1; j < reExecSets.length; j++) {
      const overlap = [...reExecSets[i].taskIds].filter((id) =>
        reExecSets[j].taskIds.has(id)
      );
      if (overlap.length === 0) continue;
      throw new Error(
        `DAG.loops must have disjoint re-execution sets. "${
          reExecSets[i].id
        }" and "${reExecSets[j].id}" both re-run: ${overlap.join(
          ', '
        )}. Split the DAG so each loop owns a separate task cone, or collapse the work into one loop.`
      );
    }
  }
}

function computeLoopReexecuteIds(
  loop: DAGConvergenceLoop,
  tasks: RawTask[]
): Set<string> {
  const ids = new Set<string>();
  if (loop.reexecute?.kind === 'tasks') {
    for (const id of loop.reexecute.tasks) ids.add(id);
    ids.add(loop.convergeOn);
    return ids;
  }
  for (const id of transitiveAncestorIds(loop.convergeOn, tasks)) ids.add(id);
  ids.add(loop.convergeOn);
  return ids;
}
function validateFraming(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new Error('DAG.framing must be a string when set.');
  }
  return raw;
}

function validateBudget(raw: unknown): DAGBudget {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('DAG.budget must be a JSON object when set.');
  }
  const obj = raw as Record<string, unknown>;
  const budget: DAGBudget = {};
  if (obj.maxIterations !== undefined) {
    validateBudgetNumber(obj.maxIterations, 'DAG.budget.maxIterations');
    budget.maxIterations = obj.maxIterations;
  }
  if (obj.maxTokensTotal !== undefined) {
    validateBudgetNumber(obj.maxTokensTotal, 'DAG.budget.maxTokensTotal');
    budget.maxTokensTotal = obj.maxTokensTotal;
  }
  return budget;
}

function validateBudgetNumber(
  raw: unknown,
  label: string
): asserts raw is number {
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 0) {
    throw new Error(`${label} must be a non-negative integer when set.`);
  }
}

function validateTask(raw: unknown, index: number): RawTask {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`tasks[${index}] must be an object.`);
  }
  const t = raw as Record<string, unknown>;

  const id = t.id;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error(`tasks[${index}].id must be a non-empty string.`);
  }

  const kind = resolveTaskKind(t.kind, index);

  const depends_on = t.depends_on ?? [];
  if (
    !Array.isArray(depends_on) ||
    depends_on.some((d) => typeof d !== 'string')
  ) {
    throw new Error(`tasks[${index}].depends_on must be an array of strings.`);
  }
  const dedupedDepends = [...new Set(depends_on as string[])];

  if (kind === 'pause') {
    if (t.complexity !== undefined) {
      throw new Error(
        `tasks[${index}] (id="${id}") is kind="pause" and must not set complexity (no LLM is invoked).`
      );
    }
    if (t.command !== undefined) {
      throw new Error(
        `tasks[${index}] (id="${id}") is kind="pause" and must not set command (only kind="oracle" runs a shell command).`
      );
    }
    if (t.expect !== undefined) {
      throw new Error(
        `tasks[${index}] (id="${id}") is kind="pause" and must not set expect (only kind="oracle" matches output).`
      );
    }
    if (t.allowNonZeroExit !== undefined) {
      throw new Error(
        `tasks[${index}] (id="${id}") is kind="pause" and must not set allowNonZeroExit (only kind="oracle" runs a command).`
      );
    }
    let subtask_prompt = '';
    if (t.subtask_prompt !== undefined) {
      if (typeof t.subtask_prompt !== 'string') {
        throw new Error(
          `tasks[${index}].subtask_prompt must be a string when set on a pause task.`
        );
      }
      subtask_prompt = t.subtask_prompt;
    }
    return {
      id,
      depends_on: dedupedDepends,
      complexity: NON_LLM_SYNTHETIC_COMPLEXITY,
      subtask_prompt,
      kind: 'pause',
    };
  }

  if (kind === 'oracle') {
    if (t.complexity !== undefined) {
      throw new Error(
        `tasks[${index}] (id="${id}") is kind="oracle" and must not set complexity (no LLM is invoked).`
      );
    }
    if (t.subtask_prompt !== undefined) {
      throw new Error(
        `tasks[${index}] (id="${id}") is kind="oracle" and must not set subtask_prompt (oracle tasks run a shell command, not an LLM prompt).`
      );
    }
    if (t.model !== undefined) {
      throw new Error(
        `tasks[${index}] (id="${id}") is kind="oracle" and must not set model (no model is invoked).`
      );
    }
    if (typeof t.command !== 'string' || t.command.trim() === '') {
      throw new Error(
        `tasks[${index}] (id="${id}") is kind="oracle" and requires a non-empty string command.`
      );
    }
    let expect: string = DEFAULT_ORACLE_EXPECT;
    if (t.expect !== undefined) {
      if (typeof t.expect !== 'string') {
        throw new Error(
          `tasks[${index}].expect must be a string when set on an oracle task.`
        );
      }
      try {
        new RegExp(t.expect);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(
          `tasks[${index}].expect must be a valid regex (got ${JSON.stringify(
            t.expect
          )}: ${reason}).`
        );
      }
      expect = t.expect;
    }
    let allowNonZeroExit = false;
    if (t.allowNonZeroExit !== undefined) {
      if (typeof t.allowNonZeroExit !== 'boolean') {
        throw new Error(
          `tasks[${index}].allowNonZeroExit must be a boolean when set on an oracle task.`
        );
      }
      allowNonZeroExit = t.allowNonZeroExit;
    }
    return {
      id,
      depends_on: dedupedDepends,
      complexity: NON_LLM_SYNTHETIC_COMPLEXITY,
      subtask_prompt: '',
      kind: 'oracle',
      command: t.command,
      expect,
      allowNonZeroExit,
    };
  }

  if (t.command !== undefined) {
    throw new Error(
      `tasks[${index}] (id="${id}") is kind="task" and must not set command (only kind="oracle" runs a shell command).`
    );
  }
  if (t.expect !== undefined) {
    throw new Error(
      `tasks[${index}] (id="${id}") is kind="task" and must not set expect (only kind="oracle" matches output).`
    );
  }
  if (t.allowNonZeroExit !== undefined) {
    throw new Error(
      `tasks[${index}] (id="${id}") is kind="task" and must not set allowNonZeroExit (only kind="oracle" runs a command).`
    );
  }
  const complexity = t.complexity;
  if (
    typeof complexity !== 'string' ||
    !COMPLEXITY_VALUES.has(complexity as Complexity)
  ) {
    throw new Error(
      `tasks[${index}].complexity must be one of HIGH | MED | LOW.`
    );
  }
  const subtask_prompt = t.subtask_prompt;
  if (typeof subtask_prompt !== 'string' || subtask_prompt.trim() === '') {
    throw new Error(
      `tasks[${index}].subtask_prompt must be a non-empty string.`
    );
  }
  return {
    id,
    depends_on: dedupedDepends,
    complexity: complexity as Complexity,
    subtask_prompt,
    kind: 'task',
  };
}

function resolveTaskKind(raw: unknown, index: number): TaskKind {
  if (raw === undefined) return 'task';
  if (typeof raw === 'string' && TASK_KIND_VALUES.has(raw as TaskKind)) {
    return raw as TaskKind;
  }
  throw new Error(
    `tasks[${index}].kind must be one of 'task' | 'pause' | 'oracle' when set (got ${JSON.stringify(
      raw
    )}).`
  );
}

/** Throws on the first cycle found. Uses iterative DFS with a recursion stack. */
function detectCycle(tasks: RawTask[]): void {
  const adj = new Map<string, string[]>();
  for (const t of tasks) adj.set(t.id, []);
  for (const t of tasks) {
    for (const dep of t.depends_on) {
      adj.get(dep)!.push(t.id);
    }
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const t of tasks) color.set(t.id, WHITE);

  for (const start of tasks) {
    if (color.get(start.id) !== WHITE) continue;
    const stack: Array<{ id: string; childIdx: number; pathIdx: number }> = [
      { id: start.id, childIdx: 0, pathIdx: 0 },
    ];
    const path: string[] = [];
    color.set(start.id, GRAY);
    path.push(start.id);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const children = adj.get(top.id)!;
      if (top.childIdx >= children.length) {
        color.set(top.id, BLACK);
        path.pop();
        stack.pop();
        continue;
      }
      const child = children[top.childIdx++];
      const cColor = color.get(child) ?? WHITE;
      if (cColor === GRAY) {
        const cycleStart = path.indexOf(child);
        const cycle = [...path.slice(cycleStart), child].join(' -> ');
        throw new Error(`Cycle detected: ${cycle}`);
      }
      if (cColor === WHITE) {
        color.set(child, GRAY);
        path.push(child);
        stack.push({ id: child, childIdx: 0, pathIdx: path.length - 1 });
      }
    }
  }
}

/**
 * Kahn's algorithm — return tasks grouped into ranks. Tasks within a rank
 * have no inter-dependencies and can run in parallel.
 */
export function computeRanks(dag: DAG): RawTask[][] {
  const remaining = new Map<string, number>();
  const byId = new Map<string, RawTask>();
  for (const t of dag.tasks) {
    remaining.set(t.id, t.depends_on.length);
    byId.set(t.id, t);
  }
  const dependents = new Map<string, string[]>();
  for (const t of dag.tasks) dependents.set(t.id, []);
  for (const t of dag.tasks) {
    for (const dep of t.depends_on) {
      dependents.get(dep)!.push(t.id);
    }
  }

  const ranks: RawTask[][] = [];
  let frontier = dag.tasks.filter((t) => remaining.get(t.id) === 0);
  while (frontier.length > 0) {
    ranks.push(frontier);
    const next: RawTask[] = [];
    for (const t of frontier) {
      for (const child of dependents.get(t.id)!) {
        const r = remaining.get(child)! - 1;
        remaining.set(child, r);
        if (r === 0) next.push(byId.get(child)!);
      }
    }
    frontier = next;
  }

  const placed = ranks.reduce((n, r) => n + r.length, 0);
  if (placed !== dag.tasks.length) {
    throw new Error('Topological sort failed — DAG contains a cycle.');
  }
  return ranks;
}

export function validateModelMap(
  raw: unknown,
  label = 'model map'
): ModelMapOverride {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  const obj = raw as Record<string, unknown>;
  const models: ModelMapOverride = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!COMPLEXITY_VALUES.has(key as Complexity)) {
      throw new Error(`${label} contains unknown complexity key: ${key}`);
    }
    models[key as Complexity] = normalizeModelSelection(
      value as ModelSpec,
      `${label}.${key}`
    );
  }
  return models;
}

export function createModelSelectionResolver(
  overrides: ModelMapOverride = {}
): (c: Complexity) => ModelSelection {
  const models = resolveModelMap(overrides);
  return (c: Complexity): ModelSelection => {
    assertKnownComplexity(c);
    return cloneModelSelection(models[c]);
  };
}

export function createCatalogBackedModelResolver(
  modelFor: (c: Complexity) => ModelSelection,
  catalog: readonly ModelCatalogItem[]
): (c: Complexity) => ModelSelection {
  const cache = new Map<Complexity, ModelSelection>();
  return (c: Complexity): ModelSelection => {
    const cached = cache.get(c);
    if (cached) return cloneModelSelection(cached);
    const resolved = resolveModelSelectionFromCatalog(
      modelFor(c),
      catalog,
      `model for ${c}`
    );
    cache.set(c, resolved);
    return cloneModelSelection(resolved);
  };
}

/** Validate a JSON model selection object. */
export function validateModelSelection(
  raw: unknown,
  label = 'model'
): ModelSelection {
  const obj = validateModelSelectionObject(raw, label);
  const id = validateNonEmptyString(obj.id, `${label}.id`);
  const params = validateModelParams(obj.params, label);
  return createModelSelection(id, params);
}

function validateModelSelectionObject(
  raw: unknown,
  label: string
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${label} must be a model object.`);
  }
  return raw as Record<string, unknown>;
}

function validateNonEmptyString(raw: unknown, label: string): string {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return raw.trim();
}

function validateModelParams(
  raw: unknown,
  label: string
): ModelParameterValue[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new Error(`${label}.params must be an array when set.`);
  }

  const params: ModelParameterValue[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const param = validateModelParam(raw[i], label, i);
    const paramId = param.id;
    if (seen.has(paramId)) {
      throw new Error(`${label}.params contains duplicate id: ${paramId}`);
    }
    seen.add(paramId);
    params.push(param);
  }
  return params;
}

function validateModelParam(
  raw: unknown,
  label: string,
  index: number
): ModelParameterValue {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${label}.params[${index}] must be an object.`);
  }
  const param = raw as Record<string, unknown>;
  return {
    id: validateNonEmptyString(param.id, `${label}.params[${index}].id`),
    value: validateNonEmptyString(
      param.value,
      `${label}.params[${index}].value`
    ),
  };
}

export function normalizeModelSelection(
  raw: ModelSpec,
  label = 'model'
): ModelSelection {
  if (typeof raw === 'string') {
    return createModelSelection(validateNonEmptyString(raw, label));
  }
  return validateModelSelection(raw, label);
}

export function formatModelSelection(model: ModelSelection): string {
  const params = model.params ?? [];
  if (params.length === 0) return model.id;
  return `${model.id} (${params.map((p) => `${p.id}=${p.value}`).join(', ')})`;
}

export function resolveModelSelectionFromCatalog(
  selection: ModelSelection,
  catalog: readonly ModelCatalogItem[],
  label = 'model'
): ModelSelection {
  const catalogItem = catalog.find((model) => model.id === selection.id);
  if (!catalogItem) {
    const ids = catalog.map((model) => model.id).sort();
    throw new Error(
      `${label} uses unknown Cursor SDK model "${
        selection.id
      }". Known models:\n  ${ids.join('\n  ')}`
    );
  }

  validateRequestedParams(selection, catalogItem, label);

  const variants = catalogItem.variants ?? [];
  if (variants.length === 0) {
    return cloneModelSelection(selection);
  }

  const requestedParams = selection.params ?? [];
  const chosenVariant =
    requestedParams.length === 0
      ? defaultVariant(variants)
      : chooseMatchingVariant(requestedParams, variants);

  if (!chosenVariant) {
    throw new Error(
      `${label} ${formatModelSelection(
        selection
      )} does not match any Cursor SDK preset variant. Valid variants:\n  ${formatVariants(
        variants
      )}`
    );
  }

  const params = chosenVariant.params.map((param) => ({ ...param }));
  return params.length > 0
    ? { id: selection.id, params }
    : { id: selection.id };
}

function validateRequestedParams(
  selection: ModelSelection,
  catalogItem: ModelCatalogItem,
  label: string
): void {
  const requestedParams = selection.params ?? [];
  if (requestedParams.length === 0) return;

  const paramDefs = catalogItem.parameters ?? [];
  if (paramDefs.length > 0) {
    const definitions = new Map(paramDefs.map((param) => [param.id, param]));
    for (const param of requestedParams) {
      const definition = definitions.get(param.id);
      if (!definition) {
        const supported = [...definitions.keys()].sort();
        throw new Error(
          `${label} ${selection.id} does not support param "${
            param.id
          }". Supported params: ${
            supported.length > 0 ? supported.join(', ') : '(none)'
          }`
        );
      }
      const allowed = new Set(definition.values.map((value) => value.value));
      if (!allowed.has(param.value)) {
        throw new Error(
          `${label} ${selection.id} param "${
            param.id
          }" does not support value "${param.value}". Supported values: ${[
            ...allowed,
          ].join(', ')}`
        );
      }
    }
    return;
  }

  const variants = catalogItem.variants ?? [];
  if (variants.length > 0) {
    const chosenVariant = chooseMatchingVariant(requestedParams, variants);
    if (!chosenVariant) {
      throw new Error(
        `${label} ${formatModelSelection(
          selection
        )} does not match any Cursor SDK preset variant. Valid variants:\n  ${formatVariants(
          variants
        )}`
      );
    }
    return;
  }

  throw new Error(
    `${label} ${selection.id} does not declare parameters or preset variants in the Cursor SDK catalog; remove explicit params from this model selection.`
  );
}

type ModelCatalogVariant = NonNullable<ModelCatalogItem['variants']>[number];

function defaultVariant(
  variants: ReadonlyArray<ModelCatalogVariant>
): ModelCatalogVariant {
  return variants.find((variant) => variant.isDefault) ?? variants[0];
}

function assertKnownComplexity(c: Complexity): void {
  if (!COMPLEXITY_KEYS.includes(c)) {
    throw new Error(`Unknown complexity: ${c}`);
  }
}

function resolveModelMap(overrides: ModelMapOverride = {}): ModelMap {
  return {
    HIGH: normalizeModelSelection(overrides.HIGH ?? DEFAULT_MODEL_MAP.HIGH),
    MED: normalizeModelSelection(overrides.MED ?? DEFAULT_MODEL_MAP.MED),
    LOW: normalizeModelSelection(overrides.LOW ?? DEFAULT_MODEL_MAP.LOW),
  };
}

function chooseMatchingVariant(
  requestedParams: readonly ModelParameterValue[],
  variants: ReadonlyArray<ModelCatalogVariant>
): ModelCatalogVariant | undefined {
  const matches = variants.filter((variant) =>
    paramsContainAll(variant.params, requestedParams)
  );
  if (matches.length === 0) return undefined;

  const defaultVar = defaultVariant(variants);
  const defaultParams = new Map(
    defaultVar.params.map((param) => [param.id, param.value])
  );
  const requestedIds = new Set(requestedParams.map((param) => param.id));
  let best = matches[0];
  let bestScore = scoreVariant(best.params, defaultParams, requestedIds);
  // Ties break to the catalog-declared default variant; otherwise first match wins.
  for (const match of matches.slice(1)) {
    const score = scoreVariant(match.params, defaultParams, requestedIds);
    if (score > bestScore) {
      best = match;
      bestScore = score;
    } else if (
      score === bestScore &&
      match === defaultVar &&
      best !== defaultVar
    ) {
      best = match;
    }
  }
  return best;
}

function paramsContainAll(
  candidateParams: readonly ModelParameterValue[],
  requestedParams: readonly ModelParameterValue[]
): boolean {
  const candidate = new Map(
    candidateParams.map((param) => [param.id, param.value])
  );
  return requestedParams.every(
    (param) => candidate.get(param.id) === param.value
  );
}

function scoreVariant(
  params: readonly ModelParameterValue[],
  defaultParams: ReadonlyMap<string, string>,
  requestedIds: ReadonlySet<string>
): number {
  let score = 0;
  for (const param of params) {
    if (requestedIds.has(param.id)) continue;
    if (defaultParams.get(param.id) === param.value) score++;
  }
  return score;
}

function formatVariants(variants: ReadonlyArray<ModelCatalogVariant>): string {
  return variants
    .map((variant) => {
      const params = variant.params
        .map((param) => `${param.id}=${param.value}`)
        .join(', ');
      const suffix = variant.isDefault ? ' [default]' : '';
      return `${variant.displayName}${suffix}: ${params || '(no params)'}`;
    })
    .join('\n  ');
}

function createModelSelection(
  id: string,
  params: readonly ModelParameterValue[] = []
): ModelSelection {
  return params.length > 0
    ? { id, params: params.map((param) => ({ ...param })) }
    : { id };
}

function cloneModelSelection(selection: ModelSelection): ModelSelection {
  return createModelSelection(selection.id, selection.params ?? []);
}
