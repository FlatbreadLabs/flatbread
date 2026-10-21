import type { IdSource } from '../util/ids.ts';
import type {
  EllipseNode,
  FrameNode,
  GroupNode,
  LineNode,
  NodeType,
  RectNode,
  SceneNode,
  TextNode,
} from './types.ts';
import { DEFAULT_FILL } from './style.ts';

const NAMES: Record<NodeType, string> = {
  frame: 'Frame',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  text: 'Text',
  group: 'Group',
};

const PREFIX: Record<NodeType, string> = {
  frame: 'frame',
  rect: 'rect',
  ellipse: 'ellipse',
  line: 'line',
  text: 'text',
  group: 'group',
};

function base(ids: IdSource, type: NodeType) {
  const id = ids.next(PREFIX[type]);
  return {
    id,
    type,
    name: `${NAMES[type]} ${id.split('-')[1]}`,
    parent: null,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    visible: true,
    locked: false,
  };
}

function styled() {
  return { fills: [{ color: DEFAULT_FILL }], strokes: [], opacity: 1 };
}

export function createRect(
  ids: IdSource,
  props: Partial<RectNode> = {}
): RectNode {
  return {
    ...base(ids, 'rect'),
    ...styled(),
    ...props,
    type: 'rect',
  } as RectNode;
}

export function createEllipse(
  ids: IdSource,
  props: Partial<EllipseNode> = {}
): EllipseNode {
  return {
    ...base(ids, 'ellipse'),
    ...styled(),
    ...props,
    type: 'ellipse',
  } as EllipseNode;
}

export function createLine(
  ids: IdSource,
  props: Partial<LineNode> = {}
): LineNode {
  return {
    ...base(ids, 'line'),
    ...styled(),
    height: 0,
    fills: [],
    strokes: [{ color: '#000000', width: 1, align: 'center' }],
    ...props,
    type: 'line',
  } as LineNode;
}

export function createFrame(
  ids: IdSource,
  props: Partial<FrameNode> = {}
): FrameNode {
  return {
    ...base(ids, 'frame'),
    ...styled(),
    fills: [{ color: '#FFFFFF' }],
    width: 400,
    height: 300,
    children: [],
    clip: true,
    ...props,
    type: 'frame',
  } as FrameNode;
}

export function createText(
  ids: IdSource,
  props: Partial<TextNode> = {}
): TextNode {
  return {
    ...base(ids, 'text'),
    ...styled(),
    fills: [{ color: '#000000' }],
    width: 120,
    height: 20,
    text: 'Text',
    fontSize: 16,
    lineHeight: 1.25,
    align: 'left',
    ...props,
    type: 'text',
  } as TextNode;
}

export function createGroup(
  ids: IdSource,
  props: Partial<GroupNode> = {}
): GroupNode {
  return {
    ...base(ids, 'group'),
    children: [],
    opacity: 1,
    ...props,
    type: 'group',
  } as GroupNode;
}

export function createNode(
  ids: IdSource,
  type: NodeType,
  props: Partial<SceneNode> = {}
): SceneNode {
  switch (type) {
    case 'rect':
      return createRect(ids, props as Partial<RectNode>);
    case 'ellipse':
      return createEllipse(ids, props as Partial<EllipseNode>);
    case 'line':
      return createLine(ids, props as Partial<LineNode>);
    case 'frame':
      return createFrame(ids, props as Partial<FrameNode>);
    case 'text':
      return createText(ids, props as Partial<TextNode>);
    case 'group':
      return createGroup(ids, props as Partial<GroupNode>);
  }
}
