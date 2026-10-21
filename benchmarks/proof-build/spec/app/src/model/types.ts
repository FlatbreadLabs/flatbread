// The document model. Coordinates are absolute page coordinates, so a child
// does not move when its parent's numbers are read; moving a container moves
// its descendants through the move command.

export type NodeType = 'frame' | 'rect' | 'ellipse' | 'line' | 'text' | 'group';

export interface Paint {
  /** `#RRGGBB`, upper case. */
  color: string;
}

export type StrokeAlign = 'inside' | 'center' | 'outside';

export interface Stroke {
  color: string;
  width: number;
  align: StrokeAlign;
}

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  parent: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Radians, clockwise, about the node's centre. */
  rotation: number;
  visible: boolean;
  locked: boolean;
}

export interface Styled {
  fills: Paint[];
  strokes: Stroke[];
  opacity: number;
}

export interface RectNode extends BaseNode, Styled {
  type: 'rect';
}

export interface EllipseNode extends BaseNode, Styled {
  type: 'ellipse';
}

export interface LineNode extends BaseNode, Styled {
  type: 'line';
}

export interface FrameNode extends BaseNode, Styled {
  type: 'frame';
  children: string[];
  clip: boolean;
}

export type TextAlign = 'left' | 'center' | 'right';

export interface TextNode extends BaseNode, Styled {
  type: 'text';
  text: string;
  fontSize: number;
  lineHeight: number;
  align: TextAlign;
}

export interface GroupNode extends BaseNode {
  type: 'group';
  children: string[];
  opacity: number;
}

export type SceneNode =
  | RectNode
  | EllipseNode
  | LineNode
  | FrameNode
  | TextNode
  | GroupNode;

export type ContainerNode = FrameNode | GroupNode;

export interface DocumentData {
  name: string;
  /** Top-level ids, back to front (paint order). */
  top: string[];
  nodes: Record<string, SceneNode>;
}

export const NODE_TYPES: readonly NodeType[] = [
  'frame',
  'rect',
  'ellipse',
  'line',
  'text',
  'group',
];

export function isContainer(node: SceneNode): node is ContainerNode {
  return node.type === 'frame' || node.type === 'group';
}

export function isStyled(
  node: SceneNode
): node is Exclude<SceneNode, GroupNode> {
  return node.type !== 'group';
}

export function isText(node: SceneNode): node is TextNode {
  return node.type === 'text';
}
