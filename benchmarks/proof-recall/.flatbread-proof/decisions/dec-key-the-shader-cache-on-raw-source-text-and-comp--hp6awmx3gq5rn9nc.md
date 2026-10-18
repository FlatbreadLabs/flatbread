---
id: dec-key-the-shader-cache-on-raw-source-text-and-comp--hp6awmx3gq5rn9nc
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Key the shader cache on raw source text and compiler version
state: superseded
created_at: '2025-09-22T11:00:00Z'
created_by: Liam O'Connell
derives_from:
  - iss-what-should-the-shader-compile-cache-key-hash--y1ja5t3r75r63s28
superseded_by:
  - dec-key-the-shader-cache-on-preprocessed-source-defi--qx2da8e4cbkx0drp
---
Key = SHA-256 of the shader file text plus the compiler version string. Simple and fast: hashing all 38,000 permutations takes 9 seconds. Liam O'Connell flagged a doubt: included headers are not part of the hash yet.
