---
id: blb-gpu-capture-visibility-buffer-on-skiff-cliffs-be--x1ynk37229baj5vt
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'GPU capture: visibility buffer on Skiff, cliffs benchmark'
kind: json
created_at: '2026-04-07T15:00:00Z'
created_by: Tomasz Brandt
---
{
  "build": "lantern-2026.04.06-r6120",
  "build_config": "debug-gpu-validation",
  "platform": "Skiff devkit SKF-0007",
  "scene": "cliffs_bench_02",
  "resolution": "1280x720",
  "passes_ms": {
    "visibility_raster": 2.6,
    "material_resolve": 5,
    "saltglass_forward": 2.1,
    "post": 1.5
  },
  "total_vb_ms": 11.2,
  "forward_plus_reference_ms": 8.9,
  "notes": "First capture on the new Skiff devkits."
}
