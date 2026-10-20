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
/**
 * A passage runs on to finish the word after its last match only when that
 * word starts within NEXT_WORD_GAP characters of the match and ends within
 * NEXT_WORD_CHARS of the window's end. A long token, such as a hash, or a run
 * of table rules after a match keeps the plain end instead.
 */
const NEXT_WORD_GAP = 24;
const NEXT_WORD_CHARS = 32;
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
 * Characters the cards aim for. The aim has a header share, a share per hit
 * for the card's frame (its header, title, chain, and links), and the length
 * of every passage the card quotes. Passages count apart because they are
 * what matched and are never cut, so a longer or an extra passage never
 * pushes out a chain or a link. The frame share was 750 when it also held
 * the one passage, about 150 characters; it is 600 now that passages count
 * apart. Five frames with one passage each still aim for about 4,000
 * characters (near 1,000 tokens at 4 characters a token). The renderer
 * shrinks link titles, the Effort ranking line, chain lines, and link lists
 * to fit, in that order. Titles, passages, and code lines are never cut
 * further, so a card set can still run past the aim.
 */
const CARDS_HEADER_CHARS = 300;
const CARD_CHARS = 600;

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

/**
 * Relations whose stored ids, read backward, give a record's inbound links,
 * in the order a card lists them. The links that pass a verdict on a record
 * (it resolves, rejects, or mitigates another) come first. `derived_by`
 * comes last: a much-used record collects dozens of derived records, and
 * listed first they would fill the line's few entries.
 */
const INBOUND_LABELS: Readonly<Record<string, string>> = {
  resolved_by: 'resolves',
  rejected_by: 'rejects',
  mitigated_by: 'mitigates',
  evidence: 'evidence_for',
  cites: 'cited_by',
  blob: 'blob_of',
  derives_from: 'derived_by',
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
  /**
   * Search only these records, each with what ties it to the query's code
   * or ref (`--path`, `--refs`). Every chain that holds one is a candidate,
   * even when no query word matches it. With words, BM25 ranks them; without,
   * the strongest tie ranks them, then the newest shown version. There is no
   * per-Effort cap.
   */
  readonly governed?: ReadonlyMap<string, readonly FindVia[]>;
}

/** What ties a record to the code or ref a query names. */
export interface FindVia {
  /** citation 3, trailer 2, text 1; 0 for a record only a ref changed. */
  readonly strength: number;
  /** The record the tie is on; a card for a newer version names it. */
  readonly record: string;
  /** As the card prints it, such as `cites cit-a: src/a.ts#run@1a2b3c4`. */
  readonly text: string;
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
  /**
   * Passages of the matched version's body: the best one, then a second
   * when another part of the body holds query words the first lacks. The
   * second may come from earlier in the body; the offsets say where. Empty
   * when the body is.
   */
  readonly passages: readonly FindPassage[];
  /**
   * The best passage of a Blob attached to the shown version: its own `blob`
   * (a Citation), or the `blob` of a Citation it `cites`. Only when that
   * payload holds a query word, and the Blob is neither a hit itself nor
   * quoted on an earlier card. `retracted` is set when the Blob, or the
   * Citation that leads to it, is retracted, which only `--retracted
   * include` or `only` lets through.
   */
  readonly attached?: {
    readonly id: string;
    readonly passage: FindPassage;
    readonly retracted?: true;
  };
  readonly outbound: readonly FindLink[];
  readonly inbound: readonly FindLink[];
  readonly code: readonly string[];
  /** With `governed`: the ties of every chain member, strongest first. */
  readonly via?: readonly FindVia[];
  /** With `--refs`: where the shown version lives, as `only on feat/a`. */
  readonly branch?: string;
  /**
   * With `--refs`, when branches each supersede one version: every head of
   * the combined chain, which the chain line marks as rival heads.
   */
  readonly heads?: readonly string[];
}

/** A window of a body, with its offsets in the normalized body. */
export interface FindPassage {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly length: number;
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
  /**
   * Query words found in at least one shown hit or a Blob a card quotes, as
   * written.
   */
  readonly found: readonly string[];
  /** Query words that no shown hit, nor a Blob a card quotes, contains. */
  readonly missing: readonly string[];
  /** With `governed` and no query words: hits carry no score. */
  readonly unscored?: true;
  /** Replaces the cards' first line, for `--path` and `--refs`. */
  readonly header?: string;
  /** Lines after the header, such as the refs a query overlaid. */
  readonly notes?: readonly string[];
  /** With `--refs`: the first conflicts across the base and the refs. */
  readonly conflicts?: readonly string[];
  /** With `--refs`: how many conflicts there are in all. */
  readonly conflictsTotal?: number;
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

/** BM25's inverse document frequency: rare terms weigh more. */
function idf(index: FindIndex, term: string): number {
  const n = index.docs.size;
  const df = index.df.get(term) ?? 0;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

function bm25(
  index: FindIndex,
  doc: FindDoc,
  terms: readonly string[]
): number {
  let score = 0;
  for (const term of terms) {
    const tf = doc.tf.get(term);
    if (!tf) continue;
    score +=
      (idf(index, term) * tf * (K1 + 1)) /
      (tf + K1 * (1 - B + (B * doc.length) / (index.averageLength || 1)));
  }
  return score;
}

export interface PassageOptions {
  /** Weight of each term, such as its IDF; 1 for a term left out. */
  readonly weights?: ReadonlyMap<string, number>;
  /**
   * Terms the card already shows, such as its title's. A window scores by
   * the terms it adds first; these only break ties.
   */
  readonly shown?: ReadonlySet<string>;
}

interface Window {
  /** Summed weight of distinct terms not already shown. */
  readonly fresh: number;
  /** Summed weight of all distinct terms. */
  readonly weight: number;
  /**
   * The matches the passage centers on: the window's matches, less repeats
   * at either end whose term also appears further in.
   */
  readonly inside: readonly Span[];
  /** Characters from the first of `inside` to the end of the last. */
  readonly spread: number;
}

/** Matched spans of a normalized body, in text order. */
function matchSpans(source: string, terms: ReadonlySet<string>): Span[] {
  return [...wordSpans(source), ...entitySpans(source)]
    .filter((span) => terms.has(span.term))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/** Drops matches at either end whose term the rest still holds. */
function tighten(spans: readonly Span[]): Span[] {
  const kept = [...spans];
  const repeated = (i: number) =>
    kept.some((span, j) => j !== i && span.term === kept[i].term);
  while (kept.length > 1 && repeated(0)) kept.shift();
  while (kept.length > 1 && repeated(kept.length - 1)) kept.pop();
  return kept;
}

/**
 * The best 160-character window over `spans`: the most weight of terms not
 * yet shown, then the most weight in all, then the matches set closest
 * together, then the earliest. Undefined when no span is given.
 */
function bestWindow(
  spans: readonly Span[],
  options: PassageOptions
): Window | undefined {
  const weight = (term: string) => options.weights?.get(term) ?? 1;
  let best: Window | undefined;
  for (const anchor of spans) {
    const from = Math.max(0, anchor.start - 20);
    const inside = tighten(
      spans.filter(
        (span) => span.start >= from && span.end <= from + SNIPPET_CHARS
      )
    );
    // A match longer than the window, such as a long path, fits no window.
    if (!inside.length) continue;
    const terms = new Set(inside.map((span) => span.term));
    let fresh = 0;
    let all = 0;
    for (const term of terms) {
      all += weight(term);
      if (!options.shown?.has(term)) fresh += weight(term);
    }
    const spread =
      Math.max(...inside.map((span) => span.end)) - inside[0].start;
    if (
      !best ||
      fresh > best.fresh ||
      (fresh === best.fresh &&
        (all > best.weight || (all === best.weight && spread < best.spread)))
    )
      best = { fresh, weight: all, inside, spread };
  }
  return best;
}

/**
 * Cuts the passage around a window's matches. The matches sit in the middle
 * of the 160 characters, and the passage runs to the end of the short word
 * after the last match, so the value a matched word names (`"fuse_ms": 42`)
 * is not cut off. `floor` and `ceiling` keep the passage clear of another
 * passage.
 */
function passageAround(
  source: string,
  inside: readonly Span[],
  floor = 0,
  ceiling = source.length
): FindPassage {
  const last = inside.length
    ? Math.max(...inside.map((span) => span.end))
    : floor;
  let start = floor;
  if (inside.length) {
    const first = inside[0].start;
    const slack = SNIPPET_CHARS - (last - first);
    start = Math.max(floor, first - Math.floor(slack / 2));
    // Start at the top when that drops only a word or two and keeps them all.
    if (floor === 0 && start <= 20 && last <= SNIPPET_CHARS) start = 0;
    // Start on a word boundary, without skipping past the first match.
    while (start > floor && start < first && /\S/.test(source[start - 1]))
      start++;
  }
  // Against a ceiling, give up words before the matches, not after them.
  if (ceiling < source.length)
    start = Math.max(floor, Math.min(start, ceiling - SNIPPET_CHARS));
  let end = Math.min(ceiling, start + SNIPPET_CHARS);
  if (end < source.length) {
    const space = source.lastIndexOf(' ', end);
    if (space > Math.max(last - 1, start + SNIPPET_CHARS * 0.75)) end = space;
  }
  if (inside.length) {
    // A copy, so the shared pattern keeps lastIndex 0 for matchAll.
    const word = new RegExp(WORD.source, WORD.flags);
    word.lastIndex = last;
    const next = word.exec(source);
    const after = next ? next.index + next[0].length : 0;
    if (
      next &&
      after > end &&
      next.index - last <= NEXT_WORD_GAP &&
      after - end <= NEXT_WORD_CHARS
    )
      end = Math.min(ceiling, after);
  }
  const window = source.slice(start, end).replace(/\s+/g, ' ').trim();
  return {
    text: `${start > 0 ? '…' : ''}${window}${end < source.length ? '…' : ''}`,
    start,
    end,
    length: source.length,
  };
}

/**
 * The 160-character window of `body` that best covers the matched terms,
 * with its offsets. Without weights or shown terms, that is the window with
 * the most distinct matched terms, then the closest-set matches, then the
 * earliest.
 */
export function bestSnippet(
  body: string,
  terms: ReadonlySet<string>,
  options: PassageOptions = {}
): FindPassage {
  const source = normalizeBody(body);
  const best = bestWindow(matchSpans(source, terms), options);
  return passageAround(source, best?.inside ?? []);
}

/**
 * Up to two passages of `body`, the best one first. The second comes from
 * text outside the first and must hold a matched term that neither the first
 * passage nor the shown terms hold, so it only appears when the body matches
 * in two places.
 */
export function bestPassages(
  body: string,
  terms: ReadonlySet<string>,
  options: PassageOptions = {}
): FindPassage[] {
  const source = normalizeBody(body);
  if (!source.trim()) return [];
  const spans = matchSpans(source, terms);
  const best = bestWindow(spans, options);
  const first = passageAround(source, best?.inside ?? []);
  if (!best) return [first];
  const seen = new Set([
    ...(options.shown ?? []),
    ...spans
      .filter((span) => span.start >= first.start && span.end <= first.end)
      .map((span) => span.term),
  ]);
  const rest = spans.filter(
    (span) => span.end <= first.start || span.start >= first.end
  );
  const second = bestWindow(rest, { ...options, shown: seen });
  if (!second || second.fresh <= 0) return [first];
  // Keep the second window on its side of the first, so they never overlap.
  const before = second.inside[0].start < first.start;
  const inside = second.inside.filter((span) =>
    before ? span.end <= first.start : span.start >= first.end
  );
  const passage = before
    ? passageAround(source, inside, 0, first.start)
    : passageAround(source, inside, first.end);
  return [first, passage];
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
export function headsOf(chain: readonly ReadRecord[]): ReadRecord[] {
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
 * The best passage among the Blobs attached to a record: its own `blob`, as
 * a Citation has, and the `blob` of each Citation it `cites`. Only a Citation
 * and a Blob that `usable` accepts count. A Blob in `skip` is left out: one
 * that is a hit, since its own card quotes it, or one an earlier card quotes.
 * So is one whose payload holds no query term. Ties go to the earlier Blob
 * id.
 */
function attachedPassage(
  index: FindIndex,
  record: ReadRecord,
  terms: ReadonlySet<string>,
  options: PassageOptions,
  skip: ReadonlySet<string>,
  usable: (target: ReadRecord) => boolean
): FindHit['attached'] {
  // Each Blob id, with whether it or the Citation leading to it is retracted.
  const blobs = new Map<string, boolean>();
  const add = (via: ReadRecord | undefined) => {
    const id = via?.frontmatter.blob;
    if (!via || typeof id !== 'string' || !usable(via)) return;
    const blob = index.records.get(id);
    if (!blob || !usable(blob) || skip.has(id)) return;
    const retracted =
      via.frontmatter.retracted === true || blob.frontmatter.retracted === true;
    blobs.set(id, (blobs.get(id) ?? true) && retracted);
  };
  add(record);
  for (const id of record.relations.cites ?? []) add(index.records.get(id));
  let best:
    | { id: string; window: Window; source: string; retracted: boolean }
    | undefined;
  for (const [id, retracted] of [...blobs].sort(([a], [b]) =>
    compareIds(a, b)
  )) {
    const blob = index.records.get(id) as ReadRecord;
    const source = normalizeBody(blob.body_excerpt);
    const window = bestWindow(matchSpans(source, terms), options);
    if (
      window &&
      (!best ||
        window.fresh > best.window.fresh ||
        (window.fresh === best.window.fresh &&
          window.weight > best.window.weight))
    )
      best = { id, window, source, retracted };
  }
  return best
    ? {
        id: best.id,
        passage: passageAround(best.source, best.window.inside),
        ...(best.retracted ? { retracted: true as const } : {}),
      }
    : undefined;
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
  const governed = options.governed;
  for (const doc of index.docs.values()) {
    if (!eligible(doc.record)) continue;
    if (governed) {
      // Every eligible version of a governed chain is a candidate, so the
      // card can show a head that the tie itself is not on.
      const chainId = index.chainOf.get(doc.record.id) as string;
      const chain = index.chains.get(chainId) as readonly ReadRecord[];
      if (!chain.some((member) => governed.has(member.id))) continue;
    }
    searched++;
    const score = bm25(index, doc, termList);
    if (score <= 0 && !governed) continue;
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
    .flatMap(([chainId, { record: best, score }]) => {
      const chain = index.chains.get(chainId) as readonly ReadRecord[];
      const heads = headsOf(chain);
      const head = heads.at(-1) ?? (chain.at(-1) as ReadRecord);
      const versions = chain.filter(eligible);
      // The card shows an eligible version: the newest head that is in
      // scope, else the newest version that is. With `asOf`, the last version
      // in link order created by then. `best`, the version that scored best, is always eligible.
      const record =
        (asOf === undefined ? heads.filter(eligible).at(-1) : undefined) ??
        versions.at(-1) ??
        best;
      // A governed chain no query word matched quotes the shown version.
      const matched = score > 0 || !governed ? best : record;
      const via = governed ? chainVias(chain, governed) : undefined;
      return [{ chain, versions, head, record, matched, score, via }];
    })
    .sort(
      governed
        ? (a, b) =>
            b.score - a.score ||
            (b.via?.[0]?.strength ?? 0) - (a.via?.[0]?.strength ?? 0) ||
            time(b.record) - time(a.record) ||
            compareIds(a.head.id, b.head.id)
        : (a, b) => b.score - a.score || compareIds(a.head.id, b.head.id)
    );
  const effortOf = (record: ReadRecord) =>
    typeof record.frontmatter.effort === 'string'
      ? record.frontmatter.effort
      : null;
  let selected = ranked;
  let efforts: FindEffortMass[] | undefined;
  if (governed) selected = selected.slice(0, limit);
  else if (!options.effort) {
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
  const weights = new Map(termList.map((term) => [term, idf(index, term)]));
  // A Citation or Blob a card quotes through must be live at the query's
  // time: not retracted unless the retracted mode lets retracted records in,
  // not superseded by a version written by then, and written by then itself.
  // The kind and Effort filters do not apply to it.
  const mode = options.retracted ?? 'exclude';
  const usable = (target: ReadRecord) => {
    if (mode === 'exclude' && target.frontmatter.retracted === true)
      return false;
    if (asOf !== undefined && time(target) > asOf) return false;
    const chain = index.chains.get(index.chainOf.get(target.id) ?? '');
    if (!chain || chain.length < 2) return true;
    const written =
      asOf === undefined ? chain : chain.filter((m) => time(m) <= asOf);
    return headsOf(written).some((member) => member.id === target.id);
  };
  // Blobs not to quote: hits, which quote themselves, and, card by card,
  // Blobs an earlier card already quotes.
  const skipBlobs = new Set(selected.map((hit) => hit.record.id));
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
    // The card prints the shown version's title, so the passages lead with
    // the query words the title does not already show.
    const titleText = text(hit.record.frontmatter.title);
    const title = new Set(
      [...wordSpans(titleText), ...entitySpans(titleText)].map(
        (span) => span.term
      )
    );
    const passages = bestPassages(hit.matched.body_excerpt, querySet, {
      weights,
      shown: title,
    });
    const onCard = new Set(title);
    for (const passage of passages)
      for (const span of matchSpans(passage.text, querySet))
        onCard.add(span.term);
    const attached = attachedPassage(
      index,
      hit.record,
      querySet,
      { weights, shown: onCard },
      skipBlobs,
      usable
    );
    if (attached) {
      skipBlobs.add(attached.id);
      for (const term of termList)
        if (index.docs.get(attached.id)?.tf.has(term)) foundTerms.add(term);
    }
    return {
      record: hit.record,
      head: hit.head,
      matched: hit.matched,
      chain: hit.chain,
      score: hit.score,
      effort: effortOf(hit.record),
      passages,
      ...(attached ? { attached } : {}),
      outbound: outboundLinks(hit.record),
      inbound: inboundLinks(index, hit.record),
      code,
      ...(hit.via ? { via: hit.via } : {}),
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
    ...(governed && !termList.length ? { unscored: true as const } : {}),
  };
}

/**
 * The ties of a chain's members, strongest first, then in text order, each
 * text once.
 */
function chainVias(
  chain: readonly ReadRecord[],
  governed: ReadonlyMap<string, readonly FindVia[]>
): FindVia[] {
  const seen = new Set<string>();
  return chain
    .flatMap((member) => governed.get(member.id) ?? [])
    .sort(
      (a, b) =>
        b.strength - a.strength ||
        compareIds(a.text, b.text) ||
        compareIds(a.record, b.record)
    )
    .filter((via) => {
      const key = `${via.text}\0${via.record}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
      member.id === hit.head.id || hit.heads?.includes(member.id) ? 'head' : '',
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

function passageLine(passage: FindPassage): string {
  return `   "${passage.text}" [chars ${passage.start}-${passage.end} of ${passage.length}]`;
}

function attachedLine(attached: NonNullable<FindHit['attached']>): string {
  const { id, passage } = attached;
  return `   blob ${id}${attached.retracted ? ' (retracted)' : ''}: "${
    passage.text
  }" [chars ${passage.start}-${passage.end} of ${passage.length}]`;
}

const VIAS_SHOWN = 3;

/** The `via:` and `branch:` lines, which are never cut. */
function tieLines(hit: FindHit): string[] {
  const lines: string[] = [];
  const vias = (hit.via ?? []).filter((via) => via.text);
  if (vias.length)
    lines.push(
      `   via: ${vias
        .slice(0, VIAS_SHOWN)
        .map(
          (via) =>
            `${via.text}${
              via.record !== hit.record.id ? ` (on ${via.record})` : ''
            }`
        )
        .join('; ')}${
        vias.length > VIAS_SHOWN ? `; +${vias.length - VIAS_SHOWN} more` : ''
      }`
    );
  if (hit.branch) lines.push(`   branch: ${hit.branch}`);
  return lines;
}

/** Characters of a card's passage and tie lines, with their line breaks. */
function passageChars(hit: FindHit): number {
  const lines = [
    ...tieLines(hit),
    ...hit.passages.map(passageLine),
    ...(hit.attached ? [attachedLine(hit.attached)] : []),
  ];
  return lines.reduce((sum, line) => sum + line.length + 1, 0);
}

function renderCard(
  index: FindIndex,
  hit: FindHit,
  n: number,
  shape: CardShape,
  unscored = false
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
    } | ${date(record)}${unscored ? '' : ` | score ${hit.score.toFixed(1)}`}`,
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
    ...tieLines(hit),
    ...(hit.matched.id !== record.id
      ? [`   matched: v${version + 1} ${hit.matched.id}`]
      : []),
    ...hit.passages.map(passageLine),
    ...(hit.attached ? [attachedLine(hit.attached)] : []),
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
  // Notes and conflicts are never cut, so they count apart too.
  const conflictTotal = result.conflictsTotal ?? result.conflicts?.length ?? 0;
  const conflictLines = result.conflicts
    ? conflictTotal
      ? [
          `CONFLICTS (${conflictTotal})`,
          ...result.conflicts.map((conflict) => `- ${conflict}`),
          ...(conflictTotal > result.conflicts.length
            ? [`- +${conflictTotal - result.conflicts.length} more`]
            : []),
        ]
      : ['CONFLICTS: none']
    : [];
  const render = (shape: typeof SHRINK_STEPS[number]) => {
    const lines = [
      result.header ??
        `find "${cut(result.query, 120)}" ${scope} (${
          result.searched
        } records searched, ${result.matched} matched, ${
          result.hits.length
        } shown)`,
      ...(result.unscored
        ? []
        : [
            `matched: ${result.found.join(' ') || 'none'} | missing: ${
              result.missing.join(' ') || 'none'
            }`,
          ]),
      ...(result.notes ?? []),
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
      lines.push(...renderCard(index, hit, i + 1, shape, result.unscored));
    });
    if (!result.hits.length) lines.push('no records matched');
    lines.push(...conflictLines);
    return lines.join('\n');
  };
  const limit =
    CARDS_HEADER_CHARS +
    CARD_CHARS * result.hits.length +
    result.hits.reduce((sum, hit) => sum + passageChars(hit), 0) +
    [...(result.notes ?? []), ...conflictLines].reduce(
      (sum, line) => sum + line.length + 1,
      0
    );
  let markdown = '';
  for (const shape of SHRINK_STEPS) {
    markdown = render(shape);
    if (markdown.length <= limit) break;
  }
  return markdown;
}
