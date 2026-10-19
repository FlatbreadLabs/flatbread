---
id: dec-stream-skiff-world-tiles-in-2-mb-reads--3jz9w9gvhhc7eppw
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Stream Skiff world tiles in 2 MB reads
state: accepted
created_at: '2026-03-06T10:30:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-skiff-microsd-sustains-92-mb-s--xr1fsyjd45y2tqcx
---
Read world tiles from storage in 2 MB blocks on Skiff. At 92 MB/s a 2 MB read takes about 22 ms, so streaming keeps up with a sprint across the dunes. Smaller reads waste time on per-read overhead on microSD.
