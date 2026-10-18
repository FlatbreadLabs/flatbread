---
id: dec-abandon-rollback-netcode-for-co-op--46envrg0v4pdwv7b
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Abandon rollback netcode for co-op
state: accepted
created_at: '2026-04-01T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - con-co-op-peers-must-agree-on-tide-state-bit-for-bit--4v0sdbc3t4ywzr3g
  - fnd-quarter-resolution-tide-re-simulation-desyncs-pe--064cvn1d3t35bnra
  - fnd-re-running-tides-every-rollback-frame-costs-4-8--tp4gxe8prh0bh9h4
supersedes:
  - dec-prototype-rollback-netcode-for-co-op--2tx2s2p3sfbwj8x4
---
We stop the rollback prototype. Co-op will not ship with rollback.

The reason is the tides. The world Effort's Decision "Run the tide simulation in 32.32 fixed point" keeps tides deterministic, and co-op needs that. But rollback must re-run tides every frame it rolls back, which costs 4.8 ms on Skiff. That is a fifth of the 25 ms frame before physics, Gull and rendering.

What we tried before giving up:
- Shrinking the window: below 6 frames, p95 Skiff Wi-Fi stalls.
- Re-simulating tides at quarter resolution: desynced within 90 seconds.
- Leaving tides out of the snapshot: breaks the bit-for-bit tide Constraint.

The checksum tooling and the 1-frame input delay result carry over to whatever replaces rollback.
The rollback code is archived on branch netcode/rollback-archive and will not be maintained.
