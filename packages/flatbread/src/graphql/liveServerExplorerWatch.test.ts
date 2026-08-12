import test from 'ava';
import express from 'express';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { initializeConfig } from '@flatbread/core';
import { proofContent } from '@flatbread/proof';
import {
  explorerAssetsPresent,
  setExplorerStaticDirOverride,
} from '@flatbread/explorer';
import type { ConfigResult, LoadedFlatbreadConfig } from '@flatbread/core';
import { mountExplorer } from './explorerMount.js';
import { startGraphqlServer } from './liveServer.js';

async function makeDir() {
  const dir = await mkdtemp(join(process.cwd(), '.tmp-explorer-watch-'));
  const root = join(dir, 'graph');
  for (const path of [
    'efforts',
    'issues',
    'findings',
    'decisions',
    'constraints',
    'risks',
    'citations',
    'blobs',
  ])
    await mkdir(join(root, path), { recursive: true });
  await mkdir(join(root, 'plain'), { recursive: true });
  return { dir, root, relativeRoot: relative(process.cwd(), root) };
}

function config(
  root: string,
  active: boolean
): ConfigResult<LoadedFlatbreadConfig> {
  return {
    config: initializeConfig({
      source: filesystem(),
      transformer: markdownTransformer(),
      content: active
        ? proofContent(root)
        : [{ collection: 'Plain', path: `${root}/plain` }],
    }),
  };
}

async function listen(app: express.Express) {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('expected TCP address');
  }
  return {
    base: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function query(port: number, source: string) {
  const response = await fetch(`http://localhost:${port}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: source }),
  });
  return (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: Array<{ message: string }>;
  };
}

function requireExplorerAssets(): void {
  setExplorerStaticDirOverride(undefined);
  if (!explorerAssetsPresent()) {
    throw new Error(
      'Explorer assets missing. Build @flatbread/explorer first (`pnpm --filter @flatbread/explorer build`).'
    );
  }
}

test.serial(
  'mountExplorer gate toggles SPA off and on without remounting Express',
  async (t) => {
    requireExplorerAssets();

    const app = express();
    const handle = mountExplorer(app, proofContent('.flatbread-proof'));
    t.true(handle.isActive());

    app.post('/graphql', (_req, res) => {
      res.json({ data: { ok: true } });
    });

    const server = await listen(app);
    t.teardown(server.close);

    const homeActive = await fetch(`${server.base}/`);
    t.is(homeActive.status, 200);
    t.true((await homeActive.text()).includes('__FLATBREAD_EXPLORER__'));

    handle.update([{ collection: 'Post', path: 'posts' }]);
    t.false(handle.isActive());

    const homeInactive = await fetch(`${server.base}/`);
    t.is(homeInactive.status, 404);
    t.false((await homeInactive.text()).includes('__FLATBREAD_EXPLORER__'));

    const graphql = await fetch(`${server.base}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    });
    t.is(graphql.status, 200);
    t.true((await graphql.text()).includes('"ok":true'));

    handle.update(proofContent('.flatbread-proof'));
    t.true(handle.isActive());

    const homeReenabled = await fetch(`${server.base}/`);
    t.is(homeReenabled.status, 200);
    t.true((await homeReenabled.text()).includes('__FLATBREAD_EXPLORER__'));
  }
);

test.serial(
  'config reload via replaceConfig clears sticky explorer when preset is removed',
  async (t) => {
    requireExplorerAssets();

    const fixture = await makeDir();
    t.teardown(() => rm(fixture.dir, { recursive: true, force: true }));

    const server = await startGraphqlServer({
      config: config(fixture.relativeRoot, true),
      port: 0,
    });
    t.teardown(() => server.close());

    t.true(server.explorer);
    const homeBefore = await fetch(`http://localhost:${server.port}/`);
    t.is(homeBefore.status, 200);
    t.true((await homeBefore.text()).includes('__FLATBREAD_EXPLORER__'));

    const inactive = config(fixture.relativeRoot, false).config!;
    const result = await server.reloader.replaceConfig(inactive);
    t.is(result.status, 'committed');
    t.false(server.explorer);

    const homeAfter = await fetch(`http://localhost:${server.port}/`);
    t.false((await homeAfter.text()).includes('__FLATBREAD_EXPLORER__'));

    const gql = await query(server.port, '{ __typename }');
    t.deepEqual(gql.errors, undefined);
    t.is(gql.data?.__typename, 'Query');
  }
);

test.serial(
  'config reload via replaceConfig enables explorer when preset is added',
  async (t) => {
    requireExplorerAssets();

    const fixture = await makeDir();
    t.teardown(() => rm(fixture.dir, { recursive: true, force: true }));

    const server = await startGraphqlServer({
      config: config(fixture.relativeRoot, false),
      port: 0,
    });
    t.teardown(() => server.close());

    t.false(server.explorer);
    const homeBefore = await fetch(`http://localhost:${server.port}/`);
    t.false((await homeBefore.text()).includes('__FLATBREAD_EXPLORER__'));

    const active = config(fixture.relativeRoot, true).config!;
    const result = await server.reloader.replaceConfig(active);
    t.is(result.status, 'committed');
    t.true(server.explorer);

    const homeAfter = await fetch(`http://localhost:${server.port}/`);
    t.is(homeAfter.status, 200);
    t.true((await homeAfter.text()).includes('__FLATBREAD_EXPLORER__'));

    const gql = await query(server.port, '{ __typename }');
    t.deepEqual(gql.errors, undefined);
    t.is(gql.data?.__typename, 'Query');
  }
);
