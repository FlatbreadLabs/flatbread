import { ProofValidationError } from './errors.js';
import type { ProofSnapshot, ProofSnapshotArtifact } from './snapshot.js';

export interface DecisionLifecycleChange {
  readonly record: ProofSnapshotArtifact;
  readonly nextFrontmatter: Readonly<Record<string, unknown>>;
}
export interface AcceptDecisionLifecycleInput {
  readonly decisionId: string;
  readonly rejectSiblings: boolean;
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
  const changes: DecisionLifecycleChange[] = [
    {
      record: target,
      nextFrontmatter: { ...target.frontmatter, state: 'accepted' },
    },
  ];
  if (input.rejectSiblings)
    for (const sibling of snapshot.siblingDecisions(
      String(target.frontmatter.effort),
      { state: 'proposed', excludeId: target.id }
    ))
      changes.push({
        record: sibling,
        nextFrontmatter: {
          ...sibling.frontmatter,
          state: 'rejected',
          rejected_by: target.id,
        },
      });
  return changes;
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
