// Tonemapping from stock filmic to the Brine curve; Meridian HDR certification.
// The Brine curve and the certification Risk both move after the last compaction.
import { d, json, INES, TOMASZ, YUSUF, PRIYA, DARA } from './people.mjs';

export default [
  {
    at: d('2025-10-07 10:00'),
    key: 'iss-tonemap-q',
    type: 'WriteIssue',
    kind: 'question',
    title: 'Which tonemapping curve should Lantern use?',
    created_by: YUSUF,
    body:
      'Saltglass caustics are the brightest thing on screen, often 30 times brighter than the sand around them. The tonemapping curve decides whether they read as light or as white blobs. ' +
      'Options: a stock filmic curve, or a neutral curve with all the look in grading LUTs.',
  },
  {
    at: d('2025-10-09 14:00'),
    key: 'dec-filmic',
    type: 'WriteDecision',
    title: 'Use the stock filmic tonemapping curve',
    created_by: TOMASZ,
    derives_from: ['iss-tonemap-q'],
    body: 'Use the stock filmic curve that Kestrel already ships. Artists know it, and it rolls off highlights softly in SDR.',
  },
  {
    at: d('2025-10-09 15:00'),
    key: 'dec-neutral',
    type: 'WriteDecision',
    title: 'Use a neutral curve and grade everything in LUTs',
    created_by: YUSUF,
    derives_from: ['iss-tonemap-q'],
    body: 'Use a near-linear neutral curve and put all of the look into per-biome grading LUTs. Most control for art, most work for art.',
  },
  {
    at: d('2025-10-20 16:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-filmic',
  },
  {
    at: d('2025-10-20 16:05'),
    type: 'ResolveIssue',
    issueId: 'iss-tonemap-q',
    resolution: 'resolved',
    resolvedBy: ['dec-filmic'],
  },
  {
    at: d('2025-10-22 10:00'),
    key: 'con-ui-nits',
    type: 'WriteConstraint',
    kind: 'soft',
    title: 'UI composites at a fixed 203 nits in HDR',
    created_by: YUSUF,
    body: 'In HDR output the HUD and menus composite at a fixed 203 nits so text looks the same on every display. UI art is authored against that level.',
  },
  {
    at: d('2025-11-18 10:00'),
    key: 'con-hdr-cert',
    type: 'WriteConstraint',
    kind: 'hard',
    title: 'Meridian HDR certification requirements',
    created_by: PRIYA,
    body:
      'Meridian certification runs an HDR test pass on every submission, and a failure blocks release. Priya Natarajan summarized the parts that touch Lantern. ' +
      'The game must read the display peak luminance from the system calibration and never exceed it, so a curve that assumes a fixed peak fails on dimmer panels. ' +
      'The 10,000-nit test ramp must not clip below the calibrated peak. The game must start in HDR when the system is in HDR, without asking. ' +
      'The user must be able to choose paper white anywhere from 80 to 400 nits, and the game must start from the system paper-white value on first boot.\n\n' +
      'Black level must follow the system setting as well; crushing the bottom 1 percent of the ramp is a failure. ' +
      'The test also checks that SDR and HDR screenshots match in content, so the HDR path cannot hide or add effects.\n\n' +
      'A title may fail the HDR pass at most twice per release candidate; a third failure sends the whole submission back for a full re-review.',
  },
  {
    at: d('2025-12-08 10:00'),
    key: 'dec-hdr-fixed-pw',
    type: 'WriteDecision',
    title: 'Hard-code HDR paper white at 200 nits on Meridian',
    created_by: TOMASZ,
    derives_from: ['con-ui-nits'],
    body: 'Set paper white to a fixed 200 nits on Meridian, close to the 203-nit UI level, and skip the system setting for now. One less setting to test before the slice.',
  },
  {
    at: d('2025-12-09 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-hdr-fixed-pw',
  },
  {
    at: d('2026-01-15 15:00'),
    key: 'blb-highlight',
    type: 'WriteBlob',
    kind: 'json',
    title: 'Highlight histogram: caustic pixels under the stock filmic curve',
    created_by: YUSUF,
    body: json({
      build: 'lantern-2026.01.14-r5650',
      scene: 'dunes_noon',
      curve: 'kestrel_filmic_v2',
      caustic_pixels: 182000,
      clipped_caustic_pixels: 69160,
      clipped_pct: 38,
      white_point_nits_equiv: 11.2,
    }),
  },
  {
    at: d('2026-01-15 15:05'),
    key: 'cit-highlight',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Histogram: caustic highlights under filmic',
    created_by: YUSUF,
    blob: 'blb-highlight',
    body: 'https://captures.tidewater.example/lantern/r5650/filmic_highlights',
  },
  {
    at: d('2026-01-16 10:00'),
    key: 'fnd-filmic-clip',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Stock filmic curve clips 38 percent of caustic highlights',
    created_by: YUSUF,
    invalidates: ['dec-filmic'],
    cites: ['cit-highlight'],
    body:
      'On the dunes at noon, 38 percent of caustic pixels hit the top of the stock filmic curve and turn flat white. The caustic pattern, which is the whole point of the effect, disappears where it is brightest. ' +
      'The curve was the wrong choice for saltglass from the start; its shoulder was tuned for skies, not for small, very bright sources.',
  },
  {
    at: d('2026-01-30 10:00'),
    key: 'dec-brine-1',
    type: 'WriteDecision',
    title: 'Use the custom Brine curve for tonemapping',
    created_by: YUSUF,
    supersedes: ['dec-filmic'],
    derives_from: ['fnd-filmic-clip'],
    body:
      'Replace the stock filmic curve with the Brine curve: a custom curve with a long, slow shoulder that keeps caustic detail up to 40 times scene mid-grey. ' +
      'Yusuf Demir tuned it on the dunes at noon and at dusk. The SDR and HDR outputs share the curve below the shoulder.',
  },
  {
    at: d('2026-02-02 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-brine-1',
  },
  {
    at: d('2026-02-03 10:00'),
    key: 'rsk-brine-match',
    type: 'WriteRisk',
    likelihood: 'medium',
    severity: 'low',
    title: 'Artists cannot match concept paintings under the Brine curve',
    created_by: YUSUF,
    derives_from: ['dec-brine-1'],
    body: 'The concept paintings were made against the stock filmic look. Under the Brine curve some key shots may never match them.',
  },
  {
    at: d('2026-03-18 10:00'),
    key: 'iss-hdr-banding',
    type: 'WriteIssue',
    kind: 'defect',
    title: 'Banding in the dusk sky with the Brine curve on 10-bit output',
    created_by: YUSUF,
    derives_from: ['dec-brine-1'],
    body: "In HDR on 10-bit output, the dusk sky shows visible bands where the Brine curve's shoulder is steepest. SDR is fine. Dithering hides some of it.",
  },
  {
    at: d('2026-03-31 10:00'),
    key: 'fnd-brine-review',
    type: 'WriteFinding',
    kind: 'survey',
    title:
      'Concept match review: 11 of 14 key shots pass under the Brine curve',
    created_by: DARA,
    derives_from: ['rsk-brine-match'],
    body:
      'The art review compared 14 key shots against the concept paintings. 11 pass. The three that fail are night harbor shots, and art direction chose to repaint the concepts rather than bend the curve. ' +
      'Dara Whitlock accepted the remaining gap.',
  },
  {
    at: d('2026-04-01 10:00'),
    type: 'SetRiskState',
    riskId: 'rsk-brine-match',
    state: 'accepted',
    evidence: ['fnd-brine-review'],
  },
  {
    at: d('2026-05-06 10:00'),
    key: 'dec-brine-2',
    type: 'WriteDecision',
    title: 'Brine curve with a separate HDR shoulder at 1,000 nits',
    created_by: YUSUF,
    supersedes: ['dec-brine-1'],
    derives_from: ['iss-hdr-banding'],
    body: 'Split the Brine curve: SDR keeps the original shoulder, HDR gets its own gentler shoulder starting at 1,000 nits. The gentler slope removes the dusk banding on 10-bit output without dithering.',
  },
  {
    at: d('2026-05-07 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-brine-2',
  },
  {
    at: d('2026-05-08 10:00'),
    type: 'ResolveIssue',
    issueId: 'iss-hdr-banding',
    resolution: 'resolved',
    resolvedBy: ['dec-brine-2'],
  },
  {
    at: d('2026-07-14 15:00'),
    key: 'blb-hdr-precheck',
    type: 'WriteBlob',
    kind: 'markdown',
    title: 'Meridian HDR certification pre-check report, July',
    created_by: PRIYA,
    body:
      '# HDR pre-check, build lantern-2026.07.13-r7400\n\n' +
      '| Test | Name | Result |\n| --- | --- | --- |\n' +
      '| HDR-01 | Starts in HDR when system is HDR | PASS |\n' +
      '| HDR-03 | Peak luminance follows calibration | PASS |\n' +
      '| HDR-05 | Test ramp does not clip below peak | PASS |\n' +
      '| HDR-07 | Paper white follows system setting and range | FAIL |\n' +
      '| HDR-09 | SDR and HDR content match | PASS |\n\n' +
      'HDR-07 note: paper white stayed at 200 nits for system values of 100 and 350. No in-game control found.',
  },
  {
    at: d('2026-07-14 15:05'),
    key: 'cit-hdr-precheck',
    type: 'WriteCitation',
    role: 'evidence',
    title: 'Report: Meridian HDR pre-check, July',
    created_by: PRIYA,
    blob: 'blb-hdr-precheck',
    body: 'https://cert.tidewater.example/meridian/precheck/r7400',
  },
  {
    at: d('2026-07-15 10:00'),
    key: 'fnd-hdr-precheck',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Meridian HDR certification pre-check failed on paper white',
    created_by: PRIYA,
    invalidates: ['dec-hdr-fixed-pw'],
    cites: ['cit-hdr-precheck'],
    body:
      'The July pre-check failed one test: paper white ignores the system setting and offers no user range. The hard-coded 200 nits was never allowed by the certification requirements. ' +
      'Every other HDR test passed. The report is attached.',
  },
  {
    at: d('2026-07-16 10:00'),
    key: 'iss-hdr-cert',
    type: 'WriteIssue',
    kind: 'blocker',
    title: 'Meridian HDR certification fails the paper-white test',
    created_by: PRIYA,
    derives_from: ['fnd-hdr-precheck', 'con-hdr-cert'],
    body: 'Release on Meridian is blocked until paper white follows the system and offers the required range. The UI pass assumes a fixed level, so the fix touches UI compositing as well as tonemapping.',
  },
  {
    at: d('2026-07-17 10:00'),
    key: 'rsk-hdr-cert',
    type: 'WriteRisk',
    likelihood: 'medium',
    severity: 'high',
    title: 'HDR certification slips the release candidate',
    created_by: DARA,
    derives_from: ['iss-hdr-cert'],
    body: 'Each certification resubmission takes about ten days. If the paper-white fix fails a second time, the Meridian release candidate on 2026-09-30 slips.',
  },
  {
    at: d('2026-07-20 10:00'),
    key: 'dec-hdr-pw-system',
    type: 'WriteDecision',
    title:
      'Read paper white from the Meridian system setting and scale the UI with it',
    created_by: PRIYA,
    derives_from: ['iss-hdr-cert'],
    body: 'On first boot, read paper white from the Meridian system setting. Composite the UI at that level instead of a fixed 203 nits. Smallest change that passes the system half of the test.',
  },
  {
    at: d('2026-07-21 10:00'),
    key: 'dec-hdr-pw-slider',
    type: 'WriteDecision',
    title: 'Add an in-game paper-white slider from 80 to 400 nits',
    created_by: YUSUF,
    derives_from: ['iss-hdr-cert'],
    body: 'Add a paper-white slider to the display menu, from 80 to 400 nits, starting at the system value. Covers the range half of the test. UI art needs checking at both ends.',
  },
  {
    at: d('2026-09-07 10:00'),
    key: 'fnd-shoulder-clip',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Brine HDR shoulder clips caustics on 800-nit panels',
    created_by: PRIYA,
    derives_from: ['dec-brine-2', 'con-hdr-cert'],
    body: 'On panels calibrated to 800 nits, the HDR shoulder starting at 1,000 nits never begins before the panel peak, so caustics clip hard at 800. The certification lab uses an 800-nit panel for the ramp test.',
  },
  {
    at: d('2026-09-08 10:00'),
    key: 'dec-brine-3',
    type: 'WriteDecision',
    title: 'Brine curve with an HDR shoulder at 800 nits',
    created_by: YUSUF,
    supersedes: ['dec-brine-2'],
    derives_from: ['fnd-shoulder-clip'],
    body: 'Move the Brine HDR shoulder down to start at 800 nits, and scale it to the calibrated peak on brighter panels. Dusk banding stays fixed at the new slope.',
  },
  {
    at: d('2026-09-09 10:00'),
    type: 'AcceptDecision',
    decisionId: 'dec-brine-3',
  },
  {
    at: d('2026-09-14 10:00'),
    key: 'fnd-hdr-precheck-2',
    type: 'WriteFinding',
    kind: 'measurement',
    title: 'Meridian HDR certification pre-check failed again on paper white',
    created_by: PRIYA,
    derives_from: ['iss-hdr-cert'],
    body:
      'The second pre-check, on 2026-09-12, failed the paper-white test again. Neither proposed fix was merged in time, so the build still used a fixed paper white. ' +
      'The next submission window opens on 2026-09-24.',
  },
  {
    at: d('2026-09-15 10:00'),
    type: 'SetRiskState',
    riskId: 'rsk-hdr-cert',
    state: 'realized',
    evidence: ['fnd-hdr-precheck-2'],
  },
];
