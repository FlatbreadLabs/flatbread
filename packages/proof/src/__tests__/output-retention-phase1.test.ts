import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'ava';

import { parseDAG } from '../dag.js';
import {
  buildConvergenceContext,
  extractConvergenceFindings,
} from '../converge_loop.js';
import {
  TaskTranscriptStore,
  taskStreamArtifactRelPath,
} from '../task_transcript.js';
import type { TaskState } from '../canvas_writer.js';
import {
  CANVAS_DISPLAY_CAP,
  excerptUpstreamForPrompt,
  parseUpstreamSections,
  renderUpstreamSections,
  summarizeUpstreamForPrompt,
  UPSTREAM_SNIPPET_CAP,
} from '../upstream_policy.js';
import { renderCanvasSource, initialRunState } from '../canvas_writer.js';
import { writeFindingsSidecar } from '../findings_sidecar.js';

test('parseDAG accepts DAG.outputPolicy.upstream', (t) => {
  const dag = parseDAG({
    title: 'pol',
    outputPolicy: { upstream: 'full' },
    tasks: [
      {
        id: 'a',
        depends_on: [],
        complexity: 'LOW',
        subtask_prompt: 'do',
      },
    ],
  });
  t.is(dag.outputPolicy?.upstream, 'full');
});

test('parseDAG rejects invalid outputPolicy upstream value', (t) => {
  t.throws(
    () =>
      parseDAG({
        title: 'bad',
        outputPolicy: { upstream: 'everything' },
        tasks: [
          {
            id: 'a',
            depends_on: [],
            complexity: 'LOW',
            subtask_prompt: 'do',
          },
        ],
      }),
    { message: /upstream must be/ }
  );
});

test('parseDAG rejects unknown outputPolicy keys', (t) => {
  t.throws(
    () =>
      parseDAG({
        title: 'bad-key',
        outputPolicy: { upstram: 'full' },
        tasks: [
          {
            id: 'a',
            depends_on: [],
            complexity: 'LOW',
            subtask_prompt: 'do',
          },
        ],
      }),
    { message: /DAG\.outputPolicy\.upstram is not supported/ }
  );
});

test('summarize upstream attaches counted excerpt banner instead of omitting rationale', (t) => {
  const filler = 'y'.repeat(5000);
  const { excerpt } = summarizeUpstreamForPrompt(filler, UPSTREAM_SNIPPET_CAP);
  t.true(
    excerpt.includes('[...upstream excerpt:') &&
      excerpt.includes('parent output was 5000 chars')
  );
  t.false(/^[^\n]+\u2026$/u.test(excerpt.trim().split(/\n/).pop() ?? ''));
});

test('full upstream excerpt includes late marker past multi-kchar parents', (t) => {
  const preamble = 'z'.repeat(2800);
  const tailMarker = `${'x'.repeat(9100)}MARKER_LATE`;
  const blob = `${preamble}\n## Section one\nstuff\n## Blockers\n${tailMarker}`;
  const full = excerptUpstreamForPrompt(blob, 'full');
  t.true(full.includes('MARKER_LATE'));
});

test('convergence extract sees late section beyond legacy STREAM cap window', (t) => {
  const long = `${'p'.repeat(6000)}\n## Blockers\n- late blocker\n`;
  const f = extractConvergenceFindings(long);
  t.true(f.hasIssues);
  t.true(f.blockerLines.some((l) => l.includes('late blocker')));
});

test('convergence extraContext carries late blockers under full upstream excerpt mode', (t) => {
  const long = `${'p'.repeat(6000)}\n## Blockers\n- still broken\n`;
  const ctx = buildConvergenceContext('reviewer', 2, long, 'full');
  t.true(ctx.includes('## Blockers'));
  t.true(ctx.includes('still broken'));
});

test('findings sidecar uses parseSource (full transcript) over bounded resultText', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-sidecar-'));
  try {
    const ts: TaskState = {
      id: 'task-a',
      depends_on: [],
      complexity: 'LOW',
      subtask_prompt: 'x',
      status: 'FINISHED',
      model: 'gpt-5.4',
      resultText: '## Blockers\n(none)',
    };
    const longTruth = `${'z'.repeat(5000)}\n## Blockers\n- deep blocker line\n`;
    await writeFindingsSidecar(dir, ts, { parseSource: longTruth });
    const raw = readFileSync(join(dir, 'task-a.findings.json'), 'utf8');
    const parsed = JSON.parse(raw) as { sections: Record<string, string> };
    t.true(parsed.sections.Blockers?.includes('deep blocker line'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('upstream section parsing keeps canvas truncation banner before headings', (t) => {
  const line = '[...truncated 9000 earlier chars...]';
  const body = `${line}\n## Blockers\nhit\n`;
  const sections = parseUpstreamSections(body);
  t.true(sections.some((s) => s.heading === 'Upstream truncation notice'));
  const rendered = renderUpstreamSections(sections);
  t.true(rendered.includes(line));
});

test('upstream section parsing keeps freeform preamble before headings', (t) => {
  const body = `Important preface before headings.\nStill preface.\n## Findings\nhit\n## Proposed contract\nkeep\n`;
  const sections = parseUpstreamSections(body);
  t.is(sections[0]?.heading, 'Upstream preamble');
  const rendered = renderUpstreamSections(sections);
  t.true(rendered.includes('Important preface before headings.'));
});

test('summarize upstream does not rewrite author-owned trailing ellipsis', (t) => {
  const body = [
    '## Summary',
    'This sentence intentionally trails off…',
    '',
    '## Current contract',
    'drop me '.repeat(500),
    '',
    '## Findings',
    'keep this section',
  ].join('\n');
  const { excerpt } = summarizeUpstreamForPrompt(body, 500);
  t.true(excerpt.includes('trails off…'));
  t.false(excerpt.includes('[...truncated in excerpt body at char cap …]'));
});

test('task transcript mirror serializes overlapping flushes in append order', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-stream-'));
  const store = new TaskTranscriptStore();
  try {
    await store.beginMirroredAppend('task-a', dir);
    store.append('task-a', 'a');
    const first = store.flushStreamMirror('task-a');
    store.append('task-a', 'b');
    const second = store.flushStreamMirror('task-a');
    await Promise.all([first, second]);
    await store.flushStreamMirror('task-a');
    const raw = readFileSync(
      join(dir, taskStreamArtifactRelPath('task-a')),
      'utf8'
    );
    t.is(raw, 'ab');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('task transcript store reads existing mirror files after resume', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-stream-resume-'));
  const store = new TaskTranscriptStore();
  try {
    const rel = taskStreamArtifactRelPath('task-a');
    writeFileSync(join(dir, rel), 'full transcript from prior process', 'utf8');
    store.registerExistingMirror('task-a', dir, rel);
    t.is(store.getJoined('task-a'), 'full transcript from prior process');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('canvas render growth stays bounded by display-sized tails versus megabyte dumps', (t) => {
  const tasks = Array.from({ length: 5 }, (_, i) => ({
    id: `t${i}`,
    depends_on: [] as string[],
    complexity: 'LOW' as const,
    subtask_prompt: `${'prompt:'.repeat(200)}\n`,
  }));
  const dag = parseDAG({ title: 'canvas-env', tasks });
  const fresh = (): ReturnType<typeof initialRunState> =>
    initialRunState(dag, () => ({
      id: 'gpt-5.4',
    }));

  const baselineLen = renderCanvasSource(fresh()).length;

  const cappedState = fresh();
  cappedState.tasks.forEach((st) => {
    st.resultText = `[...truncated 800000 earlier chars...]\n${'a'.repeat(
      CANVAS_DISPLAY_CAP
    )}`;
  });
  const cappedLen = renderCanvasSource(cappedState).length;

  const leakyState = fresh();
  leakyState.tasks.forEach((st) => {
    st.resultText = `[...truncated 800000 earlier chars...]\n${'b'.repeat(
      12000
    )}`;
  });
  const uncappedLen = renderCanvasSource(leakyState).length;

  t.true(cappedLen < baselineLen + 5 * CANVAS_DISPLAY_CAP + 96000);

  /** Longer fake transcripts should substantially grow the inlined JSON blob. */
  t.true(
    uncappedLen - cappedLen > 35000,
    'expected materially larger stringify when payloads stay long'
  );
});

test('runOne skips children when upstream is BUDGET-EXCEEDED (guard in run_dag)', (t) => {
  const path = join(dirname(fileURLToPath(import.meta.url)), '../run_dag.ts');
  const src = readFileSync(path, 'utf8');
  const idx = src.indexOf('failedDeps = task.depends_on.filter');
  t.not(idx, -1);
  const snippet = src.slice(idx, idx + 450);
  t.true(snippet.includes("'BUDGET-EXCEEDED'"));
});
