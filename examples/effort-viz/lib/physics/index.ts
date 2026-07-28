/**
 * Public entry point for the Effort Graph 2D physics + growth engine.
 *
 * Import from here, not from the submodules, so we can freely refactor
 * internals without breaking consumers.
 */

export { createGraphSimulation } from './simulation';
export {
  buildVeinPath,
  clamp01,
  easeInCubic,
  easeOutCubic,
  effectiveRadius,
  isEdgeGone,
  isNodeGone,
  veinTipPolyline,
} from './growth';
export { hashString, mulberry32, rngFromId } from './hash';
export type {
  GraphInputEdge,
  GraphInputNode,
  GraphSimulation,
  LifecycleState,
  NodeKind,
  SimEdge,
  SimNode,
  SimulationOptions,
  SimulationState,
  VeinPoint,
} from './types';
