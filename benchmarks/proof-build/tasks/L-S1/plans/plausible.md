# Plan: masks

1. Model. Shapes (rect, ellipse, frame) get `isMask: boolean`, default false. Make mask / Release mask are palette commands that dispatch `set-prop` on `isMask`, so each is one undo step, and the flag is saved with the document.
2. Which layers a mask clips. In the parent's `children` (paint order, first child painted first), a mask clips the siblings after it, up to the next mask or the end of the list.
3. Layers panel. `buildRows` lists rows frontmost first (it reverses each child list), so in the rows the clipped layers sit above the mask row. Show them indented one level and give the mask row a mask icon. Row index to paint index conversions go through the existing `dropPlacement` helpers.
4. Opacity. A group's own `opacity` multiplies into everything inside it when it renders (`effectiveOpacity`), masks included. The mask's opacity affects only how the mask shape itself is drawn, not how much it clips.
5. Hit testing. A click inside a clipped layer but outside the mask's shape hits nothing in that layer.
6. Tests: clip range in paint order, rows order and indent, group opacity, undo of make mask, save and load.
