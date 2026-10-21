# Plan: auto layout

1. Model. Frames get `autoLayout?: { direction: 'row' | 'column'; gap: number; padding: number }`. It is optional, so old files load without it (`withDefaults` can leave it undefined), and nothing else in the file format changes.
2. Layout function. `computeLayout(doc, frameId)` walks the frame's children in paint order and returns each child's new x/y, plus the frame's size when it hugs its content. To keep the panel and canvas tidy, positions are rounded to whole pixels.
3. Applying it. Subscribe to the document's change event. When a change touches an auto-layout frame or one of its children, dispatch one `resize` command with an item per child (as Align does). A guard flag stops the relayout from triggering itself.
4. Drags. During a drag the canvas dispatches moves with the drag's gesture id. The relayout after each move is dispatched as well. Back-to-back relayouts on the same frame within 300 ms are merged into one history entry, so a drag does not leave dozens of entries.
5. Panel. A new Auto layout section with Direction, Gap and Padding fields, committed through `set-prop` like the other fields.
6. Tests: row and column stacking, gap and padding, adding and removing a child, hug sizing, undo of a gap change.
