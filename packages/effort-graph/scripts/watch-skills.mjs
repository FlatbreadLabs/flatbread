import { watch } from 'node:fs';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { managedSkillSources, syncManagedProjections } from './sync-skills.mjs';

const watchers = new Map();
let timer;
let syncing = false;
let queued = false;
let stopping = false;
let tsup;

async function directories(root) {
  const result = [root];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      result.push(...(await directories(`${root}/${entry.name}`)));
    }
  }
  return result;
}

function closeWatchers() {
  for (const watcher of watchers.values()) watcher.close();
  watchers.clear();
}

function stop(signal, error) {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  closeWatchers();
  if (tsup && !tsup.killed) tsup.kill(signal);
  if (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function refreshWatchers() {
  const current = new Set(
    (await Promise.all(managedSkillSources.map(directories))).flat()
  );
  for (const directory of current) {
    if (watchers.has(directory)) continue;
    const watcher = watch(directory, { recursive: false }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => void sync(), 100);
    });
    watcher.on('error', (error) => stop('SIGTERM', error));
    watchers.set(directory, watcher);
  }
  for (const [directory, watcher] of watchers) {
    if (!current.has(directory)) {
      watcher.close();
      watchers.delete(directory);
    }
  }
}

async function sync() {
  if (stopping) return;
  if (syncing) {
    queued = true;
    return;
  }
  syncing = true;
  try {
    await syncManagedProjections();
    await refreshWatchers();
  } catch (error) {
    stop('SIGTERM', error);
  } finally {
    syncing = false;
    if (queued && !stopping) {
      queued = false;
      await sync();
    }
  }
}

async function main() {
  await sync();
  if (stopping) return;
  tsup = spawn('pnpm', ['exec', 'tsup', '--watch', 'src'], {
    stdio: 'inherit',
  });
  tsup.on('error', (error) => stop('SIGTERM', error));
  tsup.once('exit', (code, signal) => {
    if (!stopping) {
      stop(signal ?? 'SIGTERM');
      process.exitCode = code ?? 1;
    }
  });
}

process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));
main().catch((error) => stop('SIGTERM', error));
