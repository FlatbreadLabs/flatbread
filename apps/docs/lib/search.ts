import type { SearchEntry } from './content';

export interface SearchHit {
  entry: SearchEntry;
  score: number;
  snippet: string;
}

/**
 * Rank pages against a typed query.
 *
 * Flatbread has no search of its own: it can filter and match with `regex`,
 * but it does not rank. The whole corpus for this site is a few dozen
 * kilobytes, so the honest answer is to score it in the browser rather than
 * pretend a heavier index is needed.
 */
export function search(
  entries: SearchEntry[],
  input: string,
  limit = 8
): SearchHit[] {
  const terms = input
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 1);

  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];

  for (const entry of entries) {
    const title = entry.title.toLowerCase();
    const summary = entry.summary.toLowerCase();
    const body = entry.body.toLowerCase();

    let score = 0;
    let matchedEvery = true;

    for (const term of terms) {
      const inTitle = title.includes(term);
      const inSummary = summary.includes(term);
      const inBody = body.includes(term);

      if (!inTitle && !inSummary && !inBody) {
        matchedEvery = false;
        break;
      }

      if (title.startsWith(term)) score += 12;
      if (inTitle) score += 8;
      if (inSummary) score += 3;
      if (inBody) score += 1;
    }

    if (!matchedEvery) continue;
    hits.push({ entry, score, snippet: snippetFor(entry, terms[0]) });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

function snippetFor(entry: SearchEntry, term: string): string {
  const found = entry.body.toLowerCase().indexOf(term);
  if (found === -1) return entry.summary.slice(0, 120);

  const start = Math.max(0, found - 40);
  const text = entry.body.slice(start, start + 130).trim();
  return `${start > 0 ? '…' : ''}${text}…`;
}
