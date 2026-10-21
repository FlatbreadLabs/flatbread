# Plan: snapping while dragging

1. On pointer down, collect snap targets: the edges and centres of every layer that is interactive (not hidden, not locked, and not inside a hidden or locked container), leaving out the dragged layers and their descendants.
2. On each move, compute the dragged selection's bounds after the raw delta and find the nearest target within 6 screen pixels, converted to document units by dividing by the zoom.
3. Adjust the delta by the exact difference. The move command stores the exact numbers; only the panel rounds them for display.
4. Every move still carries the drag's gesture id, so a snapped drag is one history entry.
5. Alt held: skip snapping for that move. Guides are a view model the shell draws.
