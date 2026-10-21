// What run.mjs, grade.mjs, judge.mjs and compare.mjs share: where a session
// keeps its files, how tasks load, git, and the transcript scans that flag
// leaks and count Proof use.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = resolve(BENCH, '..', '..');
export const FLATBREAD_BIN = join(
  ROOT,
  'packages',
  'flatbread',
  'bin',
  'flatbread.js'
);

/** Files a session's clone gains from the runner, kept out of git status. */
export const SESSION_FILES = [
  '/flatbread',
  '/node_modules',
  '/CLAUDE.md',
  '/.claude/',
  '/.flatbread/',
];

/**
 * Paths left out of `session.diff`: Proof's own files, the runner's files,
 * and PLAN.md, which is captured on its own.
 */
export const DIFF_EXCLUDE = [
  '.flatbread-proof',
  '.flatbread',
  '.claude',
  'AGENTS.md',
  'CLAUDE.md',
  'flatbread.config.js',
  'flatbread',
  'node_modules',
  'PLAN.md',
];

/** Files in a task folder that never reach a session or a grading tree. */
const TASK_PRIVATE = /^(task\.json|rubric\.json|.*\.patch|plans)$/;

/** A test file, as the bed's own suite names them. */
export const TEST_FILE = /\.test\.(ts|mts|mjs|js)$/;

export function git(cwd, ...argv) {
  return execFileSync('git', argv, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_AUTHOR_NAME: 'bench',
      GIT_AUTHOR_EMAIL: 'bench@example.invalid',
      GIT_COMMITTER_NAME: 'bench',
      GIT_COMMITTER_EMAIL: 'bench@example.invalid',
    },
  });
}

export const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/** tune or holdout, by the first byte of sha256(id), as in proof-recall. */
export function splitOf(id) {
  return createHash('sha256').update(id).digest()[0] % 2 === 0
    ? 'tune'
    : 'holdout';
}

export const isUnder = (path, dir) =>
  path === dir || path.startsWith(dir.endsWith(sep) ? dir : dir + sep);

/** Every task under `dir`: one folder per task holding task.json. */
export function loadTasks(dir) {
  const tasks = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const file = join(dir, entry.name, 'task.json');
    if (!existsSync(file)) continue;
    const task = JSON.parse(readFileSync(file, 'utf8'));
    if (task.id !== entry.name)
      throw new Error(`${file}: id ${task.id} differs from its folder`);
    if (!['build', 'plan'].includes(task.kind))
      throw new Error(`${file}: kind must be build or plan`);
    if (!task.prompt?.trim()) throw new Error(`${file}: no prompt`);
    tasks.push({ ...task, dir: join(dir, entry.name) });
  }
  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Tasks picked by `--only` (kinds or categories) and `--ids`. Both empty
 * means every task.
 */
export function pickTasks(tasks, { only = [], ids = [] }) {
  const known = new Set(tasks.map((t) => t.id));
  for (const id of ids) if (!known.has(id)) throw new Error(`No task ${id}`);
  return tasks.filter(
    (t) =>
      (!ids.length || ids.includes(t.id)) &&
      (!only.length || only.includes(t.kind) || only.includes(t.category))
  );
}

/** Hidden files a task copies into `test/_hidden/` at grading time. */
export function hiddenFiles(taskDir) {
  return readdirSync(taskDir).filter((name) => !TASK_PRIVATE.test(name));
}

/** Where one session keeps its files, outside its clone. */
export function sessionDir(work, name, arm, id) {
  return join(work, name, arm, id);
}

/** The clone's path, which names neither the arm nor the task. */
export function cloneDir(work, name, arm, id) {
  return join(
    work,
    name,
    'clones',
    sha256(`${name}\0${arm}\0${id}`).slice(0, 12)
  );
}

export async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Every session folder under `<work>/<name>`: [{arm, id, dir}]. */
export function listSessions(work, name) {
  const base = join(work, name);
  const out = [];
  if (!existsSync(base)) return out;
  for (const arm of readdirSync(base, { withFileTypes: true })) {
    if (!arm.isDirectory() || arm.name === 'clones') continue;
    for (const id of readdirSync(join(base, arm.name), {
      withFileTypes: true,
    }))
      if (id.isDirectory())
        out.push({
          arm: arm.name,
          id: id.name,
          dir: join(base, arm.name, id.name),
        });
  }
  return out;
}

/**
 * Runs a command with a hard timeout, killing its whole process group.
 * Resolves with { code, timedOut, stdout, stderr, ms }.
 */
export function runCommand(cmd, argv, { cwd, env, timeout, input } = {}) {
  return new Promise((done) => {
    const start = Date.now();
    const child = spawn(cmd, argv, {
      cwd,
      env,
      detached: true,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    if (input !== undefined) child.stdin.end(input);
    const kill = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {
        // Already gone.
      }
    };
    const timer =
      timeout &&
      setTimeout(() => {
        timedOut = true;
        kill('SIGTERM');
        setTimeout(() => kill('SIGKILL'), 5000).unref();
      }, timeout);
    child.on('close', (code) => {
      clearTimeout(timer);
      done({ code, timedOut, stdout, stderr, ms: Date.now() - start });
    });
  });
}

/**
 * Tool calls in a stream-json transcript: [{name, input, result}], where
 * `result` is the text of the matching tool_result, when there is one.
 */
export async function toolCalls(transcriptPath) {
  let text = '';
  try {
    text = await readFile(transcriptPath, 'utf8');
  } catch {
    return [];
  }
  const calls = [];
  const byId = new Map();
  for (const line of text.split('\n')) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    for (const part of entry.message?.content ?? []) {
      if (
        entry.type === 'assistant' &&
        part.type === 'tool_use' &&
        !byId.has(part.id)
      ) {
        const call = { name: part.name, input: part.input ?? {} };
        byId.set(part.id, call);
        calls.push(call);
      }
      if (entry.type === 'user' && part.type === 'tool_result') {
        const call = byId.get(part.tool_use_id);
        if (!call) continue;
        const content = Array.isArray(part.content)
          ? part.content
              .map((c) => (typeof c === 'string' ? c : c.text ?? ''))
              .join('\n')
          : String(part.content ?? '');
        call.result = (call.result ?? '') + content;
      }
    }
  }
  return calls;
}

/** The `init` and `result` events of a transcript. */
export async function transcriptEnds(transcriptPath) {
  const out = { init: null, result: null };
  let text = '';
  try {
    text = await readFile(transcriptPath, 'utf8');
  } catch {
    return out;
  }
  for (const line of text.split('\n')) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type === 'system' && entry.subtype === 'init') out.init = entry;
    if (entry.type === 'result') out.result = entry;
  }
  return out;
}

const READ_COMMANDS = new Set([
  'list',
  'find',
  'get',
  'records',
  'brief',
  'relations',
  'blocking-decisions',
  'state',
  'help',
]);

// Absolute paths in shell text: a slash after a start, space, quote, `=`,
// `(` or `:`, then at least one path character, so a lone `/` (division)
// and `//` or `/*` (comments) are not paths.
const ABS_PATH = /(?:^|[\s'"=(:<>])(\/[\w.@+%~,-]+(?:\/[\w.@+%~,*-]*)*)/g;
// Relative paths that start with `..`.
const DOTDOT =
  /(?:^|[\s'"=(:<>])(\.\.(?:\/[\w.@+%~,*-]*)*)(?=$|[\s'"):;|&<>])/g;
// Commands whose bare `/` argument means the filesystem root.
const FS_COMMANDS =
  /^\s*(?:sudo\s+)?(ls|find|du|tree|grep|rg|ag|cat|stat|locate|fd|head|tail|less|file|cp|mv|rm|tar)\b/;
// The script text of `node -e`, `python -c`, `sh -c` and the like.
const INLINE_SCRIPT =
  /(\s(?:-e|-c|--eval|--print)\s+)('(?:[^']*)'|"(?:\\.|[^"\\])*")/g;

/**
 * Splits a Bash command into shell text and body text. Body text is what a
 * program reads rather than what the shell resolves: heredoc bodies and
 * inline scripts (`node -e "…"`). Only shell text is checked for `..` and
 * relative paths; body text is still checked for absolute paths under the
 * protected roots, since a heredoc can feed a shell.
 */
export function splitShell(command) {
  const shell = [];
  const body = [];
  const lines = command.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    line = line.replace(INLINE_SCRIPT, (_, flag, script) => {
      body.push(script);
      return `${flag}''`;
    });
    shell.push(line);
    const heredoc = line.match(/<<-?\s*(['"]?)([\w.-]+)\1/);
    if (!heredoc) continue;
    const end = heredoc[2];
    const strip = line.includes('<<-');
    for (i++; i < lines.length; i++) {
      const text = strip ? lines[i].replace(/^\t+/, '') : lines[i];
      if (text === end) break;
      body.push(lines[i]);
    }
  }
  return { shell: shell.join('\n'), body: body.join('\n') };
}

const PROOF_CLI = /flatbread\s+proof\b/;

/**
 * Scans a session's tool calls for leaks and Proof use.
 *
 * - `left_folder`: a file tool's path, a Glob or Grep path or absolute
 *   pattern, or a path in a Bash command lies outside `clone`. In Bash, a
 *   relative path starts at the shell's folder, which follows `cd` inside
 *   the clone; a `cd` out of it counts as leaving. Absolute paths outside the
 *   clone count only when they are the clone's ancestors or fall under a
 *   `protected` root (the work, task, grade, hidden and bed folders, the
 *   p4 folder and this repository), so `/dev/null` or `/usr/bin/env` do
 *   not. Heredoc bodies and inline scripts are checked only for absolute
 *   paths under a protected root, so code such as `import '../src/x.ts'`,
 *   `100 / 3` or a `// comment` written through the shell is not a leak.
 * - `hidden_read`: a tool input names a hidden root (the task, hidden and
 *   grading folders, the gate log), `test/_hidden`, or a task's reference or
 *   naive patch or rubric.
 * - `proof_reads` / `proof_writes`: `flatbread proof <command>` calls,
 *   split by whether the command only reads; direct edits under
 *   `.flatbread-proof/` count as writes.
 * - `proof_files_read`: Read calls on files under `.flatbread-proof/`.
 * - `proof_search_exposure`: searches and other calls that are not Proof
 *   commands but whose result showed text from `.flatbread-proof/` (a
 *   repository-wide Grep, `grep -r`, `find`, `ls -R`).
 * - `proof_touch`: any mention of `.flatbread-proof` or `flatbread proof`,
 *   which a `none` session should never make.
 * - `opened_cited`: Read calls on a path a code Citation names.
 */
export function scanCalls(
  calls,
  { clone, protectedRoots = [], hiddenRoots = [], citedPaths = [] }
) {
  const out = {
    left_folder: false,
    left_folder_evidence: [],
    hidden_read: false,
    hidden_read_evidence: [],
    proof_reads: 0,
    proof_writes: 0,
    proof_files_read: 0,
    proof_search_exposure: 0,
    proof_touch: false,
    skill_calls: 0,
    opened_cited: 0,
  };
  const cited = new Set(citedPaths);
  const isProtected = (abs) =>
    isUnder(clone, abs) || protectedRoots.some((root) => isUnder(abs, root));
  // `cwd` is where a relative path starts: the clone for file tools, and
  // the shell's folder for Bash, which follows `cd` within and across calls
  // (as Claude Code's Bash keeps its folder while it stays in the project).
  const outside = (path, fromShell, cwd = clone) => {
    const abs = resolve(cwd, path);
    if (isUnder(abs, clone)) return false;
    if (!fromShell || !path.startsWith('/')) return true;
    return isProtected(abs);
  };
  let shellCwd = clone;
  const flag = (path, call) => {
    out.left_folder = true;
    if (out.left_folder_evidence.length < 5)
      out.left_folder_evidence.push(`${call.name}: ${path}`);
  };
  for (const call of calls) {
    const input = call.input ?? {};
    const text = JSON.stringify(input);
    if (call.name === 'Skill') out.skill_calls++;
    if (
      hiddenRoots.some((root) => text.includes(root)) ||
      /test\/_hidden|(reference|naive)[\w-]*\.patch|rubric\.json|gate\.(log|json)/.test(
        text
      )
    ) {
      out.hidden_read = true;
      if (out.hidden_read_evidence.length < 5)
        out.hidden_read_evidence.push(`${call.name}: ${text.slice(0, 160)}`);
    }
    if (/\.flatbread-proof|flatbread\s+proof/.test(text))
      out.proof_touch = true;
    const isProofCommand =
      call.name === 'Bash' && PROOF_CLI.test(input.command ?? '');
    const readsProofFile =
      ['Read', 'Write', 'Edit', 'NotebookEdit'].includes(call.name) &&
      /\.flatbread-proof\//.test(input.file_path ?? '');
    if (
      !isProofCommand &&
      !readsProofFile &&
      typeof call.result === 'string' &&
      /\.flatbread-proof\//.test(call.result)
    )
      out.proof_search_exposure++;
    const paths = [input.file_path, input.path, input.notebook_path].filter(
      (p) => typeof p === 'string' && p
    );
    if (
      ['Glob', 'Grep'].includes(call.name) &&
      typeof input.pattern === 'string' &&
      input.pattern.startsWith('/')
    )
      paths.push(input.pattern);
    for (const path of paths) if (outside(path, false)) flag(path, call);
    if (call.name === 'Read' && typeof input.file_path === 'string') {
      const rel = resolve(clone, input.file_path).slice(clone.length + 1);
      if (cited.has(rel)) out.opened_cited++;
      if (readsProofFile) out.proof_files_read++;
    }
    if (
      ['Write', 'Edit', 'NotebookEdit'].includes(call.name) &&
      /\.flatbread-proof\//.test(input.file_path ?? '')
    )
      out.proof_writes++;
    if (call.name === 'Bash' && typeof input.command === 'string') {
      const command = input.command;
      const { shell, body } = splitShell(command);
      let cwd = shellCwd;
      for (const segment of shell.split(/&&|\|\||;|\||\n/)) {
        const cd = segment.match(/^\s*cd(?:\s+(\S+))?\s*$/);
        if (cd) {
          const arg = (cd[1] ?? '~').replace(/^['"]|['"]$/g, '');
          if (arg === '-') continue;
          const target = /^[~$]/.test(arg) ? '/' : resolve(cwd, arg);
          if (isUnder(target, clone)) cwd = target;
          else {
            flag(`cd ${arg}`, call);
            cwd = clone;
          }
          continue;
        }
        if (FS_COMMANDS.test(segment) && /\s\/(?=\s|$)/.test(segment))
          flag('/', call);
        for (const m of segment.matchAll(ABS_PATH))
          if (outside(m[1], true, cwd)) flag(m[1], call);
        for (const m of segment.matchAll(DOTDOT))
          if (outside(m[1], true, cwd)) flag(m[1], call);
      }
      for (const m of body.matchAll(ABS_PATH)) {
        const abs = resolve(m[1]);
        if (!isUnder(abs, clone) && protectedRoots.some((r) => isUnder(abs, r)))
          flag(m[1], call);
      }
      shellCwd = cwd;
      for (const m of command.matchAll(/flatbread\s+proof\s+([a-z][\w-]*)/g))
        if (READ_COMMANDS.has(m[1])) out.proof_reads++;
        else out.proof_writes++;
    }
  }
  return out;
}

/** Code paths that the graph's code Citations name (`path#symbol@sha`). */
export function citedPaths(proofRoot) {
  const dir = join(proofRoot, 'citations');
  if (!existsSync(dir)) return [];
  const paths = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(join(dir, file), 'utf8');
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
    for (const m of body.matchAll(/^([\w./-]+\.\w+)#[\w$.]+(?:@\w+)?/gm))
      paths.add(m[1]);
  }
  return [...paths];
}

/** Environment variables that tie a process to the session that started it. */
export const SESSION_VARS = [
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_REMOTE_SESSION_ID',
  'CLAUDE_CODE_REMOTE_SDK_URL',
  'CLAUDE_CODE_MESSAGING_SOCKET',
  'CLAUDE_CODE_MESSAGING_TOKEN',
  'CLAUDE_SESSION_INGRESS_TOKEN_FILE',
  'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_CODE_SESSION_ATTENDED',
  'CLAUDE_CODE_SYNC_SESSION_REFS',
  'CLAUDE_CODE_TEE_SDK_STDOUT',
  'CLAUDE_PID',
  'CLAUDECODE',
  'CLAUDE_CODE_ENTRYPOINT',
  'FLATBREAD_PROOF_SERVER',
];

export function cleanEnv() {
  const env = { ...process.env };
  for (const key of SESSION_VARS) delete env[key];
  return env;
}

/** Parses `--flag value` and bare arguments against a spec of defaults. */
export function parseArgs(argv, spec, { lists = [], flags = [] } = {}) {
  const out = { ...spec, _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }
    const key = arg.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase());
    if (flags.includes(key)) {
      out[key] = true;
      continue;
    }
    if (!(key in spec)) throw new Error(`Unknown argument ${arg}`);
    const value = argv[++i];
    if (value === undefined) throw new Error(`${arg} needs a value`);
    out[key] = lists.includes(key)
      ? value.split(',').filter(Boolean)
      : typeof spec[key] === 'number'
      ? Number(value)
      : value;
  }
  return out;
}

let netnsWorks = null;
/**
 * `[cmd, argv]` that runs `cmd argv` with no network when this machine
 * allows it (`unshare -n`, which needs root or user namespaces), and as
 * it is otherwise. `isolated` says which.
 */
export function withoutNetwork(cmd, argv) {
  if (netnsWorks === null) {
    try {
      execFileSync('unshare', ['-n', 'true'], { stdio: 'ignore' });
      netnsWorks = true;
    } catch {
      try {
        execFileSync('unshare', ['-rn', 'true'], { stdio: 'ignore' });
        netnsWorks = '-rn';
      } catch {
        netnsWorks = false;
      }
    }
  }
  if (!netnsWorks) return { cmd, argv, isolated: false };
  return {
    cmd: 'unshare',
    argv: [netnsWorks === '-rn' ? '-rn' : '-n', '--', cmd, ...argv],
    isolated: true,
  };
}

/** The environment for grading runs: no session variables, no proxy. */
export function gradeEnv() {
  const env = cleanEnv();
  for (const key of Object.keys(env))
    if (/^(https?|all|no)_proxy$/i.test(key)) delete env[key];
  return env;
}
