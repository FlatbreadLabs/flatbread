import { join } from 'node:path';
import { ProofValidationError } from './errors.js';
import { serializeDocument } from './frontmatter.js';
import {
  generateArtifactId,
  KIND_DIRECTORY,
  validateArtifactId,
} from './ids.js';
import {
  acceptDecisionLifecycle,
  supersedeDecisionLifecycle,
} from './decision-lifecycle.js';
import type { ProofSnapshot } from './snapshot.js';
import type { PlannedWrite, PrimitiveKind } from './types.js';
import type { ProofMutation } from './schemas.js';

type SnapshotRecord = NonNullable<ReturnType<ProofSnapshot['getRecord']>>;
type GetRecord = (id: string) => SnapshotRecord;

const kinds: Record<string, PrimitiveKind> = {
  WriteIssue: 'issue',
  WriteFinding: 'finding',
  WriteDecision: 'decision',
  WriteConstraint: 'constraint',
  WriteRisk: 'risk',
  WriteCitation: 'citation',
  WriteBlob: 'blob',
};

const EPISTEMIC_CREATE = new Set([
  'issue',
  'finding',
  'decision',
  'constraint',
  'risk',
]);

const CITATION_BLOB_FORBIDDEN_KEYS = [
  'cites',
  'derives_from',
  'supersedes',
  'invalidates',
] as const;

function assertNoCitationBlobEdges(
  type: string,
  input: Record<string, unknown>
): void {
  const present = CITATION_BLOB_FORBIDDEN_KEYS.filter((key) => key in input);
  if (present.length)
    throw new ProofValidationError(
      `${type} does not accept ${present.join(
        ', '
      )}; relation fields are only valid on Issue, Finding, Decision, Constraint, or Risk records.`
    );
}

function assertCites(
  get: GetRecord,
  effortId: string,
  cites: string[] | undefined
): void {
  for (const citeId of cites ?? []) {
    const target = get(citeId);
    if (target.kind !== 'citation')
      throw new ProofValidationError(
        `cites must target a Citation, got ${target.kind} (${citeId})`
      );
    assertTargetEffort('cites', effortId, target);
  }
}

function owningEffort(record: SnapshotRecord): string | undefined {
  if (record.kind === 'effort') return record.id;
  return typeof record.frontmatter.effort === 'string'
    ? record.frontmatter.effort
    : undefined;
}

function assertTargetEffort(
  relation: string,
  effortId: string,
  target: SnapshotRecord
): void {
  if (owningEffort(target) !== effortId)
    throw new ProofValidationError(
      `${relation} target ${target.id} belongs to a different effort`
    );
}

/**
 * `derives_from` is the one forward edge with no reverse projection, so nothing
 * else in the create path ever looks its targets up. Resolve each one here:
 * `get` throws `Unknown artifact <id>` for a missing target, which keeps a
 * record that points at nothing from ever reaching the journal.
 */
function assertDerivesFrom(
  get: GetRecord,
  effortId: string,
  derivesFrom: string[] | undefined
): void {
  for (const targetId of derivesFrom ?? [])
    assertTargetEffort('derives_from', effortId, get(targetId));
}

export function planMutation(
  input: ProofMutation,
  snapshot: ProofSnapshot,
  root: string,
  now: Date,
  randomBytes?: (length: number) => Uint8Array
): PlannedWrite[] {
  const writes = new Map<string, PlannedWrite>();
  const get = (id: string) => {
    const r = snapshot.getRecord(id);
    if (!r) throw new ProofValidationError(`Unknown artifact ${id}`);
    return r;
  };
  const add = (
    id: string,
    kind: PrimitiveKind,
    fm: Record<string, unknown>,
    body: string,
    operation: 'create' | 'update' = 'update'
  ) => {
    const path = join(root, KIND_DIRECTORY[kind], `${id}.md`);
    const beforeBytes =
      operation === 'update' ? snapshot.getRawBytes(id) : undefined;
    if (operation === 'update' && !beforeBytes)
      throw new ProofValidationError(`Missing snapshot bytes for update ${id}`);
    writes.set(path, {
      id,
      kind,
      absolutePath: path,
      relativePath: join(KIND_DIRECTORY[kind], `${id}.md`),
      beforeBytes,
      afterBytes: serializeDocument(body, fm),
      operation,
    });
  };
  if (input.type === 'CreateEffort') {
    if ('cites' in input)
      throw new ProofValidationError(
        'CreateEffort does not accept cites; create the Effort before its Citations.'
      );
    const id =
      input.id ?? generateArtifactId('effort', input.title, randomBytes);
    if (!validateArtifactId(id, 'effort') || snapshot.hasId(id))
      throw new ProofValidationError(`Invalid or duplicate id ${id}`);
    if (
      input.slug &&
      snapshot
        .recordsByKind('effort')
        .some((r) => r.frontmatter.slug === input.slug)
    )
      throw new ProofValidationError(`Duplicate effort slug ${input.slug}`);
    add(
      id,
      'effort',
      {
        id,
        title: input.title,
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        status: 'active',
        created_at: input.created_at ?? now.toISOString(),
        ...(input.produced_in !== undefined
          ? { produced_in: input.produced_in }
          : {}),
        ...(input.created_by !== undefined
          ? { created_by: input.created_by }
          : {}),
      },
      input.body,
      'create'
    );
    return [...writes.values()];
  }
  if (input.type === 'SetEffortStatus') {
    const r = get(input.effortId);
    if (r.kind !== 'effort') throw new ProofValidationError('Not an effort');
    const old = String(r.frontmatter.status);
    if (old === input.status || old === 'completed' || old === 'abandoned')
      throw new ProofValidationError('Illegal effort transition');
    add(r.id, r.kind, { ...r.frontmatter, status: input.status }, r.body);
    return [...writes.values()];
  }
  if (input.type in kinds) {
    const kind = kinds[input.type];
    const raw = input as Record<string, unknown> & {
      id?: string;
      title: string;
      body: string;
      effort: string;
      created_at?: string;
      blob?: string;
      cites?: string[];
      derives_from?: string[];
    };
    if (kind === 'blob' || kind === 'citation')
      assertNoCitationBlobEdges(input.type, raw);
    const id = raw.id ?? generateArtifactId(kind, raw.title, randomBytes);
    if (!validateArtifactId(id, kind) || snapshot.hasId(id))
      throw new ProofValidationError('Invalid or duplicate id');
    const effort = get(raw.effort);
    if (effort.kind !== 'effort')
      throw new ProofValidationError('Invalid effort');
    if (kind === 'citation' && raw.blob !== undefined) {
      const blob = get(raw.blob);
      if (blob.kind !== 'blob')
        throw new ProofValidationError(
          `Citation.blob must target a Blob, got ${blob.kind}`
        );
      if (blob.frontmatter.effort !== raw.effort)
        throw new ProofValidationError(
          `Citation.blob ${raw.blob} belongs to a different effort`
        );
    }
    if (EPISTEMIC_CREATE.has(kind)) {
      assertCites(get, raw.effort, raw.cites);
      assertDerivesFrom(get, raw.effort, raw.derives_from);
    }
    const fm: Record<string, unknown> = {
      ...raw,
      id,
      created_at: raw.created_at ?? now.toISOString(),
    };
    delete fm.type;
    delete fm.body;
    if (kind === 'issue') fm.status = 'open';
    if (kind === 'decision') fm.state = 'proposed';
    if (kind === 'risk') fm.state = 'open';
    if (kind === 'blob' || kind === 'citation') {
      delete fm.cites;
      delete fm.derives_from;
      delete fm.supersedes;
      delete fm.invalidates;
    }
    add(id, kind, fm, raw.body, 'create');
    const reverseUpdates = new Map<
      string,
      { target: SnapshotRecord; frontmatter: Record<string, unknown> }
    >();
    for (const edge of ['supersedes', 'invalidates'] as const)
      for (const targetId of (fm[edge] as string[] | undefined) ?? []) {
        const target = get(targetId);
        if (edge === 'supersedes' && target.kind !== kind)
          throw new ProofValidationError(
            'Supersedes must target the same kind'
          );
        if (
          edge === 'supersedes' &&
          (target.frontmatter.superseded_by as string[] | undefined)?.length
        )
          throw new ProofValidationError('Target already superseded');
        if (
          edge === 'invalidates' &&
          !['finding', 'decision'].includes(target.kind)
        )
          throw new ProofValidationError(
            'Invalidation target must be a Finding or Decision'
          );
        assertTargetEffort(edge, raw.effort, target);
        const reverse =
          edge === 'supersedes' ? 'superseded_by' : 'invalidated_by';
        const current =
          reverseUpdates.get(target.id)?.frontmatter ?? target.frontmatter;
        reverseUpdates.set(target.id, {
          target,
          frontmatter: {
            ...current,
            [reverse]: [
              ...((current[reverse] as string[] | undefined) ?? []),
              id,
            ],
          },
        });
      }
    for (const { target, frontmatter } of reverseUpdates.values())
      add(target.id, target.kind, frontmatter, target.body);
    return [...writes.values()];
  }
  if (input.type === 'Supersede' || input.type === 'Invalidate') {
    const a = get(
      input.type === 'Supersede' ? input.supersederId : input.findingId
    );
    const b = get(input.targetId);
    const edge = input.type === 'Supersede' ? 'supersedes' : 'invalidates';
    const back =
      input.type === 'Supersede' ? 'superseded_by' : 'invalidated_by';
    const sourceEffort = owningEffort(a);
    const targetEffort = owningEffort(b);
    if (
      a.id === b.id ||
      (input.type === 'Supersede' && a.kind !== b.kind) ||
      sourceEffort === undefined ||
      targetEffort === undefined ||
      sourceEffort !== targetEffort
    )
      throw new ProofValidationError('Invalid edge');
    if (input.type === 'Invalidate') {
      if (a.kind !== 'finding')
        throw new ProofValidationError(
          `Invalidate requires a Finding source, got ${a.kind}`
        );
      if (b.kind !== 'finding' && b.kind !== 'decision')
        throw new ProofValidationError(
          'Invalidation target must be a Finding or Decision'
        );
    }
    if (
      input.type === 'Supersede' &&
      (b.frontmatter[back] as unknown[] | undefined)?.length
    )
      throw new ProofValidationError('Target already superseded');
    if (((a.frontmatter[edge] as string[] | undefined) ?? []).includes(b.id))
      throw new ProofValidationError('Duplicate edge');
    add(
      a.id,
      a.kind,
      {
        ...a.frontmatter,
        [edge]: [...((a.frontmatter[edge] as string[]) || []), b.id],
      },
      a.body
    );
    const targetFm =
      input.type === 'Supersede' && b.kind === 'decision'
        ? supersedeDecisionLifecycle(snapshot, b.id).nextFrontmatter
        : {
            ...b.frontmatter,
            [back]: [...((b.frontmatter[back] as string[]) || []), a.id],
          };
    if (input.type === 'Supersede' && b.kind === 'decision')
      (targetFm as Record<string, unknown>)[back] = [
        ...((b.frontmatter[back] as string[]) || []),
        a.id,
      ];
    add(b.id, b.kind, targetFm as Record<string, unknown>, b.body);
    return [...writes.values()];
  }
  if (input.type === 'ResolveIssue') {
    const r = get(input.issueId);
    if (r.kind !== 'issue' || r.frontmatter.status !== 'open')
      throw new ProofValidationError('Issue is not open');
    for (const id of input.resolvedBy)
      if (get(id).frontmatter.effort !== r.frontmatter.effort)
        throw new ProofValidationError('Different effort');
    add(
      r.id,
      r.kind,
      {
        ...r.frontmatter,
        status: input.resolution,
        resolved_by: input.resolvedBy,
      },
      r.body
    );
    return [...writes.values()];
  }
  if (input.type === 'AcceptDecision') {
    for (const change of acceptDecisionLifecycle(snapshot, {
      decisionId: input.decisionId,
      rejectSiblings: input.rejectSiblings !== false,
    }))
      add(
        change.record.id,
        change.record.kind,
        { ...change.nextFrontmatter },
        change.record.body
      );
    return [...writes.values()];
  }
  if (input.type === 'MitigateRisk') {
    const r = get(input.riskId),
      d = get(input.decisionId);
    if (
      r.kind !== 'risk' ||
      r.frontmatter.state !== 'open' ||
      d.kind !== 'decision' ||
      d.frontmatter.state !== 'accepted' ||
      r.frontmatter.effort !== d.frontmatter.effort
    )
      throw new ProofValidationError('Cannot mitigate risk');
    add(
      r.id,
      r.kind,
      { ...r.frontmatter, state: 'mitigated', mitigated_by: d.id },
      r.body
    );
    return [...writes.values()];
  }
  if (input.type === 'SetRiskState') {
    const r = get(input.riskId);
    if (r.kind !== 'risk' || r.frontmatter.state !== 'open')
      throw new ProofValidationError('Risk is not open');
    const evidence = input.evidence.map(get);
    for (const x of evidence)
      if (x.frontmatter.effort !== r.frontmatter.effort)
        throw new ProofValidationError('Different effort');
    if (
      input.state === 'realized' &&
      !evidence.some((x) => x.kind === 'finding')
    )
      throw new ProofValidationError('Realized risk requires finding');
    add(
      r.id,
      r.kind,
      { ...r.frontmatter, state: input.state, evidence: input.evidence },
      r.body
    );
    return [...writes.values()];
  }
  throw new ProofValidationError('Unsupported mutation');
}
