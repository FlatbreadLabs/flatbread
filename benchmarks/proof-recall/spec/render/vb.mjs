// Clustered forward+ to a visibility buffer: a six-version Decision chain
// that is refined, partly reversed for Skiff, then restored.
import { d, json, INES, TOMASZ, YUSUF, DARA } from './people.mjs';

export default [
  {
    at: d('2025-09-03 11:00'),
    key: 'iss-vb-q',
    type: 'WriteIssue',
    kind: 'question',
    title:
      'Should Lantern replace clustered forward+ with a visibility buffer?',
    created_by: INES,
    body:
      'Lantern shades with clustered forward+. Saltglass cliffs are dense meshes with many small triangles, and quad overdraw is high. ' +
      'Options on the table: keep forward+ and tune it, move to a deferred G-buffer, or move to a visibility buffer. Decide before the vertical slice so the material system can follow.',
  },
  {
    at: d('2025-09-09 14:00'),
    key: 'blb-cliffs',
    type: 'WriteBlob',
    kind: 'json',
    title: 'GPU capture: forward+ on the cliffs benchmark, Meridian',
    created_by: TOMASZ,
    body: json({
      build: 'lantern-2025.09.08-r4411',
      platform: 'Meridian devkit',
      scene: 'cliffs_bench_02',
      resolution: '2560x1440',
      passes_ms: {
        depth_prepass: 1.1,
        light_cull: 0.6,
        forward_opaque: 7.9,
        saltglass_forward: 2.3,
        post: 1.4,
      },
      quad_overdraw: 3.4,
      triangles_visible: 14200000,
      worst_tile_lights: 212,
      notes:
        'Overdraw measured with the helper-lane counter; cliff face LOD0 dominates.',
    }),
  },
  {
    at: d('2025-09-09 14:05'),
    key: 'cit-cliffs',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Capture: forward+ cliffs benchmark',
    created_by: TOMASZ,
    blob: 'blb-cliffs',
    body: 'https://captures.tidewater.example/lantern/r4411/cliffs_bench_02',
  },
  {
    at: d('2025-09-10 10:00'),
    key: 'fnd-fplus-overdraw',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Forward+ overdraw on saltglass cliffs',
    created_by: TOMASZ,
    derives_from: ['iss-vb-q'],
    cites: ['cit-cliffs'],
    body:
      'On the cliffs benchmark, forward+ opaque shading takes 7.9 ms of the 16.6 ms Meridian frame. Quad overdraw averages 3.4x because the cliff meshes are dense with sub-pixel triangles. ' +
      'Light culling itself is cheap at 0.6 ms; the cost is shading quads that never reach the screen. The full capture is attached.',
  },
  {
    at: d('2025-09-22 15:00'),
    key: 'blb-vb-proto',
    type: 'WriteBlob',
    kind: 'markdown',
    title: 'Timing table: visibility buffer prototype against forward+',
    created_by: TOMASZ,
    body:
      '| Pass (cliffs_bench_02, Meridian, 1440p) | Forward+ (ms) | Visibility buffer (ms) |\n' +
      '| --- | --- | --- |\n' +
      '| Depth prepass | 1.1 | - |\n' +
      '| Visibility raster | - | 1.2 |\n' +
      '| Material resolve | - | 1.9 |\n' +
      '| Opaque shading | 7.9 | 1.5 |\n' +
      '| Total opaque | 9.0 | 4.6 |\n\n' +
      'Extra memory for a 64-bit visibility target at 4K: 96 MB. The 32-bit target used here costs 48 MB at 4K.\n' +
      'Build lantern-2025.09.19-r4520, captured by hand on devkit MRD-0031.',
  },
  {
    at: d('2025-09-22 15:05'),
    key: 'cit-vb-proto',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Timing table: visibility buffer prototype',
    created_by: TOMASZ,
    blob: 'blb-vb-proto',
    body: 'https://captures.tidewater.example/lantern/r4520/vb_proto',
  },
  {
    at: d('2025-09-24 10:00'),
    key: 'fnd-vb-proto',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Visibility buffer prototype timings',
    created_by: TOMASZ,
    derives_from: ['fnd-fplus-overdraw'],
    cites: ['cit-vb-proto'],
    body:
      "The visibility buffer prototype draws the cliffs benchmark opaque work in 4.6 ms against forward+'s 9.0 ms on Meridian. The win comes from shading each pixel once. " +
      'The prototype packs instance and triangle into 32 bits, which may not be enough for the dunes. Pass-by-pass numbers are in the attached table.',
  },
  {
    at: d('2025-09-26 10:00'),
    key: 'dec-vb-1',
    type: 'WriteDecision',
    title: 'Adopt a visibility buffer for all opaque geometry',
    created_by: INES,
    derives_from: ['iss-vb-q', 'fnd-vb-proto', 'con-budget-1'],
    body:
      'Lantern replaces clustered forward+ with a visibility buffer for all opaque geometry. Rasterize instance and triangle ids, then shade each visible pixel once in a resolve pass. ' +
      'The prototype saves 4.4 ms on the cliffs benchmark, which is the single biggest win available against the Frame budget. Saltglass, being transparent, is not opaque geometry and is out of scope here.',
  },
  {
    at: d('2025-09-26 10:01'),
    key: 'dec-vb-1-dup',
    type: 'WriteDecision',
    title: 'Adopt a visibility buffer for all opaque geometry',
    created_by: INES,
    derives_from: ['iss-vb-q'],
    body: 'Lantern replaces clustered forward+ with a visibility buffer for all opaque geometry.',
  },
  {
    at: d('2025-09-26 15:00'),
    type: 'Retract',
    recordId: 'dec-vb-1-dup',
    reason:
      'Duplicate write from a retried session; the Decision written a minute earlier is the real one.',
  },
  {
    at: d('2025-09-27 10:00'),
    key: 'dec-fplus-tune',
    type: 'WriteDecision',
    title: 'Keep clustered forward+ and tune light culling',
    created_by: TOMASZ,
    derives_from: ['iss-vb-q', 'fnd-fplus-overdraw'],
    body:
      'Keep forward+, add a depth-only prepass for the cliffs and tighten cluster bounds. The material system stays as it is, so the risk is low. ' +
      'Tomasz Brandt estimates 1.5 ms back on the cliffs benchmark, against the 4.4 ms the visibility buffer prototype saves.',
  },
  {
    at: d('2025-09-27 11:00'),
    key: 'dec-deferred',
    type: 'WriteDecision',
    title: 'Move to a deferred G-buffer',
    created_by: YUSUF,
    derives_from: ['iss-vb-q'],
    body:
      'A classic G-buffer: four render targets at 1440p cost 118 MB and about 2.8 ms of bandwidth on Meridian. Artists and tools already understand it. ' +
      'It does not fix overdraw on dense meshes as well as a visibility buffer, because the G-buffer pass still writes every covered quad.',
  },
  { at: d('2025-10-01 10:00'), type: 'AcceptDecision', decisionId: 'dec-vb-1' },
  {
    at: d('2025-10-01 10:05'),
    type: 'ResolveIssue',
    issueId: 'iss-vb-q',
    resolution: 'resolved',
    resolvedBy: ['dec-vb-1'],
  },
  {
    at: d('2025-10-14 10:00'),
    key: 'fnd-vb-idpack',
    type: 'WriteFinding',
    kind: 'measurement',
    title: '32-bit visibility ids overflow on the dunes benchmark',
    created_by: TOMASZ,
    derives_from: ['dec-vb-1'],
    body:
      "The prototype's 32-bit id gives 20 bits to the instance and 12 to the triangle. The dunes benchmark draws 1.6 million instances when the tide is out, past the 1,048,576 limit, and the far flats shade with the wrong materials. " +
      'A 64-bit target fixes it and costs 28 MB more at 1440p.',
  },
  {
    at: d('2025-10-20 10:00'),
    key: 'dec-vb-2',
    type: 'WriteDecision',
    title: 'Adopt a visibility buffer with 64-bit instance and triangle ids',
    created_by: TOMASZ,
    supersedes: ['dec-vb-1'],
    derives_from: ['fnd-vb-idpack'],
    body:
      'Same visibility buffer for all opaque geometry, but the id target is 64-bit: 32 bits of instance and 32 of triangle. ' +
      'The extra 28 MB at 1440p fits inside the render-target memory budget. Material resolve is unchanged.',
  },
  { at: d('2025-10-21 10:00'), type: 'AcceptDecision', decisionId: 'dec-vb-2' },
  {
    at: d('2025-11-04 10:00'),
    key: 'fnd-vb-foliage',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Alpha-tested foliage costs 2.1 ms in the visibility buffer',
    created_by: YUSUF,
    derives_from: ['dec-vb-2'],
    body:
      'Dune grass and kelp are alpha-tested. In the visibility buffer the alpha test runs in the raster pass with a texture fetch per pixel, and foliage on the coast benchmark goes from 0.8 ms in forward+ to 2.1 ms. ' +
      'Saltglass cannot live in the buffer at all, because it refracts what is behind it and needs that image first.',
  },
  {
    at: d('2025-11-14 10:00'),
    key: 'dec-vb-3',
    type: 'WriteDecision',
    title:
      'Visibility buffer for opaque geometry; foliage and saltglass stay forward',
    created_by: INES,
    supersedes: ['dec-vb-2'],
    derives_from: ['fnd-vb-foliage'],
    body:
      'A partial step back. Opaque geometry stays in the 64-bit visibility buffer, but alpha-tested foliage and refractive saltglass render in a forward pass after the resolve. ' +
      'That keeps foliage at 0.8 ms and gives saltglass the resolved scene to refract. Ines Okafor accepts carrying two shading paths until foliage has a better answer.',
  },
  { at: d('2025-11-15 10:00'), type: 'AcceptDecision', decisionId: 'dec-vb-3' },
  {
    at: d('2025-11-20 10:00'),
    key: 'rsk-shader-perm',
    type: 'WriteRisk',
    likelihood: 'high',
    severity: 'medium',
    title: 'Visibility buffer material resolve multiplies shader permutations',
    created_by: TOMASZ,
    derives_from: ['dec-vb-3'],
    body:
      'Resolving materials per tile class means one shader per material per tile class. With 310 saltglass and terrain materials and 6 tile classes that is 1,860 resolve shaders on top of the forward ones. ' +
      'Compile times and the shader count both grow past what the build farm handles today.',
  },
  {
    at: d('2025-12-02 10:00'),
    key: 'dec-uber-resolve',
    type: 'WriteDecision',
    title:
      'Resolve materials with one uber shader over bindless material tables',
    created_by: TOMASZ,
    derives_from: ['dec-vb-3', 'rsk-shader-perm'],
    body:
      'Material resolve uses one uber shader per tile class that reads material parameters from bindless material tables, instead of one shader per material. ' +
      'The shader count for resolve drops from 1,860 to 6. Cost on the cliffs benchmark rises 0.2 ms because of branching, which Tomasz Brandt accepts.',
  },
  {
    at: d('2025-12-04 11:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-uber-resolve',
  },
  {
    at: d('2025-12-04 11:05'),
    type: 'MitigateRisk',
    riskId: 'rsk-shader-perm',
    decisionId: 'dec-uber-resolve',
  },
  {
    at: d('2026-01-16 10:00'),
    key: 'fnd-foliage-meshlet',
    type: 'WriteFinding',
    kind: 'measurement',
    title:
      'Meshlet alpha masks bring foliage back into the visibility buffer at 0.7 ms',
    created_by: TOMASZ,
    derives_from: ['dec-meshlet-64', 'fnd-vb-foliage'],
    body:
      'With 64-vertex meshlets each carrying a coarse alpha-coverage mask, the raster pass skips fully transparent meshlets, and the per-pixel alpha test runs on 22 percent of the pixels it ran on before. ' +
      'Coast benchmark foliage costs 0.7 ms in the buffer against 0.8 ms in the forward pass.',
  },
  {
    at: d('2026-01-20 10:00'),
    key: 'dec-vb-4',
    type: 'WriteDecision',
    title:
      'Visibility buffer with compute material resolve; foliage back in the buffer',
    created_by: INES,
    supersedes: ['dec-vb-3'],
    derives_from: ['fnd-foliage-meshlet', 'dec-uber-resolve'],
    body:
      'Foliage moves back into the visibility buffer using meshlet alpha masks, so only saltglass renders forward. Material resolve runs in compute over the bindless material tables. ' +
      'This removes the second shading path for foliage that the previous version carried.',
  },
  { at: d('2026-01-21 10:00'), type: 'AcceptDecision', decisionId: 'dec-vb-4' },
  {
    at: d('2026-04-07 15:00'),
    key: 'blb-skiff-capture',
    type: 'WriteBlob',
    kind: 'json',
    title: 'GPU capture: visibility buffer on Skiff, cliffs benchmark',
    created_by: TOMASZ,
    body: json({
      build: 'lantern-2026.04.06-r6120',
      build_config: 'debug-gpu-validation',
      platform: 'Skiff devkit SKF-0007',
      scene: 'cliffs_bench_02',
      resolution: '1280x720',
      passes_ms: {
        visibility_raster: 2.6,
        material_resolve: 5.0,
        saltglass_forward: 2.1,
        post: 1.5,
      },
      total_vb_ms: 11.2,
      forward_plus_reference_ms: 8.9,
      notes: 'First capture on the new Skiff devkits.',
    }),
  },
  {
    at: d('2026-04-07 15:05'),
    key: 'cit-skiff-capture',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Capture: visibility buffer on Skiff',
    created_by: TOMASZ,
    blob: 'blb-skiff-capture',
    body: 'https://captures.tidewater.example/lantern/r6120/skiff_cliffs',
  },
  {
    at: d('2026-04-08 10:00'),
    key: 'fnd-skiff-vb-cost',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Visibility buffer costs 11.2 ms on Skiff',
    created_by: TOMASZ,
    derives_from: ['dec-vb-4'],
    cites: ['cit-skiff-capture'],
    body:
      "First Skiff devkit capture of the cliffs benchmark at 720p: the visibility buffer path costs 11.2 ms, against forward+'s 8.9 ms. Material resolve alone is 5.0 ms. " +
      "Skiff's memory bandwidth looks like the limit, since every resolve fetch goes through the bindless material tables.",
  },
  {
    at: d('2026-04-09 10:00'),
    key: 'rsk-vb-skiff',
    type: 'WriteRisk',
    likelihood: 'medium',
    severity: 'high',
    title: 'Visibility buffer bandwidth is too high for Skiff',
    created_by: TOMASZ,
    derives_from: ['fnd-skiff-vb-cost'],
    body: 'If the visibility buffer stays 2.3 ms slower than forward+ on Skiff, the Skiff port cannot hold its frame rate with saltglass on screen. Skiff becomes a launch platform at beta, so this cannot wait.',
  },
  {
    at: d('2026-04-15 10:00'),
    key: 'dec-vb-5',
    type: 'WriteDecision',
    title: 'Visibility buffer on PC and Meridian; forward+ fallback on Skiff',
    created_by: INES,
    supersedes: ['dec-vb-4'],
    derives_from: ['fnd-skiff-vb-cost', 'con-mesh-skiff'],
    body:
      'PC and Meridian keep the visibility buffer as before. Skiff goes back to clustered forward+ for opaque geometry, because the visibility buffer costs 11.2 ms there against 8.9 ms. ' +
      'This reverses part of the original move and means two opaque paths to maintain until release. Dara Whitlock agreed to the extra maintenance.',
  },
  { at: d('2026-04-16 10:00'), type: 'AcceptDecision', decisionId: 'dec-vb-5' },
  {
    at: d('2026-04-16 10:05'),
    type: 'MitigateRisk',
    riskId: 'rsk-vb-skiff',
    decisionId: 'dec-vb-5',
  },
  {
    at: d('2026-06-22 10:00'),
    key: 'fnd-skiff-vb-recapture',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Visibility buffer costs 7.4 ms on Skiff in a release build',
    created_by: TOMASZ,
    invalidates: ['fnd-skiff-vb-cost'],
    body:
      'The April Skiff capture ran with GPU validation on, which roughly doubles the cost of every bindless fetch. In a release build the cliffs benchmark visibility buffer path costs 7.4 ms against forward+ at 8.1 ms, at 720p. ' +
      'With material resolve at half rate the visibility buffer path is 6.3 ms. The April number should not have driven a Decision.',
  },
  {
    at: d('2026-07-08 10:00'),
    key: 'dec-vb-6',
    type: 'WriteDecision',
    title:
      'Visibility buffer on all platforms; Skiff resolves materials at half rate',
    created_by: INES,
    supersedes: ['dec-vb-5'],
    derives_from: ['fnd-skiff-vb-recapture'],
    body:
      'Skiff returns to the visibility buffer. The release-build capture puts it at 7.4 ms against 8.1 ms for forward+, and at 6.3 ms with material resolve at half rate, so the forward+ fallback is no longer worth keeping.\n\n' +
      'On Skiff, material resolve shades every other pixel in a checkerboard and Tern fills the gaps from history. PC and Meridian resolve at full rate. ' +
      'Saltglass still renders in a forward pass after the resolve on every platform, because refraction needs the resolved scene behind it. ' +
      'The ports team has signed off on the half-rate look on the handheld screen; Yusuf Demir saw no difference on foliage and a slight softening on cliff detail.\n\n' +
      'Keeping two opaque paths cost one engineer-week a month in fixes. The Skiff forward+ path will be deleted from the codebase on 2026-07-24, after one week of nightly captures confirm the half-rate numbers.',
  },
  { at: d('2026-07-10 10:00'), type: 'AcceptDecision', decisionId: 'dec-vb-6' },
];
