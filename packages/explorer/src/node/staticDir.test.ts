import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import {
  explorerAssetsPresent,
  getExplorerStaticDir,
  setExplorerStaticDirOverride,
} from './staticDir.js';

afterEach(() => {
  setExplorerStaticDirOverride(undefined);
});

describe('getExplorerStaticDir', () => {
  it('resolves to a path ending in dist/static', () => {
    const dir = getExplorerStaticDir();
    assert.ok(dir.endsWith(`${path.sep}static`) || dir.endsWith('/static'));
    assert.ok(
      dir.includes(`${path.sep}dist${path.sep}`) || dir.includes('/dist/')
    );
  });

  it('points at a directory that exists after build (or is creatable)', () => {
    const dir = getExplorerStaticDir();
    // During unit tests before build, the folder may not exist yet — only check shape.
    assert.equal(path.basename(dir), 'static');
    assert.equal(path.basename(path.dirname(dir)), 'dist');
    // If built, index.html should be present.
    const index = path.join(dir, 'index.html');
    if (fs.existsSync(dir)) {
      assert.ok(fs.existsSync(index), `expected ${index} after vite build`);
    }
  });

  it('honors setExplorerStaticDirOverride when set', async () => {
    const emptyDir = await mkdtemp(
      path.join(os.tmpdir(), 'flatbread-explorer-static-')
    );
    try {
      setExplorerStaticDirOverride(emptyDir);
      assert.equal(getExplorerStaticDir(), emptyDir);
      assert.equal(explorerAssetsPresent(), false);
    } finally {
      setExplorerStaticDirOverride(undefined);
      await rm(emptyDir, { recursive: true, force: true });
    }
  });
});

describe('explorerAssetsPresent', () => {
  it('reflects whether index.html exists under the static dir', async () => {
    const indexPath = path.join(getExplorerStaticDir(), 'index.html');
    if (!fs.existsSync(indexPath)) {
      assert.equal(explorerAssetsPresent(), false);
      return;
    }

    assert.equal(explorerAssetsPresent(), true);

    const emptyDir = await mkdtemp(
      path.join(os.tmpdir(), 'flatbread-explorer-absent-')
    );
    try {
      setExplorerStaticDirOverride(emptyDir);
      assert.equal(explorerAssetsPresent(), false);
    } finally {
      setExplorerStaticDirOverride(undefined);
      await rm(emptyDir, { recursive: true, force: true });
    }
  });
});
