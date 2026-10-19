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
 * Filler events for one spec, so the Effort ends with about `scale` times
 * its own records. Returns events with `at` and `key` like a spec's own.
 */
export function fillerEvents(spec, scale) {
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
      const issue = `fill-iss-${id}`;
      const finding = `fill-fnd-${id}`;
      const decision = `fill-dec-${id}`;
      const [metric, unit, lo, hi] = pick(METRICS);
      const value = +(lo + rand() * (hi - lo)).toFixed(lo < 1 ? 1 : 0);
      events.push(
        {
          at: at(time),
          key: issue,
          type: 'WriteIssue',
          kind: 'question',
          title: `Whether the ${sub} ${question} (${id})`,
          body: `${person} asked whether the ${sub} ${question}. It came up while looking at build ${build} on ${platform}.`,
          created_by: person,
        },
        {
          at: at(time + 3600e3),
          key: finding,
          type: 'WriteFinding',
          kind: 'measurement',
          title: `${capitalize(sub)} ${metric} is ${value}${
            unit ? ` ${unit}` : ''
          } on ${platform} (${id})`,
          body: `${person} measured the ${sub} ${metric} on ${platform}, build ${build}: ${value}${
            unit ? ` ${unit}` : ''
          }. That is ${pick(VERDICTS)}.`,
          derives_from: [issue],
          created_by: person,
        },
        {
          at: at(time + 2 * 3600e3),
          key: decision,
          type: 'WriteDecision',
          title: `${capitalize(sub)}: ${
            rand() < 0.5 ? 'do it' : 'leave it as is'
          } (${id})`,
          body: `The ${sub} ${metric} is ${value}${
            unit ? ` ${unit}` : ''
          } on ${platform}, so the change is ${
            rand() < 0.5
              ? 'cheap enough to make now'
              : 'not worth making this year'
          }. ${pick(FOLLOWUPS)}`,
          derives_from: [issue, finding],
          created_by: person,
        },
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
      events.push({
        at: at(time),
        key: `fill-cit-${id}`,
        type: 'WriteCitation',
        title: `${capitalize(sub)} capture, build ${build} (${id})`,
        body: `https://perf.tidewater.example/${spec.key}/${sub.replace(
          /\W+/g,
          '-'
        )}/${build}`,
        role: 'evidence',
        created_by: person,
      });
      budget -= 1;
    } else {
      const [metric, unit, lo, hi] = pick(METRICS);
      const value = +(lo + rand() * (hi - lo)).toFixed(lo < 1 ? 1 : 0);
      const runs = 3 + Math.floor(rand() * 8);
      events.push({
        at: at(time),
        key: `fill-fnd-${id}`,
        type: 'WriteFinding',
        kind: 'measurement',
        title: `${capitalize(
          sub
        )} ${metric} on ${platform}, build ${build} (${id})`,
        body: `${person} measured the ${sub} ${metric} on ${platform}, build ${build}, over ${runs} runs: ${value}${
          unit ? ` ${unit}` : ''
        }. That is ${pick(VERDICTS)}. ${pick(FOLLOWUPS)}`,
        created_by: person,
      });
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
