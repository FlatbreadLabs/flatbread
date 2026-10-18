---
id: fnd-skiff-firmware-1-2-rejects-pipeline-blobs-built--pernvgb2he7m3z3y
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Skiff firmware 1.2 rejects pipeline blobs built for firmware 1.0
kind: measurement
created_at: '2026-03-20T11:00:00Z'
created_by: Priya Natarajan
derives_from:
  - fnd-firmware-1-2-skiff-dev-kits-arrived--7dzaq12qessxaasd
invalidates:
  - fnd-prebuilt-pipeline-blobs-load-on-skiff-dev-firmwa--yzb10ygwr1q151e7
---
On the new firmware 1.2 kits, all 1,460 prebuilt harbor pipelines failed to load and recompiled on the device. Skiff checks a driver hash in every blob and rejects any blob built for another driver. The platform holder plans driver updates every two to three months, so shipped blobs would go stale after the first update. The December test passed only because it used the same firmware the blobs were built for.
