# Plan: rulers

1. A `rulers(viewport, selection)` function returns the ticks and labels for the top and left rulers. The shell calls it on every redraw, so it always reflects the current zoom, pan and selection.
2. Spacing. Pick the step from 1, 2, 5, 10, 20, 50, 100, 200, 500 and 1000 px: the smallest whose screen size (`step * zoom`) is at least 60 px, so labels never overlap.
3. Positions. Start at the first multiple of the step at or before the visible area's left (or top) edge, and convert each to screen x with `(x - pan.x) * zoom`.
4. Labels are the document value in px.
5. Selection. Highlight `selectionBounds` of the selected layers (rotation included) mapped to the screen.
6. Tests: spacing at zoom 0.1, 1 and 8; tick positions with a pan; highlight for a rotated layer.
