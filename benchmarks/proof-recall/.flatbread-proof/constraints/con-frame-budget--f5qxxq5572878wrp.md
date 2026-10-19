---
id: con-frame-budget--f5qxxq5572878wrp
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Frame budget
kind: hard
created_at: '2025-09-02T09:00:00Z'
created_by: Ines Okafor
superseded_by:
  - con-frame-budget--j6vneva1g2ywj86m
---
Lantern must finish a Meridian frame in 16.6 ms, which is 60 Hz. For pre-production the GPU passes may use the whole 16.6 ms; the render thread on the CPU runs in parallel and is budgeted elsewhere. Every pass owner reports against this number in the weekly capture review. Numbers come from the cliffs and dunes benchmarks, never from the menu scene.
