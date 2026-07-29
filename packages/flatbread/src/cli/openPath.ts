import {
  explorerAssetsPresent,
  matchExplorerPreset,
} from '@flatbread/explorer';
import type { ContentEntry } from '@flatbread/core';

export const GRAPHQL_ENDPOINT = '/graphql';
export const EXPLORER_ENDPOINT = '/';

/**
 * Browser path for `--open` / welcome: `/` only when an explorer preset matches
 * **and** static assets are present (same gate as `mountExplorerIfMatched`);
 * otherwise `/graphql`.
 */
export function resolveOpenPath(
  content: readonly ContentEntry[] | undefined
): string {
  if (content && matchExplorerPreset(content) && explorerAssetsPresent()) {
    return EXPLORER_ENDPOINT;
  }
  return GRAPHQL_ENDPOINT;
}

/** Alias of `resolveOpenPath` for existing call sites. */
export const resolveCliOpenPath = resolveOpenPath;
