import { extname, relative, resolve } from 'node:path';
import type { LoadedFlatbreadConfig } from '../types';
import type { PathClassification } from './index';

function segments(path: string): string[] {
  return relative(process.cwd(), resolve(path)).split('/').filter(Boolean);
}

function patternHasGrammar(pattern: string): boolean {
  return pattern.includes('*') || /\[[^\]]+\]/.test(pattern);
}

function matchPattern(
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
      const result = matchPattern(candidate, pattern, index, patternIndex + 1, {
        ...captures,
      });
      if (result) return result;
    }
    return undefined;
  }
  if (candidateIndex >= candidate.length) return undefined;

  const capture = /^\[([^\]]+)\](.*)$/.exec(token);
  if (capture) {
    const suffix = capture[2];
    const value = candidate[candidateIndex];
    if (suffix && !value.endsWith(suffix)) return undefined;
    return matchPattern(
      candidate,
      pattern,
      candidateIndex + 1,
      patternIndex + 1,
      {
        ...captures,
        [capture[1]]: suffix ? value.slice(0, -suffix.length) : value,
      }
    );
  }
  if (token === '*') {
    return matchPattern(
      candidate,
      pattern,
      candidateIndex + 1,
      patternIndex + 1,
      {
        ...captures,
      }
    );
  }
  if (token !== candidate[candidateIndex]) return undefined;
  return matchPattern(
    candidate,
    pattern,
    candidateIndex + 1,
    patternIndex + 1,
    {
      ...captures,
    }
  );
}

export function classifyPath(
  path: string,
  config: LoadedFlatbreadConfig
): PathClassification | undefined {
  const extension = extname(path).toLowerCase();
  const extensions = (config.loaded.extensions ?? []).map((value) =>
    `.${value.replace(/^\./, '')}`.toLowerCase()
  );
  if (!extensions.includes(extension)) return undefined;

  const candidate = segments(path);
  for (const entry of config.content) {
    if (!entry.path) continue;
    const pattern = segments(entry.path);
    if (!patternHasGrammar(entry.path)) {
      if (
        candidate.length >= pattern.length &&
        pattern.every((part, index) => part === candidate[index])
      ) {
        return { collection: entry.collection, captures: {} };
      }
      continue;
    }
    const captures = matchPattern(candidate, pattern);
    if (captures) return { collection: entry.collection, captures };
  }
  return undefined;
}
