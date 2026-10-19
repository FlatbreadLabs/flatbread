---
id: dec-ship-prebuilt-pipeline-blobs-in-the-skiff-packag--3vjysjgy9qkvzebn
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Ship prebuilt pipeline blobs in the Skiff package
state: superseded
created_at: '2025-12-12T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - fnd-prebuilt-pipeline-blobs-load-on-skiff-dev-firmwa--yzb10ygwr1q151e7
  - iss-how-should-skiff-avoid-first-use-pipeline-compil--5nvhn8xzyz2d7y7k
superseded_by:
  - dec-build-an-on-device-pipeline-cache-for-skiff--726r9mtk76qndeh7
---
The build farm compiles every Skiff pipeline at package time and ships the blobs, about 140 MB. Players never compile. This adds 9 minutes to a Skiff package build.
