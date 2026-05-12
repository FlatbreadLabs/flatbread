/**
 * Renders the runner's in-memory state into a self-contained `.canvas.tsx`
 * file. The IDE hot-recompiles on file change, so calling write() repeatedly
 * gives the user a live view of the DAG run.
 *
 * The canvas is fully static React + cursor/canvas — all state is inlined as
 * a `const STATE = {...}` literal. Only that literal changes between writes;
 * the rendered template is identical.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  formatModelSelection,
  normalizeModelSelection,
  type Complexity,
  type DAG,
  type ModelSelection,
  type ModelSpec,
  type TaskKind,
} from './dag.js';

export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'FINISHED'
  | 'ERROR'
  | 'AWAITING_APPROVAL'
  | 'BUDGET-EXCEEDED';

export interface TaskState {
  id: string;
  depends_on: string[];
  complexity: Complexity;
  subtask_prompt: string;
  status: TaskStatus;
  model: string;
  modelSelection?: ModelSelection;
  /** `'task'` (default), `'pause'`, or `'oracle'`. Undefined is normalized to `'task'`. */
  kind?: TaskKind;
  /**
   * Shell command for `kind: 'oracle'` tasks. Surfaced in the canvas so the
   * gate's pass/fail criterion is visible without reading the result body.
   * Undefined for every other kind.
   */
  command?: string;
  /** Regex source the oracle's output is matched against (defaults to `.*`). */
  expect?: string;
  startedAt?: number;
  finishedAt?: number;
  resultText?: string;
  /**
   * Relative path (under the run artifact directory) to the append-only stream
   * mirror for this task's full assistant transcript. Canvas shows bounded
   * `resultText`; this pointer is for locating the authoritative stream file.
   */
  transcriptPath?: string;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  /**
   * Convergence-loop re-execution counter. 0/undefined = original run; bumped
   * by 1 each time `--converge-on` re-runs this task to address upstream
   * reviewer findings.
   */
  iteration?: number;
  /**
   * Absolute path to the sentinel file the runner created for a `kind: 'pause'`
   * task. Set when status === `AWAITING_APPROVAL`; persisted afterwards so the
   * canvas can show "approved by removing <path>".
   */
  checkpointPath?: string;
}

export interface RunState {
  title: string;
  startedAt: number;
  finishedAt?: number;
  /**
   * Aggregate outcome of the entire run.
   *
   * - `SUCCESS` — every task finished cleanly.
   * - `FAILED` — at least one task ended in `ERROR`.
   * - `INTERRUPTED` — the runner caught a fatal signal (SIGINT/SIGTERM/SIGHUP).
   * - `BUDGET_EXCEEDED` — a budget ceiling was crossed: either the
   *   `--converge-on` loop exhausted `--max-iterations` with the convergence
   *   task still reporting blockers, OR `dag.budget.maxTokensTotal` was
   *   exceeded. Both paths exit with `EXIT_BUDGET_EXCEEDED` (4) so
   *   wrappers can branch on budget overflows without parsing logs. Hyphen
   *   form (`BUDGET-EXCEEDED`) is reserved for the per-task `TaskStatus`;
   *   the run-level field uses underscores to match the rest of this enum.
   * - `RESTARTING_RUNNER` — runner runtime files changed mid-run; the
   *   supervisor should relaunch the runner from persisted state so the next
   *   process executes the newly edited source.
   */
  runOutcome?:
    | 'SUCCESS'
    | 'FAILED'
    | 'INTERRUPTED'
    | 'BUDGET_EXCEEDED'
    | 'RESTARTING_RUNNER';
  runMessage?: string;
  tasks: TaskState[];
}

export function initialRunState(
  dag: DAG,
  modelFor: (c: Complexity) => ModelSpec
): RunState {
  return {
    title: dag.title,
    startedAt: Date.now(),
    tasks: dag.tasks.map((t) => {
      const modelSelection = normalizeModelSelection(
        modelFor(t.complexity),
        `model for task ${t.id}`
      );
      return {
        id: t.id,
        depends_on: t.depends_on,
        complexity: t.complexity,
        subtask_prompt: t.subtask_prompt,
        status: 'PENDING',
        model: formatModelSelection(modelSelection),
        modelSelection,
        // Normalize undefined kind → 'task' so downstream consumers (canvas
        // template, runner dispatcher) never have to ?? again.
        kind: t.kind ?? 'task',
        // Surface oracle-only fields so the canvas can render the gate's
        // command / expectation without reading the streamed result body.
        ...(t.kind === 'oracle'
          ? { command: t.command, expect: t.expect }
          : {}),
      };
    }),
  };
}

/**
 * Debounced writer. Multiple write() calls inside the debounce window collapse
 * into one filesystem write — the latest state always wins.
 */
export class CanvasWriter {
  private pending: RunState | null = null;
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> = Promise.resolve();
  private writeSeq = 0;
  private lastFailedWriteSeq = 0;
  private lastWriteError: unknown = null;

  constructor(
    private readonly canvasPath: string,
    private readonly debounceMs: number = 200
  ) {}

  schedule(state: RunState): void {
    this.pending = state;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const snapshot = this.pending;
      this.pending = null;
      if (snapshot) {
        this.enqueueWrite(snapshot);
      }
    }, this.debounceMs);
  }

  /** Force-flush any pending write and await disk completion. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const snapshot = this.pending;
    this.pending = null;
    const targetWriteSeq = snapshot
      ? this.enqueueWrite(snapshot)
      : this.writeSeq;
    await this.inFlight;
    if (targetWriteSeq > 0 && this.lastFailedWriteSeq === targetWriteSeq) {
      throw this.lastWriteError;
    }
  }

  private enqueueWrite(state: RunState): number {
    const seq = ++this.writeSeq;
    this.inFlight = this.inFlight.then(async () => {
      try {
        await this.writeNow(state);
        if (this.lastFailedWriteSeq < seq) {
          this.lastWriteError = null;
        }
      } catch (err) {
        this.lastFailedWriteSeq = seq;
        this.lastWriteError = err;
      }
    });
    return seq;
  }

  private async writeNow(state: RunState): Promise<void> {
    const source = renderCanvasSource(state);
    await mkdir(dirname(this.canvasPath), { recursive: true });
    await writeFile(this.canvasPath, source, 'utf8');
  }
}

export function renderCanvasSource(state: RunState): string {
  const stateLiteral = JSON.stringify(state, null, 2);
  return `${HEADER}\n\nconst STATE: RunState = ${stateLiteral};\n\n${BODY}\n`;
}

const HEADER = `/* AUTO-GENERATED by @flatbread/proof. Do not edit by hand — the runner overwrites this file. */
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  H1,
  H2,
  Pill,
  Stack,
  Stat,
  Text,
  computeDAGLayout,
  useHostTheme,
} from 'cursor/canvas';
import { useEffect, useMemo, useState } from 'react';

type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'FINISHED'
  | 'ERROR'
  | 'AWAITING_APPROVAL'
  | 'BUDGET-EXCEEDED';
type Complexity = 'HIGH' | 'MED' | 'LOW';
type TaskKind = 'task' | 'pause' | 'oracle';

// Keep in sync with ModelParameterValue / ModelSelection in dag.ts.
interface ModelParameterValue {
  id: string;
  value: string;
}

interface ModelSelection {
  id: string;
  params?: ModelParameterValue[];
}

interface TaskState {
  id: string;
  depends_on: string[];
  complexity: Complexity;
  subtask_prompt: string;
  status: TaskStatus;
  model: string;
  modelSelection?: ModelSelection;
  kind?: TaskKind;
  command?: string;
  expect?: string;
  startedAt?: number;
  finishedAt?: number;
  resultText?: string;
  /**
   * Relative path (artifact dir) for the authoritative stream transcript.
   * Canvas shows bounded resultText strings; transcriptPath reveals the mirror file path.
   */
  transcriptPath?: string;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  iteration?: number;
  checkpointPath?: string;
}

interface RunState {
  title: string;
  startedAt: number;
  finishedAt?: number;
  runOutcome?:
    | 'SUCCESS'
    | 'FAILED'
    | 'INTERRUPTED'
    | 'BUDGET_EXCEEDED'
    | 'RESTARTING_RUNNER';
  runMessage?: string;
  tasks: TaskState[];
}`;

const BODY = String.raw`const NODE_H = 64;
const SCROLL_STORAGE_KEY = '@flatbread/proof:scroll-y';
const COMPLETED_DOT_COLOR = '#22c55e';
const AWAITING_DOT_COLOR = '#f59e0b';
const BUDGET_DOT_COLOR = '#ef4444';
const COMPACT_BREAKPOINT_PX = 720;

function effectiveKind(t: TaskState): TaskKind {
  return t.kind ?? 'task';
}

function pillToneFor(status: TaskStatus): 'neutral' | 'info' | 'success' | 'warning' {
  switch (status) {
    case 'PENDING':
      return 'neutral';
    case 'RUNNING':
      return 'info';
    case 'FINISHED':
      return 'success';
    case 'ERROR':
      return 'warning';
    case 'AWAITING_APPROVAL':
      return 'warning';
    case 'BUDGET-EXCEEDED':
      return 'warning';
  }
}

function complexityTone(c: Complexity): 'neutral' | 'info' | 'warning' {
  switch (c) {
    case 'HIGH':
      return 'warning';
    case 'MED':
      return 'info';
    case 'LOW':
      return 'neutral';
  }
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return '—';
  if (ms < 1000) return ms + 'ms';
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1) + 's';
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return m + 'm ' + rem + 's';
}

function elapsed(state: RunState): number {
  const end = state.finishedAt ?? Date.now();
  return end - state.startedAt;
}

function totalTokens(state: RunState): { input: number; output: number } {
  let input = 0;
  let output = 0;
  for (const t of state.tasks) {
    input += t.inputTokens ?? 0;
    output += t.outputTokens ?? 0;
  }
  return { input, output };
}

function taskElementId(taskId: string): string {
  return 'task-card-' + taskId;
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(1024);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = (): void => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return width;
}

function getScrollY(): number {
  if (typeof window === 'undefined') return 0;
  return Math.max(window.scrollY ?? 0, 0);
}

function saveScrollY(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, String(getScrollY()));
  } catch {
    // ignore storage failures
  }
}

function restoreScrollY(): void {
  if (typeof window === 'undefined') return;
  let target = 0;
  try {
    const raw = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    target = Math.floor(parsed);
  } catch {
    return;
  }

  // Retry because hot-reload can run before content height has settled.
  let attempts = 0;
  const maxAttempts = 8;
  const tick = (): void => {
    attempts += 1;
    const scrollHeight = Math.max(
      document.documentElement?.scrollHeight ?? 0,
      document.body?.scrollHeight ?? 0,
    );
    const maxY = Math.max(scrollHeight - window.innerHeight, 0);
    if (maxY <= 0) {
      if (attempts < maxAttempts) window.requestAnimationFrame(tick);
      return;
    }
    const desiredY = Math.min(target, maxY);
    window.scrollTo({ top: desiredY, behavior: 'auto' });
    if (attempts < maxAttempts && Math.abs(getScrollY() - desiredY) > 2) {
      window.requestAnimationFrame(tick);
    }
  };
  window.requestAnimationFrame(tick);
}

function DAGGraph({
  state,
  onNodeClick,
}: {
  state: RunState;
  onNodeClick?: (taskId: string) => void;
}): JSX.Element {
  const theme = useHostTheme();
  const viewportWidth = useViewportWidth();
  const isCompact = viewportWidth < COMPACT_BREAKPOINT_PX;
  const nodeWidth = isCompact ? 168 : 200;
  const nodeGap = isCompact ? 24 : 40;
  const rankGap = isCompact ? 60 : 72;
  const layoutPadding = isCompact ? 12 : 24;
  const titleLimit = Math.max(12, Math.floor((nodeWidth - 44) / 7));
  const layout = computeDAGLayout({
    nodes: state.tasks.map((t) => ({ id: t.id })),
    edges: state.tasks.flatMap((t) =>
      t.depends_on.map((d) => ({ from: d, to: t.id })),
    ),
    direction: 'vertical',
    nodeWidth,
    nodeHeight: NODE_H,
    rankGap,
    nodeGap,
    padding: layoutPadding,
  });

  const byId = new Map(state.tasks.map((t) => [t.id, t]));

  function nodeFill(status: TaskStatus): string {
    switch (status) {
      case 'PENDING':
        return theme.fill.tertiary;
      case 'RUNNING':
        return theme.fill.secondary;
      case 'FINISHED':
        return theme.fill.secondary;
      case 'ERROR':
        return theme.fill.secondary;
      case 'AWAITING_APPROVAL':
        return theme.fill.secondary;
      case 'BUDGET-EXCEEDED':
        return theme.fill.secondary;
    }
  }

  function nodeStroke(status: TaskStatus): string {
    switch (status) {
      case 'PENDING':
        return theme.stroke.tertiary;
      case 'RUNNING':
        return theme.accent.primary;
      case 'FINISHED':
        return COMPLETED_DOT_COLOR;
      case 'ERROR':
        return theme.stroke.primary;
      case 'AWAITING_APPROVAL':
        return AWAITING_DOT_COLOR;
      case 'BUDGET-EXCEEDED':
        return BUDGET_DOT_COLOR;
    }
  }

  function statusGlyph(status: TaskStatus): string {
    switch (status) {
      case 'PENDING':
        return '○';
      case 'RUNNING':
        return '◐';
      case 'FINISHED':
        return '●';
      case 'ERROR':
        return '×';
      case 'AWAITING_APPROVAL':
        return '⏸';
      case 'BUDGET-EXCEEDED':
        return '⊘';
    }
  }

  function statusGlyphColor(status: TaskStatus): string {
    switch (status) {
      case 'PENDING':
        return theme.text.tertiary;
      case 'RUNNING':
        return theme.accent.primary;
      case 'FINISHED':
        return COMPLETED_DOT_COLOR;
      case 'ERROR':
        return theme.text.primary;
      case 'AWAITING_APPROVAL':
        return AWAITING_DOT_COLOR;
      case 'BUDGET-EXCEEDED':
        return BUDGET_DOT_COLOR;
    }
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 4,
      }}
    >
    <svg
      width={layout.width}
      height={layout.height}
      style={{
        display: 'block',
        minWidth: Math.min(layout.width, nodeWidth + layoutPadding * 2),
        maxWidth: layout.width <= viewportWidth ? '100%' : undefined,
      }}
    >
      <defs>
        <marker
          id="dag-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={theme.stroke.secondary} />
        </marker>
      </defs>
      {layout.edges.map((e, i) => (
        <line
          key={'e' + i}
          x1={e.sourceX}
          y1={e.sourceY}
          x2={e.targetX}
          y2={e.targetY}
          stroke={theme.stroke.secondary}
          strokeWidth={1.25}
          strokeDasharray={e.isBackEdge ? '4 3' : undefined}
          markerEnd="url(#dag-arrow)"
        />
      ))}
      {layout.nodes.map((n) => {
        const t = byId.get(n.id);
        if (!t) return null;
        return (
          <g
            key={n.id}
            transform={'translate(' + n.x + ',' + n.y + ')'}
            onClick={() => onNodeClick?.(n.id)}
            style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
          >
            <rect
              width={nodeWidth}
              height={NODE_H}
              rx={8}
              ry={8}
              fill={nodeFill(t.status)}
              stroke={nodeStroke(t.status)}
              strokeWidth={t.status === 'RUNNING' ? 2 : 1}
            />
            <text
              x={12}
              y={22}
              fontSize={11}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fill={statusGlyphColor(t.status)}
            >
              {statusGlyph(t.status)}
            </text>
            <text
              x={28}
              y={22}
              fontSize={13}
              fontWeight={600}
              fill={theme.text.primary}
            >
              {t.id.length > titleLimit ? t.id.slice(0, titleLimit - 1) + '…' : t.id}
            </text>
            <text
              x={12}
              y={42}
              fontSize={10.5}
              fill={theme.text.secondary}
            >
              {effectiveKind(t) === 'pause'
                ? 'human checkpoint'
                : effectiveKind(t) === 'oracle'
                  ? 'oracle gate'
                  : t.complexity + ' · ' + t.model}
            </text>
            <text
              x={12}
              y={58}
              fontSize={10.5}
              fill={theme.text.tertiary}
            >
              {t.status === 'FINISHED' || t.status === 'ERROR'
                ? (effectiveKind(t) === 'oracle'
                    ? (t.status === 'FINISHED' ? 'pass · ' : 'fail · ') + formatDuration(t.durationMs)
                    : formatDuration(t.durationMs)) +
                  ((t.iteration ?? 0) > 0 ? ' · iter ' + t.iteration : '')
                : t.status === 'RUNNING'
                  ? 'running…' + ((t.iteration ?? 0) > 0 ? ' · iter ' + t.iteration : '')
                  : t.status === 'AWAITING_APPROVAL'
                    ? 'awaiting approval'
                    : t.status === 'BUDGET-EXCEEDED'
                      ? 'budget exceeded' + ((t.iteration ?? 0) > 0 ? ' · iter ' + t.iteration : '')
                      : 'pending'}
            </text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

function SummaryStats({
  counts,
}: {
  counts: {
    total: number;
    pending: number;
    running: number;
    finished: number;
    error: number;
    awaiting: number;
  };
}): JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
        gap: 12,
        width: '100%',
      }}
    >
      <Stat value={String(counts.total)} label="Total" />
      <Stat value={String(counts.pending)} label="Pending" />
      <Stat value={String(counts.running)} label="Running" tone={counts.running > 0 ? 'info' : undefined} />
      <Stat value={String(counts.awaiting)} label="Awaiting" tone={counts.awaiting > 0 ? 'warning' : undefined} />
      <Stat value={String(counts.finished)} label="Finished" tone={counts.finished > 0 ? 'success' : undefined} />
      <Stat value={String(counts.error)} label="Errored" tone={counts.error > 0 ? 'danger' : undefined} />
    </div>
  );
}

function TaskList({
  state,
  forcedOpenVersionByTaskId,
}: {
  state: RunState;
  forcedOpenVersionByTaskId: Record<string, number>;
}): JSX.Element {
  const theme = useHostTheme();
  return (
    <Stack gap={10}>
      {state.tasks.map((t) => {
        const trailing = (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              gap: 6,
            }}
          >
            <Pill tone={complexityTone(t.complexity)} size="sm">
              {t.complexity}
            </Pill>
            <Pill tone={pillToneFor(t.status)} active={t.status !== 'PENDING'} size="sm">
              {t.status}
            </Pill>
          </div>
        );
        return (
          <div key={t.id} id={taskElementId(t.id)}>
            <Card
              key={t.id + ':' + String(forcedOpenVersionByTaskId[t.id] ?? 0)}
              collapsible
              defaultOpen={t.status !== 'PENDING' || (forcedOpenVersionByTaskId[t.id] ?? 0) > 0}
            >
            <CardHeader trailing={trailing}>{t.id}</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text tone="secondary" size="small">
                  {effectiveKind(t) === 'pause'
                    ? 'Human checkpoint'
                    : effectiveKind(t) === 'oracle'
                      ? 'Oracle gate (deterministic — no model)'
                      : 'Model ' + t.model}
                  {t.depends_on.length > 0 ? ' · depends on ' + t.depends_on.join(', ') : ''}
                  {t.durationMs !== undefined ? ' · ' + formatDuration(t.durationMs) : ''}
                  {t.inputTokens !== undefined || t.outputTokens !== undefined
                    ? ' · ' + (t.inputTokens ?? 0) + ' in / ' + (t.outputTokens ?? 0) + ' out tokens'
                    : ''}
                  {(t.iteration ?? 0) > 0 ? ' · iteration ' + t.iteration : ''}
                </Text>
                {t.modelSelection?.params && t.modelSelection.params.length > 0 ? (
                  <Text size="small" tone="tertiary" style={{ paddingLeft: 12 }}>
                    {'Params: ' +
                      t.modelSelection.params.map((p) => p.id + '=' + p.value).join(', ')}
                  </Text>
                ) : null}
                {effectiveKind(t) === 'pause' && t.checkpointPath ? (
                  <Stack gap={4}>
                    <Text size="small" weight="semibold">
                      {t.status === 'AWAITING_APPROVAL' ? 'Pending approval — delete this file to release the gate:' : 'Approved checkpoint:'}
                    </Text>
                    <pre
                      style={{
                        margin: 0,
                        padding: 8,
                        borderRadius: 6,
                        background: theme.bg.elevated,
                        border: '1px solid ' + (t.status === 'AWAITING_APPROVAL' ? AWAITING_DOT_COLOR : theme.stroke.tertiary),
                        color: theme.text.primary,
                        fontSize: 12,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      rm '{t.checkpointPath}'
                    </pre>
                  </Stack>
                ) : null}
                {effectiveKind(t) === 'oracle' ? (
                  <Stack gap={4}>
                    <Text size="small">
                      <Text as="span" weight="semibold">Command: </Text>
                      <Text as="span">{t.command ?? '(no command)'}</Text>
                    </Text>
                    <Text size="small">
                      <Text as="span" weight="semibold">Expect: </Text>
                      <Text as="span">/{t.expect ?? '.*'}/</Text>
                    </Text>
                  </Stack>
                ) : (
                  <Text size="small">
                    <Text as="span" weight="semibold">{effectiveKind(t) === 'pause' ? 'Description: ' : 'Prompt: '}</Text>
                    {t.subtask_prompt || (effectiveKind(t) === 'pause' ? '(no description)' : '')}
                  </Text>
                )}
                {t.resultText ? (
                  <Stack gap={4}>
                    <Text size="small" weight="semibold">
                      {t.status === 'RUNNING'
                        ? 'Streaming output'
                        : t.status === 'AWAITING_APPROVAL'
                          ? 'Pause status'
                          : effectiveKind(t) === 'oracle'
                            ? t.status === 'FINISHED'
                              ? 'Oracle pass'
                              : 'Oracle fail'
                            : 'Result'}
                    </Text>
                    <pre
                      style={{
                        margin: 0,
                        padding: 10,
                        borderRadius: 6,
                        background: theme.bg.elevated,
                        border: '1px solid ' + theme.stroke.tertiary,
                        color: theme.text.secondary,
                        fontSize: 12,
                        lineHeight: 1.45,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 320,
                        overflow: 'auto',
                      }}
                    >
                      {t.resultText}
                      {t.status === 'RUNNING' ? '\u2588' : ''}
                    </pre>
                    {t.transcriptPath ? (
                      <Text size="small" tone="tertiary">
                        Full transcript file (relative to artifact dir):{' '}
                        {t.transcriptPath}
                      </Text>
                    ) : null}
                  </Stack>
                ) : t.status === 'RUNNING' ? (
                  <Text size="small" tone="tertiary" italic>
                    Waiting for first token…
                  </Text>
                ) : null}
                {t.errorMessage ? (
                  <Stack gap={4}>
                    <Text size="small" weight="semibold">Error</Text>
                    <Text size="small" tone="secondary">{t.errorMessage}</Text>
                  </Stack>
                ) : null}
              </Stack>
            </CardBody>
            </Card>
          </div>
        );
      })}
    </Stack>
  );
}

export default function DagRun(): JSX.Element {
  const [forcedOpenVersionByTaskId, setForcedOpenVersionByTaskId] = useState<Record<string, number>>({});
  const taskIds = useMemo(() => new Set(STATE.tasks.map((t) => t.id)), []);

  useEffect(() => {
    restoreScrollY();
    const onScroll = (): void => saveScrollY();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      saveScrollY();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleNodeClick = (taskId: string): void => {
    if (!taskIds.has(taskId)) return;

    setForcedOpenVersionByTaskId((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] ?? 0) + 1,
    }));

    const targetId = taskElementId(taskId);
    const scrollToTask = (): void => {
      const el = document.getElementById(targetId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Wait one frame so the forced-open remount lands before we scroll.
    window.requestAnimationFrame(scrollToTask);
  };

  const counts = STATE.tasks.reduce(
    (acc, t) => {
      acc.total += 1;
      switch (t.status) {
        case 'PENDING':
          acc.pending += 1;
          break;
        case 'RUNNING':
          acc.running += 1;
          break;
        case 'FINISHED':
          acc.finished += 1;
          break;
        case 'ERROR':
          acc.error += 1;
          break;
        case 'AWAITING_APPROVAL':
          acc.awaiting += 1;
          break;
        case 'BUDGET-EXCEEDED':
          // Surfaced via the per-task pill / glyph; bucketed under errored
          // here so the summary counts stay stable.
          acc.error += 1;
          break;
      }
      return acc;
    },
    { total: 0, pending: 0, running: 0, finished: 0, error: 0, awaiting: 0 },
  );
  const tokens = totalTokens(STATE);
  const isFinal = STATE.finishedAt !== undefined;
  const statusLabel =
    STATE.runOutcome === 'INTERRUPTED'
      ? 'INTERRUPTED'
      : STATE.runOutcome === 'FAILED'
        ? 'FAILED'
        : STATE.runOutcome === 'BUDGET_EXCEEDED'
          ? 'BUDGET-EXCEEDED'
          : STATE.runOutcome === 'RESTARTING_RUNNER'
            ? 'RESTARTING RUNNER'
            : isFinal
              ? 'COMPLETE'
              : 'RUNNING';
  const statusTone =
    STATE.runOutcome === 'INTERRUPTED' ||
    STATE.runOutcome === 'FAILED' ||
    STATE.runOutcome === 'BUDGET_EXCEEDED'
      ? 'danger'
      : STATE.runOutcome === 'RESTARTING_RUNNER'
        ? 'warning'
      : isFinal
        ? 'success'
        : 'info';

  return (
    <main style={{ overflowX: 'hidden', width: '100%', maxWidth: '100%' }}>
      <Stack gap={20}>
        <Stack gap={6}>
          <div style={{ minWidth: 0 }}>
            <H1>{STATE.title}</H1>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              minWidth: 0,
            }}
          >
            <Pill tone={statusTone} active size="sm">
              {statusLabel}
            </Pill>
            <Text tone="secondary" size="small">
              {counts.total} tasks · elapsed {formatDuration(elapsed(STATE))}
              {tokens.input + tokens.output > 0
                ? ' · ' + tokens.input + ' in / ' + tokens.output + ' out tokens'
                : ''}
            </Text>
          </div>
          {STATE.runMessage ? (
            <Text tone="secondary" size="small">
              {STATE.runMessage}
            </Text>
          ) : null}
        </Stack>

        <SummaryStats counts={counts} />

        <Divider />

        <Stack gap={12}>
          <H2>Graph</H2>
          <DAGGraph state={STATE} onNodeClick={handleNodeClick} />
        </Stack>

        <Divider />

        <Stack gap={12}>
          <H2>Tasks</H2>
          <TaskList state={STATE} forcedOpenVersionByTaskId={forcedOpenVersionByTaskId} />
        </Stack>
      </Stack>
    </main>
  );
}`;
