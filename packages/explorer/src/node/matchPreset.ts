import { findEffortGraphContentRoot } from '@flatbread/effort-graph';

export type ExplorerPresetId = 'effort-graph';

export interface ExplorerPresetMatch {
  preset: ExplorerPresetId;
  /** Content root for the matched preset (Effort Graph markdown tree). */
  root: string;
}

type ContentLike = readonly {
  collection: string;
  path?: string;
  refs?: Record<string, unknown>;
}[];

/**
 * Return the explorer preset that should mount for this Flatbread content
 * config, or `null` when no registered preset matches.
 */
export function matchExplorerPreset(
  content: ContentLike
): ExplorerPresetMatch | null {
  const root = findEffortGraphContentRoot(
    content as Parameters<typeof findEffortGraphContentRoot>[0]
  );
  if (!root) return null;
  return { preset: 'effort-graph', root };
}
