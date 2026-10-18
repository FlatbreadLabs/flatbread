// Sun shadows: CSM accepted on a bad VSM capture, VSM reopened and accepted
// after it supersedes CSM. Ray-traced shadows reopened and left proposed.
// Local lights get their own question with a near-duplicate VSM option.
import { d, json, INES, TOMASZ, YUSUF, DARA } from './people.mjs';

export default [
  {
    at: d('2025-09-08 10:00'),
    key: 'iss-shadow-q',
    type: 'WriteIssue',
    kind: 'question',
    title: 'Which shadow technique should Lantern use for sun shadows?',
    created_by: INES,
    body:
      'The sun drives most of the light on the coast, and saltglass makes shadow errors easy to see because refraction bends them. ' +
      'Candidates: cascaded shadow maps, virtual shadow maps, or ray-traced sun shadows. Shadows must reach 2 km and fit the Frame budget on Meridian.',
  },
  {
    at: d('2025-09-25 15:00'),
    key: 'blb-vsm-cost',
    type: 'WriteBlob',
    kind: 'json',
    title: 'GPU capture: virtual shadow map prototype, dunes benchmark',
    created_by: TOMASZ,
    body: json({
      build: 'lantern-2025.09.24-r4561',
      platform: 'Meridian devkit',
      scene: 'dunes_bench_01',
      virtual_resolution: 16384,
      page_size: 128,
      pool_pages: 4096,
      page_pool_clear: 'every_frame',
      pages_rendered_per_frame: 3870,
      passes_ms: { page_mark: 0.3, page_raster: 2.4, page_sample: 0.4 },
      total_ms: 3.1,
      csm_reference_ms: 1.6,
    }),
  },
  {
    at: d('2025-09-25 15:05'),
    key: 'cit-vsm-cost',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Capture: virtual shadow map prototype',
    created_by: TOMASZ,
    blob: 'blb-vsm-cost',
    body: 'https://captures.tidewater.example/lantern/r4561/vsm_proto',
  },
  {
    at: d('2025-09-29 10:00'),
    key: 'fnd-vsm-cost',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Virtual shadow maps cost 3.1 ms on Meridian',
    created_by: TOMASZ,
    derives_from: ['iss-shadow-q'],
    cites: ['cit-vsm-cost'],
    body:
      'The virtual shadow map prototype, at 16k virtual resolution with 128-texel pages, costs 3.1 ms on the dunes benchmark. Four cascaded shadow maps cost 1.6 ms on the same view. ' +
      'Most of the VSM time is page rasterization. On these numbers VSM is twice the price of CSM.',
  },
  {
    at: d('2025-09-30 10:00'),
    key: 'dec-csm',
    type: 'WriteDecision',
    title: 'Use cascaded shadow maps with four cascades',
    created_by: TOMASZ,
    derives_from: ['iss-shadow-q', 'fnd-vsm-cost'],
    body:
      'Sun shadows use four cascaded shadow maps out to 2 km, with the last cascade updated every fourth frame. ' +
      'Cost is 1.6 ms on the dunes benchmark against 3.1 ms for virtual shadow maps. The technique is well understood and needs no new page management.',
  },
  {
    at: d('2025-09-30 11:00'),
    key: 'dec-vsm',
    type: 'WriteDecision',
    title: 'Use virtual shadow maps for the sun',
    created_by: INES,
    derives_from: ['iss-shadow-q'],
    body:
      'Sun shadows use one 16k virtual shadow map split into 128-texel pages, allocated where the camera needs detail and cached between frames. ' +
      'Resolution follows the screen, so there are no cascade boundaries to show through saltglass. Pages for static geometry stay valid until the sun moves far enough or a tide step changes the terrain.\n\n' +
      'Page caching is the whole point: a static scene should redraw only a few hundred pages a frame. The page pool holds 4,096 pages, which is 256 MB inside the render-target memory budget. ' +
      'Moving objects use a small separate page set that is redrawn every frame. Tomasz Brandt will own page management; Ines Okafor owns the sampling side.\n\n' +
      'Beyond 1.2 km, VSM pages are not allocated at all; a distance-field shadow covers 1.2 km to 2 km.',
  },
  {
    at: d('2025-09-30 12:00'),
    key: 'dec-rt-shadows',
    type: 'WriteDecision',
    title: 'Use ray-traced sun shadows',
    created_by: YUSUF,
    derives_from: ['iss-shadow-q'],
    body:
      'Trace one shadow ray per pixel against the hardware acceleration structure, with denoising. Soft penumbrae through saltglass come for free. ' +
      'Skiff has no ray-tracing hardware, so Skiff would need a second technique anyway.',
  },
  { at: d('2025-10-06 10:00'), type: 'AcceptDecision', decisionId: 'dec-csm' },
  {
    at: d('2025-10-06 10:05'),
    type: 'ResolveIssue',
    issueId: 'iss-shadow-q',
    resolution: 'resolved',
    resolvedBy: ['dec-csm'],
  },
  {
    at: d('2025-11-03 10:00'),
    key: 'iss-csm-seams',
    type: 'WriteIssue',
    kind: 'defect',
    title: 'Cascade seams visible through saltglass at 300 to 800 m',
    created_by: YUSUF,
    derives_from: ['dec-csm'],
    body:
      'Refraction through saltglass bends view rays across cascade boundaries, so a shadow sampled from cascade 2 sits next to one from cascade 3. ' +
      'The seam reads as a hard line in the glass at 300 to 800 m. Blending cascades hides it on sand but not inside the glass.',
  },
  {
    at: d('2025-11-10 10:00'),
    key: 'iss-shadow-local-q',
    type: 'WriteIssue',
    kind: 'question',
    title: 'Which shadow technique should Lantern use for local lights?',
    created_by: TOMASZ,
    body: 'Lanterns, campfires and glowing ruins cast local shadows. There can be 40 shadowed local lights on screen in the harbor. Pick a technique separate from the sun.',
  },
  {
    at: d('2025-11-12 10:00'),
    key: 'dec-local-atlas',
    type: 'WriteDecision',
    title: 'Use a cached shadow atlas for local lights',
    created_by: TOMASZ,
    derives_from: ['iss-shadow-local-q'],
    body: 'Local lights render cube or spot shadows into one 8k atlas, cached until something in range moves. The harbor with 40 shadowed lights costs 0.9 ms. Simple and predictable.',
  },
  {
    at: d('2025-11-12 11:00'),
    key: 'dec-local-vsm',
    type: 'WriteDecision',
    title: 'Use virtual shadow maps for local lights',
    created_by: INES,
    derives_from: ['iss-shadow-local-q'],
    body: 'Give each local light its own virtual shadow map sharing the sun page pool. One system for every light. The harbor would need about 1,500 extra pages.',
  },
  {
    at: d('2025-11-19 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-local-atlas',
  },
  {
    at: d('2025-11-19 10:05'),
    type: 'ResolveIssue',
    issueId: 'iss-shadow-local-q',
    resolution: 'resolved',
    resolvedBy: ['dec-local-atlas'],
  },
  {
    at: d('2025-11-22 15:00'),
    key: 'blb-vsm-recap',
    type: 'WriteBlob',
    kind: 'json',
    title:
      'GPU capture: virtual shadow maps with page caching, dunes benchmark',
    created_by: TOMASZ,
    body: json({
      build: 'lantern-2025.11.21-r5310',
      platform: 'Meridian devkit',
      scene: 'dunes_bench_01',
      page_pool_clear: 'on_invalidation',
      pages_rendered_per_frame: 212,
      passes_ms: { page_mark: 0.3, page_raster: 0.7, page_sample: 0.4 },
      total_ms: 1.4,
      csm_reference_ms: 1.6,
    }),
  },
  {
    at: d('2025-11-22 15:05'),
    key: 'cit-vsm-recap',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Capture: virtual shadow maps with page caching',
    created_by: TOMASZ,
    blob: 'blb-vsm-recap',
    body: 'https://captures.tidewater.example/lantern/r5310/vsm_cached',
  },
  {
    at: d('2025-11-24 10:00'),
    key: 'fnd-vsm-recapture',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Virtual shadow maps cost 1.4 ms on Meridian with cached pages',
    created_by: TOMASZ,
    invalidates: ['fnd-vsm-cost'],
    cites: ['cit-vsm-recap'],
    body:
      "The September capture had the prototype's debug flag on, which threw away cached pages and redrew the whole pool each frame. " +
      'With caching as designed, only pages touched by moving objects or by the slow sun drift redraw. Dunes benchmark: 1.4 ms, against 1.6 ms for four cascades.',
  },
  {
    at: d('2026-01-12 10:00'),
    type: 'ReopenDecision',
    decisionId: 'dec-vsm',
    reason:
      'The cost Finding that sank virtual shadow maps was a capture error; with cached pages VSM costs 1.4 ms, less than four cascades. Cascade seams through saltglass remain unsolved under CSM.',
  },
  {
    at: d('2026-02-16 10:00'),
    type: 'Supersede',
    supersederId: 'dec-vsm',
    targetId: 'dec-csm',
  },
  { at: d('2026-02-17 10:00'), type: 'AcceptDecision', decisionId: 'dec-vsm' },
  {
    at: d('2026-02-17 10:05'),
    type: 'ResolveIssue',
    issueId: 'iss-csm-seams',
    resolution: 'resolved',
    resolvedBy: ['dec-vsm'],
  },
  {
    at: d('2026-02-18 10:00'),
    key: 'rsk-vsm-overflow',
    type: 'WriteRisk',
    likelihood: 'medium',
    severity: 'high',
    title: 'VSM page pool overflows when tides expose the flats',
    created_by: TOMASZ,
    derives_from: ['dec-vsm'],
    body:
      'A falling tide exposes kilometres of wet flats at once, all needing fresh shadow pages. If the requests exceed the 4,096-page pool, shadows drop to low resolution or pop. ' +
      'Nobody has measured a spring tide yet.',
  },
  {
    at: d('2026-05-12 10:00'),
    type: 'ReopenDecision',
    decisionId: 'dec-rt-shadows',
    reason:
      'Yusuf Demir wants ray-traced sun shadows considered again as a PC ultra option now that PC has GPU time to spare.',
  },
  {
    at: d('2026-06-12 15:00'),
    key: 'blb-vsm-pages',
    type: 'WriteBlob',
    kind: 'json',
    title: 'Page-pool trace: virtual shadow maps across a spring tide',
    created_by: TOMASZ,
    body: json({
      build: 'lantern-2026.06.11-r7020',
      platform: 'Meridian devkit',
      scene: 'flats_spring_tide',
      pool_pages: 4096,
      samples: [
        { tide_phase: 'spring high', pages_requested: 1880 },
        { tide_phase: 'mid ebb', pages_requested: 3410 },
        { tide_phase: 'spring low', pages_requested: 5912 },
        { tide_phase: 'mid flood', pages_requested: 3120 },
      ],
      peak_pages_requested: 5912,
      frames_over_pool: 1430,
      worst_tide_phase: 'spring low, 31 minutes into the 40-minute cycle',
    }),
  },
  {
    at: d('2026-06-12 15:05'),
    key: 'cit-vsm-pages',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Trace: VSM page pool across a spring tide',
    created_by: TOMASZ,
    blob: 'blb-vsm-pages',
    body: 'https://captures.tidewater.example/lantern/r7020/vsm_spring_tide',
  },
  {
    at: d('2026-06-15 10:00'),
    key: 'fnd-vsm-overflow',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'VSM page pool overflows during spring tides',
    created_by: TOMASZ,
    derives_from: ['rsk-vsm-overflow'],
    cites: ['cit-vsm-pages'],
    body:
      'A full spring-tide cycle on the flats asks for far more shadow pages at low water than the pool holds. Shadows on the far flats drop to the fallback resolution and visibly pop as pages come back. ' +
      'The trace is attached. Neap tides stay inside the pool; only the two spring tides of each in-game month overflow.\n\n' +
      'Tomasz Brandt checked three cheaper ideas before writing this up. Dropping the page size to 64 texels makes the overflow worse, because the page table grows. ' +
      'Skipping pages for wet sand that is darker than a threshold saves about 600 pages, not enough. Freezing pages on the far flats for a whole tide step hides the popping but leaves shadows pointing the wrong way at sunset.\n\n' +
      'Raising the pool from 4,096 to 6,144 pages would end the overflow and cost another 128 MB, which the render-target memory budget does not have.',
  },
  {
    at: d('2026-06-16 10:00'),
    type: 'SetRiskState',
    riskId: 'rsk-vsm-overflow',
    state: 'realized',
    evidence: ['fnd-vsm-overflow'],
  },
  {
    at: d('2026-06-17 10:00'),
    key: 'iss-vsm-tide',
    type: 'WriteIssue',
    kind: 'blocker',
    title: 'Shadow pages run out at spring low tide',
    created_by: INES,
    derives_from: ['fnd-vsm-overflow'],
    body:
      'Shadow popping on the flats at spring low tide is a ship blocker for Dara Whitlock: the flats are where the main quest line crosses. ' +
      'No fix is chosen. Options discussed in review: a coarser page level for wet sand, or streaming the flats in later.',
  },
];
