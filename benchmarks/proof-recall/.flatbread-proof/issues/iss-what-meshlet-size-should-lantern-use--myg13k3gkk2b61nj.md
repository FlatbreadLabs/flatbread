---
id: iss-what-meshlet-size-should-lantern-use--myg13k3gkk2b61nj
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: What meshlet size should Lantern use?
kind: question
status: resolved
created_at: '2025-11-12T11:00:00Z'
created_by: Tomasz Brandt
resolved_by:
  - dec-use-64-vertex-meshlets-with-up-to-124-triangles--67xmt2c2hkv7tr4h
---
GPU culling works per meshlet as well as per instance. Meshlet size trades culling precision against per-meshlet overhead. Pick one size for all saltglass and terrain meshes.
