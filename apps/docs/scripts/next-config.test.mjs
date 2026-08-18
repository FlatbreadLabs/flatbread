import { afterEach, describe, expect, it, vi } from 'vitest';

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
  }
  vi.resetModules();
});

describe.sequential('docs Next config', () => {
  it.each([
    { input: undefined, expected: '' },
    { input: '', expected: '' },
    { input: '/', expected: '' },
    { input: '///', expected: '' },
    { input: 'flatbread/', expected: '/flatbread' },
    { input: '/flatbread/', expected: '/flatbread' },
  ])(
    'normalizes base path $input to $expected',
    async ({ input, expected }) => {
      if (input === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
      else process.env.NEXT_PUBLIC_BASE_PATH = input;
      vi.resetModules();

      const config = (await import('../next.config')).default;

      expect(config.basePath).toBe(expected);
      expect(config.env?.NEXT_PUBLIC_BASE_PATH).toBe(expected);
    }
  );
});
