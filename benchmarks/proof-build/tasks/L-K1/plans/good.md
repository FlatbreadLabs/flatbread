# Plan: rulers

1. A rulers view model computed from the viewport (zoom and pan) and the selection, recomputed when either changes.
2. Tick spacing: pick the smallest step from 1, 2 and 5 times a power of ten whose on-screen distance (step × zoom) is at least 50 screen pixels.
3. Tick positions: map document coordinates to screen with the viewport's toScreen, from the visible range's first multiple of the step.
4. Selection extent: selection bounds, rotation included, mapped to screen.
5. Tests: spacing at zoom 0.25, 1, 4 and 16, and the extent of a rotated selection.
