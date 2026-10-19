---
id: con-frame-budget--j6vneva1g2ywj86m
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Frame budget
kind: hard
created_at: '2025-12-19T10:00:00Z'
created_by: Ines Okafor
supersedes:
  - con-frame-budget--f5qxxq5572878wrp
superseded_by:
  - con-frame-budget--fzdrbxns6dmrrmy3
---
After the vertical slice the 16.6 ms Meridian frame is split: 15.2 ms for Lantern GPU passes and 1.4 ms held back for system overlays and dynamic-resolution headroom. The slice ran passes to the full 16.6 ms and the system overlay pushed two capture runs over. Pass owners must give back time to fit 15.2 ms.
