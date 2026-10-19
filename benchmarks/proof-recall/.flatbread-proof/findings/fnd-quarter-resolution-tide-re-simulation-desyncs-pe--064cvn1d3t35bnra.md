---
id: fnd-quarter-resolution-tide-re-simulation-desyncs-pe--064cvn1d3t35bnra
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Quarter-resolution tide re-simulation desyncs peers within 90 seconds
kind: measurement
created_at: '2026-03-27T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - con-co-op-peers-must-agree-on-tide-state-bit-for-bit--4v0sdbc3t4ywzr3g
  - dec-re-simulate-tides-at-quarter-resolution-during-r--7ah25p0r0xt9719f
---
In the quarter-resolution prototype the tide checksum diverged between peers within 90 seconds in all 10 runs. The correction step rounds differently depending on how many frames were rolled back.
