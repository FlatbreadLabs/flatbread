# Plan: swatches

1. A `swatches()` function goes over the top-level layers and reads each one's first fill colour string as stored, adding it to a map from colour to count.
2. Sort the map by count, most used first.
3. Recompute when the document emits change.
4. Clicking a swatch runs the Fill field's commit with that colour for the selection, so Undo works.
5. Groups are skipped because they have no fills.
