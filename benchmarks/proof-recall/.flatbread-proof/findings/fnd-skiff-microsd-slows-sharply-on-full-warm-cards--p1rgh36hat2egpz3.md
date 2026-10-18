---
id: fnd-skiff-microsd-slows-sharply-on-full-warm-cards--p1rgh36hat2egpz3
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: 'Skiff microSD slows sharply on full, warm cards'
kind: measurement
created_at: '2026-04-20T16:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - iss-skiff-fast-travel-has-no-load-time-plan--8xqtfd6x0mfvbkts
invalidates:
  - dec-load-skiff-fast-travel-without-a-loading-screen--v4qft5znysjv5f24
  - fnd-skiff-microsd-sustains-92-mb-s--xr1fsyjd45y2tqcx
cites:
  - cit-skiff-storage-benchmark-sheet--rszq3fw5c7eps8a2
---
Kenji Arakawa repeated the March storage benchmark under player conditions: cards filled past 80 percent, a Skiff that had run the game for 40 minutes, and the cheapest cards on sale in our three launch regions. The March test used three new, empty cards on a cold Skiff, which no player will have after a week.

Results by card: the two premium cards held close to their March numbers. The four budget cards slowed as they filled, and all of them slowed further once the Skiff warmed up. The card controller throttles writes and reads together when it gets hot, and a full card spends more time on wear levelling.

Fast travel to the harbor took 6.8 seconds on the worst card, far past the 4.5 second camera move.

Worst sustained read across the budget cards, full and warm: 61 MB/s. Plan Skiff loading and streaming against that number, not 92 MB/s.
