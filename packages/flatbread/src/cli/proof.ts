import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig } from '@flatbread/config';
import {
  pruneReadCache,
  createProofWriter,
  ProofMutationSchema,
  ProofValidationError,
  ProofReadValidationError,
  parseGenerationToken,
  findProofContentRoot,
  type EffortStatus,
  type ReadEnvelope,
} from '@flatbread/proof';
import {
  blockingDecisions,
  effortBrief,
  effortFind,
  effortRecords,
  effortState,
  type FindEnvelope,
  type StateEnvelope,
  relations,
  getRecord,
  listEfforts,
  type RetractedMode,
} from '../proof/read.js';
import type { PrimitiveKind, ReadRelation } from '@flatbread/proof';
import { handleEffortInstallSkill } from './installSkill.js';

export interface EffortCliOptions {
  cwd?: string;
  strictMinGeneration?: string;
  timeoutMs?: number;
  resolve?: 'exact' | 'head';
  kinds?: string[];
  state?: string[];
  status?: string[];
  kind?: string[];
  since?: string;
  until?: string;
  limit?: number;
  cursor?: string;
  relations?: string[];
  retracted?: RetractedMode;
  effort?: string;
  all?: boolean;
  asOf?: string;
  verify?: boolean;
  dryRun?: boolean;
}

export function mapEffortCliOptions(
  options: Record<string, unknown>
): EffortCliOptions {
  return Object.fromEntries(
    Object.entries({
      strictMinGeneration:
        typeof options['strict-min-generation'] === 'string'
          ? options['strict-min-generation']
          : typeof options['strict-min-generation'] === 'number'
          ? String(options['strict-min-generation'])
          : undefined,
      timeoutMs:
        typeof options['timeout-ms'] === 'string'
          ? Number(options['timeout-ms'])
          : typeof options['timeout-ms'] === 'number'
          ? options['timeout-ms']
          : undefined,
      resolve: options.resolve === 'head' ? 'head' : undefined,
      kinds: split(options.kinds),
      state: split(options.state),
      status: split(options.status),
      kind: split(options.kind),
      since: typeof options.since === 'string' ? options.since : undefined,
      until: typeof options.until === 'string' ? options.until : undefined,
      limit: numberOption(options.limit),
      cursor: typeof options.cursor === 'string' ? options.cursor : undefined,
      relations: split(options.relations),
      retracted:
        typeof options.retracted === 'string'
          ? (options.retracted as RetractedMode)
          : undefined,
      effort: typeof options.effort === 'string' ? options.effort : undefined,
      all: options.all === true || options.all === 'true' ? true : undefined,
      // The option parser turns `--as-of 2026` into a number; keep it as
      // text so the date check refuses it, as the read server does.
      asOf:
        typeof options['as-of'] === 'string' ||
        typeof options['as-of'] === 'number'
          ? String(options['as-of'])
          : undefined,
      verify: options.verify === true ? true : undefined,
      dryRun:
        options['dry-run'] === true || options.dryRun === true
          ? true
          : undefined,
    }).filter(([, value]) => value !== undefined)
  ) as EffortCliOptions;
}
function split(value: unknown): string[] | undefined {
  return typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : undefined;
}
function numberOption(value: unknown): number | undefined {
  const result =
    typeof value === 'string'
      ? Number(value)
      : typeof value === 'number'
      ? value
      : undefined;
  return result;
}

async function rootFor(cwd: string): Promise<string> {
  const loaded = await loadConfig({ cwd });
  const root = findProofContentRoot(loaded.config?.content ?? []);
  if (!root)
    throw new Error(
      'No complete proof preset found in flatbread.config; add proofContent() to content.'
    );
  return resolve(cwd, root);
}

function consistency(options: EffortCliOptions) {
  if (options.strictMinGeneration !== undefined)
    parseGenerationToken(options.strictMinGeneration);
  return options.strictMinGeneration !== undefined
    ? {
        mode: 'strict' as const,
        min_generation: options.strictMinGeneration,
        timeout_ms: options.timeoutMs,
      }
    : { mode: 'eventual' as const };
}

export async function handleEffortWrite(
  json: string,
  options: EffortCliOptions = {}
): Promise<{
  generation: string;
  artifacts: { id: string; path: string; operation: string }[];
  touched: { id: string; path: string }[];
  dryRun?: boolean;
  changedDecisionIds?: string[];
  rejectedIds?: string[];
}> {
  const raw: unknown = JSON.parse(json);
  if (
    raw !== null &&
    typeof raw === 'object' &&
    (raw as Record<string, unknown>).type === 'CreateEffort' &&
    'cites' in raw
  )
    throw new ProofValidationError(
      'CreateEffort does not accept cites; create the Effort before its Citations.'
    );
  if (
    options.dryRun &&
    (raw === null ||
      typeof raw !== 'object' ||
      (raw as Record<string, unknown>).type !== 'AcceptDecision')
  )
    throw new ProofValidationError(
      '--dry-run is only valid for AcceptDecision'
    );
  const input = ProofMutationSchema.parse(
    options.dryRun ? { ...(raw as object), dryRun: true } : raw
  );
  const cwd = options.cwd ?? process.cwd();
  const writer = createProofWriter({ rootDir: await rootFor(cwd) });
  const result = await writer.mutate(input);
  return {
    generation: result.generation,
    artifacts: result.artifacts.map(({ id, path, operation }) => ({
      id,
      path,
      operation,
    })),
    touched: result.touched,
    dryRun: result.dryRun,
    changedDecisionIds: result.changedDecisionIds,
    rejectedIds: result.rejectedIds,
  };
}

export async function handleEffortGet(
  id: string,
  options: EffortCliOptions = {}
): Promise<ReadEnvelope> {
  const cwd = options.cwd ?? process.cwd();
  return getRecord(id, {
    cwd,
    rootDir: await rootFor(cwd),
    cacheRoot: resolve(cwd, '.flatbread/proof'),
    consistency: consistency(options),
    resolve: options.resolve,
  });
}

export async function handleEffortRecords(
  effortId: string,
  options: EffortCliOptions = {}
): Promise<ReadEnvelope> {
  validateLimit(options.limit);
  const cwd = options.cwd ?? process.cwd();
  return effortRecords(effortId, {
    cwd,
    rootDir: await rootFor(cwd),
    cacheRoot: resolve(cwd, '.flatbread/proof'),
    consistency: consistency(options),
    kinds: options.kinds as PrimitiveKind[] | undefined,
    where: {
      ...(options.state ? { state: options.state } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
      ...(options.since || options.until
        ? { created_at: { gte: options.since, lte: options.until } }
        : {}),
    },
    retracted: options.retracted,
    page: { limit: options.limit, cursor: options.cursor },
  });
}

export async function handleEffortRelations(
  effortId: string,
  fromId: string,
  options: EffortCliOptions = {}
): Promise<ReadEnvelope> {
  validateLimit(options.limit);
  const cwd = options.cwd ?? process.cwd();
  return relations(
    effortId,
    fromId,
    (options.relations ?? []) as ReadRelation[],
    {
      cwd,
      rootDir: await rootFor(cwd),
      cacheRoot: resolve(cwd, '.flatbread/proof'),
      consistency: consistency(options),
      page: { limit: options.limit, cursor: options.cursor },
    }
  );
}

export async function handleEffortBlockingDecisions(
  effortId: string,
  options: EffortCliOptions = {}
): Promise<ReadEnvelope> {
  const cwd = options.cwd ?? process.cwd();
  return blockingDecisions(effortId, {
    cwd,
    rootDir: await rootFor(cwd),
    cacheRoot: resolve(cwd, '.flatbread/proof'),
    consistency: consistency(options),
  });
}

export async function handleEffortBrief(
  effortId: string,
  options: EffortCliOptions = {}
): Promise<ReadEnvelope> {
  const cwd = options.cwd ?? process.cwd();
  return effortBrief(effortId, {
    cwd,
    rootDir: await rootFor(cwd),
    cacheRoot: resolve(cwd, '.flatbread/proof'),
    consistency: consistency(options),
  });
}

/**
 * `proof find`: searches one Effort with `effort`, or every Effort when
 * `effort` is left out or `all` is set.
 */
export async function handleEffortFind(
  query: string,
  options: EffortCliOptions = {}
): Promise<FindEnvelope> {
  if (options.effort && options.all)
    throw new ProofReadValidationError(
      'PROOF_INVALID_ARGUMENT',
      'Pass --effort <effortId> or --all, not both'
    );
  const cwd = options.cwd ?? process.cwd();
  return effortFind(String(query ?? ''), {
    cwd,
    rootDir: await rootFor(cwd),
    cacheRoot: resolve(cwd, '.flatbread/proof'),
    consistency: consistency(options),
    effort: options.effort,
    kinds: options.kinds as PrimitiveKind[] | undefined,
    asOf: options.asOf,
    retracted: options.retracted,
    limit: options.limit,
  });
}

/** `proof state`: where one Effort stands, from frontmatter and links. */
export async function handleEffortState(
  effortId: string,
  options: EffortCliOptions = {}
): Promise<StateEnvelope> {
  const cwd = options.cwd ?? process.cwd();
  return effortState(effortId, {
    cwd,
    rootDir: await rootFor(cwd),
    cacheRoot: resolve(cwd, '.flatbread/proof'),
    consistency: consistency(options),
    asOf: options.asOf,
  });
}

export interface EffortBootstrapReport {
  readonly status: 'ready' | 'action_required';
  readonly config_path: string | null;
  readonly graph_root: string;
  readonly requirements: readonly {
    code: string;
    message: string;
    recipe: string;
  }[];
}

const CONFIG_PATTERN = /^flatbread\.config\.[mc]?[jt]s$/;
const DEFAULT_GRAPH_ROOT = '.flatbread-proof';

function requirement(
  code: string,
  message: string,
  recipe: string
): EffortBootstrapReport['requirements'][number] {
  return { code, message, recipe };
}

function ignored(
  lines: readonly string[],
  candidates: readonly string[]
): boolean {
  return lines.some((line) => {
    const value = line.trim().replace(/^\/+/, '');
    return candidates.some(
      (candidate) =>
        value === candidate ||
        value === `**/${candidate}` ||
        value === `/${candidate}`
    );
  });
}

export async function inspectEffortBootstrap(
  cwd = process.cwd()
): Promise<EffortBootstrapReport> {
  const files = (await readdir(cwd)).filter((file) =>
    CONFIG_PATTERN.test(file)
  );
  if (files.length > 1)
    throw new Error(
      JSON.stringify({
        error: {
          code: 'EFFORT_BOOTSTRAP_MULTIPLE_CONFIGS',
          message: `Expected exactly one valid flatbread.config.*; found ${files.join(
            ', '
          )}.`,
        },
      })
    );
  if (files.length === 0) {
    return {
      status: 'action_required',
      config_path: null,
      graph_root: DEFAULT_GRAPH_ROOT,
      requirements: [
        requirement(
          'EFFORT_BOOTSTRAP_CONFIG_MISSING',
          'No valid flatbread.config.* exists in the working directory.',
          'Create flatbread.config.js (or .mjs/.cjs/.ts/.mts/.cts) and add the Flatbread configuration.'
        ),
      ],
    };
  }
  const configPath = files[0];
  let loaded;
  try {
    loaded = await loadConfig({ cwd });
  } catch (error) {
    throw new Error(
      JSON.stringify({
        error: {
          code: 'EFFORT_BOOTSTRAP_INVALID_CONFIG',
          message: error instanceof Error ? error.message : String(error),
          config_path: configPath,
        },
      })
    );
  }
  const graphRoot =
    findProofContentRoot(loaded.config?.content ?? []) ?? DEFAULT_GRAPH_ROOT;
  const requirements: EffortBootstrapReport['requirements'][number][] = [];
  if (!findProofContentRoot(loaded.config?.content ?? []))
    requirements.push(
      requirement(
        'EFFORT_BOOTSTRAP_PRESET_MISSING',
        'The config does not contain a complete proofContent preset.',
        "Import { proofContent } from 'flatbread' and preserve existing content with content: [...(existingContent ?? []), ...proofContent()]."
      )
    );
  let gitignore = '';
  try {
    gitignore = await readFile(resolve(cwd, '.gitignore'), 'utf8');
  } catch {
    // Missing .gitignore is reported as both missing required entries.
  }
  const lines = gitignore.split(/\r?\n/);
  if (
    !ignored(lines, [
      `${graphRoot}/.journal/`,
      `${graphRoot}/.journal`,
      `**/${graphRoot}/.journal/`,
    ])
  )
    requirements.push(
      requirement(
        'EFFORT_BOOTSTRAP_JOURNAL_IGNORE_MISSING',
        `The write journal for Proof at ${graphRoot} is not ignored.`,
        `Add **/${graphRoot}/.journal/ to .gitignore.`
      )
    );
  if (
    !ignored(lines, [
      '.flatbread/proof/read-cache/',
      '.flatbread/proof/read-cache',
    ])
  )
    requirements.push(
      requirement(
        'EFFORT_BOOTSTRAP_CACHE_IGNORE_MISSING',
        'The derived Proof read cache is not ignored.',
        'Add **/.flatbread/proof/read-cache/ to .gitignore.'
      )
    );
  return {
    status: requirements.length ? 'action_required' : 'ready',
    config_path: configPath,
    graph_root: graphRoot,
    requirements,
  };
}

export async function handleEffortBootstrap(
  options: EffortCliOptions = {}
): Promise<EffortBootstrapReport> {
  const report = await inspectEffortBootstrap(options.cwd ?? process.cwd());
  if (options.verify && report.status === 'action_required') {
    process.exitCode = 1;
  }
  return report;
}

export async function handleEffortList(
  options: EffortCliOptions = {}
): Promise<ReadEnvelope> {
  validateLimit(options.limit);
  const cwd = options.cwd ?? process.cwd();
  const statuses = options.status?.length
    ? options.status
    : (['active'] as string[]);
  return listEfforts(statuses as EffortStatus[], {
    cwd,
    rootDir: await rootFor(cwd),
    cacheRoot: resolve(cwd, '.flatbread/proof'),
    consistency: consistency(options),
    page: { limit: options.limit, cursor: options.cursor },
  });
}

function validateLimit(limit: number | undefined): void {
  if (
    limit === undefined ||
    (Number.isInteger(limit) && limit >= 1 && limit <= 25)
  )
    return;
  throw new ProofReadValidationError(
    'PROOF_INVALID_ARGUMENT',
    'page.limit must be an integer between 1 and 25'
  );
}

/** The JSON a failed Proof command prints on stderr. */
export function errorPayload(error: unknown): unknown {
  if (
    error !== null &&
    typeof error === 'object' &&
    'shape' in error &&
    typeof (error as { shape: unknown }).shape === 'object' &&
    (error as { shape: unknown }).shape !== null
  )
    return (error as { shape: unknown }).shape;
  if (error instanceof Error) {
    try {
      return JSON.parse(error.message);
    } catch {
      return { error: { code: 'PROOF_CLI_ERROR', message: error.message } };
    }
  }
  return { error: { code: 'PROOF_CLI_ERROR', message: String(error) } };
}

export function registerProofCommands(prog: any): void {
  const printResult = async (result: Promise<unknown>): Promise<void> => {
    try {
      console.log(JSON.stringify(await result));
    } catch (error) {
      console.error(JSON.stringify(errorPayload(error)));
      process.exitCode = 1;
    }
  };

  prog
    .command('proof write <json>', 'Write a validated Proof mutation')
    .option('--dry-run', 'Preview an AcceptDecision without writing', false)
    .action(async (json: string, options: Record<string, unknown>) =>
      printResult(handleEffortWrite(json, mapEffortCliOptions(options)))
    );
  prog
    .command('proof get <id>', 'Read one Proof record')
    .option(
      '--strict-min-generation <token>',
      'Require a durable journal generation'
    )
    .option('--timeout-ms <ms>', 'Strict-read wait timeout')
    .option('--resolve <mode>', 'Resolve exact record or supersession head')
    .action(async (id: string, options: Record<string, unknown>) =>
      printResult(handleEffortGet(id, mapEffortCliOptions(options)))
    );
  prog
    .command(
      'proof blocking-decisions <effortId>',
      'Read proposed decisions linked to open blockers'
    )
    .option(
      '--strict-min-generation <token>',
      'Require a durable journal generation'
    )
    .option('--timeout-ms <ms>', 'Strict-read wait timeout')
    .action(async (effortId: string, options: Record<string, unknown>) =>
      printResult(
        handleEffortBlockingDecisions(effortId, mapEffortCliOptions(options))
      )
    );
  prog
    .command(
      'proof brief <effortId>',
      'Read where an Effort stands: its head compaction and what changed since'
    )
    .option(
      '--strict-min-generation <token>',
      'Require a durable journal generation'
    )
    .option('--timeout-ms <ms>', 'Strict-read wait timeout')
    .action(async (effortId: string, options: Record<string, unknown>) =>
      printResult(handleEffortBrief(effortId, mapEffortCliOptions(options)))
    );
  const consistencyOptions = (command: any) =>
    command
      .option(
        '--strict-min-generation <token>',
        'Require a durable journal generation'
      )
      .option('--timeout-ms <ms>', 'Strict-read wait timeout');
  const paginationOptions = (command: any) =>
    command
      .option('--limit <n>', 'Page size')
      .option('--cursor <cursor>', 'Opaque page cursor');
  const recordsOptions = (command: any) =>
    paginationOptions(
      consistencyOptions(command)
        .option('--kinds <values>', 'Comma-separated primitive kinds')
        .option('--state <values>', 'Comma-separated states')
        .option('--status <values>', 'Comma-separated statuses')
        .option('--kind <values>', 'Comma-separated record kinds')
        .option('--since <iso>', 'Created-at lower bound')
        .option('--until <iso>', 'Created-at upper bound')
        .option(
          '--retracted <mode>',
          'exclude (default), include, or only retracted records'
        )
    );
  recordsOptions(
    prog.command('proof records <effortId>', 'Read records in an Effort')
  ).action(async (effortId: string, options: Record<string, unknown>) =>
    printResult(handleEffortRecords(effortId, mapEffortCliOptions(options)))
  );
  consistencyOptions(
    prog.command(
      'proof find <words>',
      'Find records by what they say, ranked; one card per supersession chain'
    )
  )
    .option('--effort <effortId>', 'Search one Effort')
    .option(
      '--all',
      'Search every Effort (the default without --effort)',
      false
    )
    .option('--kinds <values>', 'Comma-separated primitive kinds')
    .option('--as-of <iso>', 'Show the version current at this date')
    .option(
      '--retracted <mode>',
      'exclude (default), include, or only retracted records'
    )
    .option('--limit <n>', 'Hits to show, 1 to 10 (default 5)')
    .action(async (words: unknown, options: Record<string, unknown>) =>
      printResult(
        handleEffortFind(
          // An unquoted query arrives as one word here and the rest in `_`.
          // Join them, as the read server does, so every word is searched.
          [words, ...(Array.isArray(options._) ? options._ : [])].join(' '),
          mapEffortCliOptions(options)
        )
      )
    );
  consistencyOptions(
    prog.command(
      'proof state <effortId>',
      'Read counts, contested topics, blockers, risks, dead evidence, and lifecycles'
    )
  )
    .option('--as-of <iso>', 'Not supported; refused with a pointer to find')
    .action(async (effortId: string, options: Record<string, unknown>) =>
      printResult(handleEffortState(effortId, mapEffortCliOptions(options)))
    );
  paginationOptions(
    consistencyOptions(
      prog.command('proof list', 'List Efforts by lifecycle status')
    )
  )
    .option('--status <values>', 'Comma-separated Effort statuses', 'active')
    .action(async (options: Record<string, unknown>) =>
      printResult(handleEffortList(mapEffortCliOptions(options)))
    );
  prog
    .command('proof bootstrap', 'Inspect Proof activation requirements')
    .option('--verify', 'Exit nonzero when activation is incomplete', false)
    .action(async (options: Record<string, unknown>) =>
      printResult(handleEffortBootstrap(mapEffortCliOptions(options)))
    );
  prog
    .command(
      'proof install-skill',
      'Install the Proof skill and matching flatbread package'
    )
    .option('--dry-run', 'Print planned actions without writing', false)
    .option('--skip-package', 'Install the skill only', false)
    .action(async (options: Record<string, unknown>) =>
      printResult(
        handleEffortInstallSkill({
          dryRun: options['dry-run'] === true || options.dryRun === true,
          skipPackage:
            options['skip-package'] === true || options.skipPackage === true,
        })
      )
    );
  paginationOptions(
    consistencyOptions(
      prog.command(
        'proof relations <effortId> <fromId>',
        'Read one-hop relations'
      )
    )
  )
    .option('--relations <values>', 'Comma-separated relation names')
    .action(
      async (
        effortId: string,
        fromId: string,
        options: Record<string, unknown>
      ) =>
        printResult(
          handleEffortRelations(effortId, fromId, mapEffortCliOptions(options))
        )
    );
  prog
    .command('proof cache prune', 'Prune derived read cache')
    .action(async () =>
      printResult(pruneReadCache(resolve(process.cwd(), '.flatbread/proof')))
    );
}
