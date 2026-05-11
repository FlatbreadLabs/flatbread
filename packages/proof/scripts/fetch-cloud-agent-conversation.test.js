import test from 'ava';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, 'fetch-cloud-agent-conversation.mjs');

function envWithoutCursorApiKey(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.CURSOR_API_KEY;
  return env;
}

function runScript(args, stdinText, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: envWithoutCursorApiKey(extraEnv),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr }));
    child.stdin.end(stdinText);
  });
}

test('no positional args: piped stdin is read; then missing API key (not readFile fd error)', async (t) => {
  const bc = 'bc-aaaaaaaa-bbbb-cccc-dddddddddddd';
  const { code, stderr } = await runScript([], `${bc}\n`);
  t.is(code, 1);
  t.true(stderr.includes('CURSOR_API_KEY'), stderr);
  t.notRegex(stderr, /must be of type string/, stderr);
  t.notRegex(stderr, /Received type number/, stderr);
});

test('--run without value exits before unknown-flag / API key', async (t) => {
  const { code, stderr } = await runScript(['--run'], '');
  t.is(code, 1);
  t.true(
    stderr.includes('Missing value for --run') || stderr.includes('--run'),
    stderr
  );
  t.false(stderr.startsWith('Unknown flag'), stderr);
});

test('--api-key without value exits before unknown-flag', async (t) => {
  const { code, stderr } = await runScript(['--api-key'], '');
  t.is(code, 1);
  t.true(stderr.includes('--api-key'), stderr);
  t.false(stderr.startsWith('Unknown flag'), stderr);
});

test('dash positional: piped stdin is read; then missing API key', async (t) => {
  const bc = 'bc-aaaaaaaa-bbbb-cccc-dddddddddddd';
  const { code, stderr } = await runScript(['-'], bc);
  t.is(code, 1);
  t.true(stderr.includes('CURSOR_API_KEY'), stderr);
  t.notRegex(stderr, /must be of type string/, stderr);
  t.notRegex(stderr, /Received type number/, stderr);
});
