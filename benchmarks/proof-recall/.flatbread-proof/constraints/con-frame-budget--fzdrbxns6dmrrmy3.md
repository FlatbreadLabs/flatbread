---
id: con-frame-budget--fzdrbxns6dmrrmy3
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Frame budget
kind: hard
created_at: '2026-04-02T10:00:00Z'
created_by: Ines Okafor
supersedes:
  - con-frame-budget--j6vneva1g2ywj86m
---
Meridian quality mode stays at 60 Hz: 16.6 ms per frame, of which Lantern GPU passes get 15.0 ms and 1.6 ms is headroom. The headroom grew by 0.2 ms because the new system overlay costs more than the old one. The 120 Hz performance mode has its own Constraint with an 8.3 ms frame; this record covers quality mode only. Skiff budgets belong to the ports Effort.
