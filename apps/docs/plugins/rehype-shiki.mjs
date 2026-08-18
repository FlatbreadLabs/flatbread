import { codeToHast } from 'shiki';

import { walk } from './walk.mjs';

const LANGUAGE_CLASS = /^language-(.+)$/;

/**
 * Colour every fenced code block with Shiki while the page is built.
 *
 * Flatbread awaits the markdown processor, so this transformer may be async.
 * It runs after `rehype-sanitize`, which is why the inline colours it adds
 * survive.
 *
 * Both themes are emitted as CSS variables. `app/globals.css` picks one by
 * reading the site's colour scheme, so switching themes needs no rebuild.
 */
export function rehypeShiki(options = {}) {
  const themes = options.themes ?? {
    light: 'vitesse-light',
    dark: 'vitesse-dark',
  };

  return async (tree) => {
    const blocks = [];

    walk(tree, (node, index, parent) => {
      if (node.type !== 'element' || node.tagName !== 'pre') return;
      const code = (node.children ?? []).find(
        (child) => child.type === 'element' && child.tagName === 'code'
      );
      if (!code || index === undefined || !parent) return;
      blocks.push({ index, parent, code });
    });

    for (const { index, parent, code } of blocks) {
      const lang = languageOf(code);
      const source = textOf(code).replace(/\n$/, '');
      if (!source) continue;

      let highlighted;
      try {
        highlighted = await codeToHast(source, {
          lang: lang ?? 'text',
          themes,
          defaultColor: false,
        });
      } catch {
        // An unknown language is not worth failing a build over.
        highlighted = await codeToHast(source, {
          lang: 'text',
          themes,
          defaultColor: false,
        });
      }

      const pre = highlighted.children.find(
        (child) => child.type === 'element' && child.tagName === 'pre'
      );
      if (!pre) continue;

      pre.properties = pre.properties ?? {};
      if (lang) pre.properties['data-language'] = lang;
      const title =
        code.properties?.['data-title'] ?? code.properties?.dataTitle;
      if (title) pre.properties['data-title'] = title;

      parent.children[index] = pre;
    }
  };
}

function languageOf(code) {
  const classes = code.properties?.className ?? [];
  for (const name of Array.isArray(classes) ? classes : [classes]) {
    const match = LANGUAGE_CLASS.exec(String(name));
    if (match) return match[1];
  }
  return undefined;
}

function textOf(node) {
  let text = '';
  walk(node, (child) => {
    if (child.type === 'text') text += child.value ?? '';
  });
  return text;
}

export default rehypeShiki;
