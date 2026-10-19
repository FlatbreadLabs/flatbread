---
id: dec-build-an-on-device-pipeline-cache-for-skiff--726r9mtk76qndeh7
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Build an on-device pipeline cache for Skiff
state: accepted
created_at: '2025-12-12T10:20:00Z'
created_by: Priya Natarajan
derives_from:
  - fnd-harbor-district-needs-1-460-pipelines-on-skiff--dwd5ry1wqaeacmpn
  - iss-how-should-skiff-avoid-first-use-pipeline-compil--5nvhn8xzyz2d7y7k
supersedes:
  - dec-ship-prebuilt-pipeline-blobs-in-the-skiff-packag--3vjysjgy9qkvzebn
reopen_history:
  - at: '2026-03-23T10:00:00.000Z'
    reason: >-
      Prebuilt blobs go stale on every Skiff driver update; a cache on the
      device survives updates by rebuilding.
    rejected_by: dec-ship-prebuilt-pipeline-blobs-in-the-skiff-packag--3vjysjgy9qkvzebn
---
Keep compiled graphics pipelines on the Skiff itself. The first time the game needs a pipeline, it compiles it and writes the result to a cache file in the save partition. The next session reads it back instead of compiling. Everyone on the team calls this the shader cache. It is not the build farm's shader compile cache, which speeds up our own builds and never ships to players.

To hide the first compile, the game warms the cache during load screens and fast travel. Each district has a list of the pipelines it drew in our playtests. While a load screen is up, the game compiles any pipeline on that list that is not in the cache yet. Priya Natarajan estimates that covers 95 percent of first visits.

The cache is keyed by pipeline hash plus the Skiff driver version. A firmware update that changes the driver throws the cache away and the game rebuilds it from the district lists over the next few load screens.

Size: the cache is capped at 384 MB on the Skiff storage. When it fills, the game drops the least recently used district first.
