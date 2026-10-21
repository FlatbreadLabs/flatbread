# Plan: masks

1. A styled shape gets `mask: boolean`. Making a shape a mask is a `set-prop` command, so it is one undoable step, and the flag is saved with the document.
2. Which layers a mask clips: in its parent's child list (paint order, back to front, later children paint above), the siblings after the mask up to the next mask or the end.
3. The layers panel lists rows frontmost first, so in the rows the clipped layers come before the mask; buildRows indents them under the mask row, converting from paint order.
4. Opacity: groups have their own opacity, multiplied into their children at render, so a masked group fades as a whole; the mask's own opacity applies to the mask shape.
5. Hit testing: a point outside the mask shape does not hit the layers it clips.
