import test from 'ava';
import { proofContent } from '@flatbread/proof';
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

test.serial('resolveCliOpenPath is an alias of resolveOpenPath', (t) => {
  t.is(resolveCliOpenPath, resolveOpenPath);
});

test.serial(
  'opens explorer root when preset matches and assets are present',
  (t) => {
    setExplorerStaticDirOverride(undefined);
    if (!explorerAssetsPresent()) {
      t.fail(
        'Explorer assets missing. Build @flatbread/explorer first (`pnpm --filter @flatbread/explorer build`).'
      );
      return;
    }
    t.is(resolveOpenPath(proofContent()), EXPLORER_ENDPOINT);
    t.is(resolveOpenPath(proofContent()), '/');
    t.is(resolveCliOpenPath(proofContent()), EXPLORER_ENDPOINT);
    t.is(resolveCliOpenPath(proofContent()), '/');
  }
);

test.serial('opens GraphQL sandbox when no explorer preset matches', (t) => {
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

    t.is(resolveOpenPath(proofContent()), GRAPHQL_ENDPOINT);
    t.is(resolveOpenPath(proofContent()), '/graphql');
    t.not(resolveOpenPath(proofContent()), EXPLORER_ENDPOINT);
    t.not(resolveOpenPath(proofContent()), '/');

    t.is(resolveCliOpenPath(proofContent()), GRAPHQL_ENDPOINT);
    t.is(resolveCliOpenPath(proofContent()), '/graphql');
    t.not(resolveCliOpenPath(proofContent()), EXPLORER_ENDPOINT);
    t.not(resolveCliOpenPath(proofContent()), '/');
  }
);
