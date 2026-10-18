// Frame budgets, memory, gaps, the vertical-slice blocker, and the four
// compactions. The head compaction goes stale after content lock.
import { d, INES, TOMASZ, YUSUF, PRIYA, LIAM, DARA } from './people.mjs';

export default [
  {
    at: d('2025-09-02 09:00'),
    key: 'con-budget-1',
    type: 'WriteConstraint',
    kind: 'hard',
    title: 'Frame budget',
    created_by: INES,
    body:
      'Lantern must finish a Meridian frame in 16.6 ms, which is 60 Hz. For pre-production the GPU passes may use the whole 16.6 ms; ' +
      'the render thread on the CPU runs in parallel and is budgeted elsewhere. Every pass owner reports against this number in the weekly capture review. ' +
      'Numbers come from the cliffs and dunes benchmarks, never from the menu scene.',
  },
  {
    at: d('2025-09-02 10:00'),
    key: 'con-vram',
    type: 'WriteConstraint',
    kind: 'hard',
    title: 'Render-target memory on Meridian',
    created_by: INES,
    body:
      "Lantern's render targets, transient attachments, shadow pages and GI volumes must fit in 1.8 GB of the 13.5 GB Meridian gives the game. " +
      'Streaming owns the rest. An allocation over 1.8 GB fails the nightly memory check and blocks the build.',
  },
  {
    at: d('2025-09-03 09:00'),
    key: 'con-saltglass-2km',
    type: 'WriteConstraint',
    kind: 'soft',
    title: 'Saltglass must read at 2 km',
    created_by: YUSUF,
    body:
      'Art direction wants refraction through saltglass dunes, cliffs and ruins to read out to 2 km. Caustics may fade past 800 m, but the glass must still bend what is behind it. ' +
      'This is an art target, not a platform rule. Yusuf Demir will accept a cheaper look past 1.2 km if it keeps the silhouette.',
  },
  {
    at: d('2025-09-04 09:00'),
    key: 'cit-wiki',
    type: 'WriteCitation',
    role: 'context',
    title: 'Lantern overhaul wiki page',
    created_by: INES,
    body: 'https://wiki.tidewater.example/lantern/overhaul',
  },
  {
    at: d('2025-09-12 10:00'),
    key: 'iss-gap-capture',
    type: 'WriteIssue',
    kind: 'gap',
    title: 'No automated GPU captures on nightly builds',
    created_by: INES,
    body:
      'Every timing in this Effort so far comes from a capture someone took by hand, on whatever machine was free. ' +
      'Nothing records which build or which hardware produced a number. We need captures taken the same way every night.',
  },
  {
    at: d('2025-10-06 15:00'),
    key: 'dec-nightly-capture',
    type: 'WriteDecision',
    title:
      'Capture the cliffs and dunes benchmarks on every nightly Meridian build',
    created_by: LIAM,
    derives_from: ['iss-gap-capture'],
    body:
      'The build farm runs the cliffs and dunes benchmarks on a Meridian devkit after each nightly build and stores the GPU capture with the build number and devkit serial. ' +
      'Hand captures stay allowed for exploration, but a number that drives a Decision should come from a nightly capture. ' +
      "Liam O'Connell owns the job; the first nightly capture is planned for build r4700.",
  },
  {
    at: d('2025-10-08 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-nightly-capture',
  },
  {
    at: d('2025-10-08 10:05'),
    type: 'ResolveIssue',
    issueId: 'iss-gap-capture',
    resolution: 'resolved',
    resolvedBy: ['dec-nightly-capture'],
  },
  {
    at: d('2025-11-25 10:00'),
    key: 'iss-rt-reflect',
    type: 'WriteIssue',
    kind: 'gap',
    title: 'No ray-traced reflections on saltglass',
    created_by: YUSUF,
    body:
      'Saltglass reflects the sky and nearby cliffs with screen-space reflections only. Anything off screen vanishes from the reflection. ' +
      'Yusuf Demir asks whether ray-traced reflections on PC and Meridian are in scope.',
  },
  {
    at: d('2025-12-01 09:00'),
    key: 'iss-slice-budget',
    type: 'WriteIssue',
    kind: 'blocker',
    title: 'Vertical slice runs at 19.4 ms on the dunes flyover',
    created_by: INES,
    derives_from: ['con-budget-1'],
    body:
      'Two weeks before the slice, the dunes flyover runs at 19.4 ms on Meridian, 2.8 ms over the Frame budget. ' +
      'SDF GI with all four clipmap cascades and the saltglass forward pass are the two largest passes. The slice cannot ship at this cost.',
  },
  {
    at: d('2025-12-03 10:00'),
    key: 'dec-slice-cut',
    type: 'WriteDecision',
    title: 'Drop the far SDF GI cascade for the vertical slice build',
    created_by: TOMASZ,
    derives_from: ['iss-slice-budget', 'dec-gi-sdf'],
    body:
      'For the slice build only, SDF GI traces three clipmap cascades instead of four. The far cascade covers 512 m to 2 km, where the probe-free fallback looks flat but acceptable. ' +
      'Tomasz Brandt measured the flyover at 16.1 ms with the cut. The fourth cascade comes back after the slice.',
  },
  {
    at: d('2025-12-04 09:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-slice-cut',
  },
  {
    at: d('2025-12-12 10:00'),
    type: 'ResolveIssue',
    issueId: 'iss-slice-budget',
    resolution: 'resolved',
    resolvedBy: ['dec-slice-cut'],
  },
  {
    at: d('2025-12-18 10:00'),
    key: 'cmp-1',
    type: 'WriteCompaction',
    title: 'Lantern at the vertical slice',
    created_by: INES,
    derives_from: [
      'dec-vb-3',
      'dec-csm',
      'dec-gi-sdf',
      'dec-slice-cut',
      'dec-refr-ss',
      'dec-caustics-photon',
      'dec-tern',
      'dec-filmic',
      'dec-cull-gpu',
      'dec-meshlet-64',
    ],
    body:
      'The vertical slice shipped on 2025-12-15. The dunes flyover ran at 16.1 ms on Meridian after the far SDF GI cascade was dropped for the slice build, so the 16.6 ms Frame budget held.\n\n' +
      'Opaque geometry renders through a visibility buffer, with foliage and saltglass in a forward pass after the resolve. Sun shadows use four cascaded shadow maps; virtual shadow maps were rejected on a 3.1 ms cost. ' +
      'GI is signed-distance-field GI at 2.2 ms. Saltglass refraction is screen-space, although a Finding has shown it loses off-screen content at grazing angles and a replacement is due in January. ' +
      'Caustics are photon splats. Tern is the only upscaler. Tonemapping uses the stock filmic curve. Culling is GPU-driven with 64-vertex meshlets.',
  },
  {
    at: d('2025-12-19 10:00'),
    key: 'con-budget-2',
    type: 'WriteConstraint',
    kind: 'hard',
    title: 'Frame budget',
    created_by: INES,
    supersedes: ['con-budget-1'],
    body:
      'After the vertical slice the 16.6 ms Meridian frame is split: 15.2 ms for Lantern GPU passes and 1.4 ms held back for system overlays and dynamic-resolution headroom. ' +
      'The slice ran passes to the full 16.6 ms and the system overlay pushed two capture runs over. Pass owners must give back time to fit 15.2 ms.',
  },
  {
    at: d('2025-12-22 10:00'),
    type: 'ResolveIssue',
    issueId: 'iss-rt-reflect',
    resolution: 'wontfix',
    resolvedBy: ['con-budget-2'],
  },
  {
    at: d('2026-02-10 10:00'),
    key: 'iss-gap-skiff-profiles',
    type: 'WriteIssue',
    kind: 'gap',
    title: 'No Skiff GPU timings for Lantern passes',
    created_by: TOMASZ,
    body:
      'Every Lantern pass has Meridian timings from the nightly capture, but none has Skiff timings. The visibility buffer, Tern and VSM were all chosen without a Skiff number. ' +
      'Tomasz Brandt wants Skiff numbers before alpha.',
  },
  {
    at: d('2026-02-11 10:00'),
    key: 'fnd-skiff-devkit-eta',
    type: 'WriteFinding',
    kind: 'survey',
    title: 'Skiff devkits reach the render team in April',
    created_by: DARA,
    derives_from: ['iss-gap-skiff-profiles'],
    body:
      'Dara Whitlock checked with the platform holder: the render team gets two Skiff devkits in the first week of April 2026. ' +
      'Until then only the ports team has hardware, and it is booked for memory work.',
  },
  {
    at: d('2026-02-12 10:00'),
    type: 'ResolveIssue',
    issueId: 'iss-gap-skiff-profiles',
    resolution: 'deferred',
    resolvedBy: ['fnd-skiff-devkit-eta'],
  },
  {
    at: d('2026-03-05 10:00'),
    key: 'cmp-2',
    type: 'WriteCompaction',
    title: 'Lantern at alpha',
    created_by: INES,
    derives_from: [
      'dec-vb-4',
      'dec-vsm',
      'dec-gi-sdf',
      'fnd-gi-sdf-recapture',
      'dec-refr-hybrid',
      'iss-caustic-flicker',
      'dec-tern',
      'dec-brine-1',
      'dec-presets-3',
      'con-budget-2',
    ],
    body:
      'Alpha landed on 2026-03-02. The visibility buffer now resolves materials in compute, and foliage is back in the buffer thanks to meshlet alpha masks; saltglass still renders forward.\n\n' +
      'Virtual shadow maps replaced cascaded shadow maps on 2026-02-16 after the 3.1 ms cost Finding turned out to be a capture error. ' +
      'SDF GI remains the accepted GI Decision, but the recapture on a Meridian devkit measured 4.7 ms, not 2.2 ms, and nobody has re-weighed the GI Decision. ' +
      'Refraction is screen-space with a ray-marched fallback. Caustics flicker under Tern; the blocker is open with two proposed fixes. ' +
      'Tonemapping moved to the Brine curve. Tern ships three presets. The Frame budget gives GPU passes 15.2 ms.',
  },
  {
    at: d('2026-03-20 10:00'),
    key: 'con-120-1',
    type: 'WriteConstraint',
    kind: 'soft',
    title: 'Meridian 120 Hz performance mode budget',
    created_by: DARA,
    body:
      'Marketing asked for a 120 Hz performance mode on Meridian. A 120 Hz frame is 8.3 ms. For now this is a stretch goal: Lantern will try to hit 8.3 ms with a lower internal resolution and cheaper GI, ' +
      'but Dara Whitlock can still cut the mode if it does not fit by beta.',
  },
  {
    at: d('2026-04-02 10:00'),
    key: 'con-budget-3',
    type: 'WriteConstraint',
    kind: 'hard',
    title: 'Frame budget',
    created_by: INES,
    supersedes: ['con-budget-2'],
    body:
      'Meridian quality mode stays at 60 Hz: 16.6 ms per frame, of which Lantern GPU passes get 15.0 ms and 1.6 ms is headroom. The headroom grew by 0.2 ms because the new system overlay costs more than the old one. ' +
      'The 120 Hz performance mode has its own Constraint with an 8.3 ms frame; this record covers quality mode only. Skiff budgets belong to the ports Effort.',
  },
  {
    at: d('2026-06-02 10:00'),
    key: 'con-budget-noise',
    type: 'WriteConstraint',
    kind: 'hard',
    title: 'Frame budget',
    created_by: PRIYA,
    body: 'Skiff 40 Hz mode: 25 ms per frame for CPU and GPU together. Skiff becomes a launch platform at beta, so Lantern passes on Skiff must fit inside 25 ms.',
  },
  {
    at: d('2026-06-02 16:00'),
    type: 'Retract',
    recordId: 'con-budget-noise',
    reason:
      'Written to the render Effort by mistake. The Skiff 40 Hz budget belongs to the Frame budget record in the ports Effort.',
  },
  {
    at: d('2026-06-03 10:00'),
    key: 'con-120-2',
    type: 'WriteConstraint',
    kind: 'hard',
    title: 'Meridian 120 Hz performance mode budget',
    created_by: DARA,
    supersedes: ['con-120-1'],
    body:
      'As of beta the 120 Hz performance mode is a launch commitment on Meridian. Each frame gets 8.3 ms: Lantern GPU passes get 7.4 ms and 0.9 ms is headroom. ' +
      "The mode may drop GI quality and run Tern's lowest preset, but it must not drop saltglass refraction. GI gets at most 1.0 ms of the 7.4 ms.",
  },
  {
    at: d('2026-06-04 10:00'),
    key: 'cmp-3',
    type: 'WriteCompaction',
    title: 'Lantern at beta',
    created_by: INES,
    derives_from: [
      'dec-vb-5',
      'dec-vsm',
      'dec-tern-reactive',
      'fnd-tern-cost-3',
      'dec-brine-2',
      'iss-caustic-flicker',
      'iss-120-gi',
      'con-budget-3',
      'con-120-2',
      'rsk-vsm-overflow',
    ],
    body:
      'Beta landed on 2026-06-01 with Skiff as a launch platform. The visibility buffer runs on PC and Meridian; Skiff falls back to forward+ because the April Skiff capture put the buffer at 11.2 ms.\n\n' +
      'Virtual shadow maps are in, and the page-pool overflow Risk is open. Tern gets a saltglass reactive mask, which removes 90 percent of the ghosting, and the Halcyon vendor upscaler was rejected a second time. ' +
      'Tern costs 1.6 ms at 4K output. The Brine curve has a separate HDR shoulder. The 120 Hz performance mode is now a hard launch commitment at 8.3 ms; GI does not fit it yet and that blocker is open. ' +
      'Caustic flicker is still open with two proposed fixes. Quality mode keeps 15.0 ms of GPU time.',
  },
  {
    at: d('2026-08-26 10:00'),
    key: 'cmp-4',
    type: 'WriteCompaction',
    title: 'Lantern at content lock',
    created_by: INES,
    derives_from: [
      'dec-vb-6',
      'dec-vsm',
      'dec-tern',
      'dec-tern-reactive',
      'dec-presets-4b',
      'dec-brine-2',
      'iss-caustic-flicker',
      'iss-hdr-cert',
      'rsk-hdr-cert',
      'con-120-2',
    ],
    body:
      'Content locked on 2026-08-24. The visibility buffer runs on every platform; Skiff resolves materials at half rate and the Skiff forward+ path is gone.\n\n' +
      'Virtual shadow maps cover sun shadows, but shadow pages still run out at spring low tide. Tern is the only upscaler, with four presets including Ultra Performance for the 120 Hz mode, and a saltglass reactive mask against ghosting. ' +
      "The Brine curve's HDR shoulder starts at 1,000 nits. HDR certification failed its first pre-check on paper white; two fixes are proposed, and Priya Natarajan expects the resubmission on 2026-09-12 to pass. " +
      'Caustic flicker under Tern is still an open blocker after seven months, and neither proposed fix has been accepted. The 120 Hz mode holds 8.3 ms per frame.',
  },
  {
    at: d('2026-09-25 10:00'),
    key: 'fnd-rc-capture',
    type: 'WriteFinding',
    kind: 'measurement',
    title:
      'Release-candidate capture: quality mode 14.6 ms, performance mode 7.3 ms',
    created_by: TOMASZ,
    derives_from: ['con-budget-3', 'con-120-2'],
    body:
      'Nightly capture of the release-candidate build on a Meridian devkit, dunes flyover. Quality mode GPU time is 14.6 ms against the 15.0 ms allowance. ' +
      'Performance mode GPU time is 7.3 ms against 7.4 ms, with 0.1 ms to spare. Spring low tide was not part of this run.',
  },
];
