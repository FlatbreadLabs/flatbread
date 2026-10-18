---
id: dec-capture-the-cliffs-and-dunes-benchmarks-on-every--3pqyr66yh4v6q676
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Capture the cliffs and dunes benchmarks on every nightly Meridian build
state: accepted
created_at: '2025-10-06T15:00:00Z'
created_by: Liam O'Connell
derives_from:
  - iss-no-automated-gpu-captures-on-nightly-builds--k3vncp4qwzdwc2m6
---
The build farm runs the cliffs and dunes benchmarks on a Meridian devkit after each nightly build and stores the GPU capture with the build number and devkit serial. Hand captures stay allowed for exploration, but a number that drives a Decision should come from a nightly capture. Liam O'Connell owns the job; the first nightly capture is planned for build r4700.
