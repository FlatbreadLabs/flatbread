#!/usr/bin/env node
/**
 * Fetch a Cursor cloud agent run transcript via @cursor/sdk.
 * Usage: node scripts/fetch-cloud-agent-conversation.mjs "<url-or-text>" [--run run-uuid]
 * Env: CURSOR_API_KEY (optional explicit key: --api-key …, not recommended for shell history)
 */
import { Agent } from '@cursor/sdk';

const BC_RE = /\bbc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const RUN_RE = /\brun-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

function parseArgs(argv) {
  const positional = [];
  let explicitRun;
  let apiKey;
  const args = argv.filter((a) => a !== '--');
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--run' && args[i + 1]) {
      explicitRun = args[++i];
      continue;
    }
    if (a === '--api-key' && args[i + 1]) {
      apiKey = args[++i];
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    }
    positional.push(a);
  }
  return { input: positional.join(' ').trim(), explicitRun, apiKey };
}

function extractFromUrl(raw) {
  const trimmed = raw.trim();
  let agentId;
  let runId;
  try {
    const href = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : trimmed.includes('cursor.com')
        ? `https://${trimmed.replace(/^\/+/, '')}`
        : null;
    if (href) {
      const u = new URL(href);
      const keysAgent = [
        'selectedBcId',
        'agentId',
        'bcId',
        'id',
        'agent',
      ];
      for (const k of keysAgent) {
        const v = u.searchParams.get(k);
        if (v && BC_RE.test(v)) {
          agentId = v.match(BC_RE)[0];
          break;
        }
      }
      const keysRun = ['selectedRunId', 'runId', 'run'];
      for (const k of keysRun) {
        const v = u.searchParams.get(k);
        if (v && RUN_RE.test(v)) {
          runId = v.match(RUN_RE)[0];
          break;
        }
      }
    }
  } catch {
    // ignore
  }
  if (!agentId) {
    const m = trimmed.match(BC_RE);
    if (m) agentId = m[0];
  }
  if (!runId) {
    const m = trimmed.match(RUN_RE);
    if (m) runId = m[0];
  }
  return { agentId, runId };
}

async function main() {
  const { input, explicitRun, apiKey } = parseArgs(
    process.argv.slice(2).filter((a) => a !== '--'),
  );
  let raw = input;
  if (input === '' || input === '-') {
    const { readFile } = await import('node:fs/promises');
    raw = String(await readFile(0, 'utf8')).trim();
  }

  if (!process.env.CURSOR_API_KEY && !apiKey) {
    console.error(
      'Missing CURSOR_API_KEY (or pass --api-key for one-off use).',
    );
    process.exit(1);
  }

  if (!raw) {
    console.error(
      'Usage: node scripts/fetch-cloud-agent-conversation.mjs "<cursor agents url or bc- id>" [--run run-uuid]',
    );
    process.exit(1);
  }

  const { agentId, runId: runFromText } = extractFromUrl(raw);
  if (!agentId) {
    console.error(
      'Could not find a cloud agent id (bc-…). Paste a cursor.com/agents URL or the bc-… id.',
    );
    process.exit(1);
  }

  const opts = apiKey ? { apiKey } : {};

  const agent = await Agent.get(agentId, opts);
  const runId = explicitRun ?? runFromText;

  let run;
  if (runId) {
    run = await Agent.getRun(runId, {
      runtime: 'cloud',
      agentId,
      ...opts,
    });
  } else {
    const { items } = await Agent.listRuns(agentId, {
      runtime: 'cloud',
      limit: 30,
      ...opts,
    });
    if (!items.length) {
      console.error(`No runs found for agent ${agentId}.`);
      process.exit(1);
    }
    const sorted = [...items].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
    run = sorted[0];
  }

  const conversation = await run.conversation();
  const out = {
    agentId,
    agent,
    run: {
      id: run.id,
      agentId: run.agentId,
      status: run.status,
      createdAt: run.createdAt,
      durationMs: run.durationMs,
      git: run.git,
    },
    conversation,
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
