---
id: dec-key-the-shader-cache-on-preprocessed-source-defi--qx2da8e4cbkx0drp
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: >-
  Key the shader cache on preprocessed source, defines, compiler version and
  target
state: superseded
created_at: '2025-10-16T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - fnd-raw-source-cache-keys-served-stale-shaders-after--f32vyjth0qtmr6wb
  - iss-what-should-the-shader-compile-cache-key-hash--y1ja5t3r75r63s28
supersedes:
  - dec-key-the-shader-cache-on-raw-source-text-and-comp--hp6awmx3gq5rn9nc
superseded_by:
  - dec-key-the-shader-cache-on-preprocessed-source-defi--3a05ff0r954vxh30
---
Run the preprocessor first and hash its output, so every included header is part of the key. Add the full define set and the target platform (PC, Meridian or Skiff) to the hash. Preprocessing costs 70 seconds per clean build, which is a fair price for never shipping stale includes again.
