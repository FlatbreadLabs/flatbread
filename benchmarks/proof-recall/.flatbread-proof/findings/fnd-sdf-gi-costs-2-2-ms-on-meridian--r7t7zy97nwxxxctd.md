---
id: fnd-sdf-gi-costs-2-2-ms-on-meridian--r7t7zy97nwxxxctd
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: SDF GI costs 2.2 ms on Meridian
kind: measurement
created_at: '2025-10-15T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-how-should-lantern-do-global-illumination--3hs82xftkrdhk3f7
invalidated_by:
  - fnd-sdf-gi-costs-4-7-ms-on-meridian--sm19rt2f274ajsvr
cites:
  - cit-capture-sdf-gi-dunes-benchmark--3q4n5ewn42faqaeb
---
SDF GI with four clipmap cascades of 64 cubed costs 2.2 ms per frame at 1440p on the dunes benchmark, with tracing the largest part at 1.3 ms. That is affordable inside the Frame budget. The capture is attached.
