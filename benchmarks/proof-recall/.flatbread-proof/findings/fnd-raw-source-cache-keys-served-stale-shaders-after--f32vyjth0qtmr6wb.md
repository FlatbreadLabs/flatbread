---
id: fnd-raw-source-cache-keys-served-stale-shaders-after--f32vyjth0qtmr6wb
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Raw-source cache keys served stale shaders after header edits
kind: defect
created_at: '2025-10-14T08:30:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-key-the-shader-cache-on-raw-source-text-and-comp--hp6awmx3gq5rn9nc
---
Three nightly builds between 2025-10-09 and 2025-10-13 shipped refraction shaders compiled against an old lighting header. The raw-source key did not change when only an included header changed, so agents fetched stale bytecode. Yusuf Demir caught it when saltglass caustics rendered with last week's falloff curve.
