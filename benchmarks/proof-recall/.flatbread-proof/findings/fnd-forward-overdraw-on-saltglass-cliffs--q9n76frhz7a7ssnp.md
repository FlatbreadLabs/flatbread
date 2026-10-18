---
id: fnd-forward-overdraw-on-saltglass-cliffs--q9n76frhz7a7ssnp
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Forward+ overdraw on saltglass cliffs
kind: measurement
created_at: '2025-09-10T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-should-lantern-replace-clustered-forward-with-a--7c8zxrdsj59q8hmd
cites:
  - cit-capture-forward-cliffs-benchmark--2ykf7yxr2qmwjz23
---
On the cliffs benchmark, forward+ opaque shading takes 7.9 ms of the 16.6 ms Meridian frame. Quad overdraw averages 3.4x because the cliff meshes are dense with sub-pixel triangles. Light culling itself is cheap at 0.6 ms; the cost is shading quads that never reach the screen. The full capture is attached.
