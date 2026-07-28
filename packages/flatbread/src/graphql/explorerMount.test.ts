import test, { type ExecutionContext } from 'ava';
import express from 'express';
import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import { effortGraphContent } from '@flatbread/effort-graph';
import {
  EXPLORER_BOOTSTRAP_PATH,
  explorerAssetsPresent,
  getExplorerStaticDir,
  setExplorerStaticDirOverride,
} from '@flatbread/explorer';
import { mountExplorer, mountExplorerIfMatched } from './explorerMount.js';

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

    // Register after the mount, same order as liveServer.ts.
    // use() so /graphql/anything and /events/ reach the sentinel too.
    app.use('/graphql', (_req, res) => {
      res.json({ route: 'graphql' });
    });
    app.use('/events', (_req, res) => {
      res.json({ sse: true });
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
    const json = (await boot.json()) as {
      preset: string;
      graphqlPath: string;
      eventsPath: string;
    };
    t.is(json.preset, 'effort-graph');
    t.is(json.graphqlPath, '/graphql');
    t.is(json.eventsPath, '/events');

    for (const path of ['/graphql', '/graphql/anything'] as const) {
      const res = await fetch(`${server.base}${path}`);
      t.is(res.status, 200, path);
      const body = await res.text();
      t.false(body.includes('__FLATBREAD_EXPLORER__'), path);
      t.true(body.includes('"route":"graphql"'), path);
    }

    for (const path of ['/events', '/events/'] as const) {
      const res = await fetch(`${server.base}${path}`);
      t.is(res.status, 200, path);
      const body = await res.text();
      t.false(body.includes('__FLATBREAD_EXPLORER__'), path);
      t.true(body.includes('"sse":true'), path);
    }
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
  'missing static file with extension falls through SPA fallback',
  async (t) => {
    if (!requireExplorerAssets(t)) return;

    const app = express();
    const mounted = mountExplorerIfMatched(app, effortGraphContent());
    t.truthy(mounted);

    app.use((_req, res) => {
      res.status(404).json({ sentinel: 'missing-asset' });
    });

    const server = await listen(app);
    t.teardown(server.close);

    const res = await fetch(`${server.base}/missing-asset.js`);
    t.is(res.status, 404);
    const body = await res.text();
    t.false(body.includes('__FLATBREAD_EXPLORER__'));
    t.true(body.includes('"sentinel":"missing-asset"'));
  }
);

test.serial(
  'existing static asset returns 200 without injected explorer HTML',
  async (t) => {
    if (!requireExplorerAssets(t)) return;

    const assetsDir = join(getExplorerStaticDir(), 'assets');
    const files = await readdir(assetsDir);
    const assetFile = files.find(
      (name) => name.endsWith('.js') && !name.endsWith('.map')
    );
    if (!assetFile) {
      t.fail(`No .js asset under ${assetsDir}`);
      return;
    }

    const app = express();
    const mounted = mountExplorerIfMatched(app, effortGraphContent());
    t.truthy(mounted);

    const server = await listen(app);
    t.teardown(server.close);

    const res = await fetch(`${server.base}/assets/${assetFile}`);
    t.is(res.status, 200);
    const body = await res.text();
    t.false(body.includes('__FLATBREAD_EXPLORER__'));
  }
);

test.serial(
  'inactive gate lets bootstrap path fall through to downstream handler',
  async (t) => {
    const app = express();
    const mounted = mountExplorerIfMatched(app, [
      { collection: 'Post', path: 'posts' },
    ]);
    t.is(mounted, null);

    app.get(EXPLORER_BOOTSTRAP_PATH, (_req, res) => {
      res.json({ sentinel: 'bootstrap-inactive' });
    });

    const server = await listen(app);
    t.teardown(server.close);

    const res = await fetch(`${server.base}${EXPLORER_BOOTSTRAP_PATH}`);
    t.is(res.status, 200);
    const json = (await res.json()) as { sentinel: string };
    t.is(json.sentinel, 'bootstrap-inactive');
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

test.serial(
  'update deactivates once when assets vanish and reactivates when restored',
  async (t) => {
    if (!requireExplorerAssets(t)) return;

    const emptyDir = await mkdtemp(
      join(os.tmpdir(), 'flatbread-explorer-reload-')
    );
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
    const handle = mountExplorer(app, effortGraphContent());
    t.true(handle.isActive());

    const server = await listen(app);
    t.teardown(server.close);

    const homeActive = await fetch(`${server.base}/`);
    t.is(homeActive.status, 200);
    t.true((await homeActive.text()).includes('__FLATBREAD_EXPLORER__'));

    setExplorerStaticDirOverride(emptyDir);
    handle.update(effortGraphContent());
    t.false(handle.isActive());
    t.is(
      warnings.filter((message) =>
        message.includes('Flatbread explorer assets missing')
      ).length,
      1
    );

    const homeInactive = await fetch(`${server.base}/`);
    t.false((await homeInactive.text()).includes('__FLATBREAD_EXPLORER__'));

    handle.update(effortGraphContent());
    t.false(handle.isActive());
    t.is(
      warnings.filter((message) =>
        message.includes('Flatbread explorer assets missing')
      ).length,
      1
    );

    setExplorerStaticDirOverride(undefined);
    handle.update(effortGraphContent());
    t.true(handle.isActive());

    const homeRestored = await fetch(`${server.base}/`);
    t.is(homeRestored.status, 200);
    t.true((await homeRestored.text()).includes('__FLATBREAD_EXPLORER__'));
  }
);

test.serial(
  'update deactivates when index.html becomes unreadable after a present check',
  async (t) => {
    const staticDir = await mkdtemp(
      join(os.tmpdir(), 'flatbread-explorer-eisdir-')
    );
    const indexHtmlPath = join(staticDir, 'index.html');
    await writeFile(
      indexHtmlPath,
      '<!doctype html><html><head></head><body></body></html>\n',
      'utf8'
    );
    setExplorerStaticDirOverride(staticDir);
    t.teardown(async () => {
      setExplorerStaticDirOverride(undefined);
      await rm(staticDir, { recursive: true, force: true });
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
    const handle = mountExplorer(app, effortGraphContent());
    t.true(handle.isActive());

    const server = await listen(app);
    t.teardown(server.close);

    // existsSync stays true for a directory; readFileSync throws EISDIR.
    await unlink(indexHtmlPath);
    await mkdir(indexHtmlPath);

    handle.update(effortGraphContent());
    t.false(handle.isActive());
    t.is(
      warnings.filter((message) =>
        message.includes('Flatbread explorer assets missing')
      ).length,
      1
    );

    const home = await fetch(`${server.base}/`);
    t.false((await home.text()).includes('__FLATBREAD_EXPLORER__'));
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
