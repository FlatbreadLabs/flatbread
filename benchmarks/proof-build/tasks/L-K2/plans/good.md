# Plan: swatches

1. Walk the document, skipping groups (no fills) and layers without fills, and count each fill colour as upper-case #RRGGBB.
2. Sort by count, most first; ties by the order each colour first appears in paint order.
3. Recompute on the document's change and load events.
4. Clicking a swatch commits the colour through the Fill field for every selected layer that takes a fill; Undo takes it back.
5. The list is derived and not saved.
