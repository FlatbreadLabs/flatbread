// Invariants that hold rules only Proof states: a shipped migration step
// never changes its output (R3), and one palette command run is at most
// one history entry (R1). grade.mjs runs this file only with proof-only
// and stale tasks (see globals.json). The expected values were computed
// from the editor as it was before any task.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';
import { MIGRATIONS } from '../../src/persist/migrations/index.ts';

const SHIPPED_STEPS: { from: number; input: unknown; output: unknown }[] = [
  {
    from: 1,
    input: {
      version: 1,
      name: 'Pricing card',
      nodes: [
        {
          id: 'frame-1',
          type: 'frame',
          name: 'Card',
          parent: null,
          children: ['rect-2', 'text-3'],
          x: '0px',
          y: '0px',
          width: '320px',
          height: '200px',
          fill: '#ffffff',
        },
        {
          id: 'rect-2',
          type: 'rect',
          name: 'Badge',
          parent: 'frame-1',
          x: '16px',
          y: '16',
          width: '48px',
          height: '24px',
          fill: '#3366ff',
          stroke: '#000000',
          strokeWidth: '2px',
        },
        {
          id: 'text-3',
          type: 'text',
          name: 'Label',
          parent: 'frame-1',
          x: '16px',
          y: '56px',
          width: '200px',
          height: '18px',
          fontSize: '14px',
          text: 'Most popular',
          fill: '#111111',
          hidden: true,
        },
      ],
    },
    output: {
      version: 2,
      name: 'Pricing card',
      nodes: [
        {
          id: 'frame-1',
          type: 'frame',
          name: 'Card',
          parent: null,
          children: ['rect-2', 'text-3'],
          x: 0,
          y: 0,
          width: 320,
          height: 200,
          fill: '#ffffff',
        },
        {
          id: 'rect-2',
          type: 'rect',
          name: 'Badge',
          parent: 'frame-1',
          x: 16,
          y: 16,
          width: 48,
          height: 24,
          fill: '#3366ff',
          stroke: '#000000',
          strokeWidth: 2,
        },
        {
          id: 'text-3',
          type: 'text',
          name: 'Label',
          parent: 'frame-1',
          x: 16,
          y: 56,
          width: 200,
          height: 18,
          fontSize: 14,
          text: 'Most popular',
          fill: '#111111',
          hidden: true,
        },
      ],
    },
  },
  {
    from: 2,
    input: {
      version: 2,
      name: 'Pricing card',
      nodes: [
        {
          id: 'frame-1',
          type: 'frame',
          name: 'Card',
          parent: null,
          children: ['rect-2', 'text-3'],
          x: 0,
          y: 0,
          width: 320,
          height: 200,
          fill: '#ffffff',
        },
        {
          id: 'rect-2',
          type: 'rect',
          name: 'Badge',
          parent: 'frame-1',
          x: 16,
          y: 16,
          width: 48,
          height: 24,
          fill: '#3366ff',
          stroke: '#000000',
          strokeWidth: 2,
        },
        {
          id: 'text-3',
          type: 'text',
          name: 'Label',
          parent: 'frame-1',
          x: 16,
          y: 56,
          width: 200,
          height: 18,
          fontSize: 14,
          text: 'Most popular',
          fill: '#111111',
          hidden: true,
        },
      ],
    },
    output: {
      version: 3,
      name: 'Pricing card',
      nodes: [
        {
          id: 'frame-1',
          type: 'frame',
          name: 'Card',
          parent: null,
          children: ['rect-2', 'text-3'],
          x: 0,
          y: 0,
          width: 320,
          height: 200,
          fills: [{ color: '#FFFFFF' }],
          strokes: [],
        },
        {
          id: 'rect-2',
          type: 'rect',
          name: 'Badge',
          parent: 'frame-1',
          x: 16,
          y: 16,
          width: 48,
          height: 24,
          fills: [{ color: '#3366FF' }],
          strokes: [{ color: '#000000', width: 2, align: 'inside' }],
        },
        {
          id: 'text-3',
          type: 'text',
          name: 'Label',
          parent: 'frame-1',
          x: 16,
          y: 56,
          width: 200,
          height: 18,
          fontSize: 14,
          text: 'Most popular',
          hidden: true,
          fills: [{ color: '#111111' }],
          strokes: [],
        },
      ],
    },
  },
  {
    from: 3,
    input: {
      version: 3,
      name: 'Pricing card',
      nodes: [
        {
          id: 'frame-1',
          type: 'frame',
          name: 'Card',
          parent: null,
          children: ['rect-2', 'text-3'],
          x: 0,
          y: 0,
          width: 320,
          height: 200,
          fills: [{ color: '#FFFFFF' }],
          strokes: [],
        },
        {
          id: 'rect-2',
          type: 'rect',
          name: 'Badge',
          parent: 'frame-1',
          x: 16,
          y: 16,
          width: 48,
          height: 24,
          fills: [{ color: '#3366FF' }],
          strokes: [{ color: '#000000', width: 2, align: 'inside' }],
        },
        {
          id: 'text-3',
          type: 'text',
          name: 'Label',
          parent: 'frame-1',
          x: 16,
          y: 56,
          width: 200,
          height: 18,
          fontSize: 14,
          text: 'Most popular',
          hidden: true,
          fills: [{ color: '#111111' }],
          strokes: [],
        },
      ],
    },
    output: {
      version: 4,
      name: 'Pricing card',
      nodes: {
        'frame-1': {
          id: 'frame-1',
          type: 'frame',
          name: 'Card',
          parent: null,
          children: ['rect-2', 'text-3'],
          x: 0,
          y: 0,
          width: 320,
          height: 200,
          fills: [{ color: '#FFFFFF' }],
          strokes: [],
          visible: true,
          locked: false,
        },
        'rect-2': {
          id: 'rect-2',
          type: 'rect',
          name: 'Badge',
          parent: 'frame-1',
          x: 16,
          y: 16,
          width: 48,
          height: 24,
          fills: [{ color: '#3366FF' }],
          strokes: [{ color: '#000000', width: 2, align: 'inside' }],
          visible: true,
          locked: false,
        },
        'text-3': {
          id: 'text-3',
          type: 'text',
          name: 'Label',
          parent: 'frame-1',
          x: 16,
          y: 56,
          width: 200,
          height: 18,
          fontSize: 14,
          text: 'Most popular',
          fills: [{ color: '#111111' }],
          strokes: [],
          visible: false,
          locked: false,
        },
      },
      top: ['frame-1'],
    },
  },
  {
    from: 4,
    input: {
      version: 4,
      name: 'Pricing card',
      nodes: {
        'frame-1': {
          id: 'frame-1',
          type: 'frame',
          name: 'Card',
          parent: null,
          children: ['rect-2', 'text-3'],
          x: 0,
          y: 0,
          width: 320,
          height: 200,
          fills: [{ color: '#FFFFFF' }],
          strokes: [],
          visible: true,
          locked: false,
        },
        'rect-2': {
          id: 'rect-2',
          type: 'rect',
          name: 'Badge',
          parent: 'frame-1',
          x: 16,
          y: 16,
          width: 48,
          height: 24,
          fills: [{ color: '#3366FF' }],
          strokes: [{ color: '#000000', width: 2, align: 'inside' }],
          visible: true,
          locked: false,
        },
        'text-3': {
          id: 'text-3',
          type: 'text',
          name: 'Label',
          parent: 'frame-1',
          x: 16,
          y: 56,
          width: 200,
          height: 18,
          fontSize: 14,
          text: 'Most popular',
          fills: [{ color: '#111111' }],
          strokes: [],
          visible: false,
          locked: false,
        },
      },
      top: ['frame-1'],
    },
    output: {
      version: 5,
      name: 'Pricing card',
      nodes: {
        'frame-1': {
          id: 'frame-1',
          type: 'frame',
          name: 'Card',
          parent: null,
          children: ['rect-2', 'text-3'],
          x: 0,
          y: 0,
          width: 320,
          height: 200,
          fills: [{ color: '#FFFFFF' }],
          strokes: [],
          visible: true,
          locked: false,
          rotation: 0,
        },
        'rect-2': {
          id: 'rect-2',
          type: 'rect',
          name: 'Badge',
          parent: 'frame-1',
          x: 16,
          y: 16,
          width: 48,
          height: 24,
          fills: [{ color: '#3366FF' }],
          strokes: [{ color: '#000000', width: 2, align: 'inside' }],
          visible: true,
          locked: false,
          rotation: 0,
        },
        'text-3': {
          id: 'text-3',
          type: 'text',
          name: 'Label',
          parent: 'frame-1',
          x: 16,
          y: 56,
          width: 200,
          height: 18,
          fontSize: 14,
          text: 'Most popular',
          fills: [{ color: '#111111' }],
          strokes: [],
          visible: false,
          locked: false,
          rotation: 0,
        },
      },
      top: ['frame-1'],
    },
  },
  {
    from: 4,
    input: {
      version: 4,
      name: 'Rotated',
      top: ['frame-1'],
      nodes: {
        'frame-1': {
          id: 'frame-1',
          type: 'frame',
          name: 'Board',
          parent: null,
          children: ['rect-2'],
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          rotation: 0,
          visible: true,
          locked: false,
          opacity: 1,
          clip: true,
          fills: [{ color: '#FFFFFF' }],
          strokes: [],
        },
        'rect-2': {
          id: 'rect-2',
          type: 'rect',
          name: 'Tilted',
          parent: 'frame-1',
          x: 100,
          y: 100,
          width: 80,
          height: 40,
          rotation: 45,
          visible: true,
          locked: false,
          opacity: 1,
          fills: [{ color: '#FF0000' }],
          strokes: [],
        },
      },
    },
    output: {
      version: 5,
      name: 'Rotated',
      top: ['frame-1'],
      nodes: {
        'frame-1': {
          id: 'frame-1',
          type: 'frame',
          name: 'Board',
          parent: null,
          children: ['rect-2'],
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          rotation: 0,
          visible: true,
          locked: false,
          opacity: 1,
          clip: true,
          fills: [{ color: '#FFFFFF' }],
          strokes: [],
        },
        'rect-2': {
          id: 'rect-2',
          type: 'rect',
          name: 'Tilted',
          parent: 'frame-1',
          x: 100,
          y: 100,
          width: 80,
          height: 40,
          rotation: 0.7853981633974483,
          visible: true,
          locked: false,
          opacity: 1,
          fills: [{ color: '#FF0000' }],
          strokes: [],
        },
      },
    },
  },
  {
    from: 1,
    input: {
      version: 1,
      name: 'Legacy units',
      nodes: [
        {
          id: 'frame-1',
          type: 'frame',
          name: 'Sheet',
          parent: null,
          children: ['rect-2'],
          x: '0px',
          y: '0',
          width: '8.5in',
          height: '11in',
          fill: '#FFFFFF',
        },
        {
          id: 'rect-2',
          type: 'rect',
          name: 'Margin',
          parent: 'frame-1',
          x: '50%',
          y: '18pt',
          width: '2in',
          height: ' 12 px ',
          strokeWidth: '1pt',
          stroke: '#000000',
        },
      ],
    },
    output: {
      version: 2,
      name: 'Legacy units',
      nodes: [
        {
          id: 'frame-1',
          type: 'frame',
          name: 'Sheet',
          parent: null,
          children: ['rect-2'],
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          fill: '#FFFFFF',
        },
        {
          id: 'rect-2',
          type: 'rect',
          name: 'Margin',
          parent: 'frame-1',
          x: 0,
          y: 0,
          width: 0,
          height: 12,
          strokeWidth: 0,
          stroke: '#000000',
        },
      ],
    },
  },
];

test('shipped migration steps return what they always returned', () => {
  for (const { from, input, output } of SHIPPED_STEPS) {
    const step = MIGRATIONS.find((m) => m.from === from && m.to === from + 1);
    assert.ok(step, `a step from version ${from}`);
    assert.deepEqual(
      step.run(structuredClone(input) as Record<string, unknown>),
      output,
      `step ${from}→${from + 1}`
    );
  }
});

function sampleEditor() {
  const e = createEditor();
  const frame = e.create('frame', {
    name: 'Card',
    x: 0,
    y: 0,
    width: 400,
    height: 300,
  });
  e.create(
    'rect',
    { name: 'Back', x: 10, y: 10, width: 50, height: 40 },
    { parent: frame }
  );
  const group = e.create('group', { name: 'Icons' }, { parent: frame });
  e.create(
    'ellipse',
    { name: 'Dot', x: 100, y: 100, width: 20, height: 20 },
    { parent: group }
  );
  e.create(
    'rect',
    { name: 'Bar', x: 140, y: 100, width: 60, height: 20, rotation: 0.5 },
    { parent: group }
  );
  e.create(
    'text',
    { name: 'Title', text: 'Hello there', x: 20, y: 200 },
    { parent: frame }
  );
  e.create('line', { name: 'Rule', x: 0, y: 320, width: 400 });
  const loose = e.create('rect', {
    name: 'Loose',
    x: 500,
    y: 0,
    width: 80,
    height: 80,
    opacity: 0.5,
  });
  return { e, frame, group, loose };
}

test('every palette command makes at most one history entry per run', () => {
  const setups: ((s: ReturnType<typeof sampleEditor>) => string[])[] = [
    ({ e, frame }) => [...e.doc.children(frame)],
    ({ group, loose }) => [group, loose],
    ({ loose }) => [loose],
    ({ e }) => [...e.doc.children(null)],
  ];
  for (const pick of setups)
    for (const input of [undefined, '150']) {
      const titles = (() => {
        const s = sampleEditor();
        s.e.selection.set(pick(s));
        return s.e.palette.list();
      })();
      for (const title of titles) {
        const s = sampleEditor();
        s.e.selection.set(pick(s));
        const before = s.e.history.size;
        try {
          s.e.palette.run(title, input);
        } catch {
          continue;
        }
        assert.ok(
          s.e.history.size - before <= 1,
          `"${title}" (input ${input}) made ${
            s.e.history.size - before
          } entries`
        );
      }
    }
});
