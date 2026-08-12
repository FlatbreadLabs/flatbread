import { PREFIX_KIND } from './ids.js';
import { buildEffortGraphSnapshot } from './snapshot.js';
import type {
  EffortGraphIndex,
  IndexedArtifact,
  PrimitiveKind,
} from './types.js';
export function createFilesystemEffortGraphIndex(
  rootDir: string
): EffortGraphIndex {
  const convert = (
    r: import('./snapshot.js').EffortGraphSnapshotArtifact
  ): IndexedArtifact => ({
    id: r.id,
    kind: r.kind,
    path: r.path,
    frontmatter: { ...r.frontmatter },
    body: r.body,
  });
  return {
    async getRecord(id) {
      const r = (await buildEffortGraphSnapshot(rootDir)).getRecord(id);
      return r && convert(r);
    },
    async recordsByEffort(effortId) {
      return (await buildEffortGraphSnapshot(rootDir))
        .recordsByEffort(effortId)
        .map(convert);
    },
    async recordsByKind(kind) {
      return (await buildEffortGraphSnapshot(rootDir))
        .recordsByKind(kind)
        .map(convert);
    },
    async siblingDecisions(effortId, o = {}) {
      return (await buildEffortGraphSnapshot(rootDir))
        .siblingDecisions(effortId, o)
        .map(convert);
    },
    async hasId(id) {
      return (await buildEffortGraphSnapshot(rootDir)).hasId(id);
    },
  };
}
export function kindFromId(id: string): PrimitiveKind | undefined {
  return PREFIX_KIND[id.split('-')[0]];
}
