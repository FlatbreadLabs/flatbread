# Plan: swatches

1. `collectSwatches(doc)` walks every node with `walk`, skipping groups and layers with no fills. Each fill colour is normalised with `parseColor` to upper-case `#RRGGBB` and counted per layer.
2. Order: count descending, then colour string ascending for ties.
3. Cache the result and drop the cache on the document's change and load events.
4. Clicking a swatch commits it through the Fill field for the current selection (`panel.edit('Fill', colour)`), which skips layers that have no Fill field, and is undoable.
5. Tests: counting, case normalisation, nested layers, tie order, apply and undo.
