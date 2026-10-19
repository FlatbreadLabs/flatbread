---
id: fnd-deltas-saved-at-low-tide-replay-wrongly-at-high--25b4vwytarw8ej50
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Deltas saved at low tide replay wrongly at high tide
kind: measurement
created_at: '2026-02-18T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-save-player-changes-as-deltas-against-the-tide-f--n38scy1yaarsr8cw
invalidates:
  - dec-save-player-changes-as-deltas-against-the-tide-f--n38scy1yaarsr8cw
---
The delta format assumes that a player change means the same thing at any tide. It does not. A player who digs out a salvage chest at low tide changes sand that only exists at low tide. The delta stores the dig against the tide-free baseline, where that sand has a different height.

On load, the game applies the delta to the baseline and then runs the tide forward to the saved time. The tide rebuilds the sand on top of the dig, and the chest is buried again or pushed sideways by the terrain solver.

QA reproduced this in 31 of 50 saves taken at low tide and 4 of 50 taken at high tide. Saves taken mid-turn were not tested.

In the worst case the terrain solver pushed a salvage chest 11 m inland, onto a ridge the player could not reach.
