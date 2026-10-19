---
id: dec-give-reads-for-tide-exposed-cells-top-priority--8ftkvqhawbdf5djh
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Give reads for tide-exposed cells top priority
state: accepted
created_at: '2026-05-11T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - con-cell-load-deadline--m20x64m5eh7q2bh6
  - dec-partition-the-world-into-192-m-cells--bk9r1c5jwb6fh8tc
invalidated_by:
  - fnd-tide-priority-reads-starve-player-proximity-load--by0d7b0bk39xz3rk
---
Reads for cells the tide is about to expose jump to the head of the request queue, ahead of all other streaming reads. This is the simplest way to meet the 8-second cell load deadline.
