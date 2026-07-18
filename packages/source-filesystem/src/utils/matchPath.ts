import { extname, relative, resolve } from 'node:path';
import type { ContentEntry } from '@flatbread/core';

type Match = { collection: string; captures: Record<string, string> };

function pathSegments(path: string): string[] {
  return relative(process.cwd(), resolve(path)).split('/').filter(Boolean);
}

function match(
  candidate: readonly string[],
  pattern: readonly string[],
  candidateIndex = 0,
  patternIndex = 0,
  captures: Record<string, string> = {}
): Record<string, string> | undefined {
  if (patternIndex === pattern.length) {
    return candidateIndex === candidate.length ? captures : undefined;
  }
  const token = pattern[patternIndex];
  if (token === '**') {
    for (let index = candidateIndex; index <= candidate.length; index++) {
      const found = match(candidate, pattern, index, patternIndex + 1, {
        ...captures,
      });
      if (found) return found;
    }
    return undefined;
  }
  if (candidateIndex >= candidate.length) return undefined;
  const capture = /^\[([^\]]+)\](.*)$/.exec(token);
  if (capture) {
    const value = candidate[candidateIndex];
    const suffix = capture[2];
    if (suffix && !value.endsWith(suffix)) return undefined;
    return match(candidate, pattern, candidateIndex + 1, patternIndex + 1, {
      ...captures,
      [capture[1]]: suffix ? value.slice(0, -suffix.length) : value,
    });
  }
  if (token === '*') {
    return match(candidate, pattern, candidateIndex + 1, patternIndex + 1, {
      ...captures,
    });
  }
  if (token !== candidate[candidateIndex]) return undefined;
  return match(candidate, pattern, candidateIndex + 1, patternIndex + 1, {
    ...captures,
  });
}

export function matchPath(
  path: string,
  content: readonly ContentEntry[],
  extensions: readonly string[]
): Match | undefined {
  const extension = extname(path).toLowerCase();
  const allowed = extensions.map((value) =>
    `.${value.replace(/^\./, '')}`.toLowerCase()
  );
  if (!allowed.includes(extension)) return undefined;

  const candidate = pathSegments(path);
  for (const entry of content) {
    if (!entry.path) continue;
    const pattern = pathSegments(entry.path);
    const hasGrammar =
      entry.path.includes('*') || /\[[^\]]+\]/.test(entry.path);
    if (!hasGrammar) {
      if (
        candidate.length >= pattern.length &&
        pattern.every((part, index) => part === candidate[index])
      ) {
        return { collection: entry.collection, captures: {} };
      }
      continue;
    }
    const captures = match(candidate, pattern);
    if (captures) return { collection: entry.collection, captures };
  }
  return undefined;
}
