---
id: blb-gpu-capture-sdf-gi-on-a-meridian-devkit-dunes-be--9r2nk13cja7s06cx
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'GPU capture: SDF GI on a Meridian devkit, dunes benchmark'
kind: json
created_at: '2026-02-02T15:00:00Z'
created_by: Tomasz Brandt
---
{
  "build": "lantern-2026.02.01-r5840",
  "device": "Meridian devkit MRD-0031, retail clocks",
  "scene": "dunes_bench_01",
  "resolution": "2560x1440",
  "clipmap_cascades": 4,
  "passes_ms": {
    "sdf_update": 0.6,
    "trace": 3.2,
    "filter": 0.5,
    "apply": 0.4
  },
  "total_ms": 4.7,
  "l2_hit_rate": 0.52
}
