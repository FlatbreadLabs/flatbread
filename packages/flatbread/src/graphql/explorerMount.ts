import {
  EXPLORER_BOOTSTRAP_PATH,
  getExplorerStaticDir,
  matchExplorerPreset,
  type ExplorerPresetMatch,
} from '@flatbread/explorer';
import type { ContentEntry } from '@flatbread/core';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import fs from 'node:fs';
import path from 'node:path';

const GRAPHQL_PATH = '/graphql';
const EVENTS_PATH = '/events';

export interface ExplorerMountResult {
  match: ExplorerPresetMatch;
  /** Browser path to open (`/` when the explorer is mounted). */
  openPath: '/';
}

/**
 * When a registered explorer preset matches, serve the SPA at `/`.
 * Callers should mount Apollo afterward; this middleware `next()`s for
 * `/graphql` and `/events` so those API routes still work. Returns null when
 * no preset matches.
 */
export function mountExplorerIfMatched(
  app: Express,
  content: readonly ContentEntry[]
): ExplorerMountResult | null {
  const match = matchExplorerPreset(content);
  if (!match) return null;

  const staticDir = getExplorerStaticDir();
  const indexHtmlPath = path.join(staticDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.warn(
      `Flatbread explorer assets missing at ${staticDir}. Run \`pnpm --filter @flatbread/explorer build\`.`
    );
    return null;
  }

  const bootstrap = {
    preset: match.preset,
    graphqlPath: GRAPHQL_PATH,
    eventsPath: EVENTS_PATH,
  };

  app.get(EXPLORER_BOOTSTRAP_PATH, (_req, res) => {
    res.json(bootstrap);
  });

  // Inject bootstrap into index.html so the SPA knows same-origin endpoints
  // without an extra round-trip before first paint.
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const bootScript = `<script>window.__FLATBREAD_EXPLORER__=${JSON.stringify(
    bootstrap
  )};</script>`;
  if (indexHtml.includes('</head>')) {
    indexHtml = indexHtml.replace('</head>', `${bootScript}</head>`);
  } else {
    indexHtml = `${bootScript}${indexHtml}`;
  }

  app.use(
    express.static(staticDir, {
      index: false,
      fallthrough: true,
    })
  );

  app.get(['/', '/index.html'], (_req, res) => {
    res.type('html').send(indexHtml);
  });

  // SPA fallback for client routes — never steal API paths. `/events` and
  // `/graphql` are registered after this mount and must receive `next()`.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const pathname = req.path;
    if (
      pathname === GRAPHQL_PATH ||
      pathname === EVENTS_PATH ||
      pathname.startsWith(`${GRAPHQL_PATH}/`) ||
      pathname.startsWith('/__flatbread/')
    ) {
      return next();
    }
    if (path.extname(pathname)) return next();
    res.type('html').send(indexHtml);
  });

  return { match, openPath: '/' };
}

/** Open path for `--open`: explorer root when mounted, else Apollo sandbox. */
export function resolveOpenPath(
  content: readonly ContentEntry[] | undefined
): string {
  if (content && matchExplorerPreset(content)) return '/';
  return GRAPHQL_PATH;
}
