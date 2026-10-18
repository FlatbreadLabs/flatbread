---
id: blb-skiff-harbor-district-memory-capture-build-4127--t40rdrfffc5q5e89
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: 'Skiff harbor district memory capture, build 4127'
kind: json
created_at: '2026-02-16T10:00:00Z'
created_by: Kenji Arakawa
---
{
  "capture": "harbor-district-peak",
  "platform": "Skiff",
  "firmware": "1.2",
  "build": 4127,
  "captured_on": "2026-02-17",
  "route": "Fast travel to the harbor at low tide, then walk the fish market to the lighthouse",
  "budget_mb": 8192,
  "peak_mb": 8806,
  "over_budget_mb": 614,
  "categories_mb": {
    "textures": 3184,
    "streaming_pool": 2048,
    "meshes": 1106,
    "render_targets": 1012,
    "audio_banks": 912,
    "tide_sim": 330,
    "gull_heap": 214
  },
  "growth_since_slice_mb": {
    "audio_banks": 388,
    "tide_sim": 214,
    "textures": 96,
    "meshes": 41
  },
  "notes": "Peak lasts about 4 seconds while two tide cells are double buffered."
}
