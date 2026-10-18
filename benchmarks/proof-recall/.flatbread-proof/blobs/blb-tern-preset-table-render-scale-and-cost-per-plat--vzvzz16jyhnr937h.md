---
id: blb-tern-preset-table-render-scale-and-cost-per-plat--vzvzz16jyhnr937h
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'Tern preset table: render scale and cost per platform'
kind: json
created_at: '2026-02-23T15:00:00Z'
created_by: Tomasz Brandt
---
{
  "build": "lantern-2026.02.22-r5990",
  "output": "4K on PC and Meridian, 720p on Skiff",
  "presets": {
    "quality": {
      "scale": 0.67,
      "meridian_ms": 1.4,
      "skiff_ms": 3.9
    },
    "balanced": {
      "scale": 0.58,
      "meridian_ms": 1.3,
      "skiff_ms": 3
    },
    "performance": {
      "scale": 0.5,
      "meridian_ms": 1.2,
      "skiff_ms": 2.1
    },
    "ultra_performance": {
      "scale": 0.33,
      "meridian_ms": 1,
      "skiff_ms": null
    }
  },
  "notes": "Ultra Performance is untested on Skiff."
}
