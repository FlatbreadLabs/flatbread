/**
 * Generate an excerpt from plaintext.
 * @param text The text to generate an excerpt from.
 * @param length The length of the excerpt.
 */
export default function createExcerpt(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }
  return text.slice(0, length) + `…`;
}
