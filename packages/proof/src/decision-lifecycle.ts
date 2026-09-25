import { ProofValidationError } from './errors.js';
import type { ProofSnapshot, ProofSnapshotArtifact } from './snapshot.js';

export interface DecisionLifecycleChange {
  readonly record: ProofSnapshotArtifact;
  readonly nextFrontmatter: Readonly<Record<string, unknown>>;
}
export interface AcceptDecisionLifecycleInput {
  readonly decisionId: string;
  readonly rejectSiblings: boolean;
  readonly rejects?: readonly string[];
}
function questionIds(
  snapshot: ProofSnapshot,
  record: ProofSnapshotArtifact
): Set<string> {
  const ids = record.frontmatter.derives_from;
  if (!Array.isArray(ids)) return new Set();
  return new Set(
    ids.filter((id): id is string => {
      if (typeof id !== 'string') return false;
      const issue = snapshot.getRecord(id);
      return (
        issue?.kind === 'issue' &&
        issue.frontmatter.kind === 'question' &&
        issue.frontmatter.retracted !== true
      );
    })
  );
}
export function acceptDecisionLifecycle(
  snapshot: ProofSnapshot,
  input: AcceptDecisionLifecycleInput
): readonly DecisionLifecycleChange[] {
  const target = snapshot.getRecord(input.decisionId);
  if (!target)
    throw new ProofValidationError(`Unknown artifact ${input.decisionId}`);
  if (target.kind !== 'decision' || target.frontmatter.state !== 'proposed')
    throw new ProofValidationError('Decision is not proposed');
  const questions = questionIds(snapshot, target);
  const accepted = snapshot.siblingDecisions(
    String(target.frontmatter.effort),
    {
      state: 'accepted',
      excludeId: target.id,
    }
  );
  for (const other of accepted) {
    if ([...questionIds(snapshot, other)].some((id) => questions.has(id)))
      throw new ProofValidationError(
        `Question already has accepted Decision ${other.id}`
      );
  }
  const history = target.frontmatter.reopen_history;
  if (Array.isArray(history)) {
    for (const entry of history) {
      const rejectorId =
        entry && typeof entry === 'object'
          ? (entry as Record<string, unknown>).rejected_by
          : undefined;
      const rejector =
        typeof rejectorId === 'string'
          ? snapshot.getRecord(rejectorId)
          : undefined;
      if (
        rejector?.kind === 'decision' &&
        rejector.frontmatter.effort === target.frontmatter.effort &&
        rejector.frontmatter.state === 'accepted' &&
        rejector.frontmatter.retracted !== true
      )
        throw new ProofValidationError(
          `Decision was rejected by accepted Decision ${rejector.id}`
        );
    }
  }
  const changes: DecisionLifecycleChange[] = [
    {
      record: target,
      nextFrontmatter: { ...target.frontmatter, state: 'accepted' },
    },
  ];
  const siblings = input.rejectSiblings
    ? snapshot
        .siblingDecisions(String(target.frontmatter.effort), {
          state: 'proposed',
          excludeId: target.id,
        })
        .filter((sibling) =>
          [...questionIds(snapshot, sibling)].some((id) => questions.has(id))
        )
    : [];
  const rejectIds = new Set([
    ...siblings.map((sibling) => sibling.id),
    ...(input.rejects ?? []),
  ]);
  for (const id of rejectIds) {
    const sibling = snapshot.getRecord(id);
    if (
      !sibling ||
      sibling.kind !== 'decision' ||
      sibling.id === target.id ||
      sibling.frontmatter.effort !== target.frontmatter.effort ||
      sibling.frontmatter.state !== 'proposed' ||
      sibling.frontmatter.retracted === true
    )
      throw new ProofValidationError(`Cannot reject Decision ${id}`);
    changes.push({
      record: sibling,
      nextFrontmatter: {
        ...sibling.frontmatter,
        state: 'rejected',
        rejected_by: target.id,
      },
    });
  }
  return changes;
}
export function reopenDecisionLifecycle(
  snapshot: ProofSnapshot,
  decisionId: string,
  reason: string,
  now: Date
): DecisionLifecycleChange {
  const target = snapshot.getRecord(decisionId);
  if (
    !target ||
    target.kind !== 'decision' ||
    target.frontmatter.state !== 'rejected' ||
    target.frontmatter.retracted === true
  )
    throw new ProofValidationError('Decision is not a live rejected Decision');
  const history = Array.isArray(target.frontmatter.reopen_history)
    ? target.frontmatter.reopen_history
    : [];
  const nextFrontmatter: Record<string, unknown> = {
    ...target.frontmatter,
    state: 'proposed',
    reopen_history: [
      ...history,
      {
        at: now.toISOString(),
        reason,
        rejected_by: target.frontmatter.rejected_by ?? null,
      },
    ],
  };
  delete nextFrontmatter.rejected_by;
  return { record: target, nextFrontmatter };
}
export function supersedeDecisionLifecycle(
  snapshot: ProofSnapshot,
  decisionId: string
): DecisionLifecycleChange {
  const target = snapshot.getRecord(decisionId);
  if (!target) throw new ProofValidationError(`Unknown artifact ${decisionId}`);
  if (target.kind !== 'decision')
    throw new ProofValidationError('Not a Decision');
  return {
    record: target,
    nextFrontmatter: { ...target.frontmatter, state: 'superseded' },
  };
}
