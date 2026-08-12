export type PrimitiveKind =
  | 'effort'
  | 'issue'
  | 'finding'
  | 'decision'
  | 'constraint'
  | 'risk'
  | 'blob'
  | 'citation';
export type GenerationToken = string;
export interface WrittenArtifact {
  id: string;
  kind: PrimitiveKind;
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
  operation: 'created' | 'updated';
}
export interface TouchedArtifact {
  id: string;
  path: string;
}
export interface MutationResult {
  generation: GenerationToken;
  artifacts: WrittenArtifact[];
  touched: TouchedArtifact[];
}
export interface CommittedGenerationPublication {
  rootDir: string;
  transactionId: string;
  targetGeneration: GenerationToken;
  changedPaths: readonly string[];
  touchedIds: readonly string[];
}
export interface CommittedGenerationPublisher {
  publish(publication: CommittedGenerationPublication): Promise<void>;
}
export interface IndexedArtifact {
  id: string;
  kind: PrimitiveKind;
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
}
export interface ProofIndex {
  getRecord(id: string): Promise<IndexedArtifact | undefined>;
  recordsByEffort(effortId: string): Promise<readonly IndexedArtifact[]>;
  recordsByKind(kind: PrimitiveKind): Promise<readonly IndexedArtifact[]>;
  siblingDecisions(
    effortId: string,
    options?: { state?: string; excludeId?: string }
  ): Promise<readonly IndexedArtifact[]>;
  hasId(id: string): Promise<boolean>;
}
export interface WriterLockOptions {
  leaseMs?: number;
}
export interface ProofWriterOptions {
  rootDir: string;
  index?: import('./snapshot.js').ProofSnapshotSource;
  publisher?: CommittedGenerationPublisher;
  clock?: () => Date;
  randomBytes?: (length: number) => Uint8Array;
  lockOptions?: Partial<WriterLockOptions>;
}
export interface ProofWriter {
  recover(): Promise<RecoveryResult>;
  mutate(input: import('./schemas.js').ProofMutation): Promise<MutationResult>;
}
export interface RecoveryResult {
  action: 'none' | 'rolled_back' | 'completed';
  transactionId?: string;
}
export type PlannedWrite = {
  id: string;
  kind: PrimitiveKind;
  absolutePath: string;
  relativePath: string;
  beforeBytes?: Buffer;
  afterBytes: Buffer;
  operation: 'create' | 'update';
};
export type ArtifactInput = Record<string, unknown>;
