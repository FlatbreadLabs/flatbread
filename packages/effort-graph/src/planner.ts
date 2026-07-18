import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EffortGraphValidationError } from './errors.js';
import {
  generateArtifactId,
  KIND_DIRECTORY,
  validateArtifactId,
} from './ids.js';
import { serializeDocument } from './frontmatter.js';
import type { EffortGraphIndex, PlannedWrite, PrimitiveKind } from './types.js';
import type { EffortGraphMutation } from './schemas.js';
const kinds: Record<string, PrimitiveKind> = {
  WriteIssue: 'issue',
  WriteFinding: 'finding',
  WriteDecision: 'decision',
  WriteConstraint: 'constraint',
  WriteRisk: 'risk',
};
export async function planMutation(
  input: EffortGraphMutation,
  index: EffortGraphIndex,
  root: string,
  now: Date,
  randomBytes?: (n: number) => Uint8Array
): Promise<PlannedWrite[]> {
  const writes = new Map<string, PlannedWrite>();
  const get = async (id: string) => {
    const r = await index.getRecord(id);
    if (!r) throw new EffortGraphValidationError(`Unknown artifact ${id}`);
    return r;
  };
  const add = async (
    id: string,
    kind: PrimitiveKind,
    fm: Record<string, unknown>,
    body: string,
    operation: 'create' | 'update' = 'update'
  ) => {
    const path = join(root, KIND_DIRECTORY[kind], `${id}.md`);
    const before =
      operation === 'update'
        ? await readFile(path).catch(() => undefined)
        : undefined;
    writes.set(path, {
      id,
      kind,
      absolutePath: path,
      relativePath: join(KIND_DIRECTORY[kind], `${id}.md`),
      beforeBytes: before,
      afterBytes: serializeDocument(body, fm),
      operation,
    });
  };
  if (input.type === 'CreateEffort') {
    const id =
      input.id ?? generateArtifactId('effort', input.title, randomBytes);
    if (!validateArtifactId(id, 'effort') || (await index.hasId(id)))
      throw new EffortGraphValidationError(`Invalid or duplicate id ${id}`);
    if (input.slug) {
      const existingEfforts = await index.recordsByKind('effort');
      if (existingEfforts.some((r) => r.frontmatter.slug === input.slug))
        throw new EffortGraphValidationError(
          `Duplicate effort slug ${input.slug}`
        );
    }
    await add(
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
    const r = await get(input.effortId);
    if (r.kind !== 'effort')
      throw new EffortGraphValidationError('Not an effort');
    const old = String(r.frontmatter.status);
    if (old === input.status || old === 'completed' || old === 'abandoned')
      throw new EffortGraphValidationError('Illegal effort transition');
    await add(r.id, r.kind, { ...r.frontmatter, status: input.status }, r.body);
    return [...writes.values()];
  }
  if (input.type in kinds) {
    const kind = kinds[input.type];
    const id =
      (input as any).id ??
      generateArtifactId(kind, (input as any).title, randomBytes);
    if (!validateArtifactId(id, kind) || (await index.hasId(id)))
      throw new EffortGraphValidationError('Invalid or duplicate id');
    const effort = await get((input as any).effort);
    if (effort.kind !== 'effort')
      throw new EffortGraphValidationError('Invalid effort');
    const fm: any = {
      ...input,
      id,
      created_at: (input as any).created_at ?? now.toISOString(),
    };
    delete fm.type;
    delete fm.body;
    if (kind === 'issue') fm.status = 'open';
    if (kind === 'decision') fm.state = 'proposed';
    if (kind === 'risk') fm.state = 'open';
    await add(id, kind, fm, (input as any).body, 'create');
    for (const edge of ['supersedes', 'invalidates'] as const) {
      for (const targetId of (fm[edge] as string[] | undefined) ?? []) {
        const target = await get(targetId);
        if (edge === 'supersedes' && target.kind !== kind)
          throw new EffortGraphValidationError(
            'Supersedes must target the same kind'
          );
        if (
          edge === 'supersedes' &&
          (target.frontmatter.superseded_by as string[] | undefined)?.length
        )
          throw new EffortGraphValidationError('Target already superseded');
        if (
          edge === 'invalidates' &&
          !['finding', 'decision'].includes(target.kind)
        )
          throw new EffortGraphValidationError(
            'Invalidation target must be a Finding or Decision'
          );
        const reverse =
          edge === 'supersedes' ? 'superseded_by' : 'invalidated_by';
        await add(
          target.id,
          target.kind,
          {
            ...target.frontmatter,
            [reverse]: [
              ...((target.frontmatter[reverse] as string[] | undefined) ?? []),
              id,
            ],
          },
          target.body
        );
      }
    }
    return [...writes.values()];
  }
  if (input.type === 'Supersede' || input.type === 'Invalidate') {
    const a = await get(
      input.type === 'Supersede' ? input.supersederId : input.findingId
    );
    const b = await get(input.targetId);
    const edge = input.type === 'Supersede' ? 'supersedes' : 'invalidates';
    const back =
      input.type === 'Supersede' ? 'superseded_by' : 'invalidated_by';
    if (
      a.id === b.id ||
      (input.type === 'Supersede' && a.kind !== b.kind) ||
      (a.frontmatter.effort !== b.frontmatter.effort && a.kind !== 'effort')
    )
      throw new EffortGraphValidationError('Invalid edge');
    if (input.type === 'Invalidate') {
      if (a.kind !== 'finding')
        throw new EffortGraphValidationError(
          `Invalidate requires a Finding source, got ${a.kind}`
        );
      if (b.kind !== 'finding' && b.kind !== 'decision')
        throw new EffortGraphValidationError(
          'Invalidation target must be a Finding or Decision'
        );
    }
    if (
      input.type === 'Supersede' &&
      (b.frontmatter[back] as unknown[] | undefined)?.length
    )
      throw new EffortGraphValidationError('Target already superseded');
    if (((a.frontmatter[edge] as string[] | undefined) ?? []).includes(b.id))
      throw new EffortGraphValidationError('Duplicate edge');
    await add(
      a.id,
      a.kind,
      {
        ...a.frontmatter,
        [edge]: [...((a.frontmatter[edge] as string[]) || []), b.id],
      },
      a.body
    );
    await add(
      b.id,
      b.kind,
      {
        ...b.frontmatter,
        [back]: [...((b.frontmatter[back] as string[]) || []), a.id],
        ...(input.type === 'Supersede' && b.kind === 'decision'
          ? { state: 'superseded' }
          : {}),
      },
      b.body
    );
    return [...writes.values()];
  }
  if (input.type === 'ResolveIssue') {
    const r = await get(input.issueId);
    if (r.kind !== 'issue' || r.frontmatter.status !== 'open')
      throw new EffortGraphValidationError('Issue is not open');
    for (const id of input.resolvedBy) {
      const x = await get(id);
      if (x.frontmatter.effort !== r.frontmatter.effort)
        throw new EffortGraphValidationError('Different effort');
    }
    await add(
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
    const r = await get(input.decisionId);
    if (r.kind !== 'decision' || r.frontmatter.state !== 'proposed')
      throw new EffortGraphValidationError('Decision is not proposed');
    await add(r.id, r.kind, { ...r.frontmatter, state: 'accepted' }, r.body);
    if (input.rejectSiblings !== false)
      for (const s of await index.siblingDecisions(
        String(r.frontmatter.effort),
        { state: 'proposed', excludeId: r.id }
      ))
        await add(
          s.id,
          s.kind,
          { ...s.frontmatter, state: 'rejected', rejected_by: r.id },
          s.body
        );
    return [...writes.values()];
  }
  if (input.type === 'MitigateRisk') {
    const r = await get(input.riskId),
      d = await get(input.decisionId);
    if (
      r.kind !== 'risk' ||
      r.frontmatter.state !== 'open' ||
      d.kind !== 'decision' ||
      d.frontmatter.state !== 'accepted' ||
      r.frontmatter.effort !== d.frontmatter.effort
    )
      throw new EffortGraphValidationError('Cannot mitigate risk');
    await add(
      r.id,
      r.kind,
      { ...r.frontmatter, state: 'mitigated', mitigated_by: d.id },
      r.body
    );
    return [...writes.values()];
  }
  if (input.type === 'SetRiskState') {
    const r = await get(input.riskId);
    if (r.kind !== 'risk' || r.frontmatter.state !== 'open')
      throw new EffortGraphValidationError('Risk is not open');
    const evidence = await Promise.all(input.evidence.map(get));
    for (const x of evidence)
      if (x.frontmatter.effort !== r.frontmatter.effort)
        throw new EffortGraphValidationError('Different effort');
    if (
      input.state === 'realized' &&
      !evidence.some((x) => x.kind === 'finding')
    )
      throw new EffortGraphValidationError('Realized risk requires finding');
    await add(
      r.id,
      r.kind,
      { ...r.frontmatter, state: input.state, evidence: input.evidence },
      r.body
    );
    return [...writes.values()];
  }
  throw new EffortGraphValidationError('Unsupported mutation');
}
