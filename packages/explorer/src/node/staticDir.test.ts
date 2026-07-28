import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { getExplorerStaticDir } from './staticDir.js';

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
});
