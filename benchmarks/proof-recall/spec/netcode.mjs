// The co-op rollback netcode prototype. A small Effort that is abandoned:
// rollback cannot afford to re-run the fixed-point tides every frame on Skiff.
const SOFIA = 'Sofia Marchetti';
const RHEA = 'Rhea Valdés';
const MARTA = 'Marta Lindqvist';
const PRIYA = 'Priya Natarajan';
const DARA = 'Dara Whitlock';
const KENJI = 'Kenji Arakawa';

export default {
  key: 'netcode',
  effort: {
    title: 'Co-op rollback netcode prototype',
    body:
      'Sofia Marchetti owns this Effort. It prototypes rollback netcode for Saltglass Reach co-op (one to four players) ' +
      'and decides whether rollback can ship. The tide simulation reshapes walkable terrain, so every sync model must keep tide state identical on all peers.',
    created_at: '2025-11-03T09:00:00Z',
  },
  events: [
    {
      at: '2025-11-04T10:00:00Z',
      key: 'iss-sync',
      type: 'WriteIssue',
      kind: 'question',
      title: 'How should co-op keep up to four players in sync?',
      body:
        'Co-op needs a sync model before the vertical slice. Players fight, climb and ride the same tide surges, ' +
        'so any lag in shared state is visible. Candidates: rollback, deterministic lockstep, or a host-authoritative model.',
      created_by: SOFIA,
    },
    {
      at: '2025-11-05T10:00:00Z',
      key: 'con-determinism',
      type: 'WriteConstraint',
      kind: 'hard',
      title: 'Co-op peers must agree on tide state bit for bit',
      body:
        'Tides decide which saltglass paths are walkable. If two peers disagree on the water line by a single cell, ' +
        'one player walks on sand that another sees as sea. Rhea Valdés requires tide state to match exactly on every peer, ' +
        'whatever sync model co-op uses.',
      created_by: RHEA,
    },
    {
      at: '2025-11-06T10:00:00Z',
      key: 'con-rtt',
      type: 'WriteConstraint',
      kind: 'soft',
      title: 'Co-op must stay playable at 150 ms round trip',
      body:
        'Dara Whitlock set the target: co-op between two continents must feel playable at 150 ms round trip. ' +
        'Above 250 ms we may show a warning.',
      created_by: DARA,
    },
    {
      at: '2025-11-07T10:00:00Z',
      key: 'dec-rollback',
      type: 'WriteDecision',
      title: 'Prototype rollback netcode for co-op',
      body:
        'Each peer predicts remote inputs and simulates ahead. When a late input arrives, the peer restores a snapshot and re-simulates the frames since. ' +
        'Local input never waits on the network, which suits traversal and combat at 150 ms. ' +
        'The cost is re-simulation: everything in the snapshot must run again for every rolled-back frame.',
      created_by: SOFIA,
      derives_from: ['iss-sync', 'con-rtt', 'con-determinism'],
    },
    {
      at: '2025-11-07T11:00:00Z',
      key: 'dec-lockstep',
      type: 'WriteDecision',
      title: 'Use deterministic lockstep for co-op',
      body:
        "Every peer waits for every other peer's input for a frame before simulating it. " +
        'Simple and cheap on CPU, and determinism is already required for tides. ' +
        'The cost is input delay equal to half the round trip, and the slowest peer gates everyone.',
      created_by: SOFIA,
      derives_from: ['iss-sync', 'con-determinism'],
    },
    {
      at: '2025-11-12T15:00:00Z',
      key: 'fnd-lockstep-test',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Lockstep playtest at 150 ms round trip',
      body: [
        'Sofia Marchetti and Marta Lindqvist ran a four-player lockstep build on the Shoal-01 test map with 150 ms of injected round trip.',
        '',
        'Setup:',
        '- Two PC peers at 60 Hz, one Meridian devkit at 60 Hz, one Skiff devkit at 30 Hz.',
        '- Ten minutes of traversal and one tide surge.',
        '- Input delay fixed at 5 frames (75 ms at 60 Hz), the minimum that kept every peer fed.',
        '',
        'What we saw:',
        '- Marta Lindqvist rated traversal "mushy" from the first minute. Jumps across saltglass gaps landed late.',
        '- Every peer ran at the speed of the slowest one. The Skiff devkit dropped frames during the tide surge and the whole session waited for it.',
        '- Network traffic was tiny: 1.2 KB/s per peer.',
        '',
        'The Skiff devkit stalled the whole session 41 times in 10 minutes. With a handheld in the group, lockstep would feel broken for all four players.',
      ].join('\n'),
      created_by: SOFIA,
      derives_from: ['dec-lockstep', 'con-rtt'],
    },
    {
      at: '2025-11-14T10:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-rollback',
    },
    {
      at: '2025-11-18T14:00:00Z',
      key: 'fnd-prototype-cost',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Rollback re-simulates a 4-frame window in 1.1 ms on PC',
      body:
        'First rollback prototype on Shoal-01, PC, four players. Restoring a snapshot and re-simulating 4 frames takes 1.1 ms in total. ' +
        'Sofia Marchetti calls this cheap enough to grow the window later. ' +
        'Caveat: the tide simulation was frozen for this run, because it was not yet in the snapshot.',
      created_by: SOFIA,
      derives_from: ['dec-rollback'],
    },
    {
      at: '2025-11-20T10:00:00Z',
      key: 'dec-window-v1',
      type: 'WriteDecision',
      title: 'Use a 4-frame rollback window',
      body:
        'Roll back at most 4 frames (67 ms at 60 Hz). Inputs later than that stall the peer. ' +
        'At 1.1 ms per full rollback this costs almost nothing, and covers same-region play.',
      created_by: SOFIA,
      derives_from: ['dec-rollback', 'fnd-prototype-cost'],
    },
    {
      at: '2025-11-21T10:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-window-v1',
    },
    {
      at: '2025-12-05T10:00:00Z',
      key: 'cit-primer',
      type: 'WriteCitation',
      role: 'context',
      title: 'Studio wiki primer on rollback netcode',
      body: 'https://wiki.tidewater-forge.example/netcode/rollback-primer',
      created_by: SOFIA,
    },
    {
      at: '2025-12-09T11:00:00Z',
      key: 'fnd-snapshot',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'A rollback snapshot is 38 KB per player per frame',
      body:
        "With player physics, Gull script state and the local tide cells included, one player's rollback snapshot is 38 KB per frame. " +
        'A 4-frame ring for four players needs about 600 KB, which is fine on every platform.',
      created_by: SOFIA,
      derives_from: ['dec-rollback'],
      cites: ['cit-primer'],
    },
    {
      at: '2025-12-10T09:00:00Z',
      key: 'fnd-noise',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Player snapshot is 14 KB per player',
      body:
        'Serialized player state, including Gull script variables and inventory, comes to 14 KB per player. ' +
        'Measured on the coast save slot.',
      created_by: MARTA,
    },
    {
      at: '2025-12-12T09:00:00Z',
      type: 'Retract',
      recordId: 'fnd-noise',
      reason:
        'Filed here by mistake. This measures save-game snapshots for the world Effort, not rollback snapshots.',
    },
    {
      at: '2025-12-16T10:00:00Z',
      key: 'fnd-slice',
      type: 'WriteFinding',
      kind: 'playtest',
      title:
        'Two-player rollback co-op ran the vertical slice demo without a visible desync',
      body:
        'The vertical slice demo on 2025-12-15 ran two-player co-op on PC with rollback for 25 minutes. ' +
        'No visible desync and no stalls. Tides were still frozen in co-op builds.',
      created_by: SOFIA,
      derives_from: ['dec-window-v1'],
    },
    {
      at: '2026-01-08T10:00:00Z',
      key: 'fnd-wifi-rtt',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Skiff co-op sessions over Wi-Fi see 180 ms round trips at p95',
      body:
        'Priya Natarajan logged 340 Skiff sessions on home Wi-Fi. Median round trip was 95 ms; p95 was 180 ms. ' +
        'A 4-frame window covers only about half of those sessions without stalls.',
      created_by: PRIYA,
      derives_from: ['dec-window-v1'],
    },
    {
      at: '2026-01-12T10:00:00Z',
      key: 'dec-window-v2',
      type: 'WriteDecision',
      title: 'Use a 7-frame rollback window',
      body:
        'Grow the window to 7 frames (117 ms at 60 Hz) to cover p95 Skiff Wi-Fi. ' +
        'The snapshot ring grows to about 1 MB for four players.',
      created_by: SOFIA,
      derives_from: ['fnd-wifi-rtt'],
      supersedes: ['dec-window-v1'],
    },
    {
      at: '2026-01-12T15:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-window-v2',
    },
    {
      at: '2026-01-20T10:00:00Z',
      key: 'rsk-resim',
      type: 'WriteRisk',
      likelihood: 'medium',
      severity: 'high',
      title:
        'Re-simulation cost could blow the Skiff frame budget once tides join the snapshot',
      body:
        'Every prototype number so far ran with tides frozen. Once tides are in the snapshot, every rolled-back frame re-runs the tide step too. ' +
        'Sofia Marchetti does not yet know what one tide step costs on Skiff.',
      created_by: SOFIA,
      derives_from: ['dec-window-v2', 'fnd-prototype-cost'],
    },
    {
      at: '2026-01-26T10:00:00Z',
      key: 'iss-late-join',
      type: 'WriteIssue',
      kind: 'defect',
      title: 'Late join during a tide surge desyncs the joining player',
      body:
        'A player who joins while a surge is rising receives tide cells from a snapshot that is up to 7 frames old. ' +
        'In 6 of 20 tries the joiner saw a dry path the others saw flooded. Kenji Arakawa suspects the join snapshot skips cells that are still streaming in.',
      created_by: KENJI,
      derives_from: ['dec-rollback', 'con-determinism'],
    },
    {
      at: '2026-01-28T10:00:00Z',
      key: 'fnd-input-delay',
      type: 'WriteFinding',
      kind: 'playtest',
      title: 'One frame of input delay is invisible in playtests',
      body:
        'Marta Lindqvist ran blind tests with 0, 1 and 2 frames of local input delay. ' +
        'Nobody of eight testers noticed 1 frame; five of eight noticed 2 frames.',
      created_by: MARTA,
    },
    {
      at: '2026-02-02T10:00:00Z',
      key: 'dec-window-v3',
      type: 'WriteDecision',
      title: 'Use a 6-frame rollback window with 1 frame of input delay',
      body:
        'Add 1 frame of local input delay, which playtesters cannot see, and shrink the window to 6 frames. ' +
        'Together they still cover p95 Skiff Wi-Fi. Scaling the 1.1 ms measurement, a 6-frame rollback should cost under 2 ms.',
      created_by: SOFIA,
      derives_from: ['fnd-input-delay', 'fnd-wifi-rtt', 'fnd-prototype-cost'],
      supersedes: ['dec-window-v2'],
    },
    {
      at: '2026-02-03T10:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-window-v3',
    },
    {
      at: '2026-02-09T10:00:00Z',
      key: 'iss-desync-debug',
      type: 'WriteIssue',
      kind: 'gap',
      title: 'Nothing shows which system caused a desync',
      body: 'When peers drift we only see the symptom, usually minutes later. We need to know whether tides, physics or Gull diverged first.',
      created_by: SOFIA,
    },
    {
      at: '2026-02-11T10:00:00Z',
      key: 'dec-checksum',
      type: 'WriteDecision',
      title:
        'Hash tide, physics and Gull state every 30 frames and compare across peers',
      body:
        'Each peer hashes the three state blocks separately every 30 frames and sends 12 bytes to the others. ' +
        'A mismatch names the block that diverged and the frame window it happened in.',
      created_by: SOFIA,
      derives_from: ['iss-desync-debug'],
    },
    {
      at: '2026-02-11T15:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-checksum',
    },
    {
      at: '2026-02-16T10:00:00Z',
      key: 'fnd-desync-hash',
      type: 'WriteFinding',
      kind: 'diagnosis',
      title: 'The first checksum mismatch came from Gull random number calls',
      body:
        'The checksums caught a Gull script that seeded its random generator from wall-clock time. ' +
        'Fixed in a day. Tide and physics hashes have matched in every session since.',
      created_by: MARTA,
      derives_from: ['dec-checksum'],
    },
    {
      at: '2026-02-16T11:00:00Z',
      type: 'ResolveIssue',
      issueId: 'iss-desync-debug',
      resolution: 'resolved',
      resolvedBy: ['dec-checksum', 'fnd-desync-hash'],
    },
    {
      at: '2026-02-18T16:00:00Z',
      key: 'cmp-feb',
      type: 'WriteCompaction',
      title: 'Co-op netcode: where things stand in February',
      body:
        'Rollback is the chosen co-op sync model; lockstep was rejected after the 150 ms playtest. ' +
        'The window is 6 frames with 1 frame of input delay, which covers p95 Skiff Wi-Fi. ' +
        'Measured rollback cost is 1.1 ms for 4 frames on PC, so a 6-frame rollback should stay under 2 ms. ' +
        'Desync checksums work. Open: late join during a tide surge, and the Risk that tide re-simulation costs more once tides join the snapshot. ' +
        'Next: profile on Skiff with tides running, then plan for alpha.',
      created_by: SOFIA,
      derives_from: [
        'dec-rollback',
        'dec-window-v3',
        'fnd-prototype-cost',
        'fnd-snapshot',
        'fnd-slice',
        'dec-checksum',
        'iss-late-join',
        'rsk-resim',
      ],
    },
    {
      at: '2026-03-10T10:00:00Z',
      key: 'iss-skiff-profile',
      type: 'WriteIssue',
      kind: 'gap',
      title: 'Rollback has not been profiled on Skiff with tides running',
      body: 'Alpha builds now include tides in the rollback snapshot. Every cost number we have is from PC with tides frozen.',
      created_by: SOFIA,
      derives_from: ['rsk-resim'],
    },
    {
      at: '2026-03-18T10:00:00Z',
      key: 'blb-capture',
      type: 'WriteBlob',
      kind: 'json',
      title: 'Skiff rollback profile capture, 6-frame window, tides on',
      body: JSON.stringify(
        {
          capture: 'skiff-devkit-04, Shoal-01, four players, 40 Hz mode',
          window_frames: 6,
          per_rollback_ms: {
            tide_resim: 4.8,
            physics_resim: 1.9,
            gull_resim: 0.7,
            snapshot_restore: 0.3,
            total: 7.7,
          },
          tide_step_ms: 0.8,
          frame_budget_ms: 25,
          rollbacks_per_second_p50: 22,
        },
        null,
        2
      ),
      created_by: PRIYA,
    },
    {
      at: '2026-03-18T10:10:00Z',
      key: 'cit-capture',
      type: 'WriteCitation',
      role: 'evidence',
      title: 'Skiff rollback profile capture',
      body: 'Per-system rollback timings from a Skiff devkit with tides in the snapshot. Full numbers in the attached capture.',
      blob: 'blb-capture',
      created_by: PRIYA,
    },
    {
      at: '2026-03-19T10:00:00Z',
      key: 'fnd-tide-cost',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Re-running tides every rollback frame costs 4.8 ms on Skiff',
      body:
        'With tides in the snapshot, every rolled-back frame must re-run the tide step. One 32.32 fixed-point tide step costs 0.8 ms on Skiff, ' +
        'so a full 6-frame rollback re-runs tides for 4.8 ms, before physics and Gull. ' +
        'Rollbacks happen on most frames at Wi-Fi latency. Against the 25 ms Skiff frame at 40 Hz that is far too much. ' +
        'The 1.1 ms PC figure was measured with tides frozen and does not describe the real cost.',
      created_by: SOFIA,
      derives_from: ['iss-skiff-profile', 'rsk-resim'],
      cites: ['cit-capture'],
    },
    {
      at: '2026-03-19T10:10:00Z',
      type: 'Invalidate',
      findingId: 'fnd-tide-cost',
      targetId: 'fnd-prototype-cost',
    },
    {
      at: '2026-03-19T10:20:00Z',
      type: 'SetRiskState',
      riskId: 'rsk-resim',
      state: 'realized',
      evidence: ['fnd-tide-cost'],
    },
    {
      at: '2026-03-19T10:30:00Z',
      type: 'ResolveIssue',
      issueId: 'iss-skiff-profile',
      resolution: 'resolved',
      resolvedBy: ['fnd-tide-cost'],
    },
    {
      at: '2026-03-24T10:00:00Z',
      key: 'dec-tide-lod',
      type: 'WriteDecision',
      title: 'Re-simulate tides at quarter resolution during rollback',
      body:
        'Keep rollback, but re-run tides on a quarter-resolution grid for rolled-back frames and correct to full resolution afterwards. ' +
        'This would cut tide re-simulation to about 1.2 ms. Rhea Valdés doubts the correction step can stay bit-exact.',
      created_by: SOFIA,
      derives_from: ['fnd-tide-cost'],
    },
    {
      at: '2026-03-27T10:00:00Z',
      key: 'fnd-lod-desync',
      type: 'WriteFinding',
      kind: 'measurement',
      title:
        'Quarter-resolution tide re-simulation desyncs peers within 90 seconds',
      body:
        'In the quarter-resolution prototype the tide checksum diverged between peers within 90 seconds in all 10 runs. ' +
        'The correction step rounds differently depending on how many frames were rolled back.',
      created_by: RHEA,
      derives_from: ['dec-tide-lod', 'con-determinism'],
    },
    {
      at: '2026-03-31T10:00:00Z',
      key: 'fnd-host-spike',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Host-authoritative spike keeps tides off the client CPU',
      body:
        'Marta Lindqvist built a two-day host-authoritative spike on Shoal-01 with one PC host and one Skiff client. ' +
        'The Skiff client never runs the tide step, so its simulation cost fell from 7.7 ms to 1.4 ms per frame. ' +
        'At 150 ms round trip the client sees tide edges correct by up to half a cell; Marta Lindqvist thinks blending can hide it.',
      created_by: MARTA,
      derives_from: ['fnd-tide-cost', 'con-determinism'],
    },
    {
      at: '2026-04-01T10:00:00Z',
      key: 'dec-abandon',
      type: 'WriteDecision',
      title: 'Abandon rollback netcode for co-op',
      body: [
        'We stop the rollback prototype. Co-op will not ship with rollback.',
        '',
        'The reason is the tides. The world Effort\'s Decision "Run the tide simulation in 32.32 fixed point" keeps tides deterministic, ' +
          'and co-op needs that. But rollback must re-run tides every frame it rolls back, which costs 4.8 ms on Skiff. ' +
          'That is a fifth of the 25 ms frame before physics, Gull and rendering.',
        '',
        'What we tried before giving up:',
        '- Shrinking the window: below 6 frames, p95 Skiff Wi-Fi stalls.',
        '- Re-simulating tides at quarter resolution: desynced within 90 seconds.',
        '- Leaving tides out of the snapshot: breaks the bit-for-bit tide Constraint.',
        '',
        'The checksum tooling and the 1-frame input delay result carry over to whatever replaces rollback.',
        'The rollback code is archived on branch netcode/rollback-archive and will not be maintained.',
      ].join('\n'),
      created_by: SOFIA,
      derives_from: ['fnd-tide-cost', 'fnd-lod-desync', 'con-determinism'],
      supersedes: ['dec-rollback'],
    },
    {
      at: '2026-04-01T14:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-abandon',
      rejects: ['dec-tide-lod'],
    },
    {
      at: '2026-04-02T10:00:00Z',
      key: 'dec-host',
      type: 'WriteDecision',
      title: 'Use host-authoritative sync for co-op',
      body:
        "The host runs the only tide simulation and the only physics for shared objects. Clients send inputs and render the host's state with local prediction for their own player. " +
        'Nothing re-runs tides, so the 4.8 ms cost disappears. ' +
        'Clients see corrections on tide edges at their round trip; Marta Lindqvist will tune how those corrections blend. ' +
        'The snapshot send rate is not chosen yet.',
      created_by: SOFIA,
      derives_from: ['iss-sync', 'dec-abandon', 'fnd-host-spike', 'con-rtt'],
    },
    {
      at: '2026-04-02T15:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-host',
    },
    {
      at: '2026-04-02T15:10:00Z',
      type: 'ResolveIssue',
      issueId: 'iss-sync',
      resolution: 'resolved',
      resolvedBy: ['dec-host'],
    },
    {
      at: '2026-04-03T10:00:00Z',
      key: 'rsk-host-upload',
      type: 'WriteRisk',
      likelihood: 'medium',
      severity: 'medium',
      title: 'A Skiff host may lack the upload bandwidth for three clients',
      body:
        'With host-authoritative sync the host sends world state to every client. Priya Natarajan has not yet measured Skiff upload on home Wi-Fi, ' +
        'and a Skiff hosting three clients may not keep up. Nobody owns this now that the netcode Effort is stopping.',
      created_by: PRIYA,
      derives_from: ['dec-host'],
    },
    {
      at: '2026-04-06T09:00:00Z',
      type: 'SetEffortStatus',
      status: 'abandoned',
    },
  ],
};
