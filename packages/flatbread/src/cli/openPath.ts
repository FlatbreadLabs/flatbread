import { matchExplorerPreset } from '@flatbread/explorer';
import type { ContentEntry } from '@flatbread/core';

export const GRAPHQL_ENDPOINT = '/graphql';
export const EXPLORER_ENDPOINT = '/';

/**
 * Browser path for `flatbread start --open`.
 * Explorer root when a preset matches; otherwise the Apollo sandbox.
 */
export function resolveCliOpenPath(
  content: readonly ContentEntry[] | undefined
): string {
  if (content && matchExplorerPreset(content)) return EXPLORER_ENDPOINT;
  return GRAPHQL_ENDPOINT;
}
