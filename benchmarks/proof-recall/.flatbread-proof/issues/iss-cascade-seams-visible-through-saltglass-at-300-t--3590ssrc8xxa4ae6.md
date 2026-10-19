---
id: iss-cascade-seams-visible-through-saltglass-at-300-t--3590ssrc8xxa4ae6
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Cascade seams visible through saltglass at 300 to 800 m
kind: defect
status: resolved
created_at: '2025-11-03T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-use-cascaded-shadow-maps-with-four-cascades--s5c1y9jaf275afzr
resolved_by:
  - dec-use-virtual-shadow-maps-for-the-sun--x8nqkn9q7eaf1ap4
---
Refraction through saltglass bends view rays across cascade boundaries, so a shadow sampled from cascade 2 sits next to one from cascade 3. The seam reads as a hard line in the glass at 300 to 800 m. Blending cascades hides it on sand but not inside the glass.
