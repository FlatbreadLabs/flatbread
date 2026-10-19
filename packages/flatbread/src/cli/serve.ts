import { createServer, request, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ProofReadValidationError } from '@flatbread/proof';
import { enableProjectionCache } from '../proof/read.js';
import {
  errorPayload,
  handleEffortBlockingDecisions,
  handleEffortBrief,
  handleEffortFind,
  handleEffortGet,
  handleEffortList,
  handleEffortRecords,
  handleEffortRelations,
  mapEffortCliOptions,
} from './proof.js';

/**
 * The commands a read server answers, with how many positional arguments
 * each takes. Nothing that writes is here: the server is read-only by
 * construction. `bin/flatbread.js` keeps its own copy of these names, so it
 * can forward a read without loading this bundle.
 */
export const SERVED_READS: Readonly<Record<string, number>> = {
  list: 0,
  records: 1,
  get: 1,
  relations: 2,
  'blocking-decisions': 1,
  brief: 1,
  find: 1,
};

/** Options that take no value. */
const BOOLEAN_FLAGS = new Set(['all']);
/**
 * Reads whose positionals are words of one query. They take one or more, and
 * the words are joined with spaces, as the local CLI joins them.
 */
const JOINED_POSITIONALS = new Set(['find']);

/** What the server sends back: what the CLI would print, and its exit code. */
export interface ServedRead {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
}

/**
 * True when a server holds `socketPath`. A dead socket refuses the connection
 * at once. A live server that is busy, such as one building a large graph,
 * accepts it but may not reply within the probe's two seconds, so a timeout
 * also counts as live.
 */
function answers(socketPath: string): Promise<boolean> {
  return new Promise((resolveAnswer) => {
    const probe = request(
      { socketPath, path: '/', method: 'GET' },
      (response) => {
        response.resume();
        resolveAnswer(true);
      }
    );
    probe.on('error', () => resolveAnswer(false));
    probe.setTimeout(2000, () => {
      probe.destroy();
      resolveAnswer(true);
    });
    probe.end();
  });
}

function invalid(message: string): never {
  throw new ProofReadValidationError('PROOF_INVALID_ARGUMENT', message);
}

/** Splits `proof <command> …` arguments into positionals and `--name value` options. */
export function parseReadArgs(argv: readonly string[]): {
  command: string;
  positional: string[];
  options: Record<string, string>;
} {
  const [command, ...rest] = argv;
  if (!command || !(command in SERVED_READS))
    invalid(`The read server does not serve "proof ${command ?? ''}"`);
  const positional: string[] = [];
  const options: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    if (eq < 0 && BOOLEAN_FLAGS.has(arg.slice(2)))
      options[arg.slice(2)] = 'true';
    else if (eq > 0) options[arg.slice(2, eq)] = arg.slice(eq + 1);
    else if (i + 1 < rest.length) options[arg.slice(2)] = rest[++i];
    else invalid(`Option ${arg} needs a value`);
  }
  if (JOINED_POSITIONALS.has(command) && positional.length)
    return { command, positional: [positional.join(' ')], options };
  if (positional.length !== SERVED_READS[command])
    invalid(
      `proof ${command} takes ${SERVED_READS[command]} argument(s), got ${positional.length}`
    );
  return { command, positional, options };
}

/** Runs one read as the CLI would in `cwd`. */
export async function runRead(
  argv: readonly string[],
  cwd: string
): Promise<ServedRead> {
  try {
    const { command, positional, options } = parseReadArgs(argv);
    const mapped = { ...mapEffortCliOptions(options), cwd };
    const [first, second] = positional;
    const result =
      command === 'list'
        ? await handleEffortList(mapped)
        : command === 'records'
        ? await handleEffortRecords(first, mapped)
        : command === 'get'
        ? await handleEffortGet(first, mapped)
        : command === 'relations'
        ? await handleEffortRelations(first, second, mapped)
        : command === 'blocking-decisions'
        ? await handleEffortBlockingDecisions(first, mapped)
        : command === 'find'
        ? await handleEffortFind(first, mapped)
        : await handleEffortBrief(first, mapped);
    return { stdout: `${JSON.stringify(result)}\n`, stderr: '', code: 0 };
  } catch (error) {
    return {
      stdout: '',
      stderr: `${JSON.stringify(errorPayload(error))}\n`,
      code: 1,
    };
  }
}

/**
 * Serves Proof reads over HTTP on a Unix socket, keeping each graph built in
 * memory between requests. A request is `POST /read` with
 * `{"argv": ["records", "<effortId>", "--kinds", "decision"], "cwd": "…"}`;
 * digests are written under that `cwd`, as a local read would write them.
 */
export async function serveProofReads(socketPath: string): Promise<Server> {
  enableProjectionCache();
  await mkdir(dirname(socketPath), { recursive: true });
  if (existsSync(socketPath)) {
    // Replacing the socket file would strand a live server, still running
    // but unreachable. Only a socket nothing answers on is taken over.
    if (await answers(socketPath))
      throw new Error(`A proof serve already answers on ${socketPath}`);
    await rm(socketPath);
  }
  const server = createServer((request, response) => {
    const reply = (status: number, body: ServedRead) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    };
    if (request.method !== 'POST' || request.url !== '/read')
      return reply(404, {
        stdout: '',
        stderr:
          '{"error":{"code":"PROOF_CLI_ERROR","message":"Only POST /read is served"}}\n',
        code: 1,
      });
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => (body += chunk));
    request.on('end', async () => {
      let input: { argv?: unknown; cwd?: unknown };
      try {
        input = JSON.parse(body);
      } catch {
        input = {};
      }
      if (
        !Array.isArray(input.argv) ||
        !input.argv.every((arg) => typeof arg === 'string') ||
        typeof input.cwd !== 'string'
      )
        return reply(400, {
          stdout: '',
          stderr:
            '{"error":{"code":"PROOF_CLI_ERROR","message":"Expected {argv: string[], cwd: string}"}}\n',
          code: 1,
        });
      reply(200, await runRead(input.argv as string[], input.cwd));
    });
  });
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(socketPath, () => resolveListen());
  });
  return server;
}

/** Registers `flatbread proof serve`. */
export function registerProofServe(prog: any): void {
  prog
    .command(
      'proof serve',
      'Serve Proof reads from memory on a Unix socket; read-only'
    )
    .option('--socket <path>', 'Socket path', '.flatbread/proof/serve.sock')
    .action(async (options: Record<string, unknown>) => {
      const socket = resolve(String(options.socket));
      await serveProofReads(socket);
      console.log(JSON.stringify({ serving: socket, reads: 'read-only' }));
    });
}
