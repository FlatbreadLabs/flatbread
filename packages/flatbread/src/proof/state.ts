import {
  COMPACTION_STALE_RULE,
  compactionHeads,
  compactionReport,
  isCompaction,
  isLiveStanding,
  type CompactionChange,
  type CompactionRecord,
  type ReadRecord,
  type ReadRelation,
} from '@flatbread/proof';
import { standingOf, type FindIndex } from './find.js';

/**
 * `proof state`: one bounded read of where an Effort stands, built only from
 * frontmatter and links, never from body text. It gives what a search
 * cannot: exact counts, contested topics, open blockers and risks, Issues
 * closed without a fix, live records that rest on dead ones, dated
 * lifecycles, and retractions. Records with nothing to report, such as a
 * question Issue resolved by its one accepted Decision, show only in the
 * counts, so the read stays small on a large Effort.
 *
 * Lists name records by id and standing, without titles: a Proof id starts
 * with its title's words, so a title would mostly repeat it.
 */

/** Most entries each list shows. A list cut short says how many it left out. */
export interface StateLimits {
  readonly openIssues: number;
  readonly risks: number;
  readonly contested: number;
  readonly membersPerTopic: number;
  readonly closedWithoutFix: number;
  readonly deadEvidence: number;
  /** Dead-evidence entries whose dead record was only replaced by a newer version. */
  readonly supersededSupports: number;
  readonly constraints: number;
  readonly linksPerLine: number;
  readonly lifecycle: number;
  readonly retractions: number;
  readonly compactionTargets: number;
  /** Records the head compaction no longer matches, listed by id. */
  readonly compactionChanges: number;
  /** Suspect Decisions and Constraints, listed with why. */
  readonly suspect: number;
}

export const STATE_LIMITS: StateLimits = {
  openIssues: 10,
  risks: 10,
  contested: 12,
  membersPerTopic: 5,
  closedWithoutFix: 10,
  deadEvidence: 12,
  supersededSupports: 12,
  constraints: 12,
  linksPerLine: 4,
  lifecycle: 15,
  retractions: 10,
  compactionTargets: 10,
  compactionChanges: 10,
  suspect: 10,
};
/**
 * Characters the Markdown aims for: under 4,000 tokens at 4 characters a
 * token. Ids run about 70 characters and an entry about 150, so a large
 * Effort fills the lists past this. The read then shows fewer entries,
 * cutting the catch-all lists first: lifecycle, retractions, and the
 * records the head compaction no longer matches (its count stays), then live
 * records that rest only on a replaced version, then older versions in
 * contested topics, then the topics themselves, then dead evidence and
 * Risks. Counts are never cut.
 */
export const STATE_CHARS = 15_000;
const SHRINK_STEPS: readonly Partial<StateLimits>[] = [
  { lifecycle: 8, retractions: 6, compactionChanges: 5 },
  { supersededSupports: 3, compactionChanges: 0 },
  { membersPerTopic: 4 },
  { contested: 8 },
  { deadEvidence: 8, risks: 8, lifecycle: 4 },
  { contested: 6, membersPerTopic: 3, openIssues: 8, closedWithoutFix: 6 },
];
const REASON_CHARS = 40;

export interface StateSection {
  readonly heading: string;
  /**
   * Entries the section has in full. In Constraints in force an entry is
   * one Constraint, and in Dead evidence one dead record, though both
   * print several on a line.
   */
  readonly total: number;
  /** Entries it shows; fewer than `total` means the list was cut. */
  readonly shown: number;
}

export interface EffortState {
  readonly effort_id: string;
  /** Records in the Effort, the Effort itself left out, and how many are live. */
  readonly records: number;
  readonly live: number;
  readonly sections: readonly StateSection[];
  /** True when any list was cut. */
  readonly capped: boolean;
  readonly markdown: string;
}

const KIND_ORDER = [
  'issue',
  'decision',
  'finding',
  'constraint',
  'risk',
  'citation',
  'blob',
] as const;
const KIND_LABEL: Record<string, string> = {
  issue: 'Issues',
  decision: 'Decisions',
  finding: 'Findings',
  constraint: 'Constraints',
  risk: 'Risks',
  citation: 'Citations',
  blob: 'Blobs',
};
/** Standings that take a record off the live graph. */
export const DEAD_STANDINGS: readonly string[] = [
  'superseded',
  'invalidated',
  'rejected',
  'retracted',
];
/** The worst first: a support shown wrong outranks one merely replaced. */
const DEAD_ORDER = ['invalidated', 'retracted', 'rejected', 'superseded'];
/** What a live record rests on: what it derives from, cites, or offers as evidence. */
const SUPPORT_RELATIONS: readonly ReadRelation[] = [
  'derives_from',
  'evidence',
  'cites',
];
const RISK_ORDER = ['realized', 'open', 'mitigated', 'accepted'];

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function time(record: ReadRecord | undefined): number {
  const value = Date.parse(text(record?.frontmatter.created_at));
  return Number.isNaN(value) ? 0 : value;
}

function byCreated(a: ReadRecord, b: ReadRecord): number {
  return time(a) - time(b) || compareIds(a.id, b.id);
}

function day(value: unknown): string {
  return text(value).slice(0, 10) || 'undated';
}

function date(record: ReadRecord | undefined): string {
  return day(record?.frontmatter.created_at);
}

function cut(value: string, max: number): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return [...flat].length > max
    ? `${[...flat].slice(0, max - 1).join('')}…`
    : flat;
}

function subKind(record: ReadRecord): string {
  return text(record.frontmatter.kind);
}

function ids(record: ReadRecord, relation: ReadRelation): string[] {
  return [...(record.relations[relation] ?? [])];
}

function isLive(record: ReadRecord): boolean {
  return isLiveStanding(record.kind, standingOf(record));
}

/** Live and not a compaction: a summary rests on everything, so lists of links leave it out. */
function isCurrent(record: ReadRecord): boolean {
  return isLive(record) && !isCompaction(standingRecord(record));
}

/** `1 topic`, `2 topics`: a count with its noun. */
function count(n: number, noun: string, plural = `${noun}s`): string {
  return `${n} ${n === 1 ? noun : plural}`;
}

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Standing words with their counts, most common first, then by name. */
function tallyLine(counts: ReadonlyMap<string, number>): string {
  return [...counts]
    .sort(([a, x], [b, y]) => y - x || compareIds(a, b))
    .map(([word, n]) => `${word} ${n}`)
    .join(', ');
}

function standingRecord(record: ReadRecord): CompactionRecord {
  return {
    id: record.id,
    kind: record.kind,
    frontmatter: { ...record.frontmatter, ...record.relations },
  };
}

/**
 * The dead records a live record rests on: those in `standings` that it
 * derives from, cites, or gives as evidence. The record that overturned a
 * support, by replacing, disproving, or rejecting it, does not rest on it:
 * it derives from what it overturned. A compaction rests on nothing here,
 * since a summary rests on everything. `proof state` and
 * `proof records --rests-on` both use this rule, so their counts agree.
 */
export function restsOnDead(
  record: ReadRecord,
  get: (id: string) => ReadRecord | undefined,
  standings: readonly string[] = DEAD_STANDINGS
): string[] {
  if (!isCurrent(record)) return [];
  const dead = new Set<string>();
  for (const relation of SUPPORT_RELATIONS)
    for (const id of ids(record, relation)) {
      const target = get(id);
      if (!target || !standings.includes(standingOf(target))) continue;
      const overturned = (
        ['superseded_by', 'invalidated_by', 'rejected_by'] as const
      ).some((by) => ids(target, by).includes(record.id));
      if (!overturned) dead.add(target.id);
    }
  return [...dead].sort(compareIds);
}

/** `id (new)` or `id (from -> to)`: one record the head compaction no longer matches. */
function changeRef(change: CompactionChange): string {
  return change.change === 'added'
    ? `${change.id} (new)`
    : `${change.id} (${change.from ?? 'none'} -> ${change.to ?? 'missing'})`;
}

/**
 * Builds the state of one Effort from the `find` index's records and
 * chains, within STATE_CHARS when the shrink steps allow it.
 */
export function buildEffortState(
  index: FindIndex,
  effortId: string,
  /**
   * Suspect records and why, from git history at HEAD: live Decisions and
   * Constraints whose code changed after they were recorded, or that rest
   * on dead evidence. Listed after the counts when there are any.
   */
  suspect: ReadonlyMap<string, readonly string[]> = new Map()
): EffortState {
  let limits = STATE_LIMITS;
  let state = stateWithin(index, effortId, limits, suspect);
  for (const step of SHRINK_STEPS) {
    if (state.markdown.length <= STATE_CHARS) break;
    limits = { ...limits, ...step };
    state = stateWithin(index, effortId, limits, suspect);
  }
  return state;
}

function stateWithin(
  index: FindIndex,
  effortId: string,
  limits: StateLimits,
  suspect: ReadonlyMap<string, readonly string[]>
): EffortState {
  const effort = index.records.get(effortId);
  const all = [...index.records.values()]
    .filter((record) => record.frontmatter.effort === effortId)
    .sort(byCreated);
  const get = (id: string) => index.records.get(id);
  const records = (list: readonly string[]): ReadRecord[] =>
    list
      .map(get)
      .filter((record): record is ReadRecord => record !== undefined)
      .sort(byCreated);
  const inbound = (id: string, label: string): ReadRecord[] =>
    records(index.inbound.get(id)?.get(label) ?? []);
  /** The newest of the records `list` names: the one that made a change. */
  const latest = (list: readonly string[]) => records(list).at(-1);
  /** `id (standing)`, the form every list uses for a record. */
  const ref = (id: string): string => {
    const record = get(id);
    if (!record) return `${id} (missing)`;
    const foreign =
      record.kind !== 'effort' && record.frontmatter.effort !== effortId
        ? `, Effort ${text(record.frontmatter.effort)}`
        : '';
    return `${id} (${standingOf(record)}${foreign})`;
  };
  /** True once any list, or any list inside an entry, leaves records out. */
  let capped = false;
  /** `, and N more` for a list cut to `shown` of `total`, and marks the cut. */
  const more = (total: number, shown: number): string => {
    if (total <= shown) return '';
    capped = true;
    return `, and ${total - shown} more`;
  };
  const refList = (list: readonly string[]): string => {
    const shown = list.slice(0, limits.linksPerLine);
    return `${shown.map(ref).join(', ')}${more(list.length, shown.length)}`;
  };
  /**
   * What took a record off the live graph, and when: the created date of
   * the record that did it. `name` writes the id of that record.
   */
  const verdict = (
    record: ReadRecord,
    name: (id: string) => string = (id) => id
  ): string => {
    const standing = standingOf(record);
    if (standing === 'retracted')
      return `retracted on ${day(
        record.frontmatter.retracted_at ?? record.frontmatter.created_at
      )}`;
    const relation: ReadRelation | undefined =
      standing === 'superseded'
        ? 'superseded_by'
        : standing === 'invalidated'
        ? 'invalidated_by'
        : standing === 'rejected'
        ? 'rejected_by'
        : undefined;
    const by = relation ? ids(record, relation) : [];
    return by.length
      ? `${standing} by ${by.map(name).join(', ')} on ${date(latest(by))}`
      : standing;
  };
  /**
   * When a record last changed, as far as its links tell: the newest of
   * its own date, its reopenings, and the records that resolved, replaced,
   * disproved, rejected, or mitigated it.
   */
  const changedAt = (record: ReadRecord): number =>
    Math.max(
      time(record),
      ...(Array.isArray(record.frontmatter.reopen_history)
        ? (record.frontmatter.reopen_history as Record<string, unknown>[])
        : []
      ).map((entry) => {
        const value = Date.parse(text(entry?.at));
        return Number.isNaN(value) ? 0 : value;
      }),
      ...(
        [
          'resolved_by',
          'superseded_by',
          'invalidated_by',
          'rejected_by',
          'mitigated_by',
        ] as const
      ).flatMap((relation) => records(ids(record, relation)).map(time))
    );
  const reopenings = (
    record: ReadRecord,
    name: (id: string) => string = (id) => id
  ): string[] =>
    (Array.isArray(record.frontmatter.reopen_history)
      ? (record.frontmatter.reopen_history as Record<string, unknown>[])
      : []
    ).map(
      (entry) =>
        `reopened on ${day(entry?.at)}${
          typeof entry?.rejected_by === 'string'
            ? ` after rejection by ${name(entry.rejected_by)}`
            : ''
        }`
    );

  const sections: StateSection[] = [];
  const lines: string[] = [];
  /** Records some list above already shows, so Lifecycle skips them. */
  const shown = new Set<string>();
  /**
   * Adds a section, showing at most `limit` of its entries. Each entry
   * stands for one record unless it gives `records` (all it stands for)
   * and `listed` (those it names); `extra` counts records the section
   * leaves out of its entries altogether.
   */
  const section = (
    heading: string,
    intro: readonly string[],
    entries: readonly {
      ids: readonly string[];
      lines: readonly string[];
      records?: number;
      listed?: number;
    }[],
    limit: number,
    rest: string,
    { tail = [], extra = 0 }: { tail?: readonly string[]; extra?: number } = {}
  ) => {
    const kept = entries.slice(0, limit);
    const sum = (list: typeof entries, field: 'records' | 'listed') =>
      list.reduce((n, entry) => n + (entry[field] ?? 1), 0);
    sections.push({
      heading,
      total: sum(entries, 'records') + extra,
      shown: sum(kept, 'listed'),
    });
    lines.push('', `### ${heading}`, ...intro);
    if (!entries.length) lines.push('- none');
    for (const entry of kept) {
      lines.push(...entry.lines);
      for (const id of entry.ids) shown.add(id);
    }
    if (entries.length > kept.length) {
      capped = true;
      lines.push(`- … ${entries.length - kept.length} more ${rest}`);
    }
    lines.push(...tail);
  };

  // Counts: every record by kind and standing; Issues, Findings, and
  // Constraints also by their own kind field.
  const countLines: string[] = [];
  let live = 0;
  let retracted = 0;
  for (const kind of KIND_ORDER) {
    const members = all.filter((record) => record.kind === kind);
    if (!members.length) continue;
    const standings = new Map<string, number>();
    const bySub = new Map<string, Map<string, number>>();
    for (const record of members) {
      const standing = standingOf(record);
      bump(standings, standing);
      if (isLive(record)) live++;
      if (standing === 'retracted') retracted++;
      const sub = subKind(record);
      if (sub && kind !== 'blob') {
        if (!bySub.has(sub)) bySub.set(sub, new Map());
        bump(bySub.get(sub) as Map<string, number>, standing);
      }
    }
    countLines.push(
      `- ${KIND_LABEL[kind]} ${members.length}: ${tallyLine(standings)}`
    );
    if (bySub.size > 1 || (bySub.size === 1 && kind === 'issue'))
      for (const [sub, tally] of [...bySub].sort(([a], [b]) =>
        compareIds(a, b)
      ))
        countLines.push(
          `  - ${sub} ${[...tally.values()].reduce(
            (a, b) => a + b,
            0
          )}: ${tallyLine(tally)}`
        );
  }
  const reopened = all.filter((record) => reopenings(record).length);
  if (reopened.length) {
    const now = new Map<string, number>();
    for (const record of reopened) bump(now, standingOf(record));
    countLines.push(
      `- Decisions ever reopened: ${reopened.length}; now ${tallyLine(now)}`
    );
  }
  const neverLive = all.filter(
    (record) => record.kind === 'citation' || record.kind === 'blob'
  ).length;
  countLines.push(
    `- Live records: ${live} of ${all.length}${
      neverLive
        ? `; Citations and Blobs (${neverLive}) are never counted live`
        : ''
    }; retracted: ${retracted}`
  );
  lines.push(
    `## State of ${effortId}`,
    `"${cut(text(effort?.frontmatter.title), 120)}", status ${text(
      effort?.frontmatter.status
    )}, created ${date(effort)}, newest record ${date(all.at(-1))}.`,
    'Built from frontmatter and links only. Each record shows its standing in parentheses; a change is dated by the record that made it.',
    '',
    '### Counts',
    ...countLines
  );
  sections.push({
    heading: 'Counts',
    total: countLines.length,
    shown: countLines.length,
  });

  // Suspect records: live Decisions and Constraints whose code moved on
  // after they were recorded, or that rest on dead evidence. Only when
  // there are any.
  const suspects = records([...suspect.keys()]);
  if (suspects.length)
    section(
      'Suspect records',
      [
        `**SUSPECT**: ${count(
          suspects.length,
          'live record'
        )} may be out of date: the code ${
          suspects.length === 1 ? 'it rests' : 'they rest'
        } on changed after ${
          suspects.length === 1 ? 'it was' : 'they were'
        } recorded, or ${
          suspects.length === 1 ? 'it rests' : 'they rest'
        } on dead evidence. Read the code first; where they disagree, the code is the current behaviour.`,
      ],
      suspects.map((record) => ({
        ids: [record.id],
        lines: [
          `- ${ref(record.id)}: ${(suspect.get(record.id) ?? []).join('; ')}`,
        ],
      })),
      limits.suspect,
      `suspect records; \`proof records ${effortId} --suspect\``
    );

  // Open Issues, blockers first, each with what it gates and comes from.
  const openIssues = all
    .filter(
      (record) => record.kind === 'issue' && standingOf(record) === 'open'
    )
    .sort(
      (a, b) =>
        Number(subKind(b) === 'blocker') - Number(subKind(a) === 'blocker') ||
        byCreated(a, b)
    );
  section(
    'Open Issues and blockers',
    [
      `${count(
        openIssues.filter((issue) => subKind(issue) === 'blocker').length,
        'open blocker'
      )}, ${count(
        openIssues.length,
        'open Issue'
      )} in all. "Gates" lists the live Decisions that derive from an Issue.`,
    ],
    openIssues.map((issue) => {
      const after = inbound(issue.id, 'derived_by').filter(isCurrent);
      const gates = after.filter((record) => record.kind === 'decision');
      const others = after.filter((record) => record.kind !== 'decision');
      const from = ids(issue, 'derives_from');
      return {
        ids: [issue.id, ...gates.map((record) => record.id)],
        lines: [
          `- ${ref(issue.id)}, ${subKind(issue) || 'issue'}, open since ${date(
            issue
          )}`,
          ...(gates.length
            ? [`  - gates: ${refList(gates.map((record) => record.id))}`]
            : []),
          ...(others.length
            ? [`  - built on by: ${refList(others.map((record) => record.id))}`]
            : []),
          ...(from.length ? [`  - comes from: ${refList(from)}`] : []),
        ],
      };
    }),
    limits.openIssues,
    `open Issues; \`proof records ${effortId} --kinds issue --status open\``
  );

  // Risks: realized and open first, with where they came from; then
  // mitigated and accepted ones, one line each.
  const riskRank = (risk: ReadRecord) => {
    const rank = RISK_ORDER.indexOf(standingOf(risk));
    return rank < 0 ? RISK_ORDER.length : rank;
  };
  const risks = all
    .filter(
      (record) => record.kind === 'risk' && standingOf(record) !== 'retracted'
    )
    .sort((a, b) => riskRank(a) - riskRank(b) || byCreated(a, b));
  section(
    'Risks',
    [],
    risks.map((risk) => {
      const standing = standingOf(risk);
      const mitigations = ids(risk, 'mitigated_by');
      const evidence = ids(risk, 'evidence');
      const from = ids(risk, 'derives_from');
      // A replaced or disproved Risk is dated by the record that replaced
      // or disproved it; a realized or accepted one by its evidence, which
      // the state change names.
      const moved =
        standing === 'superseded' || standing === 'invalidated'
          ? `; ${verdict(risk)}`
          : standing === 'mitigated' && mitigations.length
          ? `; mitigated on ${date(latest(mitigations))} by ${refList(
              mitigations
            )}`
          : evidence.length && standing !== 'open'
          ? `; ${standing} on ${date(latest(evidence))}, evidence ${refList(
              evidence
            )}`
          : '';
      const first = `- ${ref(risk.id)}, raised ${date(risk)}${moved}`;
      // A Risk still in play also says where it came from and whether
      // anything mitigates it; a settled one needs only its first line.
      if (standing !== 'open' && standing !== 'realized')
        return { ids: [risk.id], lines: [first] };
      const details = [
        `mitigation: ${mitigations.length ? refList(mitigations) : 'none'}`,
        ...(from.length ? [`comes from: ${refList(from)}`] : []),
      ];
      return {
        ids: [risk.id],
        lines: [first, `  - ${details.join('; ')}`],
      };
    }),
    limits.risks,
    `Risks; \`proof records ${effortId} --kinds risk\``
  );

  // Constraints in force: the live ones, by their kind.
  const constraints = all.filter(
    (record) => record.kind === 'constraint' && isLive(record)
  );
  const constraintKinds = [
    ...new Set(constraints.map((record) => subKind(record) || 'constraint')),
  ].sort();
  section(
    'Constraints in force',
    [],
    constraintKinds.map((kind) => {
      const members = constraints.filter(
        (record) => (subKind(record) || 'constraint') === kind
      );
      const kept = members.slice(0, limits.constraints);
      return {
        ids: kept.map((record) => record.id),
        records: members.length,
        listed: kept.length,
        lines: [
          `- ${kind} ${members.length}: ${kept
            .map((record) => record.id)
            .join(', ')}${more(members.length, kept.length)}`,
        ],
      };
    }),
    constraintKinds.length,
    'kinds'
  );

  // Contested topics: a question Issue with more than one Decision, counting
  // every version of each, or a supersession chain with more than one version.
  // A retracted record is noise, not a version, so topics leave it out;
  // Retractions lists it.
  const chainOf = (record: ReadRecord) =>
    (index.chains.get(index.chainOf.get(record.id) ?? '') ?? [record]).filter(
      (member) => standingOf(member) !== 'retracted'
    );
  const inTopic = new Set<string>();
  const topics: {
    first: ReadRecord;
    question?: ReadRecord;
    members: ReadRecord[];
  }[] = [];
  for (const question of all) {
    if (
      question.kind !== 'issue' ||
      subKind(question) !== 'question' ||
      standingOf(question) === 'retracted'
    )
      continue;
    const members = new Map<string, ReadRecord>();
    for (const decision of inbound(question.id, 'derived_by'))
      if (
        decision.kind === 'decision' &&
        decision.frontmatter.effort === effortId &&
        standingOf(decision) !== 'retracted'
      )
        for (const member of chainOf(decision)) members.set(member.id, member);
    if (members.size < 2) continue;
    for (const id of members.keys()) inTopic.add(id);
    topics.push({
      first: question,
      question,
      members: [...members.values()].sort(byCreated),
    });
  }
  for (const record of all) {
    const chain = chainOf(record);
    // Compactions replace each other by design; `proof brief` reads them.
    if (
      chain.length < 2 ||
      chain.some((member) => inTopic.has(member.id)) ||
      isCompaction(standingRecord(record))
    )
      continue;
    for (const member of chain) inTopic.add(member.id);
    topics.push({ first: chain[0], members: [...chain] });
  }
  // Open contests first (more than one live record), then by the newest
  // change, so a cut list drops old, settled topics.
  const newest = (members: readonly ReadRecord[]) =>
    Math.max(...members.map((member) => time(member)));
  topics.sort(
    (a, b) =>
      Number(b.members.filter(isLive).length > 1) -
        Number(a.members.filter(isLive).length > 1) ||
      newest(b.members) - newest(a.members) ||
      byCreated(a.first, b.first)
  );
  section(
    'Contested topics',
    [
      `${count(
        topics.length,
        'topic'
      )}: questions with more than one Decision (every version counted), and records with more than one version. Open contests come first, then the most recently changed. Letters name the records shown; "now" marks the live ones.`,
    ],
    topics.map(({ question, members }) => {
      // Live records first, then dead ones, each newest first, so a cut
      // drops the oldest versions.
      const order = [
        ...members.filter(isLive).reverse(),
        ...members.filter((member) => !isLive(member)).reverse(),
      ];
      const kept = order.slice(0, limits.membersPerTopic);
      const left = order.slice(kept.length);
      const leftLive = left.filter(isLive).length;
      if (left.length) capped = true;
      // Letters stand for the records shown; a record left out keeps its id.
      const tag = new Map(
        kept.map((member, i) => [member.id, `[${String.fromCharCode(97 + i)}]`])
      );
      const name = (id: string) => tag.get(id) ?? id;
      const resolvers = question ? ids(question, 'resolved_by') : [];
      const head = question
        ? `- ${ref(question.id)}, question with ${members.length} Decisions${
            resolvers.length
              ? `; resolved by ${resolvers.map(name).join(', ')}`
              : ''
          }`
        : `- ${members.length} versions of one ${members[0].kind}${
            subKind(members[0]) ? ` (${subKind(members[0])})` : ''
          }`;
      return {
        ids: [...(question ? [question.id] : []), ...kept.map((m) => m.id)],
        lines: [
          head,
          ...kept.map((member) => {
            const notes = [
              isLive(member)
                ? `now ${standingOf(member)}, written ${date(member)}`
                : verdict(member, name),
              ...reopenings(member, name),
            ];
            return `  - ${name(member.id)} ${member.id}: ${notes.join('; ')}`;
          }),
          ...(left.length
            ? [
                `  - … ${count(left.length, 'more version')}${
                  leftLive ? `, ${leftLive} of them live` : ''
                }`,
              ]
            : []),
        ],
      };
    }),
    limits.contested,
    'topics'
  );

  // Issues closed without a fix: deferred or won't fix, or resolved with no
  // resolving Decision or Finding.
  const closed = all.filter((record) => {
    if (record.kind !== 'issue') return false;
    const standing = standingOf(record);
    if (standing === 'deferred' || standing === 'wontfix') return true;
    return (
      standing === 'resolved' &&
      !ids(record, 'resolved_by').some((id) =>
        ['decision', 'finding'].includes(get(id)?.kind ?? '')
      )
    );
  });
  section(
    'Closed without a fix',
    [
      'Issues closed as deferred or wontfix, or resolved by no Decision or Finding.',
    ],
    closed.map((issue) => {
      const by = ids(issue, 'resolved_by');
      return {
        ids: [issue.id],
        lines: [
          `- ${ref(issue.id)}, ${subKind(issue) || 'issue'}, opened ${date(
            issue
          )}; ${
            by.length
              ? `closed ${standingOf(issue)} on ${date(
                  latest(by)
                )} by ${refList(by)}`
              : 'closed with no resolving record'
          }`,
        ],
      };
    }),
    limits.closedWithoutFix,
    `Issues; \`proof records ${effortId} --kinds issue --status deferred,wontfix\``
  );

  // Dead evidence: live records that derive from, cite, or give as evidence
  // a superseded, invalidated, rejected, or retracted record. One entry per
  // dead record, so the record that overturned it is named once.
  const rank = (standing: string) => DEAD_ORDER.indexOf(standing);
  const resting = new Map<string, Set<string>>();
  for (const record of all)
    for (const target of restsOnDead(record, get)) {
      if (!resting.has(target)) resting.set(target, new Set());
      (resting.get(target) as Set<string>).add(record.id);
    }
  const deadSupports = records([...resting.keys()]).sort(
    (a, b) => rank(standingOf(a)) - rank(standingOf(b)) || byCreated(a, b)
  );
  // Entries whose dead record was only replaced come last, and a large
  // Effort shows fewer of them.
  const replaced = deadSupports.filter(
    (support) => standingOf(support) === 'superseded'
  );
  const replacedLeft = replaced.slice(limits.supersededSupports);
  const deadShown = deadSupports.filter(
    (support) => !replacedLeft.includes(support)
  );
  const restingRecords = new Set(
    [...resting.values()].flatMap((set) => [...set])
  );
  const worst = new Map<string, number>();
  for (const support of deadSupports) bump(worst, standingOf(support));
  section(
    'Dead evidence',
    [
      `${count(restingRecords.size, 'live record')} ${
        restingRecords.size === 1 ? 'rests' : 'rest'
      } directly on ${count(deadSupports.length, 'dead record')}${
        deadSupports.length ? ` (${tallyLine(worst)})` : ''
      }. Resting on a record means deriving from it, citing it, or giving it as evidence.`,
    ],
    deadShown.map((support) => {
      const live = records([...(resting.get(support.id) ?? [])]);
      // A replaced version that Contested topics lists gets only its date.
      const why =
        standingOf(support) === 'superseded' && shown.has(support.id)
          ? `superseded on ${date(
              latest(ids(support, 'superseded_by'))
            )} (see Contested topics)`
          : verdict(support);
      // Records built on the live ones, one hop further, for every dead
      // record but a replaced version.
      const further =
        standingOf(support) === 'superseded'
          ? []
          : records([
              ...new Set(
                live.flatMap((record) =>
                  inbound(record.id, 'derived_by')
                    .filter(
                      (next) =>
                        isCurrent(next) &&
                        !resting.get(support.id)?.has(next.id) &&
                        !(
                          [
                            'superseded_by',
                            'invalidated_by',
                            'rejected_by',
                          ] as const
                        ).some((by) => ids(support, by).includes(next.id))
                    )
                    .map((next) => next.id)
                )
              ),
            ]);
      return {
        ids: [support.id, ...live.map((record) => record.id)],
        lines: [
          `- ${support.id}, ${why}; rested on by ${refList(
            live.map((record) => record.id)
          )}`,
          ...(further.length
            ? [
                `  - and, one link further, by ${refList(
                  further.map((record) => record.id)
                )}`,
              ]
            : []),
        ],
      };
    }),
    limits.deadEvidence,
    'dead records with live records on them',
    {
      extra: replacedLeft.length,
      tail: replacedLeft.length
        ? [
            `- … ${
              replacedLeft.length
            } more replaced versions that live records still rest on: ${
              records(
                replacedLeft.flatMap((support) => [
                  ...(resting.get(support.id) ?? []),
                ])
              ).length
            } live records`,
          ]
        : [],
    }
  );
  if (replacedLeft.length) capped = true;

  // Head compaction: whether it is stale, and each record it no longer
  // matches. Its count is exact even when the list is cut.
  const standingRecords = all.map(standingRecord);
  const head = records(
    compactionHeads(standingRecords).map((record) => record.id)
  ).at(-1);
  if (head) {
    const report = compactionReport(standingRecord(head), standingRecords);
    const from = new Set(ids(head, 'derives_from')).size;
    const moved = report.stale.slice(0, limits.compactionTargets);
    const reasons = [
      ...(report.stale.length
        ? [
            `${report.stale.length} of the ${count(
              from,
              'record'
            )} it derives from changed standing: ${moved
              .map(changeRef)
              .join(', ')}${more(report.stale.length, moved.length)}`,
          ]
        : []),
      ...(report.invalidated
        ? [`invalidated by ${refList(ids(head, 'invalidated_by'))}`]
        : []),
    ];
    const changes = report.changes.slice(0, limits.compactionChanges);
    const differ = `${count(report.changes.length, 'record')} ${
      report.changes.length === 1 ? 'differs' : 'differ'
    } from the live set it covers (exact)`;
    lines.push(
      '',
      '### Head compaction',
      `- ${head.id} (${date(head)}). Stale: ${
        report.isStale
          ? `yes (${reasons.join('; ')})`
          : `no (none of the ${count(
              from,
              'record'
            )} it derives from changed standing; not invalidated)`
      }.`,
      changes.length
        ? `- ${differ}: ${changes.map(changeRef).join(', ')}${more(
            report.changes.length,
            changes.length
          )}`
        : `- ${differ}${
            report.changes.length
              ? `; \`proof get ${head.id}\` lists ${
                  // `get` lists at most 25 changes.
                  report.changes.length > 25 ? '25 of them' : 'them'
                }`
              : ''
          }.`,
      `- ${COMPACTION_STALE_RULE}`
    );
    if (changes.length < report.changes.length) capped = true;
    // Its total is the records the head no longer matches.
    sections.push({
      heading: 'Head compaction',
      total: report.changes.length,
      shown: changes.length,
    });
  }

  // Lifecycle: the Effort, then dated changes to Issues, Decisions, and
  // records shown wrong that no list above shows. A question resolved by a
  // live Decision and an accepted Decision never reopened are settled and
  // show only in the counts.
  const lifecycle = all.flatMap((record) => {
    if (shown.has(record.id) || inTopic.has(record.id)) return [];
    const standing = standingOf(record);
    const at = changedAt(record);
    if (standing === 'retracted') return [];
    if (record.kind === 'issue') {
      const by = ids(record, 'resolved_by');
      if (
        subKind(record) === 'question' &&
        standing === 'resolved' &&
        records(by).some(
          (target) => target.kind === 'decision' && isLive(target)
        )
      )
        return [];
      return [
        {
          at,
          ids: [record.id],
          lines: [
            `- ${ref(record.id)}, ${subKind(record) || 'issue'}: opened ${date(
              record
            )}${
              by.length
                ? `; ${standing} on ${date(latest(by))} by ${refList(by)}`
                : ''
            }`,
          ],
        },
      ];
    }
    const notes =
      record.kind === 'decision' ? reopenings(record) : ([] as string[]);
    if (record.kind === 'decision' && standing === 'accepted' && !notes.length)
      return [];
    if (
      record.kind !== 'decision' &&
      standing !== 'invalidated' &&
      standing !== 'superseded'
    )
      return [];
    return [
      {
        at,
        ids: [record.id],
        lines: [
          `- ${ref(record.id)}: written ${date(record)}${[
            ...notes,
            ...(isLive(record) ? [] : [verdict(record)]),
          ]
            .map((note) => `; ${note}`)
            .join('')}`,
        ],
      },
    ];
  });
  section(
    'Lifecycle',
    [
      'Issues, Decisions, and records shown wrong that no list above shows, the most recently changed first. The Effort itself is dated in the first line.',
    ],
    lifecycle.sort((a, b) => b.at - a.at || compareIds(a.ids[0], b.ids[0])),
    limits.lifecycle,
    'older entries'
  );

  const retractions = all.filter(
    (record) => standingOf(record) === 'retracted'
  );
  section(
    'Retractions',
    [`${count(retractions.length, 'retracted record')}, none of them live.`],
    retractions.map((record) => ({
      ids: [record.id],
      lines: [
        `- ${record.id}, ${record.kind}${
          subKind(record) ? ` (${subKind(record)})` : ''
        }, written ${date(record)}, retracted on ${day(
          record.frontmatter.retracted_at
        )}${
          text(record.frontmatter.retracted_reason)
            ? `: ${cut(
                text(record.frontmatter.retracted_reason),
                REASON_CHARS
              )}`
            : ''
        }`,
      ],
    })),
    limits.retractions,
    `retracted records; \`proof records ${effortId} --retracted only\``
  );

  return {
    effort_id: effortId,
    records: all.length,
    live,
    sections,
    capped,
    markdown: lines.join('\n'),
  };
}
