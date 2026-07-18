import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parseDocument } from './frontmatter.js';
import { KIND_DIRECTORY, PREFIX_KIND } from './ids.js';
import { EffortGraphValidationError } from './errors.js';
import type {
  EffortGraphIndex,
  IndexedArtifact,
  PrimitiveKind,
} from './types.js';
export function createFilesystemEffortGraphIndex(
  rootDir: string
): EffortGraphIndex {
  async function scan(): Promise<IndexedArtifact[]> {
    const result: IndexedArtifact[] = [];
    for (const kind of Object.keys(KIND_DIRECTORY) as PrimitiveKind[]) {
      const dir = join(rootDir, KIND_DIRECTORY[kind]);
      let names: string[] = [];
      try {
        names = await readdir(dir);
      } catch {
        continue;
      }
      for (const name of names.filter((n) => n.endsWith('.md'))) {
        const path = join(dir, name);
        const parsed = parseDocument(await readFile(path), kind);
        const id = String(parsed.frontmatter.id);
        if (result.some((x) => x.id === id))
          throw new EffortGraphValidationError(`Duplicate id ${id} at ${path}`);
        result.push({
          id,
          kind,
          path: relative(rootDir, path),
          frontmatter: parsed.frontmatter,
          body: parsed.body,
        });
      }
    }
    return result;
  }
  return {
    async getRecord(id) {
      return (await scan()).find((x) => x.id === id);
    },
    async recordsByEffort(effortId) {
      return (await scan()).filter((x) => x.frontmatter.effort === effortId);
    },
    async recordsByKind(kind) {
      return (await scan()).filter((x) => x.kind === kind);
    },
    async siblingDecisions(effortId, o = {}) {
      return (await scan()).filter(
        (x) =>
          x.kind === 'decision' &&
          x.frontmatter.effort === effortId &&
          (!o.state || x.frontmatter.state === o.state) &&
          x.id !== o.excludeId
      );
    },
    async hasId(id) {
      return !!(await scan()).find((x) => x.id === id);
    },
  };
}
export function kindFromId(id: string): PrimitiveKind | undefined {
  return PREFIX_KIND[id.split('-')[0]];
}
