---
id: blb-meridian-hdr-certification-pre-check-report-july--6r648dzqhh44mkq7
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'Meridian HDR certification pre-check report, July'
kind: markdown
created_at: '2026-07-14T15:00:00Z'
created_by: Priya Natarajan
---
# HDR pre-check, build lantern-2026.07.13-r7400

| Test | Name | Result |
| --- | --- | --- |
| HDR-01 | Starts in HDR when system is HDR | PASS |
| HDR-03 | Peak luminance follows calibration | PASS |
| HDR-05 | Test ramp does not clip below peak | PASS |
| HDR-07 | Paper white follows system setting and range | FAIL |
| HDR-09 | SDR and HDR content match | PASS |

HDR-07 note: paper white stayed at 200 nits for system values of 100 and 350. No in-game control found.
