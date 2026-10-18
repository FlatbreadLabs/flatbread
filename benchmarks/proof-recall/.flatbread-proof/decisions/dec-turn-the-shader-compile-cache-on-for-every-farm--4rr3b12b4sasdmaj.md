---
id: dec-turn-the-shader-compile-cache-on-for-every-farm--4rr3b12b4sasdmaj
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Turn the shader compile cache on for every farm build
state: accepted
created_at: '2026-03-20T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
  - dec-cap-each-farm-agent-at-6-parallel-shader-compile--q5w4sfjm73tsj8x8
  - dec-key-the-shader-cache-on-preprocessed-source-defi--3a05ff0r954vxh30
---
Nightly, on-demand and release builds all read from and write to the cache from today. Release builds keep the 1-in-50 byte-compare sample. Fresh compiles remain available with a build flag.
