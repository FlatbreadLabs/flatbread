// The text that the `brief` and `dump` arms paste into the task: the
// output of `proof brief` for every Effort, or every live record in full.
// Both are made once per bed commit and cached, since every session on
// that bed gets the same text. The dump reads record files directly, so
// it asks the CLI which records are suspect (`proof records --suspect`)
// and prints the same warning before each one's body that `proof get`
// prints.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  isCompaction,
  KIND_DIRECTORY,
  parseDocument,
  recordStanding,
} from '@flatbread/proof';
import { FLATBREAD_BIN, git, ROOT, runCommand, cleanEnv } from './common.mjs';

// Standings that take a record off the live graph.
const DEAD = new Set(['retracted', 'superseded', 'invalidated', 'rejected']);
// Frontmatter shown in each record's header line rather than as a field.
const HEADER_FIELDS = new Set([
  'id',
  'effort',
  'title',
  'created_at',
  'created_by',
]);

/** Every record under a `.flatbread-proof` root, with kind and standing. */
export function readRecords(proofRoot) {
  const records = [];
  for (const [kind, dir] of Object.entries(KIND_DIRECTORY)) {
    const path = join(proofRoot, dir);
    if (!existsSync(path)) continue;
    for (const file of readdirSync(path).filter((f) => f.endsWith('.md'))) {
      let parsed;
      try {
        parsed = parseDocument(readFileSync(join(path, file)), kind);
      } catch (error) {
        throw new Error(`${join(path, file)}: ${error.message}`);
      }
      const { frontmatter, body } = parsed;
      const record = { id: frontmatter.id, kind, frontmatter, body };
      record.standing = kind === 'effort' ? null : recordStanding(record);
      records.push(record);
    }
  }
  return records;
}

const byDate = (a, b) =>
  String(a.frontmatter.created_at).localeCompare(
    String(b.frontmatter.created_at)
  ) || a.id.localeCompare(b.id);

const fieldValue = (value) =>
  Array.isArray(value)
    ? value.join(', ')
    : value && typeof value === 'object'
    ? JSON.stringify(value)
    : String(value);

/**
 * Every live record's full text, grouped by Effort, compactions included.
 * Dead means retracted, superseded, invalidated, or rejected. `suspect`
 * maps a record id to the warning the CLI prints before its body.
 */
export function dumpText(proofRoot, suspect = {}) {
  const records = readRecords(proofRoot);
  const efforts = records.filter((r) => r.kind === 'effort').sort(byDate);
  const parts = [];
  let count = 0;
  for (const effort of efforts) {
    const fm = effort.frontmatter;
    const live = records
      .filter(
        (r) =>
          r.kind !== 'effort' &&
          r.frontmatter.effort === effort.id &&
          !DEAD.has(r.standing)
      )
      .sort(byDate);
    count += live.length;
    parts.push(
      `### Effort: ${fm.title}\n\n\`${effort.id}\` · ${
        fm.status ?? 'active'
      }\n\n${effort.body.trim()}\n`
    );
    for (const r of live) {
      const f = r.frontmatter;
      const kind = isCompaction(r) ? 'compaction' : r.kind;
      const fields = Object.entries(f)
        .filter(([key]) => !HEADER_FIELDS.has(key))
        .map(([key, value]) => `${key}: ${fieldValue(value)}`);
      parts.push(
        `#### ${kind}: ${f.title}\n\n\`${r.id}\` · ${r.standing} · ${String(
          f.created_at ?? ''
        ).slice(0, 10)} · ${f.created_by ?? ''}${
          fields.length ? `\n${fields.join('\n')}` : ''
        }\n\n${suspect[r.id] ? `> ${suspect[r.id]}\n\n` : ''}${r.body.trim()}\n`
      );
    }
  }
  return { text: parts.join('\n'), records: count, efforts: efforts.length };
}

/**
 * Runs `use(clone, efforts)` in a throwaway clone of `bed` under `scratch`
 * (so the bed's own folder gains no read cache), with the clone's Efforts
 * oldest first.
 */
async function inClone(bed, scratch, name, use) {
  const clone = join(scratch, `${name}-clone-${process.pid}`);
  await rm(clone, { recursive: true, force: true });
  await mkdir(dirname(clone), { recursive: true });
  git(dirname(clone), 'clone', '--quiet', '--no-hardlinks', bed, clone);
  try {
    await symlink(join(ROOT, 'node_modules'), join(clone, 'node_modules'));
    const efforts = readRecords(join(clone, '.flatbread-proof'))
      .filter((r) => r.kind === 'effort')
      .sort(byDate);
    return await use(clone, efforts);
  } finally {
    await rm(clone, { recursive: true, force: true });
  }
}

/** One `proof` CLI read in `cwd`, as its JSON envelope. */
async function proofRead(cwd, args) {
  const run = await runCommand(
    process.execPath,
    [FLATBREAD_BIN, 'proof', ...args],
    { cwd, env: cleanEnv(), timeout: 120e3 }
  );
  if (run.code !== 0)
    throw new Error(
      `proof ${args.join(' ')} failed: ${run.stderr || run.stdout}`
    );
  return JSON.parse(run.stdout);
}

/**
 * The CLI's warning for each suspect record in `bed`, by id, from
 * `proof records <effort> --suspect` for every Effort, every page. When a
 * listing's check stopped at a cap (`suspect_limit`), each live Decision
 * and Constraint of that Effort is checked on its own with `proof get`, as
 * the arms that read through `get` see it.
 */
export async function suspectBanners(bed, scratch) {
  return inClone(bed, scratch, 'suspect', async (clone, efforts) => {
    const banners = {};
    const records = readRecords(join(clone, '.flatbread-proof'));
    for (const effort of efforts) {
      let cursor;
      let partial = false;
      do {
        const envelope = await proofRead(clone, [
          'records',
          effort.id,
          '--suspect',
          '--limit',
          '25',
          ...(cursor ? ['--cursor', cursor] : []),
        ]);
        Object.assign(banners, envelope.suspect ?? {});
        if (envelope.cap_reasons?.includes('suspect_limit')) partial = true;
        cursor = envelope.page.next_cursor;
      } while (cursor);
      if (!partial) continue;
      for (const r of records.filter(
        (r) =>
          r.frontmatter.effort === effort.id &&
          ['decision', 'constraint'].includes(r.kind) &&
          !DEAD.has(r.standing)
      )) {
        const envelope = await proofRead(clone, ['get', r.id]);
        if (envelope.suspect?.[r.id]) banners[r.id] = envelope.suspect[r.id];
      }
    }
    return banners;
  });
}

/**
 * `proof brief <effort>` for every Effort, run by the real CLI in a
 * throwaway clone of `bed` under `scratch`. The clone's path is replaced
 * with `.` in the output.
 */
export async function briefText(bed, scratch) {
  return inClone(bed, scratch, 'brief', async (clone, efforts) => {
    const parts = [];
    for (const effort of efforts) {
      const envelope = await proofRead(clone, ['brief', effort.id]);
      // The digest opens with the read's query metadata (hashes, cursor,
      // caps), which is plumbing, not memory; the Markdown after it stays.
      const digest = (await readFile(envelope.artifact_path, 'utf8')).replace(
        /^---\n[\s\S]*?\n---\n/,
        ''
      );
      parts.push(
        `### ${effort.frontmatter.title}\n\n${digest
          .split(clone)
          .join('.')
          .trim()}\n`
      );
    }
    return { text: parts.join('\n'), efforts: efforts.length };
  });
}

/**
 * The `brief` or `dump` text for `bed`, cached in `cache` by bed commit.
 * Returns the text; the cache folder also keeps a small `.json` summary.
 */
export async function injectText(kind, bed, cache) {
  const head = git(bed, 'rev-parse', 'HEAD').trim();
  const dir = join(cache, head.slice(0, 16));
  const file = join(dir, `${kind}.md`);
  if (existsSync(file)) return readFile(file, 'utf8');
  await mkdir(dir, { recursive: true });
  const made =
    kind === 'dump'
      ? dumpText(join(bed, '.flatbread-proof'), await suspectBanners(bed, dir))
      : await briefText(bed, dir);
  const { text, ...about } = made;
  await writeFile(file, text);
  await writeFile(
    join(dir, `${kind}.json`),
    `${JSON.stringify({ bed, head, chars: text.length, ...about }, null, 2)}\n`
  );
  return text;
}
