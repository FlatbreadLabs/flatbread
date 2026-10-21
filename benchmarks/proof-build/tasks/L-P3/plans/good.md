# Plan: auto layout

1. Frames get `layout: { direction: 'row' | 'column', gap, padding } | null`. A new v5→v6 migration step adds `layout: null`, so older files open with auto layout off; shipped steps are untouched.
2. A pure `relayout(doc, frameId)` computes child positions and the frame's size from the layout; it returns resize items with exact numbers. Nothing is rounded when stored; fields round only for display.
3. Every edit that can change a stack (field commit, insert, delete, reorder, resize) dispatches its own commands and then the relayout resize command in the same batch, or with the same gesture id, so one Undo takes back the edit and its relayout.
4. A drag gives every move and relayout command the drag's gesture id; history merges only by gesture id, never by time.
5. Gap and padding fields in the panel are ordinary field descriptors that write through commands.
