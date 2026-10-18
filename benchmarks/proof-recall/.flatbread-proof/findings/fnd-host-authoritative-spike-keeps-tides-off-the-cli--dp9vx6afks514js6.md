---
id: fnd-host-authoritative-spike-keeps-tides-off-the-cli--dp9vx6afks514js6
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Host-authoritative spike keeps tides off the client CPU
kind: measurement
created_at: '2026-03-31T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - con-co-op-peers-must-agree-on-tide-state-bit-for-bit--4v0sdbc3t4ywzr3g
  - fnd-re-running-tides-every-rollback-frame-costs-4-8--tp4gxe8prh0bh9h4
---
Marta Lindqvist built a two-day host-authoritative spike on Shoal-01 with one PC host and one Skiff client. The Skiff client never runs the tide step, so its simulation cost fell from 7.7 ms to 1.4 ms per frame. At 150 ms round trip the client sees tide edges correct by up to half a cell; Marta Lindqvist thinks blending can hide it.
