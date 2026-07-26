/**
 * Effective lifecycle — what a record's state actually *is*, as opposed to
 * what its frontmatter says.
 *
 * Forward edges are the authoritative representation of supersession and
 * invalidation, and frontmatter `state` can lag behind them: a Decision
 * replaced via an inline `supersedes` on create keeps `state: accepted` and is
 * marked as history only by its `superseded_by` edge. Reading `state` alone
 * therefore labels retired reasoning as committed — the exact opposite of the
 * truth, on the record a reader most needs to get right.
 *
 * That particular lag is a writer defect, tracked as
 * `iss-writedecision-with-supersedes-leaves-the-superse--by624gyf21ex42sv`.
 * Deriving from edges is the right call regardless of when it is fixed, since
 * edges also cover legacy and hand-edited records.
 *
 * Everything that shows state (canvas glyphs, drawer badge, counts) reads from
 * here so they cannot disagree.
 */

import type { GraphEdge, GraphNode, GraphNodeKind } from './types';

/**
 * How alive a record is. Three values, deliberately: one more channel than
 * this and the canvas has more states than a reader can hold at a glance.
 */
export type Aliveness =
  /** Awaiting a call: open Issue or Risk, proposed Decision. */
  | 'open'
  /** Committed, closed, or stateless. The resting appearance. */
  | 'settled'
  /** Overturned: rejected, superseded, invalidated, or wontfix. */
  | 'retired';

export interface EffectiveLifecycle {
  /** Lowercase lifecycle token, e.g. `superseded`, `wontfix`, `proposed`. */
  state: string | undefined;
  aliveness: Aliveness;
  /** True when this record was overturned by an edge rather than by its own state. */
  overturnedByEdge: boolean;
}

/** States that mean "this reasoning is no longer live". */
const RETIRED_STATES = new Set([
  'rejected',
  'superseded',
  'invalidated',
  'wontfix',
  'deprecated',
  'abandoned',
]);

/** States that mean "somebody still owes this a call". */
const OPEN_STATES = new Set(['open', 'proposed', 'deferred', 'active']);

/**
 * Index the edges that override frontmatter state.
 *
 * Forward edges are authoritative in this datamodel, so both directions of a
 * supersession pair are checked: the record carrying `superseded_by`, and the
 * target of somebody else's `supersedes`.
 */
export function buildLifecycleIndex(edges: GraphEdge[]): {
  superseded: Set<string>;
  invalidated: Set<string>;
  rejected: Set<string>;
} {
  const superseded = new Set<string>();
  const invalidated = new Set<string>();
  const rejected = new Set<string>();

  for (const edge of edges) {
    switch (edge.kind) {
      case 'superseded_by':
        superseded.add(edge.source);
        break;
      case 'supersedes':
        superseded.add(edge.target);
        break;
      case 'invalidates':
        invalidated.add(edge.target);
        break;
      case 'rejected_by':
        rejected.add(edge.source);
        break;
      default:
        break;
    }
  }

  return { superseded, invalidated, rejected };
}

export type LifecycleIndex = ReturnType<typeof buildLifecycleIndex>;

/** Empty index, for call sites that have no edges yet. */
export const EMPTY_LIFECYCLE_INDEX: LifecycleIndex = {
  superseded: new Set(),
  invalidated: new Set(),
  rejected: new Set(),
};

function alivenessOf(state: string | undefined): Aliveness {
  if (!state) return 'settled';
  if (RETIRED_STATES.has(state)) return 'retired';
  if (OPEN_STATES.has(state)) return 'open';
  return 'settled';
}

/**
 * Resolve a record's real lifecycle. Edge-derived retirement wins over
 * frontmatter, because an accepted-then-superseded Decision is history no
 * matter what its own state field still claims.
 */
export function effectiveLifecycle(
  node: GraphNode,
  index: LifecycleIndex
): EffectiveLifecycle {
  const declared = (node.lifecycle ?? node.status ?? node.state)?.toLowerCase();

  if (index.invalidated.has(node.id)) {
    return { state: 'invalidated', aliveness: 'retired', overturnedByEdge: true };
  }
  if (index.superseded.has(node.id)) {
    return { state: 'superseded', aliveness: 'retired', overturnedByEdge: true };
  }
  if (index.rejected.has(node.id) && declared !== 'rejected') {
    return { state: 'rejected', aliveness: 'retired', overturnedByEdge: true };
  }

  return {
    state: declared,
    aliveness: alivenessOf(declared),
    overturnedByEdge: false,
  };
}

/** Resolve aliveness for every node in one pass. */
export function buildAlivenessMap(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, EffectiveLifecycle> {
  const index = buildLifecycleIndex(edges);
  const map = new Map<string, EffectiveLifecycle>();
  for (const node of nodes) map.set(node.id, effectiveLifecycle(node, index));
  return map;
}

/**
 * Headline counts for the top bar, phrased in primitives rather than in
 * nodes and edges. Counts what a reader cares about: how much work is
 * tracked, and what still needs a call.
 */
export interface GraphSummary {
  efforts: number;
  openIssues: number;
  proposedDecisions: number;
  /** Open plus realized: a Risk that already came true is not "settled" work. */
  liveRisks: number;
  retired: number;
  records: number;
}

export function summarizeGraph(
  nodes: GraphNode[],
  lifecycles: Map<string, EffectiveLifecycle>
): GraphSummary {
  const summary: GraphSummary = {
    efforts: 0,
    openIssues: 0,
    proposedDecisions: 0,
    liveRisks: 0,
    retired: 0,
    records: 0,
  };

  for (const node of nodes) {
    const life = lifecycles.get(node.id);
    if (node.kind === 'effort') {
      summary.efforts += 1;
      continue;
    }
    summary.records += 1;
    if (life?.aliveness === 'retired') {
      summary.retired += 1;
      continue;
    }
    // A realized Risk is `settled` on the aliveness axis — nothing is going to
    // overturn it — but it is the record a reader most needs surfaced, so it
    // counts alongside open Risks rather than disappearing from every total.
    if (node.kind === 'risk' && (life?.aliveness === 'open' || life?.state === 'realized')) {
      summary.liveRisks += 1;
      continue;
    }
    if (life?.aliveness !== 'open') continue;
    if (node.kind === 'issue') summary.openIssues += 1;
    else if (node.kind === 'decision' && life.state === 'proposed') {
      summary.proposedDecisions += 1;
    }
  }

  return summary;
}

/** True for Issues that gate an Effort — `kind: blocker` and still open. */
export function isOpenBlocker(
  node: GraphNode,
  life: EffectiveLifecycle | undefined
): boolean {
  return (
    node.kind === 'issue' &&
    node.kindLabel === 'blocker' &&
    life?.aliveness === 'open'
  );
}

export type { GraphNodeKind };
