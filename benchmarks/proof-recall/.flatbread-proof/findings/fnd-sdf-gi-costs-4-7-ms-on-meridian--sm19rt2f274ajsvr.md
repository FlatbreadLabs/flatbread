---
id: fnd-sdf-gi-costs-4-7-ms-on-meridian--sm19rt2f274ajsvr
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: SDF GI costs 4.7 ms on Meridian
kind: measurement
created_at: '2026-02-05T10:00:00Z'
created_by: Tomasz Brandt
invalidates:
  - fnd-sdf-gi-costs-2-2-ms-on-meridian--r7t7zy97nwxxxctd
cites:
  - cit-capture-sdf-gi-on-a-meridian-devkit--1hjqjkb1e7z7tryy
---
The October SDF GI number was not a Meridian number. The first nightly devkit capture of the dunes benchmark puts SDF GI at 4.7 ms, more than twice the 2.2 ms the GI Decision was accepted on. Tracing went from 1.3 ms to 3.2 ms; the distance-field update and the filter grew a little too. The October capture predates the nightly capture job and was taken by hand; its attached capture names the machine it ran on.

Why the gap is so large: SDF tracing is bound by cache misses. Each cone step reads a different part of the clipmap, so the trace pass lives or dies on the L2 cache. The Decision 'Use signed-distance-field GI' still stands on the 2.2 ms figure and nobody has re-weighed it against the probe grid. Tomasz Brandt does not propose reversing it yet, because the probe grid still leaks through thin walls.

The L2 hit rate in the trace pass fell from 81 percent in the October capture to 52 percent on the devkit.
