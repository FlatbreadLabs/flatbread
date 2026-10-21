# Plan: snapping while dragging

1. Targets. On drag start, collect the left, centre and right x and the top, middle and bottom y of every other top-level layer and every child of frames. Use `hitNode`'s interactivity check (`isInteractive`) so hidden and locked layers, and anything inside them, are left out, and leave out the dragged layers and their descendants.
2. Matching. On each move, compute the dragged bounds after the raw delta. Find the closest target on each axis within 6 screen px; the threshold in document units is `6 / zoom`.
3. Applying. Add the difference to the delta before the move command is dispatched. The stored position is exact; the panel's precision rules handle display.
4. Guides. Keep the snapped lines in a small view model the shell draws; clear them on drag end.
5. Alt. If Alt is held, skip matching for that move.
6. History. Moves keep the drag's gesture id, so the snapped drag is still one Undo.
7. Tests: snapping to an edge and a centre, no snap to a hidden or locked layer, threshold scales with zoom, Alt disables.
