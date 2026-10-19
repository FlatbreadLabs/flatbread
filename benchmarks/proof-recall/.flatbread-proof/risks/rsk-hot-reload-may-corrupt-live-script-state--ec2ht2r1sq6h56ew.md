---
id: rsk-hot-reload-may-corrupt-live-script-state--ec2ht2r1sq6h56ew
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Hot reload may corrupt live script state
state: open
created_at: '2026-02-26T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-hot-reload-gull-functions-by-swapping-bytecode-a--8dxnkg6h8vmcsr42
likelihood: medium
severity: medium
---
A swapped function may read locals or object fields in a different order than the old version wrote them. Designers would see creatures behave strangely after a reload and blame their own edit.
