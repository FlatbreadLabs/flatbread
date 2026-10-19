---
id: dec-use-ubershaders-while-skiff-pipelines-compile--bab5rkqkvq647966
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Use ubershaders while Skiff pipelines compile
state: rejected
created_at: '2025-12-12T10:40:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-how-should-skiff-avoid-first-use-pipeline-compil--5nvhn8xzyz2d7y7k
rejected_by: dec-ship-prebuilt-pipeline-blobs-in-the-skiff-packag--3vjysjgy9qkvzebn
---
Draw with a slow general shader until the specialized pipeline finishes compiling on a worker thread. Tomasz Brandt measured the ubershader at 2.4 times the GPU cost of the specialized saltglass shader, which Skiff cannot afford at 33.3 ms.
