import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveDependency,
  checkPluginDependencies,
  formatMissingDepsWarning,
  DEFAULT_PLUGIN_DEPENDENCIES,
} from '../dependencyCheck.js';

import * as fs from 'fs';
import { createRequire } from 'module';

vi.mock('fs', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
  };
});

// Mock the 'module' package to control createRequire used by dependencyCheck
vi.mock('module', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createRequire: vi.fn(actual.createRequire),
  };
});

describe('dependencyCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveDependency', () => {
    it('resolves via createRequire from cwd', async () => {
      const req = createRequire(import.meta.url);
      const spy = vi.spyOn(req, 'resolve').mockReturnValue('/fake/path');

      const mod = await import('module');
      const mockCreateRequire = vi.mocked((mod as any).createRequire);
      mockCreateRequire
        .mockImplementationOnce(() => req) // for cwd
        .mockImplementationOnce(() => req); // for here

      expect(resolveDependency('some-dep')).toBe(true);

      spy.mockRestore();
    });

    it('falls back to package context when cwd fails', async () => {
      const reqCwd = createRequire(import.meta.url);
      const reqHere = createRequire(import.meta.url);
      const spyCwd = vi.spyOn(reqCwd, 'resolve').mockImplementation(() => {
        throw new Error('fail cwd');
      });
      const spyHere = vi.spyOn(reqHere, 'resolve').mockReturnValue('/ok');

      const mod = await import('module');
      const mockCreateRequire = vi.mocked((mod as any).createRequire);
      mockCreateRequire
        .mockImplementationOnce(() => reqCwd)
        .mockImplementationOnce(() => reqHere);

      expect(resolveDependency('some-dep')).toBe(true);

      spyCwd.mockRestore();
      spyHere.mockRestore();
    });

    it('uses node_modules dir check as last resort', async () => {
      const mod = await import('module');
      const mockCreateRequire = vi.mocked((mod as any).createRequire);
      mockCreateRequire.mockImplementation(() => {
        throw new Error('no require');
      });

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      expect(resolveDependency('@scoped/pkg')).toBe(true);
    });

    it('returns false when all strategies fail', async () => {
      const mod = await import('module');
      const mockCreateRequire = vi.mocked((mod as any).createRequire);
      mockCreateRequire.mockImplementation(() => {
        throw new Error('no require');
      });

      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(resolveDependency('missing')).toBe(false);
    });
  });

  describe('checkPluginDependencies', () => {
    it('returns unique missing deps when not resolvable', () => {
      const resolver = vi.fn().mockReturnValue(false);
      const missing = checkPluginDependencies(
        ['typed-document-node', 'typed-document-node'],
        { resolver }
      );
      expect(missing).toEqual(['@graphql-typed-document-node/core']);
    });

    it('returns empty when deps resolvable', () => {
      const resolver = vi.fn().mockReturnValue(true);
      const missing = checkPluginDependencies(['typed-document-node'], {
        resolver,
      });
      expect(missing).toEqual([]);
    });
  });

  describe('formatMissingDepsWarning', () => {
    it('formats message with install command', () => {
      const msg = formatMissingDepsWarning(['a', 'b'], 'pnpm i a b');
      expect(msg).toContain('Missing: a, b');
      expect(msg).toContain('Install them with: pnpm i a b');
    });
  });
});
