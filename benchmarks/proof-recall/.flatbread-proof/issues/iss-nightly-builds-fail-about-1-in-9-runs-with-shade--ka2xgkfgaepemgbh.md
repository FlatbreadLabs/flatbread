---
id: iss-nightly-builds-fail-about-1-in-9-runs-with-shade--ka2xgkfgaepemgbh
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Nightly builds fail about 1 in 9 runs with shader compile timeouts
kind: defect
status: resolved
created_at: '2025-12-01T09:00:00Z'
created_by: Liam O'Connell
derives_from:
  - dec-fan-shader-cache-misses-out-to-every-farm-agent--pwrf9w720rf4hd27
resolved_by:
  - dec-cap-each-farm-agent-at-6-parallel-shader-compile--q5w4sfjm73tsj8x8
---
Since remote execution went live, 7 of the last 63 nightly builds failed with "shader job timed out". A rerun always passes. The failures cluster after 02:00 UTC, when every platform builds at once.
