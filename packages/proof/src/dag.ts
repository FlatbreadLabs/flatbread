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
export type ModelMapOverride = Partial<ModelMap>;
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

export interface DAG {
  title: string;
  models?: ModelMapOverride;
  framing?: string;
  budget?: DAGBudget;
  tasks: RawTask[];
}

export interface DAGBudget {
  maxIterations?: number;
  maxTokensTotal?: number;
}

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

  return { title: obj.title, models, framing, budget, tasks };
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
    models[key as Complexity] = validateModelSelection(
      value,
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
  const id = validateModelId(obj.id, `${label}.id`);
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

function validateModelId(raw: unknown, label: string): string {
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
    id: validateModelId(param.id, `${label}.params[${index}].id`),
    value: validateModelId(param.value, `${label}.params[${index}].value`),
  };
}

export function normalizeModelSelection(
  raw: ModelSpec,
  label = 'model'
): ModelSelection {
  if (typeof raw === 'string') {
    return createModelSelection(validateModelId(raw, label));
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
    HIGH: cloneModelSelection(overrides.HIGH ?? DEFAULT_MODEL_MAP.HIGH),
    MED: cloneModelSelection(overrides.MED ?? DEFAULT_MODEL_MAP.MED),
    LOW: cloneModelSelection(overrides.LOW ?? DEFAULT_MODEL_MAP.LOW),
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
