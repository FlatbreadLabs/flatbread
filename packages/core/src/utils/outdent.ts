/**
 * when used as a template literal tag will remove the indentation that exists from the code block indentation
 *
 */

export function outdent(
  strings: TemplateStringsArray,
  ...values: string[]
): string {
  const result = strings
    .map((s, i) => s + (values[i] ?? ''))
    .join('')
    .trim();
  const matches = Array.from(result.matchAll(/\n(\s+)/gs));
  const minimumIndent =
    matches.map((match) => match[1]).sort((a, b) => a.length - b.length)?.[0]
      ?.length ?? 0;
  const replacer = new RegExp(`\\n\\s{${minimumIndent}}`, 'g');

  return result.replace(replacer, '\n');
}
