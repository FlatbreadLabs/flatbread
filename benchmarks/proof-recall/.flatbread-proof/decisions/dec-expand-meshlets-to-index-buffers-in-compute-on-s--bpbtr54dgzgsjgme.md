---
id: dec-expand-meshlets-to-index-buffers-in-compute-on-s--bpbtr54dgzgsjgme
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Expand meshlets to index buffers in compute on Skiff
state: accepted
created_at: '2025-12-05T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - con-skiff-has-no-mesh-shader-support--zz4xpaqy1n0zzrj7
  - dec-use-64-vertex-meshlets-with-up-to-124-triangles--67xmt2c2hkv7tr4h
---
On Skiff, a compute pass writes the surviving meshlets into an index buffer each frame, and the classic vertex pipeline draws it with one indirect call. Culling stays per meshlet.
