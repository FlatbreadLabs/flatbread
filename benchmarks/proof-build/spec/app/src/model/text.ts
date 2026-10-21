import type { TextNode } from './types.ts';

/** Average glyph advance as a share of the font size. */
export const GLYPH_ADVANCE = 0.6;

export function measureLine(line: string, fontSize: number): number {
  return line.length * fontSize * GLYPH_ADVANCE;
}

/**
 * Breaks `text` into lines no wider than `width`, at spaces where it can and
 * inside a word when one word is wider than the box. Newlines always break.
 */
export function wrapLines(
  text: string,
  width: number,
  fontSize: number
): string[] {
  const perLine = Math.max(1, Math.floor(width / (fontSize * GLYPH_ADVANCE)));
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      let rest = word;
      while (rest.length > perLine) {
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(rest.slice(0, perLine));
        rest = rest.slice(perLine);
      }
      const candidate = line ? `${line} ${rest}` : rest;
      if (candidate.length > perLine) {
        out.push(line);
        line = rest;
      } else line = candidate;
    }
    out.push(line);
  }
  return out;
}

export function lineCount(
  node: Pick<TextNode, 'text' | 'width' | 'fontSize'>
): number {
  return wrapLines(node.text, node.width, node.fontSize).length;
}

/** The height a text box needs for its wrapped lines. */
export function autoHeight(
  node: Pick<TextNode, 'text' | 'width' | 'fontSize' | 'lineHeight'>
): number {
  return lineCount(node) * node.fontSize * node.lineHeight;
}

export function isBlank(text: string): boolean {
  return text.trim().length === 0;
}
