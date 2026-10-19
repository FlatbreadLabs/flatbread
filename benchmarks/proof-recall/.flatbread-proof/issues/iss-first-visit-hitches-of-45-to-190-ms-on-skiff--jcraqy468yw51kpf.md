---
id: iss-first-visit-hitches-of-45-to-190-ms-on-skiff--jcraqy468yw51kpf
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: First-visit hitches of 45 to 190 ms on Skiff
kind: defect
status: resolved
created_at: '2025-12-08T11:00:00Z'
created_by: Priya Natarajan
resolved_by:
  - dec-build-an-on-device-pipeline-cache-for-skiff--726r9mtk76qndeh7
  - fnd-skiff-pipeline-cache-removes-second-visit-hitche--kzjtp9dpbpbmrb0x
---
Walking into a district for the first time on Skiff stalls the game for 45 to 190 ms at a time. The stalls vanish on a second visit in the same session and come back after a restart. Skiff compiles each graphics pipeline the first time it is drawn.
