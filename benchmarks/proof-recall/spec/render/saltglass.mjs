// Saltglass refraction and caustics: screen-space refraction shown wrong and
// replaced by a hybrid; caustic flicker under Tern stays an open blocker.
import { d, json, INES, TOMASZ, YUSUF, DARA } from './people.mjs';

export default [
  {
    at: d('2025-09-18 10:00'),
    key: 'iss-refr-q',
    type: 'WriteIssue',
    kind: 'question',
    title: 'How should Lantern render saltglass refraction?',
    created_by: YUSUF,
    body:
      'Saltglass is the signature look of Saltglass Reach. Dunes, cliffs and ruins bend whatever is behind them, out to 2 km. ' +
      'Options: screen-space refraction, ray-marching through the saltglass distance field, or refracting into local cubemaps.',
  },
  {
    at: d('2025-10-02 10:00'),
    key: 'fnd-refr-cost',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Refraction cost: screen-space 0.9 ms, ray-marched 3.4 ms',
    created_by: TOMASZ,
    derives_from: ['iss-refr-q'],
    body:
      'On the cliffs benchmark with saltglass covering 40 percent of the screen, screen-space refraction costs 0.9 ms and a 64-step ray march through the distance field costs 3.4 ms. ' +
      'Local cubemaps cost 0.5 ms but show the wrong place behind the glass whenever the camera moves away from the capture point.',
  },
  {
    at: d('2025-10-03 10:00'),
    key: 'dec-refr-ss',
    type: 'WriteDecision',
    title: 'Use screen-space refraction for saltglass',
    created_by: TOMASZ,
    derives_from: ['iss-refr-q', 'fnd-refr-cost'],
    body: 'Offset the scene-color lookup by the refracted view ray, in screen space. At 0.9 ms it is the cheapest option that shows the right thing behind the glass most of the time.',
  },
  {
    at: d('2025-10-03 11:00'),
    key: 'dec-refr-rm',
    type: 'WriteDecision',
    title: 'Ray-march refraction through the saltglass distance field',
    created_by: YUSUF,
    derives_from: ['iss-refr-q'],
    body: 'March the refracted ray through the distance field up to 64 steps and shade the hit. Correct even when the refracted point is off screen. Costs 3.4 ms.',
  },
  {
    at: d('2025-10-03 12:00'),
    key: 'dec-refr-cube',
    type: 'WriteDecision',
    title: 'Refract into local cubemaps',
    created_by: INES,
    derives_from: ['iss-refr-q'],
    body: 'Capture cubemaps every 50 m along the coast and refract into the nearest one. Cheapest at 0.5 ms, but parallax is wrong and tides make the captures stale every 40 minutes.',
  },
  {
    at: d('2025-10-06 11:00'),
    key: 'iss-caustics-q',
    type: 'WriteIssue',
    kind: 'question',
    title: 'How should Lantern draw saltglass caustics?',
    created_by: YUSUF,
    body: 'Sunlight through saltglass dunes should throw moving caustic patterns on the sand below. Options: project animated caustic textures along the sun, or splat photons traced through the glass.',
  },
  {
    at: d('2025-10-10 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-refr-ss',
  },
  {
    at: d('2025-10-10 10:05'),
    type: 'ResolveIssue',
    issueId: 'iss-refr-q',
    resolution: 'resolved',
    resolvedBy: ['dec-refr-ss'],
  },
  {
    at: d('2025-10-14 15:00'),
    key: 'fnd-caustic-proto',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Photon caustics cost 1.1 ms from a 512 by 512 sun-space map',
    created_by: TOMASZ,
    derives_from: ['iss-caustics-q'],
    body: 'Tracing one photon per texel of a 512 by 512 sun-space map through the saltglass and splatting the hits costs 1.1 ms on Meridian. Projected textures cost 0.2 ms but do not follow the shape of the glass.',
  },
  {
    at: d('2025-10-15 14:00'),
    key: 'dec-caustics-proj',
    type: 'WriteDecision',
    title: 'Project animated caustic textures along the sun direction',
    created_by: YUSUF,
    derives_from: ['iss-caustics-q'],
    body: 'Project a tiling animated caustic texture along the sun direction under any saltglass. Costs 0.2 ms. Artists control the look directly.',
  },
  {
    at: d('2025-10-15 15:00'),
    key: 'dec-caustics-photon',
    type: 'WriteDecision',
    title: 'Splat caustic photons from a sun-space map',
    created_by: TOMASZ,
    derives_from: ['iss-caustics-q', 'fnd-caustic-proto'],
    body: 'Trace photons from a 512 by 512 sun-space map through the saltglass, jitter them each frame, and splat the hits into a caustic buffer that lighting reads. The pattern follows the real glass shape. Costs 1.1 ms.',
  },
  {
    at: d('2025-10-24 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-caustics-photon',
  },
  {
    at: d('2025-10-24 10:05'),
    type: 'ResolveIssue',
    issueId: 'iss-caustics-q',
    resolution: 'resolved',
    resolvedBy: ['dec-caustics-photon'],
  },
  {
    at: d('2025-11-26 10:00'),
    key: 'fnd-refr-halo',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Screen-space refraction halos around the player',
    created_by: YUSUF,
    derives_from: ['dec-refr-ss'],
    body: 'When the player stands in front of saltglass, the refraction samples the player instead of what is behind the glass, leaving a bright halo two to six pixels wide around the silhouette. A depth test on the offset sample removes most of it.',
  },
  {
    at: d('2025-12-04 14:00'),
    key: 'fnd-refr-offscreen',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Screen-space refraction loses off-screen content at grazing angles',
    created_by: YUSUF,
    invalidates: ['dec-refr-ss'],
    body:
      'Looking along the dunes at grazing angles, 30 to 45 percent of refracted rays leave the screen, and those pixels show smeared edge color. ' +
      'This is the common view in the game, not a corner case. Screen-space refraction cannot be the answer for saltglass on its own; the vertical slice will ship with the artifact.',
  },
  {
    at: d('2025-12-09 10:00'),
    key: 'fnd-caustic-proj-tiling',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Projected caustic textures tile visibly past 600 m',
    created_by: YUSUF,
    invalidates: ['dec-caustics-proj'],
    body:
      'Yusuf Demir kept the projected caustic textures alive as a possible Skiff fallback and tested them on the far dunes. Past 600 m the texture repeat is obvious on every dune face. ' +
      'The projected option is wrong for saltglass at any distance the game shows.',
  },
  {
    at: d('2026-01-08 10:00'),
    key: 'dec-refr-hybrid',
    type: 'WriteDecision',
    title:
      'Screen-space refraction with a ray-marched fallback for off-screen rays',
    created_by: TOMASZ,
    supersedes: ['dec-refr-ss'],
    derives_from: ['fnd-refr-offscreen', 'fnd-refr-cost'],
    body:
      'Refraction first tries the screen-space lookup. When the refracted ray leaves the screen, or the depth test from the halo fix rejects the sample, the pixel falls back to a ray march through the saltglass distance field. ' +
      'On the dunes at grazing angles about 40 percent of saltglass pixels take the fallback, and the total refraction cost is 1.8 ms on Meridian, against 0.9 ms for screen-space alone and 3.4 ms for marching everything.\n\n' +
      'The halo fix stays in. Ray-marching every pixel, the option rejected in October, is still too expensive; this Decision uses the march only where screen space has nothing to show. ' +
      'Past 2 km the fallback samples the sky cubemap instead of marching.\n\n' +
      'The fallback march is capped at 32 steps, half of the 64 steps the October cost Finding measured.',
  },
  {
    at: d('2026-01-09 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-refr-hybrid',
  },
  {
    at: d('2026-01-22 15:00'),
    key: 'blb-caustic-trace',
    type: 'WriteBlob',
    kind: 'json',
    title: 'Luminance trace: caustics under Tern, dunes at noon',
    created_by: YUSUF,
    body: json({
      build: 'lantern-2026.01.21-r5720',
      platform: 'Meridian devkit',
      scene: 'dunes_noon',
      internal_resolution: '1280x720',
      output_resolution: '2560x1440',
      frames: 600,
      peak_flicker_hz: 4.7,
      flicker_band_hz: [3, 6],
      max_luma_delta: 0.31,
      pixels_over_threshold_pct: 6.2,
    }),
  },
  {
    at: d('2026-01-22 15:05'),
    key: 'cit-caustic-trace',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Trace: caustic luminance under Tern',
    created_by: YUSUF,
    blob: 'blb-caustic-trace',
    body: 'https://captures.tidewater.example/lantern/r5720/caustic_flicker',
  },
  {
    at: d('2026-01-23 10:00'),
    key: 'fnd-caustic-flicker',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Caustics flicker at 3 to 6 Hz under Tern',
    created_by: YUSUF,
    derives_from: ['dec-caustics-photon', 'dec-tern'],
    cites: ['cit-caustic-trace'],
    body:
      'Photon jitter changes the caustic pattern every frame. At 720p internal resolution Tern cannot tell new caustic detail from noise, clamps it away on some frames and keeps it on others, and the sand under the dunes flickers at 3 to 6 Hz. ' +
      'Full trace attached. At native resolution there is no visible flicker.',
  },
  {
    at: d('2026-01-26 10:00'),
    key: 'iss-caustic-flicker',
    type: 'WriteIssue',
    kind: 'blocker',
    title: 'Caustics flicker under Tern at low internal resolution',
    created_by: INES,
    derives_from: ['fnd-caustic-flicker'],
    body:
      'Flicker in the 3 to 6 Hz band is a photosensitivity problem as well as an ugly one. Release cannot happen with it. ' +
      'Any fix must keep the caustics moving with the tide and must work at the internal resolutions Tern uses on every platform.',
  },
  {
    at: d('2026-01-26 10:02'),
    key: 'iss-caustic-flicker-dup',
    type: 'WriteIssue',
    kind: 'blocker',
    title: 'Caustics flicker under Tern at low internal resolutions',
    created_by: INES,
    body: 'Caustics flicker under Tern at low internal resolution. Blocker for release.',
  },
  {
    at: d('2026-01-27 10:00'),
    type: 'Retract',
    recordId: 'iss-caustic-flicker-dup',
    reason: 'Duplicate of the blocker filed two minutes earlier.',
  },
  {
    at: d('2026-01-27 11:00'),
    key: 'rsk-caustic-flicker',
    type: 'WriteRisk',
    likelihood: 'medium',
    severity: 'high',
    title: 'Caustic flicker fails photosensitivity review',
    created_by: DARA,
    derives_from: ['iss-caustic-flicker'],
    body: 'Platform photosensitivity review rejects flashing between 3 and 30 Hz over large areas. If the caustic flicker survives to submission, both consoles can fail review.',
  },
  {
    at: d('2026-02-12 10:00'),
    key: 'dec-caustic-clamp',
    type: 'WriteDecision',
    title: "Exclude caustic luminance from Tern's history clamp",
    created_by: TOMASZ,
    derives_from: ['iss-caustic-flicker'],
    body: 'Write caustic light to a separate buffer that Tern accumulates without neighborhood clamping, then add it back after upscaling. Tern then averages the jitter instead of fighting it.',
  },
  {
    at: d('2026-03-03 10:00'),
    key: 'dec-caustic-seed',
    type: 'WriteDecision',
    title: 'Lock caustic photon jitter to the tide phase',
    created_by: YUSUF,
    derives_from: ['iss-caustic-flicker'],
    body: 'Seed the photon jitter from the tide phase instead of the frame number, so the pattern changes only as the water moves. Tern then sees a stable pattern between tide steps.',
  },
  {
    at: d('2026-05-20 10:00'),
    key: 'fnd-caustic-seed-test',
    type: 'WriteFinding',
    kind: 'measurement',
    title:
      'Tide-locked jitter halves caustic flicker but stalls caustic motion',
    created_by: YUSUF,
    derives_from: ['dec-caustic-seed'],
    body:
      'Yusuf Demir built the tide-locked seed on the r6600 branch and ran the dunes noon trace again. Peak flicker energy in the 3 to 6 Hz band drops by about half. ' +
      'It does not go away, because Tern still sees sub-pixel photon positions change between tide steps.\n\n' +
      'The bigger problem is motion. Caustics are supposed to crawl with the water, and the tide only moves the pattern when the phase advances. ' +
      'Around slack water the phase barely moves, so the caustics stand still while the water surface keeps rippling. Reviewers in the art meeting called it frozen. ' +
      'Yusuf Demir tried adding a slow drift on top of the tide seed, and the flicker came straight back.\n\n' +
      'Around slack tide the caustic pattern freezes for about 4 minutes of each 40-minute cycle.',
  },
  {
    at: d('2026-08-12 10:00'),
    key: 'fnd-caustic-clamp-test',
    type: 'WriteFinding',
    kind: 'measurement',
    title:
      'Clamp exclusion removes caustic flicker but ghosts caustics for 9 frames',
    created_by: TOMASZ,
    derives_from: ['dec-caustic-clamp'],
    body:
      'With caustic light outside the history clamp, the 3 to 6 Hz flicker is gone in the dunes noon trace. But when a cliff shadow or the player crosses the caustics, the old pattern lingers for 9 frames. ' +
      'Tomasz Brandt thinks a reactive mask could fix it, as it did for refraction; nobody has tried yet.',
  },
];
