---
id: fnd-3-of-200-saves-taken-mid-turn-fail-to-load--4j1kafsdeq0wedhf
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 3 of 200 saves taken mid-turn fail to load
kind: measurement
created_at: '2026-05-05T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - rsk-saving-during-a-tide-turn-may-record-a-half-appl--zezc1pxx8zp5b82m
---
QA forced 200 autosaves during tide turns. Three fail to load: the terrain solver rejects a delta whose height lies between the old and new tide surfaces.
