// Global illumination: SDF GI accepted on a capture from the wrong platform.
// The capture is invalidated, but the accepted Decision is never re-weighed.
import { d, json, INES, TOMASZ, YUSUF, DARA } from './people.mjs';

export default [
  {
    at: d('2025-09-15 10:00'),
    key: 'iss-gi-q',
    type: 'WriteIssue',
    kind: 'question',
    title: 'How should Lantern do global illumination?',
    created_by: INES,
    body:
      'Tides move every 40 minutes and the sun crosses the sky in 90, so baked lighting is out. Candidates: a relit probe grid, signed-distance-field GI, or a hybrid of the two. ' +
      'Light must bounce through saltglass and must not leak through thin glass walls.',
  },
  {
    at: d('2025-10-13 15:00'),
    key: 'blb-gi-sdf',
    type: 'WriteBlob',
    kind: 'json',
    title: 'GPU capture: SDF GI on the dunes benchmark',
    created_by: TOMASZ,
    body: json({
      build: 'lantern-2025.10.10-r4630',
      device: 'PC workstation (Meridian clock profile)',
      scene: 'dunes_bench_01',
      resolution: '2560x1440',
      clipmap_cascades: 4,
      clipmap_size: '64^3',
      passes_ms: { sdf_update: 0.4, trace: 1.3, filter: 0.3, apply: 0.2 },
      total_ms: 2.2,
      l2_hit_rate: 0.81,
    }),
  },
  {
    at: d('2025-10-13 15:05'),
    key: 'cit-gi-sdf',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Capture: SDF GI dunes benchmark',
    created_by: TOMASZ,
    blob: 'blb-gi-sdf',
    body: 'https://captures.tidewater.example/lantern/r4630/sdf_gi',
  },
  {
    at: d('2025-10-15 10:00'),
    key: 'fnd-gi-sdf-cost',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'SDF GI costs 2.2 ms on Meridian',
    created_by: TOMASZ,
    derives_from: ['iss-gi-q'],
    cites: ['cit-gi-sdf'],
    body:
      'SDF GI with four clipmap cascades of 64 cubed costs 2.2 ms per frame at 1440p on the dunes benchmark, with tracing the largest part at 1.3 ms. ' +
      'That is affordable inside the Frame budget. The capture is attached.',
  },
  {
    at: d('2025-10-15 10:05'),
    key: 'fnd-gi-sdf-cost-noise',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'SDF GI costs 2.4 ms on Meridian',
    created_by: TOMASZ,
    derives_from: ['iss-gi-q'],
    body: 'SDF GI costs 2.4 ms per frame at 1440p on the dunes benchmark.',
  },
  {
    at: d('2025-10-16 10:00'),
    type: 'Retract',
    recordId: 'fnd-gi-sdf-cost-noise',
    reason:
      'Draft written before the capture finished; the 2.4 ms figure included the debug overlay. The 2.2 ms Finding is the one to use.',
  },
  {
    at: d('2025-10-17 10:00'),
    key: 'fnd-gi-probe-leak',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Probe grid leaks light through thin saltglass walls',
    created_by: YUSUF,
    derives_from: ['iss-gi-q'],
    body:
      'With 1 m probe spacing, probes behind 20 cm saltglass walls in the ruins see the sunlit side, and the dark side glows. ' +
      'Halving the spacing to 0.5 m cuts the leak by about half and costs eight times the probes.',
  },
  {
    at: d('2025-10-20 13:00'),
    key: 'dec-gi-probe',
    type: 'WriteDecision',
    title: 'Use a relit probe grid for global illumination',
    created_by: YUSUF,
    derives_from: ['iss-gi-q'],
    body:
      'Place probes on a 1 m grid near the player and 4 m further out, and relight them each frame from the sun and sky. Cheap at about 0.6 ms. ' +
      'Leaks through thin saltglass walls are the known weakness.',
  },
  {
    at: d('2025-10-20 14:00'),
    key: 'dec-gi-sdf',
    type: 'WriteDecision',
    title: 'Use signed-distance-field GI',
    created_by: TOMASZ,
    derives_from: ['iss-gi-q', 'fnd-gi-sdf-cost', 'fnd-gi-probe-leak'],
    body:
      'Trace short cones against a signed-distance-field clipmap of the scene, four cascades of 64 cubed. Thin saltglass walls block light correctly because the distance field knows they are there. ' +
      'At 2.2 ms on Meridian it fits the Frame budget.',
  },
  {
    at: d('2025-10-20 15:00'),
    key: 'dec-gi-hybrid',
    type: 'WriteDecision',
    title: 'Use a probe grid for the far field and SDF tracing near the camera',
    created_by: INES,
    derives_from: ['iss-gi-q'],
    body: 'Trace the distance field within 64 m of the camera and fall back to the relit probe grid beyond it. More code than either option alone, but each half does what it is good at.',
  },
  {
    at: d('2025-10-28 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-gi-sdf',
  },
  {
    at: d('2025-10-28 10:05'),
    type: 'ResolveIssue',
    issueId: 'iss-gi-q',
    resolution: 'resolved',
    resolvedBy: ['dec-gi-sdf'],
  },
  {
    at: d('2025-11-05 10:00'),
    key: 'fnd-gi-frame-share',
    type: 'WriteFinding',
    kind: 'analysis',
    title: 'GI takes 13 percent of the quality-mode frame',
    created_by: INES,
    derives_from: ['fnd-gi-sdf-cost', 'con-budget-1'],
    body: 'At 2.2 ms, SDF GI is 13 percent of the 16.6 ms Meridian frame. Ines Okafor uses this share to plan the other passes: shadows, refraction and Tern together may take 5 ms.',
  },
  {
    at: d('2025-11-06 10:00'),
    key: 'rsk-sdf-memory',
    type: 'WriteRisk',
    likelihood: 'medium',
    severity: 'medium',
    title: 'SDF volumes outgrow the render-target memory budget',
    created_by: TOMASZ,
    derives_from: ['dec-gi-sdf', 'con-vram'],
    body: 'Four 64-cubed clipmaps plus the per-mesh distance fields could pass 500 MB once all the ruins are in. That would squeeze shadow pages and the visibility buffer inside 1.8 GB.',
  },
  {
    at: d('2026-02-02 15:00'),
    key: 'blb-gi-recap',
    type: 'WriteBlob',
    kind: 'json',
    title: 'GPU capture: SDF GI on a Meridian devkit, dunes benchmark',
    created_by: TOMASZ,
    body: json({
      build: 'lantern-2026.02.01-r5840',
      device: 'Meridian devkit MRD-0031, retail clocks',
      scene: 'dunes_bench_01',
      resolution: '2560x1440',
      clipmap_cascades: 4,
      passes_ms: { sdf_update: 0.6, trace: 3.2, filter: 0.5, apply: 0.4 },
      total_ms: 4.7,
      l2_hit_rate: 0.52,
    }),
  },
  {
    at: d('2026-02-02 15:05'),
    key: 'cit-gi-recap',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Capture: SDF GI on a Meridian devkit',
    created_by: TOMASZ,
    blob: 'blb-gi-recap',
    body: 'https://captures.tidewater.example/lantern/r5840/sdf_gi_devkit',
  },
  {
    at: d('2026-02-05 10:00'),
    key: 'fnd-gi-sdf-recapture',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'SDF GI costs 4.7 ms on Meridian',
    created_by: TOMASZ,
    invalidates: ['fnd-gi-sdf-cost'],
    cites: ['cit-gi-recap'],
    body:
      'The October SDF GI number was not a Meridian number. The first nightly devkit capture of the dunes benchmark puts SDF GI at 4.7 ms, more than twice the 2.2 ms the GI Decision was accepted on. ' +
      'Tracing went from 1.3 ms to 3.2 ms; the distance-field update and the filter grew a little too. ' +
      'The October capture predates the nightly capture job and was taken by hand; its attached capture names the machine it ran on.\n\n' +
      'Why the gap is so large: SDF tracing is bound by cache misses. Each cone step reads a different part of the clipmap, so the trace pass lives or dies on the L2 cache. ' +
      "The Decision 'Use signed-distance-field GI' still stands on the 2.2 ms figure and nobody has re-weighed it against the probe grid. " +
      'Tomasz Brandt does not propose reversing it yet, because the probe grid still leaks through thin walls.\n\n' +
      'The L2 hit rate in the trace pass fell from 81 percent in the October capture to 52 percent on the devkit.',
  },
  {
    at: d('2026-03-09 10:00'),
    key: 'fnd-sdf-memory',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'SDF volumes use 410 MB of render-target memory',
    created_by: TOMASZ,
    derives_from: ['rsk-sdf-memory'],
    body:
      'With every ruin in the alpha build loaded, the clipmaps and per-mesh distance fields use 410 MB of the 1.8 GB render-target budget. ' +
      'That fits today, but leaves about 90 MB of slack for new ruins before the 500 MB line the Risk named.',
  },
  {
    at: d('2026-03-10 10:00'),
    type: 'SetRiskState',
    riskId: 'rsk-sdf-memory',
    state: 'accepted',
    evidence: ['fnd-sdf-memory'],
  },
  {
    at: d('2026-03-24 10:00'),
    key: 'iss-120-gi',
    type: 'WriteIssue',
    kind: 'blocker',
    title: 'GI does not fit the 120 Hz performance-mode budget',
    created_by: INES,
    derives_from: ['con-120-1', 'fnd-gi-sdf-recapture'],
    body:
      'At 4.7 ms SDF GI alone takes more than half of an 8.3 ms performance-mode frame. The 120 Hz mode cannot ship with GI as it is. ' +
      'Some cheaper GI path for performance mode is needed.',
  },
  {
    at: d('2026-03-25 10:00'),
    key: 'rsk-120-gi',
    type: 'WriteRisk',
    likelihood: 'high',
    severity: 'high',
    title: 'GI cannot fit the 120 Hz performance mode',
    created_by: DARA,
    derives_from: ['iss-120-gi'],
    body: 'If no GI path fits the performance-mode budget, the 120 Hz mode either ships with flat lighting or does not ship. Marketing has already announced it.',
  },
  {
    at: d('2026-03-26 10:00'),
    key: 'dec-gi-120-probe',
    type: 'WriteDecision',
    title: 'Use the probe grid alone in 120 Hz performance mode',
    created_by: YUSUF,
    derives_from: ['iss-120-gi', 'fnd-gi-probe-leak'],
    body: 'In performance mode only, replace SDF GI with the relit probe grid at 2 m spacing. It costs about 0.6 ms. The leak through thin saltglass walls comes back, and Yusuf Demir would hide the worst ruins with authored blockers.',
  },
  {
    at: d('2026-04-10 10:00'),
    key: 'dec-gi-120-quarter',
    type: 'WriteDecision',
    title: 'Trace SDF GI at quarter resolution in performance mode',
    created_by: TOMASZ,
    derives_from: ['iss-120-gi'],
    body: 'Keep SDF GI in performance mode but trace at quarter resolution and upsample with a depth-aware filter. Thin walls stay correct. Tomasz Brandt expects about 1.3 ms.',
  },
  {
    at: d('2026-06-24 10:00'),
    key: 'fnd-120-gi-cost',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Quarter-resolution SDF GI costs 1.9 ms in performance mode',
    created_by: TOMASZ,
    derives_from: ['dec-gi-120-quarter', 'con-120-2'],
    body:
      'Quarter-resolution tracing measured 1.9 ms on the dunes benchmark in performance mode, not the 1.3 ms hoped for; the upsample filter costs 0.5 ms by itself. ' +
      'Performance mode allows GI at most 1.0 ms. Neither proposal fits as written.',
  },
  {
    at: d('2026-06-25 10:00'),
    type: 'SetRiskState',
    riskId: 'rsk-120-gi',
    state: 'realized',
    evidence: ['fnd-120-gi-cost'],
  },
];
