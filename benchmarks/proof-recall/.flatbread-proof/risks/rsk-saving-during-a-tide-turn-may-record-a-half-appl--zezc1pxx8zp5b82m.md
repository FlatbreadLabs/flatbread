---
id: rsk-saving-during-a-tide-turn-may-record-a-half-appl--zezc1pxx8zp5b82m
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Saving during a tide turn may record a half-applied tide
state: realized
created_at: '2026-04-28T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8
evidence:
  - fnd-3-of-200-saves-taken-mid-turn-fail-to-load--4j1kafsdeq0wedhf
likelihood: medium
severity: high
---
The tide applies terrain changes over several frames during a turn. An autosave in that window could record deltas against terrain that is half old and half new.
