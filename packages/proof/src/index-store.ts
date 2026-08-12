import { PREFIX_KIND } from './ids.js';
import { buildProofSnapshot } from './snapshot.js';
import type { ProofIndex, IndexedArtifact, PrimitiveKind } from './types.js';
export function createFilesystemProofIndex(rootDir: string): ProofIndex {
  const convert = (
    r: import('./snapshot.js').ProofSnapshotArtifact
  ): IndexedArtifact => ({
    id: r.id,
    kind: r.kind,
    path: r.path,
    frontmatter: { ...r.frontmatter },
    body: r.body,
  });
  return {
    async getRecord(id) {
      const r = (await buildProofSnapshot(rootDir)).getRecord(id);
      return r && convert(r);
    },
    async recordsByEffort(effortId) {
      return (await buildProofSnapshot(rootDir))
        .recordsByEffort(effortId)
        .map(convert);
    },
    async recordsByKind(kind) {
      return (await buildProofSnapshot(rootDir))
        .recordsByKind(kind)
        .map(convert);
    },
    async siblingDecisions(effortId, o = {}) {
      return (await buildProofSnapshot(rootDir))
        .siblingDecisions(effortId, o)
        .map(convert);
    },
    async hasId(id) {
      return (await buildProofSnapshot(rootDir)).hasId(id);
    },
  };
}
export function kindFromId(id: string): PrimitiveKind | undefined {
  return PREFIX_KIND[id.split('-')[0]];
}
