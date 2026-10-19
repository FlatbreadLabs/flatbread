---
id: iss-what-should-the-shader-compile-cache-key-hash--y1ja5t3r75r63s28
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: What should the shader compile cache key hash?
kind: question
status: resolved
created_at: '2025-09-22T09:00:00Z'
created_by: Liam O'Connell
derives_from:
  - dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
resolved_by:
  - dec-key-the-shader-cache-on-preprocessed-source-defi--3a05ff0r954vxh30
---
The cache key decides both correctness and hit rate. Two candidates: hash the shader source text with the compiler version, or use file modification times as a cheap proxy.
