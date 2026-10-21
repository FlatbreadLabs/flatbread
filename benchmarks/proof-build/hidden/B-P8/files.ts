// Old files for the colour-name tests (not a test file itself).

/** A version 2 file: lists of nodes, one fill and one stroke each. */
export const V2_POSTER = JSON.stringify({
  version: 2,
  name: 'Old poster',
  nodes: [
    {
      id: 'frame-1',
      type: 'frame',
      name: 'Poster',
      parent: null,
      children: ['rect-2', 'text-3', 'ellipse-4'],
      x: 0,
      y: 0,
      width: 400,
      height: 600,
      fill: 'white',
    },
    {
      id: 'rect-2',
      type: 'rect',
      name: 'Band',
      parent: 'frame-1',
      x: 0,
      y: 0,
      width: 400,
      height: 80,
      fill: 'red',
      stroke: 'navy',
      strokeWidth: 2,
    },
    {
      id: 'text-3',
      type: 'text',
      name: 'Title',
      parent: 'frame-1',
      x: 20,
      y: 100,
      width: 360,
      height: 40,
      text: 'Sale',
      fill: '#333333',
      rotation: 90,
    },
    {
      id: 'ellipse-4',
      type: 'ellipse',
      name: 'Spot',
      parent: 'frame-1',
      x: 300,
      y: 400,
      width: 60,
      height: 60,
      fill: 'Teal',
      stroke: 'black',
    },
  ],
});

/** A version 1 file: lengths as strings, a named fill. */
export const V1_NOTE = JSON.stringify({
  version: 1,
  name: 'Note',
  nodes: [
    {
      id: 'rect-1',
      type: 'rect',
      name: 'Sticky',
      parent: null,
      x: '10px',
      y: '20px',
      width: '120px',
      height: '120px',
      fill: 'yellow',
      stroke: 'olive',
      strokeWidth: '1px',
    },
  ],
});

/** A version 5 file that an earlier editor saved from a version 2 one. */
export const V5_RESAVED = JSON.stringify(
  {
    version: 5,
    name: 'Old poster',
    top: ['rect-2'],
    nodes: {
      'rect-2': {
        fills: [{ color: 'RED' }],
        height: 80,
        id: 'rect-2',
        locked: false,
        name: 'Band',
        opacity: 1,
        parent: null,
        rotation: 0,
        strokes: [{ color: 'NAVY', width: 2, align: 'inside' }],
        type: 'rect',
        visible: true,
        width: 400,
        x: 0,
        y: 0,
      },
    },
  },
  null,
  2
);
