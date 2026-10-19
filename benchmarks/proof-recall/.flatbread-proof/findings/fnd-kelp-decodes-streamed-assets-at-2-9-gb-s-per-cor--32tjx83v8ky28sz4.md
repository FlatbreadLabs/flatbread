---
id: fnd-kelp-decodes-streamed-assets-at-2-9-gb-s-per-cor--32tjx83v8ky28sz4
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Kelp decodes streamed assets at 2.9 GB/s per core
kind: measurement
created_at: '2025-10-14T11:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - iss-which-codec-should-compress-streamed-assets--9gnh870e1qwzd28r
invalidated_by:
  - fnd-kelp-decodes-at-1-1-gb-s-on-skiff-with-a-cold-ca--vef244qjn2mjf07x
cites:
  - cit-codec-benchmark-table-october-2025--wg58ryzjhtpaca3x
---
On the PC dev box, Kelp decodes streamed assets at 2.9 GB/s per core with a 3.1:1 ratio. Zstandard at level 9 decodes at 1.4 GB/s with 2.8:1. LZ4 decodes fastest, 3.8 GB/s, but its 2.1:1 ratio would grow the install by a third. The per-class table is attached.
