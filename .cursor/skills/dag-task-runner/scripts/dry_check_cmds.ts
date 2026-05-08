/**
 * --dry-check-cmds mode: walks every `subtask_prompt`, regex-extracts shell
 * commands, validates them against the workspace, and prints a structured
 * report. No `CURSOR_API_KEY` required.
 *
 * Validation focuses on patterns that have caused real DAG-runtime failures:
 *
 *   - `pnpm --filter <name> ...` where `<name>` is not a known workspace
 *     package → DIRTY (the filter resolves to nothing and the command no-ops
 *     or errors).
 *   - `pnpm exec flatbread <subcmd>` without `--filter <pkg>` → DIRTY
 *     (`loadConfig` does not search up; `flatbread.config.js` only exists in
 *     example dirs, so a top-level invocation never finds it). This is the
 *     historical regression the runner is asked to detect.
 *   - `pnpm codegen` (top-level) without an explicit `--filter` → DIRTY
 *     (`codegen` is a `--watch` script in `examples/nextjs/package.json`;
 *     it would hang the DAG node).
 *   - `pnpm --filter <pkg> codegen` where `pkg` defines `codegen` as a
 *     `--watch` script → DIRTY (same hang risk).
 *
 * Backticked references that appear in a *negation context* ("Do NOT use",
 * "instead of", "would hang", "avoid") are tagged `INFO` and excluded from
 * the dirty count — they are documentation of anti-patterns the prompt
 * already steers the agent away from.
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import type { DAG, RawTask } from './dag.js';

export type Verdict = 'OK' | 'DIRTY' | 'WARN' | 'INFO';

export interface CommandFinding {
  taskId: string;
  /** Raw command extracted from the prompt (backtick contents, trimmed). */
  command: string;
  /** First non-flag token, e.g. `pnpm`, `flatbread`. */
  verb: string;
  verdict: Verdict;
  reason: string;
  /** Was the command preceded by a "do NOT" / "instead of" cue in the prompt? */
  negated: boolean;
}

export interface DryCheckReport {
  title: string;
  totalTasks: number;
  totalCommands: number;
  ok: number;
  warn: number;
  dirty: number;
  info: number;
  findings: CommandFinding[];
  /** True when at least one finding is `DIRTY`. Drives exit code. */
  isDirty: boolean;
}

interface WorkspaceFacts {
  /** All workspace package `name` fields (`@flatbread/core`, `nextjs`, …). */
  packageNames: Set<string>;
  /** Map of workspace package name → package.json `scripts` table. */
  scriptsByPackage: Map<string, Record<string, string>>;
  /** Directory names under `packages/` and `examples/` (for `--filter` shorthand). */
  packageDirs: Set<string>;
  /** Map of dir basename → package name. Used to interpret `--filter <dir>`. */
  packageNameByDir: Map<string, string>;
  /** Absolute path to workspace root (the `--cwd` we resolve against). */
  cwd: string;
}

/** Verbs we consider "shell commands" worth validating. */
const SHELL_VERBS = new Set([
  'pnpm',
  'npm',
  'yarn',
  'npx',
  'node',
  'tsx',
  'flatbread',
  'git',
  'cd',
  'mkdir',
  'mv',
  'cp',
  'rm',
  'cat',
  'echo',
  'bash',
  'sh',
  'cursor-agent',
  'agent-browser',
  'set',
  'source',
  'export',
  'kill',
  'open',
  'curl',
  'wget',
  'ls',
]);

/**
 * Cues in the preceding 80 chars that flip a finding from DIRTY/WARN to INFO.
 *
 * Three families:
 *
 *   - Negation: prompt explicitly tells the agent NOT to run the command
 *     (`Do NOT use \`pnpm codegen\`…`).
 *   - Citation: command is quoted as a reference to existing config / docs
 *     rather than an instruction (`binds port 5057 via \`flatbread start …\`
 *     per \`examples/nextjs/package.json:8\``).
 *   - Backgrounding: command is explicitly intended to be spawned in the
 *     background and torn down later (`Start the example dev server in the
 *     background: \`pnpm --filter nextjs dev\``).
 */
const NEUTRALIZING_CUES = [
  // Negation
  'do not use',
  "don't use",
  'do not run',
  "don't run",
  'instead of',
  'would hang',
  'avoid',
  'never use',
  "won't use",
  'rather than',
  'would block',
  // Citation / documentation reference
  ' via ',
  ' per ',
  ' from ',
  ' see ',
  'defined as',
  'defined in',
  'package.json:',
  'binds port',
  // Backgrounding (legitimate long-running spawn-then-teardown pattern)
  'in the background',
  'background:',
  'background.',
  ' background ',
  ' nohup ',
];

/** Single-backtick-delimited tokens. We deliberately ignore triple-backtick fences (none in current prompts) and HTML codeblocks. */
const BACKTICK_RE = /`([^`\n]+)`/g;

export async function loadWorkspaceFacts(cwd: string): Promise<WorkspaceFacts> {
  const workspaceRoot = resolveWorkspaceRoot(cwd);
  const facts: WorkspaceFacts = {
    packageNames: new Set(),
    scriptsByPackage: new Map(),
    packageDirs: new Set(),
    packageNameByDir: new Map(),
    cwd: workspaceRoot,
  };

  for (const parent of ['packages', 'examples']) {
    const parentAbs = join(workspaceRoot, parent);
    if (!existsSync(parentAbs)) continue;
    const entries = await readdir(parentAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgJsonPath = join(parentAbs, entry.name, 'package.json');
      if (!existsSync(pkgJsonPath)) continue;
      try {
        const raw = JSON.parse(await readFile(pkgJsonPath, 'utf8')) as {
          name?: unknown;
          scripts?: unknown;
        };
        if (typeof raw.name !== 'string' || raw.name.trim() === '') continue;
        const name = raw.name.trim();
        facts.packageNames.add(name);
        facts.packageDirs.add(entry.name);
        facts.packageNameByDir.set(entry.name, name);
        const scripts: Record<string, string> = {};
        if (raw.scripts && typeof raw.scripts === 'object') {
          for (const [k, v] of Object.entries(
            raw.scripts as Record<string, unknown>
          )) {
            if (typeof v === 'string') scripts[k] = v;
          }
        }
        facts.scriptsByPackage.set(name, scripts);
      } catch {
        // ignore malformed package.json — not our job to lint here
      }
    }
  }

  return facts;
}

function resolveWorkspaceRoot(cwd: string): string {
  let current = resolve(cwd);
  while (true) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}

export function runDryCheck(dag: DAG, facts: WorkspaceFacts): DryCheckReport {
  const findings: CommandFinding[] = [];
  for (const task of dag.tasks) {
    if (!task.subtask_prompt) continue;
    for (const extracted of extractCommands(task.subtask_prompt)) {
      findings.push(validateCommand(task, extracted, facts));
    }
  }

  let ok = 0;
  let warn = 0;
  let dirty = 0;
  let info = 0;
  for (const f of findings) {
    if (f.verdict === 'OK') ok++;
    else if (f.verdict === 'WARN') warn++;
    else if (f.verdict === 'DIRTY') dirty++;
    else info++;
  }

  return {
    title: dag.title,
    totalTasks: dag.tasks.length,
    totalCommands: findings.length,
    ok,
    warn,
    dirty,
    info,
    findings,
    isDirty: dirty > 0,
  };
}

interface ExtractedCommand {
  command: string;
  verb: string;
  /** Up to 80 chars before the opening backtick, lowercased — used to detect negation. */
  precedingContext: string;
}

function extractCommands(prompt: string): ExtractedCommand[] {
  const out: ExtractedCommand[] = [];
  BACKTICK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BACKTICK_RE.exec(prompt))) {
    const inner = m[1].trim();
    if (inner === '') continue;
    const verb = inner.split(/\s+/, 1)[0];
    if (!SHELL_VERBS.has(verb)) continue;
    const ctxStart = Math.max(0, m.index - 80);
    const precedingContext = prompt.slice(ctxStart, m.index).toLowerCase();
    out.push({ command: inner, verb, precedingContext });
  }
  return out;
}

function isNeutralized(precedingContext: string): boolean {
  return NEUTRALIZING_CUES.some((cue) => precedingContext.includes(cue));
}

function validateCommand(
  task: RawTask,
  extracted: ExtractedCommand,
  facts: WorkspaceFacts
): CommandFinding {
  const negated = isNeutralized(extracted.precedingContext);
  const base: Omit<CommandFinding, 'verdict' | 'reason'> = {
    taskId: task.id,
    command: extracted.command,
    verb: extracted.verb,
    negated,
  };

  let raw: CommandFinding;
  if (extracted.verb === 'pnpm') {
    raw = validatePnpmCommand(task, extracted.command, facts, base);
  } else if (extracted.verb === 'flatbread') {
    raw = {
      ...base,
      verdict: 'WARN',
      reason:
        'Bare `flatbread …` invocation — unless run with `pnpm --filter <pkg> exec` from a dir containing `flatbread.config.js`, `loadConfig` will not find a config.',
    };
  } else {
    raw = {
      ...base,
      verdict: 'OK',
      reason:
        'No workspace-specific check; verb not in pnpm/flatbread risk family.',
    };
  }

  // Downgrade DIRTY / WARN to INFO when surrounding prompt text already
  // contains a negation / citation / backgrounding cue that handles the risk.
  // Genuinely OK findings are passed through unchanged so they stay visible.
  if (negated && (raw.verdict === 'DIRTY' || raw.verdict === 'WARN')) {
    return {
      ...raw,
      verdict: 'INFO',
      reason: `${raw.reason} — neutralized by surrounding prompt context (negation, citation, or background-spawn cue).`,
    };
  }
  return raw;
}

function validatePnpmCommand(
  task: RawTask,
  command: string,
  facts: WorkspaceFacts,
  base: Omit<CommandFinding, 'verdict' | 'reason'>
): CommandFinding {
  const tokens = command.split(/\s+/);
  // tokens[0] === 'pnpm'
  let i = 1;

  // Short-circuit: `pnpm --silent`, `pnpm install …` etc. — strip leading flags
  // before the first sub-command but preserve `--filter <name>` and `--dir <path>`.
  let filterPkg: string | null = null;
  let filterDir: string | null = null;
  let dirArg: string | null = null;
  while (i < tokens.length && tokens[i].startsWith('--')) {
    const flag = tokens[i];
    if (flag === '--filter' || flag === '-F') {
      const arg = tokens[i + 1];
      if (arg) {
        if (facts.packageDirs.has(arg)) {
          filterDir = arg;
          filterPkg = facts.packageNameByDir.get(arg) ?? null;
        } else {
          filterPkg = arg;
        }
        i += 2;
        continue;
      }
    }
    if (flag === '--dir' || flag === '-C') {
      dirArg = tokens[i + 1] ?? null;
      i += 2;
      continue;
    }
    if (flag === '--silent' || flag === '--prefer-offline') {
      i += 1;
      continue;
    }
    // Unknown leading flag — treat the rest as opaque, still capture sub-cmd.
    i += 1;
  }

  const sub = tokens[i];
  const subArgs = tokens.slice(i + 1);

  // Validate filter target if provided.
  if (filterPkg !== null) {
    if (
      !facts.packageNames.has(filterPkg) &&
      !facts.packageDirs.has(filterDir ?? filterPkg)
    ) {
      return {
        ...base,
        verdict: 'DIRTY',
        reason: `pnpm --filter target "${filterPkg}" is not a workspace package or dir under packages/ or examples/.`,
      };
    }
  }

  if (sub === 'exec' && subArgs[0] === 'flatbread') {
    const flatbreadSub = subArgs[1] ?? '';
    if (filterPkg === null && dirArg === null) {
      return {
        ...base,
        verdict: 'DIRTY',
        reason:
          `\`pnpm exec flatbread ${flatbreadSub}\` runs from the workspace root, where no flatbread.config.js exists; ` +
          "flatbread's loadConfig does not search up. Use `pnpm --filter <pkg> exec flatbread …` from an example dir instead.",
      };
    }
    return {
      ...base,
      verdict: 'OK',
      reason: `pnpm --filter ${
        filterPkg ?? dirArg
      } exec flatbread ${flatbreadSub}: filter targets a workspace package containing a flatbread.config.js.`,
    };
  }

  // `pnpm codegen` / `pnpm dev` / `pnpm <script>` invocations.
  if (sub && !sub.startsWith('-')) {
    const hangScripts = scriptsThatHang(facts, filterPkg);
    if (hangScripts.has(sub)) {
      const target = filterPkg ?? '<root>';
      return {
        ...base,
        verdict: 'DIRTY',
        reason:
          `\`pnpm ${
            filterPkg ? `--filter ${filterPkg} ` : ''
          }${sub}\` resolves to a long-running script ` +
          `(\`${hangScripts.get(
            sub
          )}\`) defined on package "${target}". This would hang the DAG node.`,
      };
    }

    if (filterPkg !== null) {
      const scripts = facts.scriptsByPackage.get(filterPkg);
      // `exec`, `dlx`, `add`, `install` etc. are pnpm built-ins — skip script validation for those.
      const builtins = new Set([
        'exec',
        'dlx',
        'add',
        'install',
        'remove',
        'run',
        'test',
        'build',
        'lint',
        'why',
        'list',
        'recursive',
      ]);
      if (
        scripts &&
        !builtins.has(sub) &&
        !(sub in scripts) &&
        !sub.includes(':') /* allow pnpm <namespaced:script> heuristically */
      ) {
        return {
          ...base,
          verdict: 'WARN',
          reason: `\`pnpm --filter ${filterPkg} ${sub}\`: package "${filterPkg}" defines no \`${sub}\` script (and no built-in pnpm subcommand by that name). May fall back to a recursive script lookup.`,
        };
      }
    }
  }

  return {
    ...base,
    verdict: 'OK',
    reason: filterPkg
      ? `Resolves against workspace package "${filterPkg}".`
      : 'pnpm command without --filter; no workspace-specific risk detected.',
  };
}

/**
 * Returns a map of script-name → its body for scripts whose body matches a
 * known "this never returns" pattern. Limited to `--watch` and `nodemon`
 * because those are the canonical hang-the-DAG anti-patterns the prompts
 * warn about; legitimate background servers (`next dev`, `flatbread start`)
 * are intended to be spawned with explicit teardown and should not be
 * flagged here unless their preceding prompt context lacks a "background"
 * cue (which `isNeutralized` already handles upstream).
 */
function scriptsThatHang(
  facts: WorkspaceFacts,
  filterPkg: string | null
): Map<string, string> {
  const out = new Map<string, string>();
  const scopes = filterPkg
    ? [facts.scriptsByPackage.get(filterPkg) ?? {}]
    : Array.from(facts.scriptsByPackage.values());
  for (const scripts of scopes) {
    for (const [name, body] of Object.entries(scripts)) {
      if (/\s--watch\b/.test(body) || /\bnodemon\b/.test(body)) {
        out.set(name, body);
      }
    }
  }
  return out;
}

export function formatDryCheckReport(report: DryCheckReport): string {
  const lines: string[] = [];
  lines.push(`[dry-check-cmds] DAG: ${report.title}`);
  lines.push(
    `[dry-check-cmds] tasks=${report.totalTasks} commands=${report.totalCommands} ok=${report.ok} warn=${report.warn} dirty=${report.dirty} info=${report.info}`
  );
  lines.push('');

  const byTask = new Map<string, CommandFinding[]>();
  for (const f of report.findings) {
    const arr = byTask.get(f.taskId) ?? [];
    arr.push(f);
    byTask.set(f.taskId, arr);
  }

  if (byTask.size === 0) {
    lines.push('  (no shell commands extracted from any subtask_prompt)');
  } else {
    for (const [taskId, items] of byTask) {
      lines.push(`  ${taskId}`);
      for (const f of items) {
        lines.push(`    [${f.verdict}] \`${f.command}\``);
        lines.push(`      → ${f.reason}`);
      }
      lines.push('');
    }
  }

  lines.push(
    `[dry-check-cmds] verdict: ${
      report.isDirty ? 'DIRTY (exit 1)' : 'CLEAN (exit 0)'
    }`
  );
  return lines.join('\n');
}
