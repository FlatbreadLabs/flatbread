---
id: con-a-cache-hit-must-give-the-same-bytes-as-a-fresh--3gmcswztxzpmpz83
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: A cache hit must give the same bytes as a fresh compile
kind: soft
created_at: '2025-11-10T10:00:00Z'
created_by: Ines Okafor
---
Ines Okafor will not debug rendering bugs that only appear on cached builds. Bytecode served from the cache must match a fresh compile byte for byte, or the cache is not trusted.
