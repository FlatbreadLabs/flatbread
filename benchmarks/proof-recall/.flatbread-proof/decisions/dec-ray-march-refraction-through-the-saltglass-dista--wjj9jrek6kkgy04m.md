---
id: dec-ray-march-refraction-through-the-saltglass-dista--wjj9jrek6kkgy04m
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Ray-march refraction through the saltglass distance field
state: rejected
created_at: '2025-10-03T11:00:00Z'
created_by: Yusuf Demir
derives_from:
  - iss-how-should-lantern-render-saltglass-refraction--brndmsn2n8jz6yyk
rejected_by: dec-use-screen-space-refraction-for-saltglass--vknzksgdrgr7zkg6
---
March the refracted ray through the distance field up to 64 steps and shade the hit. Correct even when the refracted point is off screen. Costs 3.4 ms.
