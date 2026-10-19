---
id: rsk-shader-cache-storage-could-outgrow-the-4-tb-farm--76y9649mwrx7aavd
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Shader cache storage could outgrow the 4 TB farm volume
state: accepted
created_at: '2025-11-18T14:00:00Z'
created_by: Liam O'Connell
derives_from:
  - con-the-build-farm-stays-at-12-agents-until-alpha--w7e1xfex9z2ycpx1
  - dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
evidence:
  - fnd-retrospective-on-the-shader-compile-cache--9rpv2a60ach04cx6
likelihood: medium
severity: medium
---
Every key change, compiler update and define tweak adds new entries; nothing evicts old ones yet. At the current rate the cache grows about 210 GB a month. Liam O'Connell is not sure an eviction policy is worth building before release.
