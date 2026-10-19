---
id: fnd-tide-priority-reads-starve-player-proximity-load--by0d7b0bk39xz3rk
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Tide-priority reads starve player-proximity loads
kind: measurement
created_at: '2026-08-10T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-give-reads-for-tide-exposed-cells-top-priority--8ftkvqhawbdf5djh
invalidates:
  - dec-give-reads-for-tide-exposed-cells-top-priority--8ftkvqhawbdf5djh
cites:
  - cit-skiff-streaming-trace-stream-trace-0807--e4vdxvga0amqyzjb
---
Giving tide-exposed cells absolute priority was a mistake. On a falling spring tide, the second harmonic exposes far more coast than a normal tide, and the queue fills with tide-cell reads for minutes at a time.

A player who sprints inland during that window outruns streaming. Proximity reads for the cells ahead of the player wait behind every queued tide read, because nothing outranks the tide lane. The ground arrives as untextured glass and fills in seconds later.

The tide deadline itself is met with time to spare: tide cells finish 20 seconds before exposure on average, against an 8-second deadline. The priority rule protects a deadline that had slack while it starves the reads that had none.

In the worst capture, at the Glassreef inlet, inland terrain stayed untextured for 6.8 seconds.
