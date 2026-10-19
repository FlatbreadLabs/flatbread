---
id: dec-visibility-buffer-on-pc-and-meridian-forward-fal--khvgysnhmnkjqe9k
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Visibility buffer on PC and Meridian; forward+ fallback on Skiff
state: superseded
created_at: '2026-04-15T10:00:00Z'
created_by: Ines Okafor
derives_from:
  - con-skiff-has-no-mesh-shader-support--zz4xpaqy1n0zzrj7
  - fnd-visibility-buffer-costs-11-2-ms-on-skiff--s3vphdwnhbh4650s
supersedes:
  - dec-visibility-buffer-with-compute-material-resolve--5s2z9mqmv8vnszed
superseded_by:
  - dec-visibility-buffer-on-all-platforms-skiff-resolve--k1ackk3c3275r5y1
---
PC and Meridian keep the visibility buffer as before. Skiff goes back to clustered forward+ for opaque geometry, because the visibility buffer costs 11.2 ms there against 8.9 ms. This reverses part of the original move and means two opaque paths to maintain until release. Dara Whitlock agreed to the extra maintenance.
