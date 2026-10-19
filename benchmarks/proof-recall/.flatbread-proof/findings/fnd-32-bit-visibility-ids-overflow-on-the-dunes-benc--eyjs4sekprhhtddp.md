---
id: fnd-32-bit-visibility-ids-overflow-on-the-dunes-benc--eyjs4sekprhhtddp
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 32-bit visibility ids overflow on the dunes benchmark
kind: measurement
created_at: '2025-10-14T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-adopt-a-visibility-buffer-for-all-opaque-geometr--68vchzqgd1avw8q4
---
The prototype's 32-bit id gives 20 bits to the instance and 12 to the triangle. The dunes benchmark draws 1.6 million instances when the tide is out, past the 1,048,576 limit, and the far flats shade with the wrong materials. A 64-bit target fixes it and costs 28 MB more at 1440p.
