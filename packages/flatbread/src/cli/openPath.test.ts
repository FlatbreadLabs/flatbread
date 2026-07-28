import test from 'ava';
import { effortGraphContent } from '@flatbread/effort-graph';
import {
  explorerAssetsPresent,
  setExplorerStaticDirOverride,
} from '@flatbread/explorer';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import {
  EXPLORER_ENDPOINT,
  GRAPHQL_ENDPOINT,
  resolveCliOpenPath,
  resolveOpenPath,
} from './openPath.js';

test('resolveCliOpenPath is an alias of resolveOpenPath', (t) => {
  t.is(resolveCliOpenPath, resolveOpenPath);
});

test('opens explorer root when preset matches and assets are present', (t) => {
  setExplorerStaticDirOverride(undefined);
  if (!explorerAssetsPresent()) {
    t.fail(
      'Explorer assets missing. Build @flatbread/explorer first (`pnpm --filter @flatbread/explorer build`).'
    );
    return;
  }
  t.is(resolveOpenPath(effortGraphContent()), EXPLORER_ENDPOINT);
  t.is(resolveOpenPath(effortGraphContent()), '/');
  t.is(resolveCliOpenPath(effortGraphContent()), EXPLORER_ENDPOINT);
  t.is(resolveCliOpenPath(effortGraphContent()), '/');
});

test('opens GraphQL sandbox when no explorer preset matches', (t) => {
  t.is(
    resolveOpenPath([{ collection: 'Post', path: 'posts' }]),
    GRAPHQL_ENDPOINT
  );
  t.is(
    resolveCliOpenPath([{ collection: 'Post', path: 'posts' }]),
    GRAPHQL_ENDPOINT
  );
  t.is(resolveOpenPath(undefined), GRAPHQL_ENDPOINT);
  t.is(resolveCliOpenPath(undefined), GRAPHQL_ENDPOINT);
});

test.serial(
  'opens GraphQL sandbox when preset matches but assets are missing',
  async (t) => {
    const emptyDir = await mkdtemp(
      join(os.tmpdir(), 'flatbread-explorer-openpath-')
    );
    setExplorerStaticDirOverride(emptyDir);
    t.teardown(async () => {
      setExplorerStaticDirOverride(undefined);
      await rm(emptyDir, { recursive: true, force: true });
    });

    t.is(resolveOpenPath(effortGraphContent()), GRAPHQL_ENDPOINT);
    t.is(resolveOpenPath(effortGraphContent()), '/graphql');
    t.not(resolveOpenPath(effortGraphContent()), EXPLORER_ENDPOINT);
    t.not(resolveOpenPath(effortGraphContent()), '/');

    t.is(resolveCliOpenPath(effortGraphContent()), GRAPHQL_ENDPOINT);
    t.is(resolveCliOpenPath(effortGraphContent()), '/graphql');
    t.not(resolveCliOpenPath(effortGraphContent()), EXPLORER_ENDPOINT);
    t.not(resolveCliOpenPath(effortGraphContent()), '/');
  }
);
