# Plan: masks

1. Add `mask: boolean` to shapes.
2. The layers list is back to front: row 0 is the backmost layer, so the layers above a mask are the rows after it, and their row indexes are their paint-order indexes.
3. Groups carry no opacity of their own, so the opacity of a group holding a mask is pushed onto each child.
4. Rendering clips by the mask's shape.
