---
id: dec-keep-clustered-forward-and-tune-light-culling--18zwcwr0cb3tpmpt
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Keep clustered forward+ and tune light culling
state: rejected
created_at: '2025-09-27T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-forward-overdraw-on-saltglass-cliffs--q9n76frhz7a7ssnp
  - iss-should-lantern-replace-clustered-forward-with-a--7c8zxrdsj59q8hmd
rejected_by: dec-adopt-a-visibility-buffer-for-all-opaque-geometr--68vchzqgd1avw8q4
---
Keep forward+, add a depth-only prepass for the cliffs and tighten cluster bounds. The material system stays as it is, so the risk is low. Tomasz Brandt estimates 1.5 ms back on the cliffs benchmark, against the 4.4 ms the visibility buffer prototype saves.
