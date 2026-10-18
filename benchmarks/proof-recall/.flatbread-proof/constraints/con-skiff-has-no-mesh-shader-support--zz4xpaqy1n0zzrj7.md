---
id: con-skiff-has-no-mesh-shader-support--zz4xpaqy1n0zzrj7
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Skiff has no mesh shader support
kind: hard
created_at: '2025-10-15T09:00:00Z'
created_by: Tomasz Brandt
---
Skiff's GPU and driver do not support mesh or amplification shaders, and the platform holder has no plans to add them. Any meshlet path needs a fallback through the classic vertex pipeline on Skiff.
