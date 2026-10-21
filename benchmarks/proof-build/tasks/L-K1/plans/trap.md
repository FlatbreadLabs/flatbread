# Plan: rulers

1. Add a `Rulers` view model next to the viewport. It reads the zoom and pan when the shell asks for it.
2. Ticks are every 10 document px, with a label every 100 px, starting at the left edge of the visible area. Screen position is `(x - pan.x) * zoom`.
3. The highlighted extent is the first selected layer's x and width (y and height for the left ruler).
4. Tests: tick positions at zoom 1 and label text.
