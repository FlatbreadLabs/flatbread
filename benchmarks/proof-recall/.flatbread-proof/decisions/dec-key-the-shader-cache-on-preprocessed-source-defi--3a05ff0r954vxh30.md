---
id: dec-key-the-shader-cache-on-preprocessed-source-defi--3a05ff0r954vxh30
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: >-
  Key the shader cache on preprocessed source, defines, target and compiler
  binary hash
state: accepted
created_at: '2026-01-15T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - con-a-cache-hit-must-give-the-same-bytes-as-a-fresh--3gmcswztxzpmpz83
  - fnd-two-compiler-builds-with-the-same-version-string--gmgr4ha0ndxqmcn9
  - iss-what-should-the-shader-compile-cache-key-hash--y1ja5t3r75r63s28
supersedes:
  - dec-key-the-shader-cache-on-preprocessed-source-defi--qx2da8e4cbkx0drp
---
This replaces the version-string key. The key is now the SHA-256 of these inputs, in this order:

1. The preprocessed shader source, so every included header counts.
2. The sorted define set for the permutation.
3. The target platform: PC, Meridian or Skiff.
4. The SHA-256 of the shader compiler binary and its optimizer library, not the version string.
5. The compile flags after normalization (flag order no longer matters).

Hashing the compiler binary costs nothing per permutation: each agent hashes its install once at startup and caches the result.
Rolling the key forward invalidates the whole cache once, so the first build after the change runs cold, about 14 minutes with remote execution.
Liam O'Connell considered keeping the old entries as a fallback and decided against it, since the old key is exactly what let mismatched bytecode through.

One input is left out on purpose: the shader debug name. Lantern embeds debug names in the bytecode only in development builds, and including the name split identical permutations into 3,100 extra entries in a trial. Debug names are stripped before hashing and re-added after a fetch.
