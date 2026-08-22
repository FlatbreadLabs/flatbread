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
  effortRecords,
  relations,
  getRecord,
  listEfforts,
} from '../proof/read.js';
import type { PrimitiveKind, ReadRelation } from '@flatbread/proof';

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
  verify?: boolean;
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
      verify: options.verify === true ? true : undefined,
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
  const input = ProofMutationSchema.parse(raw);
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

export function registerProofCommands(prog: any): void {
  const hasShape = (
    value: unknown
  ): value is { shape: Record<string, unknown> } => {
    if (value === null || typeof value !== 'object' || !('shape' in value))
      return false;
    const candidate = value as { shape: unknown };
    return typeof candidate.shape === 'object' && candidate.shape !== null;
  };
  const printResult = async (result: Promise<unknown>): Promise<void> => {
    try {
      console.log(JSON.stringify(await result));
    } catch (error) {
      let payload: unknown;
      if (hasShape(error)) payload = error.shape;
      else if (error instanceof Error) {
        try {
          payload = JSON.parse(error.message);
        } catch {
          payload = {
            error: { code: 'PROOF_CLI_ERROR', message: error.message },
          };
        }
      } else {
        payload = {
          error: { code: 'PROOF_CLI_ERROR', message: String(error) },
        };
      }
      console.error(JSON.stringify(payload));
      process.exitCode = 1;
    }
  };

  prog
    .command('proof write <json>', 'Write a validated Proof mutation')
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
    );
  recordsOptions(
    prog.command('proof records <effortId>', 'Read records in an Effort')
  ).action(async (effortId: string, options: Record<string, unknown>) =>
    printResult(handleEffortRecords(effortId, mapEffortCliOptions(options)))
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
