import {
  EXPLORER_BOOTSTRAP_PATH,
  explorerAssetsPresent,
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
  type RequestHandler,
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

export interface ExplorerMountHandle {
  /** Whether SPA middleware currently serves `/` (preset match ∧ assets). */
  isActive(): boolean;
  /**
   * Re-evaluate preset + assets against new content.
   * Does not touch the Express stack; only the gate + cached injected HTML.
   * Warns (once per transition into missing-assets) when preset matches but
   * assets are absent.
   */
  update(content: readonly ContentEntry[]): void;
}

interface ExplorerBootstrap {
  preset: ExplorerPresetMatch['preset'];
  graphqlPath: string;
  eventsPath: string;
}

/**
 * Registers bootstrap, static, `/`/`index.html`, and SPA fallback once.
 * Inactive gate → all of those `next()` so Apollo/SSE own the paths.
 * Toggle activity with {@link ExplorerMountHandle.update} on config reload.
 */
export function mountExplorer(
  app: Express,
  content: readonly ContentEntry[]
): ExplorerMountHandle {
  let active = false;
  let indexHtml = '';
  let bootstrap: ExplorerBootstrap = {
    preset: 'effort-graph',
    graphqlPath: GRAPHQL_PATH,
    eventsPath: EVENTS_PATH,
  };
  let staticMiddleware: RequestHandler | null = null;
  /** True while the last evaluation was preset-match + missing assets. */
  let inMissingAssets = false;

  const evaluate = (nextContent: readonly ContentEntry[]) => {
    const match = matchExplorerPreset(nextContent);
    if (!match) {
      active = false;
      inMissingAssets = false;
      staticMiddleware = null;
      return;
    }

    const staticDir = getExplorerStaticDir();
    if (!explorerAssetsPresent()) {
      if (!inMissingAssets) {
        console.warn(
          `Flatbread explorer assets missing at ${staticDir}. Run \`pnpm --filter @flatbread/explorer build\`.`
        );
        inMissingAssets = true;
      }
      active = false;
      staticMiddleware = null;
      return;
    }

    inMissingAssets = false;
    bootstrap = {
      preset: match.preset,
      graphqlPath: GRAPHQL_PATH,
      eventsPath: EVENTS_PATH,
    };

    const indexHtmlPath = path.join(staticDir, 'index.html');
    let html = fs.readFileSync(indexHtmlPath, 'utf8');
    const bootScript = `<script>window.__FLATBREAD_EXPLORER__=${JSON.stringify(
      bootstrap
    )};</script>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${bootScript}</head>`);
    } else {
      html = `${bootScript}${html}`;
    }
    indexHtml = html;
    staticMiddleware = express.static(staticDir, {
      index: false,
      fallthrough: true,
    });
    active = true;
  };

  evaluate(content);

  app.get(EXPLORER_BOOTSTRAP_PATH, (_req, res, next) => {
    if (!active) return next();
    res.json(bootstrap);
  });

  app.use((req, res, next) => {
    if (!active || !staticMiddleware) return next();
    return staticMiddleware(req, res, next);
  });

  app.get(['/', '/index.html'], (_req, res, next) => {
    if (!active) return next();
    res.type('html').send(indexHtml);
  });

  // SPA fallback for client routes — never steal API paths. `/events` and
  // `/graphql` (exact and under those prefixes) register after this mount
  // and must receive `next()`.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!active) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const pathname = req.path;
    if (
      pathname === GRAPHQL_PATH ||
      pathname === EVENTS_PATH ||
      pathname.startsWith(`${GRAPHQL_PATH}/`) ||
      pathname.startsWith(`${EVENTS_PATH}/`) ||
      pathname.startsWith('/__flatbread/')
    ) {
      return next();
    }
    if (path.extname(pathname)) return next();
    res.type('html').send(indexHtml);
  });

  return {
    isActive: () => active,
    update: evaluate,
  };
}

/**
 * When a registered explorer preset matches and static assets are present,
 * serve the SPA at `/`. Prefer {@link mountExplorer} when the mount must
 * react to config reload (mutable gate). Returns null when inactive after the
 * initial evaluation (no preset, or assets missing — warns; does not throw).
 */
export function mountExplorerIfMatched(
  app: Express,
  content: readonly ContentEntry[]
): ExplorerMountResult | null {
  const handle = mountExplorer(app, content);
  if (!handle.isActive()) return null;
  const match = matchExplorerPreset(content);
  if (!match) return null;
  return { match, openPath: '/' };
}
