import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { EffortGraphValidationError } from './errors.js';
import { parseDocument } from './frontmatter.js';
import { KIND_DIRECTORY } from './ids.js';
import type { PrimitiveKind } from './types.js';

export interface EffortGraphSnapshotArtifact {
  readonly id: string;
  readonly kind: PrimitiveKind;
  readonly path: string;
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly body: string;
}
export interface EffortGraphSnapshotArtifactInput
  extends Omit<EffortGraphSnapshotArtifact, 'frontmatter'> {
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly rawBytes: Buffer;
}
export interface EffortGraphSnapshot {
  getRecord(id: string): EffortGraphSnapshotArtifact | undefined;
  hasId(id: string): boolean;
  recordsByEffort(effortId: string): readonly EffortGraphSnapshotArtifact[];
  recordsByKind(kind: PrimitiveKind): readonly EffortGraphSnapshotArtifact[];
  siblingDecisions(
    effortId: string,
    options?: Readonly<{ state?: string; excludeId?: string }>
  ): readonly EffortGraphSnapshotArtifact[];
  getRawBytes(id: string): Buffer | undefined;
}
export interface EffortGraphSnapshotSource {
  buildSnapshot(rootDir: string): Promise<EffortGraphSnapshot>;
}

export function createEffortGraphSnapshot(
  artifacts: readonly EffortGraphSnapshotArtifactInput[]
): EffortGraphSnapshot {
  const byId = new Map<string, EffortGraphSnapshotArtifact>();
  const raw = new Map<string, Buffer>();
  const byEffort = new Map<string, EffortGraphSnapshotArtifact[]>();
  const byKind = new Map<PrimitiveKind, EffortGraphSnapshotArtifact[]>();
  for (const input of artifacts) {
    if (byId.has(input.id))
      throw new EffortGraphValidationError(
        `Duplicate id ${input.id} at ${input.path}`
      );
    const record = Object.freeze({
      id: input.id,
      kind: input.kind,
      path: input.path,
      frontmatter: Object.freeze({ ...input.frontmatter }),
      body: input.body,
    });
    byId.set(record.id, record);
    raw.set(record.id, Buffer.from(input.rawBytes));
    const effort = record.frontmatter.effort;
    if (typeof effort === 'string') {
      const list = byEffort.get(effort) ?? [];
      list.push(record);
      byEffort.set(effort, list);
    }
    const kindList = byKind.get(record.kind) ?? [];
    kindList.push(record);
    byKind.set(record.kind, kindList);
  }
  const freezeLists = (map: Map<unknown, EffortGraphSnapshotArtifact[]>) => {
    for (const list of map.values()) Object.freeze(list);
  };
  freezeLists(byEffort);
  freezeLists(byKind);
  return {
    getRecord: (id) => byId.get(id),
    hasId: (id) => byId.has(id),
    recordsByEffort: (id) => [...(byEffort.get(id) ?? [])],
    recordsByKind: (kind) => [...(byKind.get(kind) ?? [])],
    siblingDecisions: (effortId, options = {}) =>
      (byEffort.get(effortId) ?? []).filter(
        (r) =>
          r.kind === 'decision' &&
          (options.state === undefined ||
            r.frontmatter.state === options.state) &&
          r.id !== options.excludeId
      ),
    getRawBytes: (id) => {
      const bytes = raw.get(id);
      return bytes && Buffer.from(bytes);
    },
  };
}

export async function buildEffortGraphSnapshot(
  rootDir: string
): Promise<EffortGraphSnapshot> {
  const artifacts: EffortGraphSnapshotArtifactInput[] = [];
  for (const kind of Object.keys(KIND_DIRECTORY) as PrimitiveKind[]) {
    const dir = join(rootDir, KIND_DIRECTORY[kind]);
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names.filter((n) => n.endsWith('.md'))) {
      const absolutePath = join(dir, name);
      const bytes = await readFile(absolutePath);
      const parsed = parseDocument(bytes, kind);
      artifacts.push({
        id: String(parsed.frontmatter.id),
        kind,
        path: relative(rootDir, absolutePath),
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        rawBytes: bytes,
      });
    }
  }
  const seen = new Set<string>();
  for (const artifact of artifacts) {
    if (seen.has(artifact.id))
      throw new EffortGraphValidationError(
        `Duplicate id ${artifact.id} at ${join(rootDir, artifact.path)}`
      );
    seen.add(artifact.id);
  }
  return createEffortGraphSnapshot(artifacts);
}

export const filesystemEffortGraphSnapshotSource: EffortGraphSnapshotSource = {
  buildSnapshot: buildEffortGraphSnapshot,
};
