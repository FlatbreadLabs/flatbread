import test, { type ExecutionContext } from 'ava';
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import { effortGraphContent } from '@flatbread/effort-graph';
import {
  EXPLORER_BOOTSTRAP_PATH,
  explorerAssetsPresent,
  getExplorerStaticDir,
  setExplorerStaticDirOverride,
} from '@flatbread/explorer';
import { mountExplorerIfMatched } from './explorerMount.js';

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

function requireExplorerAssets(t: ExecutionContext): boolean {
  setExplorerStaticDirOverride(undefined);
  if (!explorerAssetsPresent()) {
    t.fail(
      `Explorer assets missing at ${join(
        getExplorerStaticDir(),
        'index.html'
      )}. Build @flatbread/explorer first.`
    );
    return false;
  }
  return true;
}

test.serial(
  'mounts SPA at / and leaves /graphql and /events for downstream handlers',
  async (t) => {
    if (!requireExplorerAssets(t)) return;

    const app = express();
    const mounted = mountExplorerIfMatched(app, effortGraphContent());
    t.truthy(mounted);
    t.is(mounted!.openPath, '/');

    app.get('/graphql', (_req, res) => {
      res.json({ route: 'graphql' });
    });
    app.get('/events', (_req, res) => {
      res.type('text/event-stream').send('event: test\ndata: {}\n\n');
    });

    const server = await listen(app);
    t.teardown(server.close);

    const home = await fetch(`${server.base}/`);
    t.is(home.status, 200);
    const html = await home.text();
    t.true(html.includes('__FLATBREAD_EXPLORER__'));
    t.true(html.includes('effort-graph'));

    const boot = await fetch(`${server.base}${EXPLORER_BOOTSTRAP_PATH}`);
    t.is(boot.status, 200);
    const json = (await boot.json()) as { preset: string; graphqlPath: string };
    t.is(json.preset, 'effort-graph');
    t.is(json.graphqlPath, '/graphql');

    const graphql = await fetch(`${server.base}/graphql`);
    t.is(graphql.status, 200);
    const graphqlBody = await graphql.text();
    t.false(graphqlBody.includes('__FLATBREAD_EXPLORER__'));
    t.true(graphqlBody.includes('"route":"graphql"'));

    const events = await fetch(`${server.base}/events`);
    t.is(events.status, 200);
    const eventsBody = await events.text();
    t.false(eventsBody.includes('__FLATBREAD_EXPLORER__'));
    t.true(eventsBody.includes('event: test'));
  }
);

test.serial(
  'serves injected HTML for extensionless SPA client routes',
  async (t) => {
    if (!requireExplorerAssets(t)) return;

    const app = express();
    const mounted = mountExplorerIfMatched(app, effortGraphContent());
    t.truthy(mounted);

    const server = await listen(app);
    t.teardown(server.close);

    const clientRoute = await fetch(`${server.base}/effort-graph/view`);
    t.is(clientRoute.status, 200);
    const html = await clientRoute.text();
    t.true(html.includes('__FLATBREAD_EXPLORER__'));
    t.true(html.includes('effort-graph'));
  }
);

test.serial(
  'warns and returns null without SPA routes when assets are missing',
  async (t) => {
    const emptyDir = await mkdtemp(
      join(os.tmpdir(), 'flatbread-explorer-mount-')
    );
    setExplorerStaticDirOverride(emptyDir);
    t.teardown(async () => {
      setExplorerStaticDirOverride(undefined);
      await rm(emptyDir, { recursive: true, force: true });
    });

    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    };
    t.teardown(() => {
      console.warn = originalWarn;
    });

    const app = express();
    const mounted = mountExplorerIfMatched(app, effortGraphContent());
    t.is(mounted, null);
    t.true(
      warnings.some((message) =>
        message.includes('Flatbread explorer assets missing')
      )
    );

    const server = await listen(app);
    t.teardown(server.close);

    const home = await fetch(`${server.base}/`);
    t.is(home.status, 404);
  }
);

test.serial('does not mount explorer for ordinary content', async (t) => {
  const app = express();
  const mounted = mountExplorerIfMatched(app, [
    { collection: 'Post', path: 'posts' },
  ]);
  t.is(mounted, null);

  const server = await listen(app);
  t.teardown(server.close);

  const res = await fetch(`${server.base}/`);
  t.is(res.status, 404);
});
