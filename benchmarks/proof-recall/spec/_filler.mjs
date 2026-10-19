// Filler: routine records that make an Effort larger without changing what
// any question asks about. `build.mjs --scale N` merges them into each
// Effort's events, so the Effort ends with about N times its own records.
//
// Filler is plausible project noise: measurements, captures, and small
// question-to-decision threads about subsystems no spec or question names.
// It never links to a real record, never retracts, and is all written before
// the Effort's head compaction, which therefore covers it. A seeded random
// generator makes the output identical on every build.
//
// `build.mjs --filler-overlap <fraction>` makes filler adversarial. That
// share of filler threads and records take a real subsystem name from the
// Effort's own spec (Tern, VSM, saltglass refraction) in place of a made-up
// one. They still link to no real record, and they measure only routine
// things no question asks about, such as warning counts. Their numbers come
// from a second seeded generator, so the other filler records stay exactly
// as in a plain build. build.mjs redraws any overlap draft that collides
// with a question, so the output is fixed for a given fraction and a given
// set of question files; editing any question can change it.
//
// The leading underscore keeps `loadSpecs` from reading this file as a spec.

const PEOPLE = {
  render: ['Ines Okafor', 'Tomasz Brandt', 'Yusuf Demir', 'Dara Whitlock'],
  world: ['Rhea Valdés', 'Kenji Arakawa', 'Marta Lindqvist', 'Dara Whitlock'],
  ports: ['Priya Natarajan', 'Dara Whitlock', 'Tomasz Brandt'],
  tools: ['Liam O’Connell', 'Dara Whitlock', 'Kenji Arakawa'],
  netcode: ['Sofia Marchetti', 'Dara Whitlock', 'Marta Lindqvist'],
};

// Subsystems per Effort. `build.mjs --scale` refuses any whose name
// appears in a spec or question, so filler cannot shadow a real topic.
const SUBSYSTEMS = {
  render: [
    'font atlas',
    'menu blur',
    'decal pool',
    'minimap renderer',
    'photo mode',
    'title card',
    'subtitle renderer',
    'crowd impostors',
    'lens flare',
    'credits roll',
    'map fog',
    'damage numbers',
    'tooltip renderer',
    'splash video',
    'item preview',
  ],
  world: [
    'quest log',
    'fishing minigame',
    'bird flocks',
    'lighthouse scheduler',
    'market stalls',
    'weather vane props',
    'ambient chatter',
    'dock cranes',
    'bell tower clock',
    'kite physics',
    'lantern festival',
    'shell collection',
    'tavern doors',
    'rope bridges',
    'merchant carts',
  ],
  ports: [
    'controller rumble',
    'achievement service',
    'cloud save sync',
    'suspend and resume',
    'user switching',
    'parental controls',
    'store overlay',
    'screenshot button',
    'trophy icons',
    'keyboard prompts',
    'battery indicator',
    'region settings',
    'capture gallery',
    'friend invites',
    'sleep mode',
  ],
  tools: [
    'level editor autosave',
    'localization import',
    'audio bank packer',
    'texture viewer',
    'crash symbol server',
    'build dashboard',
    'test runner',
    'nightly installer',
    'asset search',
    'changelog bot',
    'license scanner',
    'artist sandbox',
    'patch differ',
    'doc site',
    'review bot',
  ],
  netcode: [
    'lobby browser',
    'text chat',
    'friend presence',
    'party invites',
    'NAT probe',
    'chat filter',
    'emote wheel',
    'ping display',
    'matchmaking queue',
    'region picker',
    'spectator list',
    'kick vote',
    'host migration banner',
    'join codes',
    'session timeout',
  ],
};

// Real subsystem names that overlap filler reuses. Each must appear in its
// Effort's spec; `build.mjs` checks that.
const OVERLAP_SUBSYSTEMS = {
  render: [
    'Tern',
    'VSM',
    'saltglass refraction',
    'caustics',
    'SDF GI',
    'Brine curve',
    'visibility buffer',
    'meshlets',
  ],
  world: [
    'tide simulation',
    'streaming pool',
    'Gull VM',
    'fibers',
    'Kelp',
    'delta saves',
    'archetype tables',
    'hot reload',
  ],
  ports: [
    'pipeline cache',
    'dynamic resolution',
    'microSD',
    'fast travel',
    'autosave',
    'Kelp',
    'Tern',
  ],
  tools: [
    'shader compile cache',
    'cache key',
    'remote execution',
    'nightly builds',
    'fetch timeout',
    'build farm',
  ],
  netcode: [
    'rollback window',
    'host-authoritative sync',
    'lockstep',
    'desync',
    'input delay',
    'tide simulation',
  ],
};
// What overlap filler measures and asks: housekeeping that no question asks
// about. `build.mjs` refuses any of these that a spec or question uses.
const OVERLAP_METRICS = [
  ['warning count', '', 1, 60],
  ['log lines per minute', '', 5, 900],
  ['unit test time', 's', 2, 120],
  ['config parse time', 'ms', 1, 90],
  ['symbol upload time', 's', 3, 200],
  ['console command count', '', 2, 80],
];
const OVERLAP_QUESTIONS = [
  'should log less',
  'needs a clearer error message',
  'should move its settings to the new config format',
  'should drop its old console commands',
  'needs its own unit test target',
  'should print fewer warnings',
];

const PLATFORMS = ['PC', 'Meridian', 'Skiff'];
const METRICS = [
  ['load time', 'ms', 20, 900],
  ['memory', 'MB', 2, 180],
  ['CPU time', 'ms', 0.1, 3.5],
  ['draw calls', '', 4, 400],
  ['disk reads', '', 3, 600],
  ['allocations per minute', '', 10, 5000],
  ['startup time', 'ms', 40, 1500],
];
const VERDICTS = [
  'well inside what the team allows for it',
  'about the same as last month',
  'slightly worse than the previous build',
  'better than the previous build after a cleanup',
  'within noise of the last capture',
];
const FOLLOWUPS = [
  'No action needed.',
  'Recheck after the next content drop.',
  'Logged for the monthly performance review.',
  'The owner will look again if it doubles.',
  'Nobody is assigned; it stays on the watch list.',
];
const QUESTIONS = [
  'should be cached between sessions',
  'should load on a worker thread',
  'needs its own memory pool',
  'should ship in the first patch',
  'should be split into two assets',
  'should skip work when hidden',
];

/** Small seeded generator, so the same Effort always gets the same filler. */
function random(seedText) {
  let seed = 2166136261;
  for (const ch of seedText)
    seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CREATES = new Set([
  'WriteIssue',
  'WriteFinding',
  'WriteDecision',
  'WriteConstraint',
  'WriteRisk',
  'WriteCitation',
  'WriteBlob',
  'WriteCompaction',
]);

function capitalize(text) {
  return text[0].toUpperCase() + text.slice(1);
}

/** Every subsystem name filler may use, for the collision check. */
export function fillerTerms(effortKey) {
  return SUBSYSTEMS[effortKey] ?? [];
}

/**
 * The words overlap filler uses, for build.mjs to check: `real` names must
 * appear in the Effort's spec; `housekeeping` phrases must appear in no spec
 * or question.
 */
export function overlapTerms(effortKey) {
  return {
    real: OVERLAP_SUBSYSTEMS[effortKey] ?? [],
    housekeeping: [
      ...OVERLAP_METRICS.map(([metric]) => metric),
      ...OVERLAP_QUESTIONS,
    ],
  };
}

/**
 * Filler events for one spec, so the Effort ends with about `scale` times
 * its own records. Returns events with `at` and `key` like a spec's own.
 *
 * With `overlap` above 0, that share of filler threads and records reuse a
 * real subsystem name (see the header). `collides(event)` is true when an
 * overlap event would match a question's check or state one of its
 * answers; such an item draws new words, and after five tries falls back to
 * plain filler, so overlap filler never changes an answer.
 */
export function fillerEvents(
  spec,
  scale,
  { overlap = 0, collides = () => false } = {}
) {
  if (scale <= 1) return [];
  const subsystems = SUBSYSTEMS[spec.key];
  const people = PEOPLE[spec.key];
  if (!subsystems || !people)
    throw new Error(`No filler vocabulary for ${spec.key}`);
  const own = spec.events.filter((e) => CREATES.has(e.type)).length + 1;
  let budget = Math.round(own * (scale - 1));
  const compactions = spec.events.filter((e) => e.type === 'WriteCompaction');
  const start = new Date(spec.effort.created_at).getTime() + 3600e3;
  const end =
    new Date((compactions.at(-1) ?? spec.events.at(-1)).at).getTime() -
    6 * 3600e3;
  const rand = random(`filler:${spec.key}`);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  // Overlap draws come from their own stream, so they never shift `rand`.
  const overlapRand = random(`overlap:${spec.key}`);
  const overlapPick = (list) => list[Math.floor(overlapRand() * list.length)];
  const realNames = OVERLAP_SUBSYSTEMS[spec.key] ?? [];
  if (overlap > 0 && !realNames.length)
    throw new Error(`No overlap vocabulary for ${spec.key}`);
  const measure = (lo, hi, draw) =>
    +(lo + draw() * (hi - lo)).toFixed(lo < 1 ? 1 : 0);
  /**
   * Candidate words for one filler item (subsystem, metric, value, and
   * question), best first. An item outside the overlap share gets only its
   * plain words; one inside gets five drafts with real names and
   * housekeeping metrics, then its plain words as the last resort.
   */
  const overlapWords = (plain) => {
    if (!(overlap > 0) || overlapRand() >= overlap) return [plain];
    const tries = [];
    for (let i = 0; i < 5; i++) {
      const [metric, unit, lo, hi] = overlapPick(OVERLAP_METRICS);
      tries.push({
        sub: overlapPick(realNames),
        metric,
        unit,
        value: measure(lo, hi, overlapRand),
        question: overlapPick(OVERLAP_QUESTIONS),
      });
    }
    return [...tries, plain];
  };
  const firstClean = (options, render) =>
    options.find(
      (words, i) =>
        i === options.length - 1 ||
        !render(words).some((event) => collides(event))
    );
  const at = (ms) => new Date(Math.floor(ms / 60e3) * 60e3).toISOString();
  const events = [];
  let n = 0;
  while (budget > 0) {
    n++;
    const id = String(n).padStart(4, '0');
    const sub = pick(subsystems);
    const platform = pick(PLATFORMS);
    const person = pick(people);
    const build = 3000 + Math.floor(rand() * 6000);
    const time = start + rand() * (end - start - 4 * 3600e3);
    const roll = rand();
    if (roll < 0.25 && budget >= 3) {
      // A small thread: a question, the measurement that answers it, and the
      // accepted Decision that closes it. Its links stay inside the thread.
      const question = pick(QUESTIONS);
      const [metric, unit, lo, hi] = pick(METRICS);
      const value = measure(lo, hi, rand);
      const verdict = pick(VERDICTS);
      const doIt = rand() < 0.5;
      const cheap = rand() < 0.5;
      const followup = pick(FOLLOWUPS);
      const issue = `fill-iss-${id}`;
      const finding = `fill-fnd-${id}`;
      const decision = `fill-dec-${id}`;
      const render = (w) => {
        const amount = `${w.value}${w.unit ? ` ${w.unit}` : ''}`;
        return [
          {
            at: at(time),
            key: issue,
            type: 'WriteIssue',
            kind: 'question',
            title: `Whether the ${w.sub} ${w.question} (${id})`,
            body: `${person} asked whether the ${w.sub} ${w.question}. It came up while looking at build ${build} on ${platform}.`,
            created_by: person,
          },
          {
            at: at(time + 3600e3),
            key: finding,
            type: 'WriteFinding',
            kind: 'measurement',
            title: `${capitalize(w.sub)} ${
              w.metric
            } is ${amount} on ${platform} (${id})`,
            body: `${person} measured the ${w.sub} ${w.metric} on ${platform}, build ${build}: ${amount}. That is ${verdict}.`,
            derives_from: [issue],
            created_by: person,
          },
          {
            at: at(time + 2 * 3600e3),
            key: decision,
            type: 'WriteDecision',
            title: `${capitalize(w.sub)}: ${
              doIt ? 'do it' : 'leave it as is'
            } (${id})`,
            body: `The ${w.sub} ${
              w.metric
            } is ${amount} on ${platform}, so the change is ${
              cheap ? 'cheap enough to make now' : 'not worth making this year'
            }. ${followup}`,
            derives_from: [issue, finding],
            created_by: person,
          },
        ];
      };
      const plain = { sub, question, metric, unit, value };
      events.push(
        ...render(firstClean(overlapWords(plain), render)),
        {
          at: at(time + 3 * 3600e3),
          type: 'AcceptDecision',
          decisionId: decision,
        },
        {
          at: at(time + 3 * 3600e3),
          type: 'ResolveIssue',
          issueId: issue,
          resolution: 'resolved',
          resolvedBy: [decision],
        }
      );
      budget -= 3;
    } else if (roll < 0.4) {
      const render = (w) => [
        {
          at: at(time),
          key: `fill-cit-${id}`,
          type: 'WriteCitation',
          title: `${capitalize(w.sub)} capture, build ${build} (${id})`,
          body: `https://perf.tidewater.example/${spec.key}/${w.sub.replace(
            /\W+/g,
            '-'
          )}/${build}`,
          role: 'evidence',
          created_by: person,
        },
      ];
      events.push(...render(firstClean(overlapWords({ sub }), render)));
      budget -= 1;
    } else {
      const [metric, unit, lo, hi] = pick(METRICS);
      const value = measure(lo, hi, rand);
      const runs = 3 + Math.floor(rand() * 8);
      const verdict = pick(VERDICTS);
      const followup = pick(FOLLOWUPS);
      const render = (w) => [
        {
          at: at(time),
          key: `fill-fnd-${id}`,
          type: 'WriteFinding',
          kind: 'measurement',
          title: `${capitalize(w.sub)} ${
            w.metric
          } on ${platform}, build ${build} (${id})`,
          body: `${person} measured the ${w.sub} ${
            w.metric
          } on ${platform}, build ${build}, over ${runs} runs: ${w.value}${
            w.unit ? ` ${w.unit}` : ''
          }. That is ${verdict}. ${followup}`,
          created_by: person,
        },
      ];
      const plain = { sub, metric, unit, value };
      events.push(...render(firstClean(overlapWords(plain), render)));
      budget -= 1;
    }
  }
  return events;
}

/** A spec's events and filler, in time order; spec events win ties. */
export function mergeEvents(specEvents, filler) {
  const tagged = [
    ...specEvents.map((e, i) => ({ e, i, filler: 0 })),
    ...filler.map((e, i) => ({ e, i, filler: 1 })),
  ];
  tagged.sort(
    (a, b) =>
      new Date(a.e.at) - new Date(b.e.at) || a.filler - b.filler || a.i - b.i
  );
  return tagged.map((t) => t.e);
}
