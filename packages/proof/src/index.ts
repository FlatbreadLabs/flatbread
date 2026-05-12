/**
 * Public library surface for `@flatbread/proof` — the DAG task runner that
 * decomposes a task into a graph of Cursor SDK subagents and proves they
 * delivered via live canvas, oracles, pause gates, and convergence loops.
 *
 * The primary use case is the `proof` CLI (`bin/proof.js`); these exports
 * are for tooling that wants to author or inspect DAGs programmatically.
 */

export {
  COMPLEXITY_KEYS,
  DEFAULT_MODEL_MAP,
  computeRanks,
  createCatalogBackedModelResolver,
  createModelSelectionResolver,
  formatModelSelection,
  isOracleTask,
  isPauseTask,
  normalizeModelSelection,
  parseDAG,
  resolveConvergenceLoops,
  resolveModelSelectionFromCatalog,
  validateModelSelection,
  validateModelMap,
} from './dag.js';
export type {
  Complexity,
  DAG,
  DAGBudget,
  DAGConvergenceLoop,
  DAGOutputPolicy,
  LoopReexecute,
  ModelCatalogItem,
  ModelMap,
  ModelMapOverride,
  ModelParameterValue,
  ModelSelection,
  ModelSpec,
  RawTask,
  ResolvedConvergenceLoop,
  ResolvedModelMap,
  TaskKind,
} from './dag.js';

export { CanvasWriter, initialRunState } from './canvas_writer.js';
export type { RunState, TaskState, TaskStatus } from './canvas_writer.js';

export {
  buildConvergenceContext,
  extractConvergenceFindings,
  resolveLoopReexecuteIds,
  transitiveAncestors,
} from './converge_loop.js';
export { transitiveAncestorIds } from './dag.js';
export type { ConvergenceFindings } from './converge_loop.js';

export {
  CANVAS_DISPLAY_CAP,
  DISPLAY_TRUNCATION_BANNER_RE,
  UPSTREAM_SNIPPET_CAP,
  excerptUpstreamForPrompt,
  parseUpstreamSections,
  renderUpstreamSections,
  summarizeUpstreamForPrompt,
} from './upstream_policy.js';
export type {
  UpstreamPolicyMode,
  UpstreamSection,
  UpstreamSummarizeStats,
} from './upstream_policy.js';

export {
  findingsFileName,
  parseSections,
  readFindingsSidecar,
  readFindingsSidecarAsText,
  writeFindingsSidecar,
} from './findings_sidecar.js';
export type { FindingsSidecar } from './findings_sidecar.js';

export {
  formatDryCheckReport,
  loadWorkspaceFacts,
  runDryCheck,
} from './dry_check_cmds.js';
export type {
  CommandFinding,
  DryCheckReport,
  Verdict,
} from './dry_check_cmds.js';

export { runOracleTask } from './oracle_task.js';
export type { OracleTaskDeps, OracleTaskOptions } from './oracle_task.js';

export { checkpointPathFor, runPauseTask } from './pause_task.js';
export type { PauseTaskDeps, PauseTaskOptions } from './pause_task.js';

export {
  EXIT_RUNNER_RESTART,
  RUNNER_RUNTIME_FILES,
  changedRunnerRuntimeFiles,
  readPersistedRunState,
  snapshotRunnerRuntimeFiles,
  writePersistedRunState,
} from './self_hosting.js';
export type {
  PersistedRunState,
  RunnerFileSnapshot,
  RunnerFileSnapshotEntry,
} from './self_hosting.js';
