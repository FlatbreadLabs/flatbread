// Filler for the dump10x arm (--scale 10): nine Efforts in look-alike areas
// of the Tessera shell, written in the same voice as the real graph. Each
// one is a run of questions with competing Decisions, bugs with their
// Findings, measurements (some later remeasured), Constraints, Risks, code
// Citations and a closing compaction.
//
// Filler never talks about the seven real areas: its paths sit under
// shell/, which the bed does not have, and its words stay inside its own
// area. The builder scans it with the same banned-phrase list as the real
// records. Everything is drawn from a seeded generator, so a build is the
// same every time.

const AREAS = [
  {
    key: 'fx-export',
    title: 'Export pipeline',
    owner: 'Lena Fischer',
    root: 'shell/export',
    objects: [
      'PDF pages',
      'SVG output',
      'PNG renders',
      'export presets',
      'the export queue',
      'fonts embedded in exports',
      'export file names',
      'print bleed',
    ],
  },
  {
    key: 'fx-prototype',
    title: 'Prototyping and preview',
    owner: 'Sam Okoro',
    root: 'shell/prototype',
    objects: [
      'hotspots',
      'screen transitions',
      'the preview window',
      'flow starting points',
      'scroll areas',
      'prototype share links',
      'device frames',
      'transition timing',
    ],
  },
  {
    key: 'fx-comments',
    title: 'Comments and review',
    owner: 'Noor Haddad',
    root: 'shell/comments',
    objects: [
      'comment threads',
      'mentions',
      'comment pins',
      'resolved threads',
      'comment notifications',
      'reactions',
      'the comment index',
      'draft replies',
    ],
  },
  {
    key: 'fx-assets',
    title: 'Asset library',
    owner: 'Elif Demir',
    root: 'shell/assets',
    objects: [
      'the image library',
      'icon sets',
      'uploaded images',
      'asset thumbnails',
      'image compression',
      'asset folders',
      'stock image imports',
      'asset licences',
    ],
  },
  {
    key: 'fx-color',
    title: 'Colour management',
    owner: 'Jonas Berg',
    root: 'shell/color',
    objects: [
      'colour profiles',
      'sRGB conversion',
      'Display P3 output',
      'the eyedropper',
      'colour pickers',
      'contrast checks',
      'CMYK previews',
      'gamut warnings',
    ],
  },
  {
    key: 'fx-presence',
    title: 'Collaboration cursors',
    owner: 'Aiko Tanaka',
    root: 'shell/presence',
    objects: [
      'live cursors',
      'presence avatars',
      'follow mode',
      'cursor chat',
      'idle detection',
      'presence colours',
      'the presence socket',
      'spotlight sessions',
    ],
  },
  {
    key: 'fx-onboarding',
    title: 'Onboarding',
    owner: 'Marta Ruiz',
    root: 'shell/onboarding',
    objects: [
      'the welcome tour',
      'sample files',
      'first-use tooltips',
      'the setup checklist',
      'empty-state hints',
      'the template gallery',
      'the sign-up survey',
      'video lessons',
    ],
  },
  {
    key: 'fx-telemetry',
    title: 'Telemetry',
    owner: 'Omar Siddiqui',
    root: 'shell/telemetry',
    objects: [
      'usage events',
      'crash reports',
      'performance traces',
      'the consent dialog',
      'event batching',
      'the metrics dashboard',
      'trace sampling',
      'log retention',
    ],
  },
  {
    key: 'fx-fonts',
    title: 'Fonts',
    owner: 'Hana Kim',
    root: 'shell/fonts',
    objects: [
      'font loading',
      'the font picker',
      'missing-font warnings',
      'variable fonts',
      'font previews',
      'local fonts',
      'font subsetting',
      'fallback fonts',
    ],
  },
];

const ASPECTS = [
  {
    key: 'defaults',
    q: (o) => `What should ${o} default to?`,
    options: (o) => [
      `Default ${o} to the last setting used`,
      `Default ${o} to a fixed setting per team`,
      `Ask about ${o} every time`,
    ],
    why: [
      'people repeat their last choice nine times out of ten',
      'a team wants the same result whoever runs it',
      'asking every time was the most common complaint in testing',
    ],
  },
  {
    key: 'caching',
    q: (o) => `Should results for ${o} be cached?`,
    options: (o) => [
      `Cache ${o} by content hash`,
      `Recompute ${o} every time`,
      `Cache ${o} for the session only`,
    ],
    why: [
      'the same inputs come back many times a day',
      'a stale result is worse than a slow one here',
      'a session cache needs no clean-up',
    ],
  },
  {
    key: 'limits',
    q: (o) => `How large may ${o} get?`,
    options: (o) => [
      `Cap ${o} at a fixed size and warn`,
      `Stream ${o} in chunks with no cap`,
      `Cap ${o} by plan tier`,
    ],
    why: [
      'a cap keeps the worst case predictable',
      'chunks keep memory flat whatever the size',
      'tiers match what people pay for',
    ],
  },
  {
    key: 'errors',
    q: (o) => `What happens when ${o} fails?`,
    options: (o) => [
      `Retry ${o} three times, then report`,
      `Fail ${o} at once with a clear message`,
      `Skip the failing part of ${o} and carry on`,
    ],
    why: [
      'most failures are a dropped connection that a retry fixes',
      'people would rather know at once than wait',
      'one bad item should not stop the rest',
    ],
  },
  {
    key: 'naming',
    q: (o) => `How are ${o} named?`,
    options: (o) => [
      `Name ${o} after their source`,
      `Name ${o} with a timestamp`,
      `Let people name ${o} each time`,
    ],
    why: [
      'people find things by where they came from',
      'timestamps never collide',
      'naming is part of the task for some teams',
    ],
  },
  {
    key: 'progress',
    q: (o) => `How is progress on ${o} shown?`,
    options: (o) => [
      `Show progress on ${o} as a percentage`,
      `Show progress on ${o} as items done`,
      `Show only a spinner for ${o}`,
    ],
    why: [
      'a percentage answers how long is left',
      'counts are honest when sizes vary',
      'most runs finish in under a second',
    ],
  },
  {
    key: 'storage',
    q: (o) => `Where do ${o} live?`,
    options: (o) => [
      `Keep ${o} on the team server`,
      `Keep ${o} in the browser`,
      `Keep ${o} with each account`,
    ],
    why: [
      'the whole team needs to see the same thing',
      'nothing has to leave the device',
      'people move between teams',
    ],
  },
];

const FAILURES = [
  'dropped the last item of a long run',
  'ran twice after a retry',
  'showed the wrong name after a rename',
  'hung on an empty input',
  'used an old setting after a restart',
  'reported success when nothing happened',
];
const CAUSES = [
  'a counter was read before the last write finished',
  'the retry did not check whether the first attempt had landed',
  'the cache key left out the name',
  'the empty case fell through to a wait that never ended',
  'the setting was read once at start-up and never again',
  'the status came from the request, not from the result',
];
const CONSTRAINTS = [
  (o) => `Work on ${o} never blocks typing`,
  (o) => `${cap(o)} keep working offline`,
  (o) => `${cap(o)} never send file contents to third parties`,
  (o) => `${cap(o)} finish within two seconds on a typical file`,
];
const RISKS = [
  (o) => `${cap(o)} may slow down on very large files`,
  (o) => `${cap(o)} may drift from what the server holds`,
  (o) => `${cap(o)} may confuse people who switch devices`,
];
const FIXTURES = [
  'marketing site',
  'mobile app',
  'brand book',
  'dashboard kit',
  'onboarding flow',
];
const METRICS = [
  ['median time', 'ms'],
  ['p95 time', 'ms'],
  ['memory', 'MB'],
  ['failure rate', '%'],
];

function cap(text) {
  return text[0].toUpperCase() + text.slice(1);
}
function slug(text) {
  return text
    .toLowerCase()
    .replace(/^the /, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
function camel(text) {
  const parts = slug(text).split('-');
  return parts[0] + parts.slice(1).map(cap).join('');
}

/** mulberry32, seeded from a string. */
function rng(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const START = Date.parse('2026-02-03T09:00:00Z');
const END = Date.parse('2026-06-11T17:00:00Z');

function iso(ms) {
  return new Date(Math.round(ms / 60000) * 60000)
    .toISOString()
    .replace('.000Z', 'Z');
}

/**
 * Builds one filler Effort with about `target` records. Events carry `at`
 * so the builder can place them on the first commit at or after that time.
 */
function buildArea(area, target) {
  const r = rng(area.key);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const events = [];
  const keys = new Set();
  let records = 0;
  let t = START + r() * 20 * 864e5;
  const step = (END - 864e5 - t) / (target * 1.6);
  const next = () => {
    t += step * (0.5 + r());
    return iso(Math.min(t, END - 864e5));
  };
  const q = (local) => `${area.key}.${local}`;
  const add = (event) => {
    if (event.key) {
      if (keys.has(event.key))
        throw new Error(`filler: duplicate key ${event.key}`);
      keys.add(event.key);
      records += 1;
    }
    const owner = event.key ? { effort: area.key, created_by: area.owner } : {};
    events.push({ ...owner, ...event, at: event.at ?? next() });
  };
  events.push({ type: 'CreateEffort', effort: area.key, at: iso(t) });
  const accepted = [];
  const topics = [];
  for (const o of area.objects) for (const a of ASPECTS) topics.push([o, a]);
  // A fixed shuffle of the object × aspect pairs.
  for (let i = topics.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [topics[i], topics[j]] = [topics[j], topics[i]];
  }
  let n = 0;
  while (records < target - 2 && n < topics.length) {
    const [o, a] = topics[n++];
    const id = `${slug(o)}-${a.key}`;
    const options = a.options(o);
    const chosen = Math.floor(r() * options.length);
    add({
      type: 'WriteIssue',
      key: `iss-${id}`,
      kind: 'question',
      title: a.q(o),
      body: `${cap(o)} need a rule for ${a.key}. ${
        options.length
      } options came up in review: ${options
        .map((x) => x.toLowerCase())
        .join('; ')}.`,
    });
    const decs = options.map((title, i) => `dec-${id}-${i}`);
    options.forEach((title, i) =>
      add({
        type: 'WriteDecision',
        key: decs[i],
        title,
        body:
          i === chosen
            ? `${title}, because ${a.why[i]}. Rejected: ${options
                .filter((_, k) => k !== i)
                .map((x) => x.toLowerCase())
                .join(' and ')}.`
            : `${title}. The case for it: ${a.why[i]}.`,
        derives_from: [q(`iss-${id}`)],
      })
    );
    add({ type: 'AcceptDecision', decisionId: q(decs[chosen]) });
    add({
      type: 'ResolveIssue',
      issueId: q(`iss-${id}`),
      resolution: 'resolved',
      resolvedBy: [q(decs[chosen])],
    });
    accepted.push({ key: decs[chosen], title: options[chosen], id });
    const [metric, unit] = pick(METRICS);
    const value =
      unit === '%'
        ? (r() * 4).toFixed(1)
        : String(Math.round(5 + r() * (unit === 'MB' ? 300 : 2400)));
    const fixture = pick(FIXTURES);
    add({
      type: 'WriteFinding',
      key: `fnd-${id}`,
      kind: 'measurement',
      title: `${cap(o)}: ${metric} is ${value} ${unit} on the ${fixture} file`,
      body: `Measured after "${
        options[chosen]
      }" landed, on the ${fixture} test file, 20 runs. ${
        metric === 'failure rate'
          ? 'Failures were all timeouts.'
          : 'The spread was small.'
      }`,
      derives_from: [q(decs[chosen])],
    });
    if (r() < 0.45) {
      const k = Math.floor(r() * FAILURES.length);
      add({
        type: 'WriteIssue',
        key: `iss-${id}-bug`,
        kind: 'bug',
        title: `${cap(o)} ${FAILURES[k]}`,
        body: `Reported from the ${fixture} team. It happened about once a week.`,
      });
      add({
        type: 'WriteFinding',
        key: `fnd-${id}-cause`,
        kind: 'analysis',
        title: `Why ${o} ${FAILURES[k]}`,
        body: `${cap(CAUSES[k])}. Fixed in ${area.root}.`,
        derives_from: [q(`iss-${id}-bug`)],
      });
      add({
        type: 'ResolveIssue',
        issueId: q(`iss-${id}-bug`),
        resolution: 'resolved',
        resolvedBy: [q(`fnd-${id}-cause`)],
      });
    }
    if (r() < 0.3) {
      add({
        type: 'WriteConstraint',
        key: `con-${id}`,
        kind: r() < 0.6 ? 'hard' : 'soft',
        title: pick(CONSTRAINTS)(o),
        body: `Set by ${area.owner} for ${o}. A change that breaks it needs a new Decision first.`,
      });
    }
    if (r() < 0.2) {
      add({
        type: 'WriteRisk',
        key: `rsk-${id}`,
        likelihood: pick(['low', 'medium', 'high']),
        severity: pick(['low', 'medium']),
        title: pick(RISKS)(o),
        body: `Seen in testing with the ${fixture} file; no customer report yet.`,
      });
    }
    if (r() < 0.5) {
      add({
        type: 'Anchor',
        key: `cit-${id}`,
        title: `Code: ${o}, ${a.key}`,
        path: `${area.root}/${slug(o)}.ts`,
        symbol: camel(`${a.key} ${o}`),
        commit: 'auto',
      });
    }
    if (r() < 0.15) {
      add({
        type: 'WriteFinding',
        key: `fnd-${id}-v2`,
        kind: 'measurement',
        title: `${cap(o)}: ${metric} remeasured on a clean machine`,
        body: 'The first run had other work on the machine. On a clean run the number is about two thirds of it.',
        invalidates: [q(`fnd-${id}`)],
      });
    }
    if (r() < 0.1 && accepted.length > 1) {
      const old = accepted[accepted.length - 1];
      add({
        type: 'WriteDecision',
        key: `dec-${old.id}-revisit`,
        title: `${old.title}, revisited`,
        body: `${old.title} still holds, now with a weekly review of the numbers in ${area.root}.`,
        supersedes: [q(old.key)],
      });
      add({ type: 'AcceptDecision', decisionId: q(`dec-${old.id}-revisit`) });
      accepted[accepted.length - 1] = { ...old, key: `dec-${old.id}-revisit` };
    }
  }
  add({
    type: 'WriteFinding',
    key: 'fnd-misfiled',
    kind: 'note',
    title: `${cap(area.objects[0])} need a second pass`,
    body: 'Filed as a reminder.',
  });
  add({
    type: 'Retract',
    recordId: q('fnd-misfiled'),
    reason: 'A reminder, not a finding.',
  });
  add({
    type: 'WriteCompaction',
    key: 'cmp',
    title: `${area.title}: where things stand`,
    body: `${accepted
      .slice(0, 6)
      .map((d) => d.title)
      .join('. ')}. Open items are listed as Risks in this Effort.`,
    derives_from: accepted.slice(0, 10).map((d) => q(d.key)),
    at: iso(END - 864e5 + 3600e3),
  });
  return {
    key: area.key,
    title: area.title,
    body: `${
      area.owner
    } owns this Effort. It covers ${area.title.toLowerCase()} in the Tessera shell (${
      area.root
    }/).`,
    events,
  };
}

/** Filler brings the graph (about 170 real records) to about 150 × scale records. */
export function fillerEfforts(scale) {
  if (scale <= 1) return { efforts: [] };
  const perArea = Math.round((150 * scale - 170) / AREAS.length);
  return { efforts: AREAS.map((area) => buildArea(area, perArea)) };
}

export const FILLER_KEYS = AREAS.map((a) => a.key);
