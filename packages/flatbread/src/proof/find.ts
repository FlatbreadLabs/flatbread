import {
  recordStanding,
  type PrimitiveKind,
  type ReadRecord,
  type ReadRelation,
} from '@flatbread/proof';

/**
 * `proof find`: ranked keyword search over the record files. Everything here
 * is a pure function of the records passed in. There are no embeddings, no
 * random choices, and no locale-aware comparisons, so the same files give the
 * same hits on every machine.
 */

export const FIND_DEFAULT_LIMIT = 5;
export const FIND_MAX_LIMIT = 10;
/** BM25 term-frequency saturation and length normalization. */
const K1 = 1.2;
const B = 0.75;
const TITLE_WEIGHT = 2;
/** Extra weight for entity terms: numbers with units, people, code refs. */
const ENTITY_BOOST = 1.5;
const SNIPPET_CHARS = 160;
const LINKS_PER_RELATION = 3;
const LINK_TITLE_CHARS = 60;
const HITS_PER_EFFORT = 3;
/**
 * Without `--effort`, the per-Effort cap applies only when no Effort clearly
 * leads: when the top Effort's score mass is under 1.5 times the next one's.
 */
const EFFORT_LEAD = 1.5;
const EFFORTS_SHOWN = 5;
const CHAIN_VERSIONS_SHOWN = 4;
const CODE_REFS_SHOWN = 6;
/**
 * Characters the cards aim for: a header share plus a share per hit, so five
 * hits aim for about 4,000 characters (near 1,000 tokens at 4 characters a
 * token). The renderer shrinks link titles, the Effort ranking line, chain
 * lines, and link lists to fit, in that order. Titles, snippets, and code
 * lines are never cut further, so a card set can still run past the aim. On
 * the 10x benchmark graph the whole JSON envelope for five hits ran about
 * 5,700 characters at the median and up to about 6,900.
 */
const CARDS_HEADER_CHARS = 300;
const CARD_CHARS = 750;

const STOPWORDS = new Set(
  (
    'a an the of to in on for and or nor but is are was were be been being ' +
    'by with what which who whom whose how why when where that this these ' +
    'those it its at as from into than then there their they them we our us ' +
    'you your i me my he she his her do does did done has have had not no ' +
    'so if any all each can could would should will shall may might must'
  ).split(' ')
);

/**
 * A word: letters and digits, with inner apostrophes, hyphens, underscores,
 * and dots between digits (4.7), plus trailing `+` signs (forward+).
 */
const WORD =
  /[\p{L}\p{N}]+(?:(?:['’]|(?<=\p{N})\.(?=\p{N})|[-_])[\p{L}\p{N}]+)*\+{0,2}/gu;
const UNIT =
  /(?<![\p{L}\p{N}.])(\d+(?:\.\d+)?)\s?(ms|µs|us|ns|s|hz|khz|mhz|ghz|fps|px|kb|mb|gb|tb|kib|mib|gib|k|x|%)(?![\p{L}\p{N}])/giu;
const CODE_EXTENSIONS =
  'ts|tsx|js|jsx|mjs|cjs|rs|go|py|rb|java|kt|swift|c|h|cc|cpp|hpp|cs|json|ya?ml|toml|md|css|scss|html|sql|sh|glsl|hlsl|wgsl|vue|svelte';
const CODE_PATH = new RegExp(
  `(?<![\\w/.-])((?:[\\w.-]+/)*[\\w-]+(?:\\.[\\w-]+)*\\.(?:${CODE_EXTENSIONS}))(?![\\w/])`,
  'g'
);
const SYMBOL = /(?<![\w$.])([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\(\)/g;
const SHA = /(?<![\p{L}\p{N}])[0-9a-f]{7,40}(?![\p{L}\p{N}])/giu;
const ISSUE_NUMBER = /(?<![\w&#])#(\d+)\b/g;
const PULL_URL = /github\.com\/[\w.-]+\/[\w.-]+\/(?:pull|issues)\/(\d+)/g;

/** One term found in a text, with where it sits. */
interface Span {
  readonly term: string;
  /** The word as written, lowercased, before stemming. */
  readonly surface: string;
  readonly start: number;
  readonly end: number;
  /** For a hyphenated word's joined form, the terms of its parts. */
  readonly parts?: readonly string[];
}

/** A doubled final consonant that -ed and -ing add: stopped, running. */
const DOUBLED = /([bdgmnprt])\1$/;
/** A two-letter root that lost a final e: us(e), ow(e), ag(e). */
const SHORT_ROOT = /^[aeiou][b-df-hj-np-tv-z]$/;

/**
 * Light, deterministic stemming for plain words: plural -s and -ies, -ed,
 * -ing, and a final -e, so cache, caches, cached, and caching meet, and so do
 * add, added, and adding, and use, used, and using.
 */
export function stem(word: string): string {
  if (!/^[a-z]+$/.test(word) || word.length <= 3) return word;
  let w = word;
  if (w.endsWith('ies') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (
    w.endsWith('s') &&
    !w.endsWith('ss') &&
    !w.endsWith('us') &&
    !w.endsWith('is')
  )
    w = w.slice(0, -1);
  const suffix = w.endsWith('ing') ? 3 : w.endsWith('ed') ? 2 : 0;
  const root = w.slice(0, w.length - suffix);
  if (suffix && root.length >= 3)
    // Undouble only when 3 letters stay, so add and egg keep their pair.
    w = root.length >= 4 && DOUBLED.test(root) ? root.slice(0, -1) : root;
  else if (suffix && SHORT_ROOT.test(root)) w = `${root}e`;
  if (w.endsWith('e') && w.length >= 4) w = w.slice(0, -1);
  return w;
}

function wordSpans(text: string): Span[] {
  const spans: Span[] = [];
  for (const match of text.matchAll(WORD)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const raw = match[0].toLowerCase().replace(/['’]/g, '');
    const parts = raw.split(/[-_]/).filter(Boolean);
    if (parts.length > 1) {
      const joined = parts.join('');
      const kept = parts.filter((part) => !STOPWORDS.has(part));
      if (!STOPWORDS.has(joined))
        spans.push({
          term: stem(joined),
          surface: joined,
          start,
          end,
          parts: kept.map(stem),
        });
      for (const surface of kept)
        spans.push({ term: stem(surface), surface, start, end });
    } else if (!STOPWORDS.has(raw))
      spans.push({ term: stem(raw), surface: raw, start, end });
  }
  return spans;
}

function codeSpans(text: string): Span[] {
  const spans: Span[] = [];
  const add = (term: string, start: number, end: number) =>
    spans.push({ term, surface: term, start, end });
  for (const match of text.matchAll(CODE_PATH)) {
    const start = match.index ?? 0;
    const path = match[1].toLowerCase();
    add(path, start, start + match[0].length);
    const base = path.slice(path.lastIndexOf('/') + 1);
    if (base !== path) add(base, start, start + match[0].length);
  }
  for (const match of text.matchAll(SYMBOL)) {
    const start = match.index ?? 0;
    const name = match[1].toLowerCase();
    add(`${name}()`, start, start + match[0].length);
    const last = name.slice(name.lastIndexOf('.') + 1);
    if (last !== name) add(`${last}()`, start, start + match[0].length);
  }
  for (const match of text.matchAll(SHA))
    if (/\d/.test(match[0]) && /[a-f]/i.test(match[0]))
      add(
        match[0].toLowerCase(),
        match.index ?? 0,
        (match.index ?? 0) + match[0].length
      );
  for (const pattern of [ISSUE_NUMBER, PULL_URL])
    for (const match of text.matchAll(pattern))
      add(
        `#${match[1]}`,
        match.index ?? 0,
        (match.index ?? 0) + match[0].length
      );
  return spans;
}

function unitSpans(text: string): Span[] {
  return [...text.matchAll(UNIT)].map((match) => {
    const term = `${match[1]}${match[2].toLowerCase()}`;
    const start = match.index ?? 0;
    return { term, surface: term, start, end: start + match[0].length };
  });
}

/** Entity terms: numbers with units ('4.7 ms' becomes 4.7ms) and code refs. */
function entitySpans(text: string): Span[] {
  return [...unitSpans(text), ...codeSpans(text)];
}

/** The terms a text yields, words first, then entity terms. */
export function tokenize(text: string): string[] {
  return [...wordSpans(text), ...entitySpans(text)].map((span) => span.term);
}

/**
 * Code references a text names, as written: file paths, `symbol()` names,
 * commit SHAs, and issue or pull request numbers.
 */
export function codeReferences(text: string): string[] {
  const seen = new Set<string>();
  const refs: string[] = [];
  const add = (ref: string) => {
    if (seen.has(ref.toLowerCase())) return;
    seen.add(ref.toLowerCase());
    refs.push(ref);
  };
  for (const match of text.matchAll(CODE_PATH)) add(match[1]);
  for (const match of text.matchAll(SYMBOL)) add(`${match[1]}()`);
  for (const match of text.matchAll(SHA))
    if (/\d/.test(match[0]) && /[a-f]/i.test(match[0])) add(match[0]);
  for (const pattern of [ISSUE_NUMBER, PULL_URL])
    for (const match of text.matchAll(pattern)) add(`#${match[1]}`);
  return refs;
}

function normalizeBody(body: string): string {
  return body.replace(/\r\n?/g, '\n');
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function time(record: ReadRecord): number {
  const value = Date.parse(text(record.frontmatter.created_at));
  return Number.isNaN(value) ? 0 : value;
}

/** Oldest first, then by id, so chains and ties always sort the same way. */
function byCreated(a: ReadRecord, b: ReadRecord): number {
  return time(a) - time(b) || compareIds(a.id, b.id);
}

/**
 * For each chain member, the members its links say are older: the ones it
 * `supersedes`, and the ones that list it in `superseded_by`.
 */
function olderVersions(
  members: readonly ReadRecord[]
): Map<string, Set<string>> {
  const ids = new Set(members.map((member) => member.id));
  const older = new Map(
    members.map((member) => [member.id, new Set<string>()])
  );
  for (const member of members) {
    for (const id of member.relations.supersedes ?? [])
      if (ids.has(id) && id !== member.id) older.get(member.id)?.add(id);
    for (const id of member.relations.superseded_by ?? [])
      if (ids.has(id) && id !== member.id) older.get(id)?.add(member.id);
  }
  return older;
}

/**
 * Puts a chain in link order: every version comes after the versions it
 * supersedes, as `asof` in the benchmark's graph.mjs walks it. Created time,
 * then id, breaks ties between fork branches. A cycle, which only a hand edit
 * can make, releases its oldest member first.
 */
function linkOrder(members: readonly ReadRecord[]): ReadRecord[] {
  const older = olderVersions(members);
  const pending = [...members].sort(byCreated);
  const placed = new Set<string>();
  const ordered: ReadRecord[] = [];
  while (pending.length) {
    const ready = pending.findIndex((member) =>
      [...(older.get(member.id) ?? [])].every((id) => placed.has(id))
    );
    const [next] = pending.splice(Math.max(ready, 0), 1);
    placed.add(next.id);
    ordered.push(next);
  }
  return ordered;
}

/** The standing word for a record, as `brief` computes it. */
export function standingOf(record: ReadRecord): string {
  return recordStanding({
    id: record.id,
    kind: record.kind,
    frontmatter: { ...record.frontmatter, ...record.relations },
  });
}

interface FindDoc {
  readonly record: ReadRecord;
  readonly tf: ReadonlyMap<string, number>;
  readonly length: number;
}

/** Relations whose stored ids, read backward, give a record's inbound links. */
const INBOUND_LABELS: Readonly<Record<string, string>> = {
  derives_from: 'derived_by',
  cites: 'cited_by',
  resolved_by: 'resolves',
  rejected_by: 'rejects',
  mitigated_by: 'mitigates',
  evidence: 'evidence_for',
  blob: 'blob_of',
};
/** Outbound links a card lists. Supersession shows on the chain line instead. */
const OUTBOUND_RELATIONS: readonly ReadRelation[] = [
  'derives_from',
  'invalidates',
  'invalidated_by',
  'resolved_by',
  'rejected_by',
  'mitigated_by',
  'evidence',
  'cites',
];

export interface FindIndex {
  readonly records: ReadonlyMap<string, ReadRecord>;
  readonly docs: ReadonlyMap<string, FindDoc>;
  readonly df: ReadonlyMap<string, number>;
  readonly averageLength: number;
  /** Chain root for every record id; records with no supersession are their own root. */
  readonly chainOf: ReadonlyMap<string, string>;
  /** Members of each chain in link order, oldest first. */
  readonly chains: ReadonlyMap<string, readonly ReadRecord[]>;
  /** For each record id, the records that link to it, by inbound label. */
  readonly inbound: ReadonlyMap<string, ReadonlyMap<string, readonly string[]>>;
}

function addTerms(
  tf: Map<string, number>,
  spans: readonly Span[],
  weight: number
): number {
  for (const span of spans)
    tf.set(span.term, (tf.get(span.term) ?? 0) + weight);
  return spans.length * weight;
}

function indexDoc(record: ReadRecord): FindDoc {
  const tf = new Map<string, number>();
  const title = text(record.frontmatter.title);
  const body = normalizeBody(record.body_excerpt);
  let length = 0;
  length += addTerms(tf, wordSpans(title), TITLE_WEIGHT);
  length += addTerms(tf, wordSpans(body), 1);
  for (const field of ['kind', 'state', 'status', 'role'])
    length += addTerms(tf, wordSpans(text(record.frontmatter[field])), 1);
  length += addTerms(
    tf,
    wordSpans(text(record.frontmatter.created_by)),
    ENTITY_BOOST
  );
  length += addTerms(tf, entitySpans(`${title}\n${body}`), ENTITY_BOOST);
  return { record, tf, length };
}

/**
 * Builds the search index. Every non-Effort record is a document; Efforts are
 * kept only for their titles. IDF (inverse document frequency, the BM25
 * weight that makes rare words count more) counts every record, whatever a
 * later query filters to, so words common across the whole graph weigh
 * little.
 */
export function buildFindIndex(records: readonly ReadRecord[]): FindIndex {
  const byId = new Map<string, ReadRecord>();
  for (const record of [...records].sort(byCreated))
    byId.set(record.id, record);
  const docs = new Map<string, FindDoc>();
  const df = new Map<string, number>();
  let total = 0;
  for (const record of byId.values()) {
    if (record.kind === 'effort') continue;
    const doc = indexDoc(record);
    docs.set(record.id, doc);
    total += doc.length;
    for (const term of doc.tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }
  // Union-find over supersession, so every version of a record is one chain.
  const parent = new Map<string, string>();
  const root = (id: string): string => {
    let current = id;
    while (parent.get(current) !== current)
      current = parent.get(current) as string;
    parent.set(id, current);
    return current;
  };
  for (const id of docs.keys()) parent.set(id, id);
  for (const doc of docs.values())
    for (const other of [
      ...(doc.record.relations.supersedes ?? []),
      ...(doc.record.relations.superseded_by ?? []),
    ]) {
      if (!docs.has(other)) continue;
      const [a, b] = [root(doc.record.id), root(other)];
      if (a !== b) parent.set(a < b ? b : a, a < b ? a : b);
    }
  const chainOf = new Map<string, string>();
  const chains = new Map<string, ReadRecord[]>();
  for (const doc of docs.values()) {
    const id = root(doc.record.id);
    chainOf.set(doc.record.id, id);
    if (!chains.has(id)) chains.set(id, []);
    (chains.get(id) as ReadRecord[]).push(doc.record);
  }
  for (const [id, members] of chains) chains.set(id, linkOrder(members));
  const inbound = new Map<string, Map<string, string[]>>();
  for (const record of byId.values())
    for (const [relation, label] of Object.entries(INBOUND_LABELS)) {
      const targets =
        relation === 'blob'
          ? [record.frontmatter.blob].filter(
              (id): id is string => typeof id === 'string'
            )
          : record.relations[relation as ReadRelation] ?? [];
      for (const target of targets) {
        if (!inbound.has(target)) inbound.set(target, new Map());
        const links = inbound.get(target) as Map<string, string[]>;
        if (!links.has(label)) links.set(label, []);
        (links.get(label) as string[]).push(record.id);
      }
    }
  return {
    records: byId,
    docs,
    df,
    averageLength: docs.size ? total / docs.size : 0,
    chainOf,
    chains,
    inbound,
  };
}

export interface FindOptions {
  /** Search one Effort; leave it out to search every Effort. */
  readonly effort?: string;
  readonly kinds?: readonly PrimitiveKind[];
  /** ISO date: show the version of each chain that was current then. */
  readonly asOf?: string;
  readonly retracted?: 'exclude' | 'include' | 'only';
  readonly limit?: number;
}

export interface FindLink {
  readonly relation: string;
  readonly ids: readonly string[];
}

export interface FindHit {
  /** The version the card shows: the chain head, or the as-of version. */
  readonly record: ReadRecord;
  readonly head: ReadRecord;
  /** The version whose text scored best. */
  readonly matched: ReadRecord;
  readonly chain: readonly ReadRecord[];
  readonly score: number;
  readonly effort: string | null;
  readonly snippet: {
    readonly text: string;
    readonly start: number;
    readonly end: number;
    readonly length: number;
  };
  readonly outbound: readonly FindLink[];
  readonly inbound: readonly FindLink[];
  readonly code: readonly string[];
}

export interface FindEffortMass {
  readonly id: string;
  readonly title: string;
  readonly mass: number;
}

export interface FindResult {
  readonly query: string;
  readonly effort: string | null;
  readonly searched: number;
  readonly matched: number;
  readonly hits: readonly FindHit[];
  /**
   * Only when searching every Effort: the 5 Efforts with the highest score
   * mass, the summed scores of each one's best 3 hits.
   */
  readonly efforts?: readonly FindEffortMass[];
  /** Query words found in at least one shown hit, as written. */
  readonly found: readonly string[];
  /** Query words that no shown hit contains. */
  readonly missing: readonly string[];
}

export interface QueryTerm {
  readonly term: string;
  /** The word the term came from, as written, lowercased. */
  readonly surface: string;
  /** For a hyphenated word's joined form, the terms of its parts. */
  readonly parts?: readonly string[];
}

/** Distinct query terms with the word each came from, in query order. */
export function queryTerms(query: string): QueryTerm[] {
  const seen = new Set<string>();
  const terms: QueryTerm[] = [];
  for (const span of [...wordSpans(query), ...entitySpans(query)])
    if (!seen.has(span.term)) {
      seen.add(span.term);
      terms.push({
        term: span.term,
        surface: span.surface,
        ...(span.parts ? { parts: span.parts } : {}),
      });
    }
  return terms;
}

function bm25(
  index: FindIndex,
  doc: FindDoc,
  terms: readonly string[]
): number {
  let score = 0;
  const n = index.docs.size;
  for (const term of terms) {
    const tf = doc.tf.get(term);
    if (!tf) continue;
    const df = index.df.get(term) ?? 0;
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
    score +=
      (idf * tf * (K1 + 1)) /
      (tf + K1 * (1 - B + (B * doc.length) / (index.averageLength || 1)));
  }
  return score;
}

/**
 * The 160-character window of `body` that holds the most distinct matched
 * terms (then the most matches, then the earliest), with its offsets.
 */
export function bestSnippet(
  body: string,
  terms: ReadonlySet<string>
): FindHit['snippet'] {
  const source = normalizeBody(body);
  const hits = [...wordSpans(source), ...entitySpans(source)]
    .filter((span) => terms.has(span.term))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  let start = 0;
  if (hits.length) {
    let best = { distinct: -1, count: -1, start: 0 };
    for (const anchor of hits) {
      const from = Math.max(0, anchor.start - 20);
      const inside = hits.filter(
        (span) => span.start >= from && span.end <= from + SNIPPET_CHARS
      );
      const distinct = new Set(inside.map((span) => span.term)).size;
      if (
        distinct > best.distinct ||
        (distinct === best.distinct && inside.length > best.count)
      )
        best = { distinct, count: inside.length, start: from };
    }
    // Start at the top when that drops only a word or two.
    start = best.start <= 20 ? 0 : best.start;
    // Start on a word boundary, without skipping past the first match.
    const first = hits.find((span) => span.start >= start)?.start ?? start;
    while (start > 0 && start < first && /\S/.test(source[start - 1])) start++;
  }
  let end = Math.min(source.length, start + SNIPPET_CHARS);
  if (end < source.length) {
    const space = source.lastIndexOf(' ', end);
    if (space > start + SNIPPET_CHARS * 0.75) end = space;
  }
  const window = source.slice(start, end).replace(/\s+/g, ' ').trim();
  return {
    text: `${start > 0 ? '…' : ''}${window}${end < source.length ? '…' : ''}`,
    start,
    end,
    length: source.length,
  };
}

function inScope(record: ReadRecord, options: FindOptions): boolean {
  const retracted = record.frontmatter.retracted === true;
  const mode = options.retracted ?? 'exclude';
  return (
    (!options.effort || record.frontmatter.effort === options.effort) &&
    (!options.kinds?.length || options.kinds.includes(record.kind)) &&
    (mode === 'include' || (mode === 'only') === retracted)
  );
}

/** Chain members that no other member supersedes, in link order. */
function headsOf(chain: readonly ReadRecord[]): ReadRecord[] {
  const superseded = new Set(
    [...olderVersions(chain).values()].flatMap((ids) => [...ids])
  );
  return chain.filter((member) => !superseded.has(member.id));
}

function outboundLinks(record: ReadRecord): FindLink[] {
  const links: FindLink[] = OUTBOUND_RELATIONS.flatMap((relation) => {
    const ids = record.relations[relation] ?? [];
    return ids.length ? [{ relation, ids: [...ids].sort(compareIds) }] : [];
  });
  const blob = record.frontmatter.blob;
  if (typeof blob === 'string') links.push({ relation: 'blob', ids: [blob] });
  return links;
}

function inboundLinks(index: FindIndex, record: ReadRecord): FindLink[] {
  const links = index.inbound.get(record.id);
  if (!links) return [];
  return Object.values(INBOUND_LABELS).flatMap((relation) => {
    const ids = links.get(relation) ?? [];
    return ids.length ? [{ relation, ids: [...ids].sort(compareIds) }] : [];
  });
}

/**
 * Runs a query. Each supersession chain is one hit, scored by its best
 * member. Only versions that pass the query's scope count: the Effort, the
 * kinds, the retracted mode, and, with `asOf`, a created time at or before
 * it. They alone are scored, quoted, and shown. Without an Effort, when no
 * Effort clearly leads, at most 3 hits come from any one Effort, so an
 * ambiguous query shows its candidate Efforts side by side; slots the cap
 * leaves empty go to the next hits by score.
 */
export function findRecords(
  index: FindIndex,
  query: string,
  options: FindOptions = {}
): FindResult {
  const terms = queryTerms(query);
  const termList = terms.map(({ term }) => term);
  const limit = Math.min(
    FIND_MAX_LIMIT,
    Math.max(1, options.limit ?? FIND_DEFAULT_LIMIT)
  );
  const asOf = options.asOf ? Date.parse(options.asOf) : undefined;
  const eligible = (record: ReadRecord) =>
    inScope(record, options) && (asOf === undefined || time(record) <= asOf);
  let searched = 0;
  const best = new Map<string, { record: ReadRecord; score: number }>();
  for (const doc of index.docs.values()) {
    if (!eligible(doc.record)) continue;
    searched++;
    const score = bm25(index, doc, termList);
    if (score <= 0) continue;
    const chainId = index.chainOf.get(doc.record.id) as string;
    const current = best.get(chainId);
    if (
      !current ||
      score > current.score ||
      (score === current.score &&
        compareIds(doc.record.id, current.record.id) < 0)
    )
      best.set(chainId, { record: doc.record, score });
  }
  const ranked = [...best.entries()]
    .flatMap(([chainId, { record: matched, score }]) => {
      const chain = index.chains.get(chainId) as readonly ReadRecord[];
      const heads = headsOf(chain);
      const head = heads.at(-1) ?? (chain.at(-1) as ReadRecord);
      const versions = chain.filter(eligible);
      // The card shows an eligible version: the newest head that is in
      // scope, else the newest version that is. With `asOf`, the last version
      // in link order created by then. `matched` is always eligible.
      const record =
        (asOf === undefined ? heads.filter(eligible).at(-1) : undefined) ??
        versions.at(-1) ??
        matched;
      return [{ chain, versions, head, record, matched, score }];
    })
    .sort((a, b) => b.score - a.score || compareIds(a.head.id, b.head.id));
  const effortOf = (record: ReadRecord) =>
    typeof record.frontmatter.effort === 'string'
      ? record.frontmatter.effort
      : null;
  let selected = ranked;
  let efforts: FindEffortMass[] | undefined;
  if (!options.effort) {
    const perEffort = new Map<string, number[]>();
    for (const hit of ranked) {
      const effort = effortOf(hit.record) ?? '';
      if (!perEffort.has(effort)) perEffort.set(effort, []);
      (perEffort.get(effort) as number[]).push(hit.score);
    }
    efforts = [...perEffort.entries()]
      .map(([id, scores]) => ({
        id,
        title: text(index.records.get(id)?.frontmatter.title),
        mass: scores
          .slice(0, HITS_PER_EFFORT)
          .reduce((sum, score) => sum + score, 0),
      }))
      .sort((a, b) => b.mass - a.mass || compareIds(a.id, b.id));
    const [top, next] = efforts;
    const cap =
      next && top.mass < EFFORT_LEAD * next.mass ? HITS_PER_EFFORT : limit;
    const counts = new Map<string, number>();
    const capped: typeof ranked = [];
    const over: typeof ranked = [];
    for (const hit of ranked) {
      const effort = effortOf(hit.record) ?? '';
      const count = counts.get(effort) ?? 0;
      (count < cap ? capped : over).push(hit);
      counts.set(effort, count + 1);
    }
    selected = [...capped, ...over].slice(0, limit);
    const order = new Map(efforts.map((effort, i) => [effort.id, i]));
    selected = [...selected].sort(
      (a, b) =>
        (order.get(effortOf(a.record) ?? '') ?? 0) -
          (order.get(effortOf(b.record) ?? '') ?? 0) ||
        b.score - a.score ||
        compareIds(a.head.id, b.head.id)
    );
  } else selected = selected.slice(0, limit);
  const querySet = new Set(termList);
  const foundTerms = new Set<string>();
  const hits: FindHit[] = selected.map((hit) => {
    for (const member of hit.versions)
      for (const term of termList)
        if (index.docs.get(member.id)?.tf.has(term)) foundTerms.add(term);
    const code: string[] = [];
    for (const member of [...hit.versions].reverse())
      for (const ref of codeReferences(
        `${text(member.frontmatter.title)}\n${member.body_excerpt}`
      ))
        if (!code.some((seen) => seen.toLowerCase() === ref.toLowerCase()))
          code.push(ref);
    return {
      record: hit.record,
      head: hit.head,
      matched: hit.matched,
      chain: hit.chain,
      score: hit.score,
      effort: effortOf(hit.record),
      snippet: bestSnippet(hit.matched.body_excerpt, querySet),
      outbound: outboundLinks(hit.record),
      inbound: inboundLinks(index, hit.record),
      code,
    };
  });
  // A hyphenated query word is searched joined and split. When every part
  // was found, the joined form is not reported missing.
  const missed = (entry: QueryTerm) =>
    !foundTerms.has(entry.term) &&
    !(entry.parts?.length && entry.parts.every((part) => foundTerms.has(part)));
  const surfaces = (wanted: (entry: QueryTerm) => boolean) => [
    ...new Set(terms.filter(wanted).map((entry) => entry.surface)),
  ];
  return {
    query,
    effort: options.effort ?? null,
    searched,
    matched: ranked.length,
    hits,
    ...(efforts ? { efforts: efforts.slice(0, EFFORTS_SHOWN) } : {}),
    found: surfaces((entry) => foundTerms.has(entry.term)),
    missing: surfaces(missed),
  };
}

function cut(value: string, max: number): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return [...flat].length > max
    ? `${[...flat].slice(0, max - 1).join('')}…`
    : flat;
}

function date(record: ReadRecord): string {
  return text(record.frontmatter.created_at).slice(0, 10) || 'undated';
}

function kindLabel(record: ReadRecord): string {
  const sub = record.frontmatter.kind;
  return typeof sub === 'string' && sub ? `${record.kind}:${sub}` : record.kind;
}

/** How much each card may show; the renderer shrinks these to fit. */
interface CardShape {
  /** Link entries per `out:` or `in:` line. */
  readonly links: number;
  /** Whether link entries carry their target's title. */
  readonly titles: boolean;
  /**
   * Most chain versions shown. The head and the shown and matched versions
   * always show, even past it.
   */
  readonly chain: number;
}

function linkEntry(index: FindIndex, id: string, titles: boolean): string {
  const target = index.records.get(id);
  if (!target) return `${id} (missing)`;
  return `${id}${
    titles ? ` "${cut(text(target.frontmatter.title), LINK_TITLE_CHARS)}"` : ''
  } (${standingOf(target)})`;
}

/**
 * Renders link groups on one line, at most 3 per relation, and at most
 * `shape.links` entries in all. A relation with no entry left shows only its
 * count, as `cited_by +4`.
 */
function linkLine(
  index: FindIndex,
  label: string,
  links: readonly FindLink[],
  shape: CardShape
): string | undefined {
  if (!links.length) return undefined;
  let left = shape.links;
  const parts = links.map((link) => {
    const shown = link.ids.slice(0, Math.min(LINKS_PER_RELATION, left));
    left -= shown.length;
    const more = link.ids.length - shown.length;
    if (!shown.length) return `${link.relation} +${more}`;
    return `${link.relation} ${shown
      .map((id) => linkEntry(index, id, shape.titles))
      .join(', ')}${more ? ` +${more} more` : ''}`;
  });
  return `   ${label}: ${parts.join('; ')}`;
}

/**
 * The chain line. It keeps the head and the shown and matched versions,
 * fills up to `shape.chain` versions newest first, and counts the versions it
 * leaves out, as `(2 more)`.
 */
function chainLine(hit: FindHit, shape: CardShape): string | undefined {
  if (hit.chain.length < 2) return undefined;
  const kept = new Set(
    [hit.head, hit.record, hit.matched].map(({ id }) =>
      hit.chain.findIndex((member) => member.id === id)
    )
  );
  for (let i = hit.chain.length - 1; i >= 0 && kept.size < shape.chain; i--)
    kept.add(i);
  const parts: string[] = [];
  let skipped = 0;
  hit.chain.forEach((member, i) => {
    if (!kept.has(i)) {
      skipped++;
      return;
    }
    if (skipped) parts.push(`(${skipped} more)`);
    skipped = 0;
    const marks = [
      member.id === hit.head.id ? 'head' : '',
      member.id === hit.record.id && member.id !== hit.head.id ? 'as of' : '',
    ].filter(Boolean);
    const killer = [
      ...(member.relations.invalidated_by ?? []).map(
        (id) => `invalidated_by ${id}`
      ),
      ...(member.relations.rejected_by ?? []).map((id) => `rejected_by ${id}`),
    ];
    parts.push(
      `v${i + 1} ${member.id} ${standingOf(member)} ${date(member)}${
        killer.length ? ` ${killer.join(', ')}` : ''
      }${marks.length ? ` (${marks.join(', ')})` : ''}`
    );
  });
  if (skipped) parts.push(`(${skipped} more)`);
  return `   chain: ${parts.join(' -> ')}`;
}

function renderCard(
  index: FindIndex,
  hit: FindHit,
  n: number,
  shape: CardShape
): string[] {
  const { record } = hit;
  const standing = standingOf(record);
  const retracted = record.frontmatter.retracted === true;
  const version = hit.chain.findIndex((member) => member.id === hit.matched.id);
  const lines = [
    `${n}. ${record.id} | ${kindLabel(record)} | ${
      retracted ? 'RETRACTED' : standing
    }${
      record.id === hit.head.id && hit.chain.length > 1 ? ' (head)' : ''
    } | ${date(record)} | score ${hit.score.toFixed(1)}`,
    `   "${cut(text(record.frontmatter.title), 100)}"`,
    ...(retracted
      ? [
          `   RETRACTED${
            typeof record.frontmatter.retracted_at === 'string'
              ? ` ${record.frontmatter.retracted_at.slice(0, 10)}`
              : ''
          }: ${cut(
            text(record.frontmatter.retracted_reason),
            80
          )}; not live, kept for audit only`,
        ]
      : []),
    ...(hit.matched.id !== record.id
      ? [`   matched: v${version + 1} ${hit.matched.id}`]
      : []),
    ...(hit.snippet.length
      ? [
          `   "${hit.snippet.text}" [chars ${hit.snippet.start}-${hit.snippet.end} of ${hit.snippet.length}]`,
        ]
      : []),
  ];
  for (const line of [
    chainLine(hit, shape),
    linkLine(index, 'out', hit.outbound, shape),
    linkLine(index, 'in', hit.inbound, shape),
  ])
    if (line) lines.push(line);
  if (hit.code.length)
    lines.push(
      `   code: ${hit.code.slice(0, CODE_REFS_SHOWN).join(', ')}${
        hit.code.length > CODE_REFS_SHOWN
          ? ` +${hit.code.length - CODE_REFS_SHOWN} more`
          : ''
      }`
    );
  return lines;
}

/**
 * Shapes to try, fullest first. Each step gives up one thing: link titles,
 * then the Effort ranking line (the `##` headings and the JSON `find.efforts`
 * still carry it), then the middle of each chain, then link entries.
 */
const SHRINK_STEPS: readonly (CardShape & { efforts: boolean })[] = [
  { links: 4, titles: true, chain: CHAIN_VERSIONS_SHOWN, efforts: true },
  { links: 4, titles: false, chain: CHAIN_VERSIONS_SHOWN, efforts: true },
  { links: 4, titles: false, chain: CHAIN_VERSIONS_SHOWN, efforts: false },
  { links: 4, titles: false, chain: 0, efforts: false },
  { links: 3, titles: false, chain: 0, efforts: false },
  { links: 2, titles: false, chain: 0, efforts: false },
  { links: 1, titles: false, chain: 0, efforts: false },
  { links: 0, titles: false, chain: 0, efforts: false },
];

/**
 * The cards as Markdown. The renderer measures the whole text and takes the
 * first shape in SHRINK_STEPS that fits the character aim.
 */
export function renderFindCards(index: FindIndex, result: FindResult): string {
  const scope = result.effort ? `in ${result.effort}` : 'in all Efforts';
  const render = (shape: typeof SHRINK_STEPS[number]) => {
    const lines = [
      `find "${cut(result.query, 120)}" ${scope} (${
        result.searched
      } records searched, ${result.matched} matched, ${
        result.hits.length
      } shown)`,
      `matched: ${result.found.join(' ') || 'none'} | missing: ${
        result.missing.join(' ') || 'none'
      }`,
    ];
    if (shape.efforts && result.efforts?.length)
      lines.push(
        `efforts by match: ${result.efforts
          .map(
            (effort) =>
              `${effort.id} "${cut(effort.title, 30)}" ${effort.mass.toFixed(
                1
              )}`
          )
          .join(' | ')}`
      );
    let effort: string | null | undefined;
    result.hits.forEach((hit, i) => {
      if (result.efforts && hit.effort !== effort) {
        effort = hit.effort;
        lines.push(
          `## ${effort ?? 'no Effort'} "${cut(
            text(index.records.get(effort ?? '')?.frontmatter.title),
            60
          )}"`
        );
      }
      lines.push(...renderCard(index, hit, i + 1, shape));
    });
    if (!result.hits.length) lines.push('no records matched');
    return lines.join('\n');
  };
  const limit = CARDS_HEADER_CHARS + CARD_CHARS * result.hits.length;
  let markdown = '';
  for (const shape of SHRINK_STEPS) {
    markdown = render(shape);
    if (markdown.length <= limit) break;
  }
  return markdown;
}
