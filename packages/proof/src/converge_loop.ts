/**
 * --converge-on <task-id> + --max-iterations <N> loop helpers.
 *
 * The convergence task is expected to be a `flatbread-adversarial-reviewer`
 * style node — its bounded canvas `resultText` follows the schema:
 *
 *   ## Blockers
 *   …
 *   ## High-severity findings
 *   …
 *   ## Medium-severity findings
 *   …
 *
 * `extractConvergenceFindings` parses that result text. If `## Blockers` or
 * `## High-severity findings` contain meaningful content (anything beyond
 * `none`/`(none)`/`n/a` placeholders), we mark the run as having issues and
 * the parent runner re-executes the ancestor subtree.
 *
 * `transitiveAncestors` returns the closed set of ancestor task ids in the
 * DAG (the union of `depends_on` reached by repeated traversal). The runner
 * filters its existing rank ordering to that set so re-execution preserves
 * the same topological order as the original run.
 */

import {
  transitiveAncestorIds,
  type DAG,
  type ResolvedConvergenceLoop,
} from './dag.js';
import {
  type UpstreamPolicyMode,
  excerptUpstreamForPrompt,
} from './upstream_policy.js';

export interface ConvergenceFindings {
  hasIssues: boolean;
  blockerLines: string[];
  highSeverityLines: string[];
}

export function extractConvergenceFindings(
  text: string | undefined
): ConvergenceFindings {
  if (!text) {
    return { hasIssues: false, blockerLines: [], highSeverityLines: [] };
  }
  const sections = parseSections(text);
  const blockerLines = filterMeaningful(sections.get('blockers') ?? []);
  const highSeverityLines = filterMeaningful(
    sections.get('high-severity findings') ?? []
  );
  return {
    hasIssues: blockerLines.length > 0 || highSeverityLines.length > 0,
    blockerLines,
    highSeverityLines,
  };
}

/**
 * Splits text into sections keyed by `## ` heading text (lower-cased,
 * trimmed). Sub-headings (`### …`) are kept inside their parent section.
 */
function parseSections(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  // Anchor on lines that start with exactly two `#` (not three+) followed by
  // a space — matches `## Blockers` but skips `### Sub-section`.
  const HEADING_RE = /^##(?!#)\s*(.+?)\s*$/;
  const lines = text.split(/\r?\n/);
  let currentHeading: string | null = null;
  let currentLines: string[] = [];
  for (const line of lines) {
    const m = HEADING_RE.exec(line);
    if (m) {
      if (currentHeading !== null) out.set(currentHeading, currentLines);
      currentHeading = m[1].trim().toLowerCase();
      currentLines = [];
    } else if (currentHeading !== null) {
      currentLines.push(line);
    }
  }
  if (currentHeading !== null) out.set(currentHeading, currentLines);
  return out;
}

/**
 * Returns lines that look like real findings — drops blanks, plain
 * placeholder text like `(none)` / `none.` / `n/a`, and decorative
 * separators.
 */
function filterMeaningful(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') continue;
    if (isPlaceholderLine(line)) continue;
    if (/^[-*_]{3,}$/.test(line)) continue; // hr separators
    out.push(line);
  }
  return out;
}

function isPlaceholderLine(line: string): boolean {
  // Strip leading bullets, formatting punctuation, and surrounding parens —
  // anything that survives gets compared against a tiny placeholder vocabulary.
  const stripped = line.replace(/[-_*()[\]\s.,;:!?'"`>]/g, '').toLowerCase();
  if (stripped === '') return true;
  return PLACEHOLDER_WORDS.has(stripped);
}

const PLACEHOLDER_WORDS = new Set([
  'none',
  'na',
  'noneobserved',
  'nonefound',
  'nonenoted',
  'nothing',
  'nothingtoreport',
  'noissues',
  'noissuesfound',
  'noblockers',
  'noblockersfound',
  'nohighseverityfindings',
  'nohighseverityissues',
]);

export function transitiveAncestors(taskId: string, dag: DAG): Set<string> {
  return transitiveAncestorIds(taskId, dag.tasks);
}

/**
 * Resolves a single loop's `reexecute` selector into the concrete set of
 * task ids the runner re-executes per iteration. Always includes the
 * convergence task itself so the loop body can re-run it after upstream
 * re-execution. Pure function — does not mutate the DAG or the loop.
 *
 * - `{ kind: 'ancestors' }` → `transitiveAncestors(convergeOn) ∪ {convergeOn}`,
 *   matching the legacy `--converge-on` behavior.
 * - `{ kind: 'tasks'; tasks: [...] }` → the validated allow-list (already
 *   guaranteed at parse time to lie inside the convergence ancestor cone).
 *   The convergence task id is added defensively even though `parseDAG`
 *   already injects it during validation.
 */
export function resolveLoopReexecuteIds(
  loop: ResolvedConvergenceLoop,
  dag: DAG
): Set<string> {
  if (loop.reexecute.kind === 'ancestors') {
    const ids = transitiveAncestors(loop.convergeOn, dag);
    ids.add(loop.convergeOn);
    return ids;
  }
  const ids = new Set<string>(loop.reexecute.tasks);
  ids.add(loop.convergeOn);
  return ids;
}

/**
 * Renders the convergence task's reviewer transcript into the standard "extra
 * upstream context" preamble we stitch into ancestor prompts on re-run. The
 * iteration index lets re-runs distinguish their feedback from any future
 * iterations. The body is excerpted via the same upstream policy as child
 * `buildUpstreamContext` — never silently truncated mid-review.
 */
export function buildConvergenceContext(
  convergeTaskId: string,
  iteration: number,
  reviewerTranscript: string | undefined,
  upstreamMode: UpstreamPolicyMode = 'summarize'
): string {
  const trimmed = (reviewerTranscript ?? '').trim();
  if (trimmed === '') {
    return [
      `Convergence feedback from "${convergeTaskId}" (iteration ${
        iteration - 1
      }):`,
      '',
      '(empty result text)',
    ].join('\n');
  }
  const body = excerptUpstreamForPrompt(trimmed, upstreamMode);
  return [
    `Convergence feedback from "${convergeTaskId}" (iteration ${
      iteration - 1
    }):`,
    '',
    body,
  ].join('\n');
}
