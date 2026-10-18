---
id: fnd-re-running-tides-every-rollback-frame-costs-4-8--tp4gxe8prh0bh9h4
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Re-running tides every rollback frame costs 4.8 ms on Skiff
kind: measurement
created_at: '2026-03-19T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - iss-rollback-has-not-been-profiled-on-skiff-with-tid--34pra8d0kj2x92dg
  - rsk-re-simulation-cost-could-blow-the-skiff-frame-bu--sk2njsp170a3qwyf
invalidates:
  - fnd-rollback-re-simulates-a-4-frame-window-in-1-1-ms--xa30a1cez2brphyf
cites:
  - cit-skiff-rollback-profile-capture--qhbe4rs9ax0h3z3d
---
With tides in the snapshot, every rolled-back frame must re-run the tide step. One 32.32 fixed-point tide step costs 0.8 ms on Skiff, so a full 6-frame rollback re-runs tides for 4.8 ms, before physics and Gull. Rollbacks happen on most frames at Wi-Fi latency. Against the 25 ms Skiff frame at 40 Hz that is far too much. The 1.1 ms PC figure was measured with tides frozen and does not describe the real cost.
