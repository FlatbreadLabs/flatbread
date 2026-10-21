# Plan: snapping while dragging

1. Snap targets are all layers in the document.
2. When within 6 px, round the dragged layer's x and y to the target and then round to whole pixels before storing, so snapped layers land on integer positions.
3. Draw guides.
