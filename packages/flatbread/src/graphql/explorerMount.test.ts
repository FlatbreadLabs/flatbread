import test from 'ava';
import express from 'express';
import { join } from 'node:path';
import { effortGraphContent } from '@flatbread/effort-graph';
import {
  EXPLORER_BOOTSTRAP_PATH,
  getExplorerStaticDir,
} from '@flatbread/explorer';
import { mountExplorerIfMatched, resolveOpenPath } from './explorerMount.js';

test('resolveOpenPath prefers explorer for Effort Graph configs', (t) => {
  t.is(resolveOpenPath(effortGraphContent()), '/');
  t.is(resolveOpenPath([{ collection: 'Post', path: 'posts' }]), '/graphql');
});

test.serial(
  'mounts SPA at / and leaves /graphql for Apollo when assets exist',
  async (t) => {
    const staticDir = getExplorerStaticDir();
    const indexPath = join(staticDir, 'index.html');
    // Build must have produced assets; skip soft-fail would hide regressions.
    const { access } = await import('node:fs/promises');
    try {
      await access(indexPath);
    } catch {
      t.fail(
        `Explorer assets missing at ${indexPath}. Build @flatbread/explorer first.`
      );
      return;
    }

    const app = express();
    const mounted = mountExplorerIfMatched(app, effortGraphContent());
    t.truthy(mounted);
    t.is(mounted!.openPath, '/');

    // Capture handlers by issuing a fake request through the stack.
    const server = app.listen(0);
    t.teardown(
      () =>
        new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        })
    );
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      t.fail('expected TCP address');
      return;
    }
    const base = `http://127.0.0.1:${address.port}`;

    const home = await fetch(`${base}/`);
    t.is(home.status, 200);
    const html = await home.text();
    t.true(html.includes('__FLATBREAD_EXPLORER__'));
    t.true(html.includes('effort-graph'));

    const boot = await fetch(`${base}${EXPLORER_BOOTSTRAP_PATH}`);
    t.is(boot.status, 200);
    const json = (await boot.json()) as { preset: string; graphqlPath: string };
    t.is(json.preset, 'effort-graph');
    t.is(json.graphqlPath, '/graphql');
  }
);

test.serial('does not mount explorer for ordinary content', async (t) => {
  const app = express();
  const mounted = mountExplorerIfMatched(app, [
    { collection: 'Post', path: 'posts' },
  ]);
  t.is(mounted, null);

  const server = app.listen(0);
  t.teardown(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      })
  );
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    t.fail('expected TCP address');
    return;
  }
  const res = await fetch(`http://127.0.0.1:${address.port}/`);
  // No route registered → Express default 404
  t.is(res.status, 404);
});
