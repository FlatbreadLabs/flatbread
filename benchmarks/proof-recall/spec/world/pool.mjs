// Thread 8: memory. The streaming pool Constraint (WORLD.md fact 2) and eviction.
const KENJI = 'Kenji Arakawa';
const MARTA = 'Marta Lindqvist';
const PRIYA = 'Priya Natarajan';
const DARA = 'Dara Whitlock';

export default [
  {
    at: '2025-09-12T10:00:00Z',
    key: 'con-pool-1',
    type: 'WriteConstraint',
    kind: 'hard',
    created_by: KENJI,
    title: 'Streaming pool budget',
    body: `The streaming pool, which holds every resident cell's textures, geometry, navigation, and audio, may use at most 2.0 GB on every platform. Streaming must evict before it allocates past that line.`,
  },
  {
    at: '2025-10-24T10:00:00Z',
    key: 'iss-pool-evict',
    type: 'WriteIssue',
    kind: 'question',
    created_by: KENJI,
    derives_from: ['con-pool-1'],
    title: 'How should the streaming pool choose cells to evict?',
    body: `When the pool is full and a new cell must load, streaming evicts resident cells. The policy decides how often we reload a cell we just threw away.`,
  },
  {
    at: '2025-10-27T10:00:00Z',
    key: 'dec-pool-lru',
    type: 'WriteDecision',
    created_by: KENJI,
    derives_from: ['iss-pool-evict'],
    title: 'Evict the least recently used cells first',
    body: `Evict the cell that was touched longest ago. Cheap to track and well understood.`,
  },
  {
    at: '2025-10-27T11:00:00Z',
    key: 'dec-pool-fifo',
    type: 'WriteDecision',
    created_by: MARTA,
    derives_from: ['iss-pool-evict'],
    title: 'Evict cells in the order they were loaded',
    body: `Evict the oldest-loaded cell first. Simpler than LRU and needs no per-frame bookkeeping.`,
  },
  {
    at: '2025-10-30T10:00:00Z',
    type: 'AcceptDecision',
    decisionId: 'dec-pool-lru',
  },
  {
    at: '2025-10-30T10:05:00Z',
    type: 'ResolveIssue',
    issueId: 'iss-pool-evict',
    resolution: 'resolved',
    resolvedBy: ['dec-pool-lru'],
  },
  {
    at: '2026-01-05T10:00:00Z',
    key: 'fnd-pool-thrash',
    type: 'WriteFinding',
    kind: 'measurement',
    created_by: KENJI,
    derives_from: ['dec-pool-lru'],
    title: 'LRU eviction thrashes during tide turns',
    body: `Cells the tide is about to expose have not been touched for a whole cycle, so LRU evicts them first, just before they are needed. In a slice playtest, 38% of tide-turn reloads were cells evicted in the previous 60 seconds.`,
  },
  {
    at: '2026-01-05T12:00:00Z',
    type: 'Invalidate',
    findingId: 'fnd-pool-thrash',
    targetId: 'dec-pool-lru',
  },
  {
    at: '2026-01-08T10:00:00Z',
    key: 'fnd-pool-sim',
    type: 'WriteFinding',
    kind: 'simulation',
    created_by: KENJI,
    derives_from: ['fnd-pool-thrash'],
    title: 'Simulated forecast eviction cuts reloads by 63%',
    body: `Kenji Arakawa simulated an eviction policy that scores cells by distance from the player and by the tide forecast. Over 50 simulated tide cycles, it cuts reloads by 63% against LRU.`,
  },
  {
    at: '2026-01-12T10:00:00Z',
    key: 'dec-pool-forecast',
    type: 'WriteDecision',
    created_by: KENJI,
    derives_from: ['fnd-pool-thrash', 'fnd-pool-sim'],
    supersedes: ['dec-pool-lru'],
    title: 'Evict cells by distance and tide forecast',
    body: `Score each resident cell by distance from the nearest player and by how soon the tide forecast needs it. Evict the lowest score first. Cells the tide will expose within one turn are never evicted.`,
  },
  {
    at: '2026-01-14T09:00:00Z',
    type: 'AcceptDecision',
    decisionId: 'dec-pool-forecast',
  },
  {
    at: '2026-02-02T10:00:00Z',
    key: 'rsk-pool-cut',
    type: 'WriteRisk',
    likelihood: 'medium',
    severity: 'high',
    created_by: DARA,
    derives_from: ['con-pool-1'],
    title: 'Ports may need to shrink the streaming pool for Skiff',
    body: `Skiff has the smallest memory of the three platforms, and every system's budget is still provisional. If the Skiff total shrinks, the 2.0 GB streaming pool is the largest single budget and the likeliest to be cut.`,
  },
  {
    at: '2026-03-03T15:00:00Z',
    key: 'blob-pool-occupancy',
    type: 'WriteBlob',
    kind: 'json',
    created_by: KENJI,
    title: 'Streaming pool occupancy, alpha playtest',
    body: JSON.stringify(
      {
        capture: 'pool-occupancy-0303',
        sessions: 12,
        hours: 19.5,
        pool_gb: 2.0,
        mean_occupancy_gb: 1.71,
        peak_occupancy_gb: 1.98,
        reloads: { lru_replay: 4120, forecast: 3214, reduction: 0.22 },
        player_reversals_per_min: 3.4,
        evicted_then_reloaded_within_60s: 0.19,
      },
      null,
      2
    ),
  },
  {
    at: '2026-03-03T15:10:00Z',
    key: 'cit-pool-occupancy',
    type: 'WriteCitation',
    role: 'evidence',
    blob: 'blob-pool-occupancy',
    created_by: KENJI,
    title: 'Pool occupancy capture pool-occupancy-0303',
    body: 'https://perf.tidewater.internal/kestrel/pool/pool-occupancy-0303.json',
  },
  {
    at: '2026-03-04T10:00:00Z',
    key: 'fnd-pool-field',
    type: 'WriteFinding',
    kind: 'measurement',
    created_by: KENJI,
    derives_from: ['fnd-pool-sim', 'dec-pool-forecast'],
    cites: ['cit-pool-occupancy'],
    title: 'Field captures show forecast eviction cuts reloads by 22%, not 63%',
    body: `Kenji Arakawa captured pool behaviour across twelve alpha playtest sessions and replayed the same sessions under LRU for comparison. Forecast eviction is better, but nowhere near the simulation's figure: it cuts reloads by 22%, not 63%.

The tide half of the score works as designed. No cell the tide exposed had to reload during a turn. The distance half is the problem. Each resident cell is scored by straight-line distance from the nearest player, and players do not move like that.

The simulation assumed players walk in straight lines toward a goal. Real players double back to pick up salvage, look at caustics, or wait for a friend, so a cell evicted for being behind the player is often needed again a minute later. In the field captures, players reversed direction 3.4 times per minute on average.

The decision stands, because 22% is still a gain and the tide protection matters most. The 63% figure should not be quoted.`,
  },
  {
    at: '2026-03-04T12:00:00Z',
    type: 'Invalidate',
    findingId: 'fnd-pool-field',
    targetId: 'fnd-pool-sim',
  },
  {
    at: '2026-06-02T10:00:00Z',
    key: 'fnd-pool-cut-notice',
    type: 'WriteFinding',
    kind: 'survey',
    created_by: PRIYA,
    derives_from: ['rsk-pool-cut'],
    title:
      'Ports cut the Skiff memory total, and streaming must give back 400 MB',
    body: `Priya Natarajan reports that Skiff is now a launch platform, so the world must fit the ports Constraint "Skiff memory budget", which fell from 9 GB to 8 GB in February. The ports team split the 1 GB cut across systems, and streaming's share is 400 MB.`,
  },
  {
    at: '2026-06-03T09:00:00Z',
    type: 'SetRiskState',
    riskId: 'rsk-pool-cut',
    state: 'realized',
    evidence: ['fnd-pool-cut-notice'],
  },
  {
    at: '2026-06-04T09:00:00Z',
    key: 'con-pool-draft',
    type: 'WriteConstraint',
    kind: 'hard',
    created_by: KENJI,
    title: 'Streaming pool budget (draft)',
    body: `Draft: streaming pool at most 1.8 GB on every platform.`,
  },
  {
    at: '2026-06-04T10:00:00Z',
    type: 'Retract',
    recordId: 'con-pool-draft',
    reason: 'Draft figure written before the ports team set the final cut.',
  },
  {
    at: '2026-06-04T11:00:00Z',
    key: 'con-pool-2',
    type: 'WriteConstraint',
    kind: 'hard',
    created_by: KENJI,
    derives_from: ['fnd-pool-cut-notice'],
    supersedes: ['con-pool-1'],
    title: 'Streaming pool budget',
    body: `The streaming pool may use at most 1.6 GB on every platform, down from 2.0 GB. The reason is the ports Constraint "Skiff memory budget", which fell from 9 GB to 8 GB when Skiff became a launch platform; streaming's share of that cut is 400 MB. One budget for all platforms keeps content tuning in one place, so PC and Meridian take the same 1.6 GB.

How the 400 MB comes back: Kenji Arakawa lowers texture mip residency in the outer ring, compacts audio banks per cell, and drops navigation detail for cells the player cannot reach until the tide falls.

The forecast eviction policy keeps tide-exposed cells resident, so the cut falls on cells behind the player. Expect more reloads when players double back.

Of the 400 MB, texture mips give back 260 MB, audio banks 90 MB, and navigation 50 MB.`,
  },
  {
    at: '2026-07-10T10:00:00Z',
    key: 'fnd-pool-tideband',
    type: 'WriteFinding',
    kind: 'measurement',
    created_by: KENJI,
    derives_from: ['con-pool-2', 'dec-tide-harmonic'],
    title: 'Tide-band cells need 320 MB resident during a spring tide turn',
    body: `With the second harmonic, a spring tide exposes up to 11 coastal cells at once. Keeping them resident through the turn needs 320 MB of the pool. Without a reservation, forecast eviction pushes out cells near the player to make room.`,
  },
  {
    at: '2026-07-15T10:00:00Z',
    key: 'con-pool-3',
    type: 'WriteConstraint',
    kind: 'hard',
    created_by: KENJI,
    derives_from: ['fnd-pool-tideband', 'con-pool-2'],
    supersedes: ['con-pool-2'],
    title: 'Streaming pool budget',
    body: `The streaming pool may use at most 1.6 GB on every platform. Of that, 320 MB is reserved for tide-band cells during a tide turn; outside a turn the reservation is free for any cell. The total is unchanged from the June cut.`,
  },
];
