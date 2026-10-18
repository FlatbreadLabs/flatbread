---
id: fnd-shader-cache-warms-in-40-seconds-on-first-boot--eadc6xjwgfhmbg86
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Shader cache warms in 40 seconds on first boot
kind: measurement
created_at: '2025-12-10T16:00:00Z'
created_by: Priya Natarajan
retracted: true
retracted_at: '2025-12-11T09:00:00.000Z'
retracted_reason: >-
  Filed in the wrong Effort. This measures the on-device pipeline cache on
  Skiff, which the ports Effort owns, not the build farm shader compile cache.
---
On a Skiff devkit, the pipeline cache took 40 seconds to warm on first boot of the coast level, with hitches of up to 120 ms while it filled. Second boot showed no hitches.
