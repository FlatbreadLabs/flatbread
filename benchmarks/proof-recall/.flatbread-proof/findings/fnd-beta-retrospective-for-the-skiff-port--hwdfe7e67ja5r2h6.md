---
id: fnd-beta-retrospective-for-the-skiff-port--hwdfe7e67ja5r2h6
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Beta retrospective for the Skiff port
kind: retrospective
created_at: '2026-06-22T15:00:00Z'
created_by: Priya Natarajan
derives_from:
  - fnd-kelp-high-ratio-textures-bring-the-skiff-harbor--rnzeng8fj363pr75
  - fnd-skiff-firmware-1-2-rejects-pipeline-blobs-built--pernvgb2he7m3z3y
  - fnd-skiff-microsd-slows-sharply-on-full-warm-cards--p1rgh36hat2egpz3
---
What went well: the Kelp high-ratio switch took one week end to end and saved 900 MB, just as predicted. The 40 Hz mode cost less than feared because dynamic resolution already existed. The cert pre-check caught both failures early enough to fix them before beta.

What went badly: twice we trusted a test that ran on a better setup than players have. The December pipeline blob test ran on the same firmware the blobs were built for. The March storage test ran on new, empty cards on a cold Skiff. Both looked fine and both were wrong.

We also sized memory against the 9 GB figure for four months after the platform holder had hinted at a bigger system reserve. Priya Natarajan now checks the SDK release notes every Monday.

Cost: the wrong pipeline choice cost 6 weeks of schedule: the beta slipped 6 weeks past its planned date while the team rebuilt pipelines as an on-device cache. Rule from here: run every platform test on retail firmware and on the worst hardware a player can buy.
