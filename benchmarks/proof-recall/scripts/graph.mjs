// Loads a built benchmark graph and evaluates question checks against it.
// Shared by check.mjs (authoring) and grade.mjs (scoring runs).
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  compactionChanges,
  compactionHeads,
  isCompaction,
  isLiveStanding,
  KIND_DIRECTORY,
  parseCovers,
  parseDocument,
  recordStanding,
  staleDerivations,
} from '@flatbread/proof';

const EXCERPT_CHARS = 600;
const EXCERPT_LINES = 12;

export async function loadGraph(root) {
  const keymap = JSON.parse(await readFile(join(root, 'keymap.json'), 'utf8'));
  const keyById = new Map(Object.entries(keymap).map(([k, id]) => [id, k]));
  const records = new Map();
  for (const [kind, dir] of Object.entries(KIND_DIRECTORY)) {
    let files = [];
    try {
      files = await readdir(join(root, dir));
    } catch {
      continue;
    }
    for (const file of files.filter((name) => name.endsWith('.md'))) {
      const bytes = await readFile(join(root, dir, file));
      const { frontmatter, body } = parseDocument(bytes, kind);
      records.set(frontmatter.id, {
        id: frontmatter.id,
        kind,
        frontmatter,
        body,
      });
    }
  }
  return { root, keymap, keyById, records };
}

/** A question's local keys belong to its file's Effort; `effort.key` is global. */
export function qualify(effort, key) {
  return key.includes('.') ? key : `${effort}.${key}`;
}

export function idFor(graph, effort, key) {
  const id = graph.keymap[qualify(effort, key)];
  if (!id) throw new Error(`unknown key "${qualify(effort, key)}"`);
  return id;
}

function record(graph, effort, key) {
  return graph.records.get(idFor(graph, effort, key));
}

function list(value) {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

export function standing(rec) {
  return recordStanding(rec);
}

function effortRecords(graph, effortId) {
  return [...graph.records.values()].filter(
    (rec) => rec.frontmatter.effort === effortId
  );
}

const PATH_RELATIONS = new Set([
  'derives_from',
  'supersedes',
  'superseded_by',
  'invalidates',
  'invalidated_by',
  'resolved_by',
  'rejected_by',
  'mitigated_by',
  'evidence',
  'cites',
  'blob',
  'effort',
  // Reverse readings of stored forward edges:
  'supports', // to.derives_from contains from
  'cited_by', // to.cites contains from
  'reopen_history', // from.reopen_history[].rejected_by contains to
]);

/** True when the stored graph holds this edge. */
const LINK_FIELDS = [
  'derives_from',
  'supersedes',
  'superseded_by',
  'invalidates',
  'invalidated_by',
  'resolved_by',
  'rejected_by',
  'mitigated_by',
  'evidence',
  'cites',
  'blob',
];

/**
 * Fewest edges between two records, following only links stored on the
 * record being read (what a reader can see), and never the Effort link every
 * record shares. A route shorter than a question's `hops` means the question
 * is easier than its tier claims.
 */
export function shortestHops(graph, effort, fromKey, toKey, max = 8) {
  if (!graph.adjacency) {
    graph.adjacency = new Map();
    const link = (a, b) => {
      if (!graph.adjacency.has(a)) graph.adjacency.set(a, new Set());
      graph.adjacency.get(a).add(b);
    };
    for (const rec of graph.records.values()) {
      const targets = LINK_FIELDS.flatMap((field) =>
        list(rec.frontmatter[field])
      );
      for (const entry of list(rec.frontmatter.reopen_history))
        targets.push(...list(entry?.rejected_by));
      for (const target of targets) link(rec.id, target);
    }
  }
  const start = idFor(graph, effort, fromKey);
  const goal = idFor(graph, effort, toKey);
  let frontier = [start];
  const seen = new Set(frontier);
  for (let hops = 0; hops <= max; hops++) {
    if (frontier.includes(goal)) return hops;
    const next = [];
    for (const id of frontier)
      for (const neighbor of graph.adjacency.get(id) ?? [])
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          next.push(neighbor);
        }
    frontier = next;
  }
  return Infinity;
}

export function hasEdge(graph, effort, [fromKey, relation, toKey]) {
  if (!PATH_RELATIONS.has(relation))
    throw new Error(`bad relation ${relation}`);
  const from = record(graph, effort, fromKey);
  const to = record(graph, effort, toKey);
  if (!from || !to) return false;
  if (relation === 'supports')
    return list(to.frontmatter.derives_from).includes(from.id);
  if (relation === 'cited_by')
    return list(to.frontmatter.cites).includes(from.id);
  if (relation === 'reopen_history')
    return list(from.frontmatter.reopen_history).some((entry) =>
      list(entry?.rejected_by).includes(to.id)
    );
  return list(from.frontmatter[relation]).includes(to.id);
}

function head(graph, rec) {
  const seen = new Set();
  let current = rec;
  while (current && list(current.frontmatter.superseded_by).length) {
    if (seen.has(current.id))
      throw new Error(`supersession cycle at ${current.id}`);
    seen.add(current.id);
    current = graph.records.get(list(current.frontmatter.superseded_by)[0]);
  }
  return current;
}

function chain(graph, rec) {
  let first = rec;
  while (list(first.frontmatter.supersedes).length)
    first = graph.records.get(list(first.frontmatter.supersedes)[0]);
  const out = [first];
  while (list(out.at(-1).frontmatter.superseded_by).length)
    out.push(graph.records.get(list(out.at(-1).frontmatter.superseded_by)[0]));
  return out;
}

function matches(rec, where = {}) {
  return Object.entries(where).every(([field, want]) => {
    const value = field === 'standing' ? standing(rec) : rec.frontmatter[field];
    return list(want).map(String).includes(String(value));
  });
}

function compactionState(graph, effortId) {
  const recs = effortRecords(graph, effortId);
  const heads = compactionHeads(recs).sort((a, b) =>
    `${a.frontmatter.created_at}\0${a.id}`.localeCompare(
      `${b.frontmatter.created_at}\0${b.id}`
    )
  );
  const top = heads.at(-1);
  if (!top)
    return {
      head: null,
      heads: 0,
      stale: false,
      changes: [],
      staleTargets: [],
    };
  const covers = parseCovers(top.frontmatter.covers);
  const changes = compactionChanges(covers, recs);
  const staleTargets = staleDerivations(
    covers,
    list(top.frontmatter.derives_from),
    recs
  );
  const invalidated = list(top.frontmatter.invalidated_by).length > 0;
  return {
    head: top.id,
    heads: heads.length,
    stale: staleTargets.length > 0 || invalidated,
    changes,
    staleTargets,
  };
}

/**
 * Runs one check. Value checks return the answer they compute; assertion
 * checks (`body`, `edge`) return booleans.
 */
export function runCheck(graph, effort, check) {
  const keyOf = (rec) => graph.keyById.get(rec.id);
  // Only Effort-wide checks need it. Files that span Efforts (`cross`,
  // `ambiguous`) have no Effort of their own, so their checks name
  // `check.effort` and qualify every key as `<effort>.<key>`.
  const effortId = () => idFor(graph, check.effort ?? effort, 'effort');
  switch (check.type) {
    case 'field': {
      const rec = record(graph, effort, check.record);
      if (check.field === 'standing') return standing(rec);
      return rec.frontmatter[check.field] ?? null;
    }
    case 'head':
      return keyOf(head(graph, record(graph, effort, check.start)));
    case 'chain':
      return chain(graph, record(graph, effort, check.start)).map(keyOf);
    case 'asof': {
      // The version of a supersession chain that was current at a moment.
      const at = new Date(check.at).getTime();
      const versions = chain(graph, record(graph, effort, check.start)).filter(
        (rec) => new Date(rec.frontmatter.created_at).getTime() <= at
      );
      return versions.length ? keyOf(versions.at(-1)) : null;
    }
    case 'select': {
      // `effort` may list several Efforts, or be "*" for all of them.
      const scope =
        check.effort === '*'
          ? Object.keys(graph.keymap)
              .filter((key) => key.endsWith('.effort'))
              .map((key) => key.split('.')[0])
          : Array.isArray(check.effort)
          ? check.effort
          : null;
      let recs = scope
        ? scope.flatMap((name) =>
            effortRecords(graph, idFor(graph, name, 'effort'))
          )
        : effortRecords(graph, effortId());
      if (check.kinds)
        recs = recs.filter((rec) => check.kinds.includes(rec.kind));
      const retracted = check.retracted ?? 'exclude';
      if (retracted === 'exclude')
        recs = recs.filter((rec) => rec.frontmatter.retracted !== true);
      if (retracted === 'only')
        recs = recs.filter((rec) => rec.frontmatter.retracted === true);
      if (check.compactions !== true)
        recs = recs.filter((rec) => !isCompaction(rec));
      if (check.where) recs = recs.filter((rec) => matches(rec, check.where));
      if (check.live !== undefined)
        recs = recs.filter(
          (rec) => isLiveStanding(rec.kind, standing(rec)) === check.live
        );
      if (check.derivesFrom) {
        const target = idFor(graph, effort, check.derivesFrom);
        recs = recs.filter((rec) =>
          list(rec.frontmatter.derives_from).includes(target)
        );
      }
      if (check.restsOn)
        recs = recs.filter((rec) =>
          list(rec.frontmatter.derives_from).some((id) => {
            const support = graph.records.get(id);
            return support && list(check.restsOn).includes(standing(support));
          })
        );
      if (check.invalidates) {
        const target = idFor(graph, effort, check.invalidates);
        recs = recs.filter((rec) =>
          list(rec.frontmatter.invalidates).includes(target)
        );
      }
      // Each text filter takes one phrase or a list; a record must contain
      // every phrase, ignoring case.
      const contains = (text, phrases) =>
        list(phrases).every((p) =>
          text.toLowerCase().includes(p.toLowerCase())
        );
      if (check.bodyIncludes)
        recs = recs.filter((rec) => contains(rec.body, check.bodyIncludes));
      if (check.titleIncludes)
        recs = recs.filter((rec) =>
          contains(String(rec.frontmatter.title ?? ''), check.titleIncludes)
        );
      const keys = recs.map(keyOf).sort();
      return check.count ? keys.length : keys;
    }
    case 'efforts': {
      // Efforts themselves, filtered by frontmatter such as `status`.
      const efforts = [...graph.records.values()].filter(
        (rec) => rec.kind === 'effort' && matches(rec, check.where)
      );
      const keys = efforts.map(keyOf).sort();
      return check.count ? keys.length : keys;
    }
    case 'compaction': {
      const state = compactionState(graph, effortId());
      if (check.field === 'head')
        return state.head ? keyOf(graph.records.get(state.head)) : null;
      if (check.field === 'heads') return state.heads;
      if (check.field === 'stale') return state.stale;
      if (check.field === 'changes') return state.changes.length;
      if (check.field === 'changed')
        return state.changes.map((c) => graph.keyById.get(c.id)).sort();
      if (check.field === 'staleTargets')
        return state.staleTargets.map((c) => graph.keyById.get(c.id)).sort();
      throw new Error(`bad compaction field ${check.field}`);
    }
    case 'body': {
      const rec = record(graph, effort, check.record);
      const body = rec.body.replace(/\r\n?/g, '\n');
      return list(check.includes).every((text) => {
        const at = body.indexOf(text);
        if (at < 0) return false;
        if (!check.afterExcerpt) return true;
        // The fact must sit past what browse digests show.
        return (
          at >= EXCERPT_CHARS ||
          body.slice(0, at).split('\n').length > EXCERPT_LINES
        );
      });
    }
    case 'edge':
      return hasEdge(graph, effort, check.edge);
    default:
      throw new Error(`bad check type ${check.type}`);
  }
}

export function sameAnswer(kind, expected, actual, effort) {
  const norm = (key) => (typeof key === 'string' ? qualify(effort, key) : key);
  if (kind === 'record') {
    const one =
      Array.isArray(actual) && actual.length === 1 ? actual[0] : actual;
    return norm(expected) === norm(one);
  }
  if (kind === 'records') {
    const a = [...list(expected)].map(norm).sort();
    const b = [...list(actual)].map(norm).sort();
    return a.length === b.length && a.every((value, i) => value === b[i]);
  }
  if (kind === 'count') return Number(expected) === Number(actual);
  if (kind === 'boolean') return Boolean(expected) === Boolean(actual);
  return (
    String(expected).trim().toLowerCase() ===
    String(actual).trim().toLowerCase()
  );
}
