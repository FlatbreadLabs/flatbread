---
id: rsk-compute-meshlet-expansion-is-too-slow-on-skiff--b1915sgdsr1bpwda
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Compute meshlet expansion is too slow on Skiff
state: open
created_at: '2025-12-06T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-expand-meshlets-to-index-buffers-in-compute-on-s--bpbtr54dgzgsjgme
likelihood: medium
severity: medium
---
Writing index buffers every frame costs bandwidth Skiff does not have much of. On the cliffs benchmark the expansion could take 1.5 ms or more. No Skiff measurement exists yet.
