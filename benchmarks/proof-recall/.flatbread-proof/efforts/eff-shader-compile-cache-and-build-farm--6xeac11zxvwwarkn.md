---
id: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Shader compile cache and build farm
status: completed
created_at: '2025-09-08T09:00:00Z'
---
Liam O'Connell owns this Effort. It covers the build farm's shader compile cache, the cache key, remote execution of shader compiles, and the flaky nightly builds that came with them. In this Effort "shader cache" means the farm-side compile cache that stores compiled Lantern bytecode. It is not the on-device pipeline cache on Skiff, which the ports Effort owns. The Effort ends when every farm build reads from the cache.
