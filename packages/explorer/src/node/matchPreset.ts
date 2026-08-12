import { findProofContentRoot } from '@flatbread/proof';

export type ExplorerPresetId = 'proof';

export interface ExplorerPresetMatch {
  preset: ExplorerPresetId;
  /** Content root for the matched preset (Proof markdown tree). */
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
  const root = findProofContentRoot(
    content as Parameters<typeof findProofContentRoot>[0]
  );
  if (!root) return null;
  return { preset: 'proof', root };
}
