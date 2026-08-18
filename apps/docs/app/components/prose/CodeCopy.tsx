'use client';

import { useEffect } from 'react';

/**
 * Put a copy button on every code block.
 *
 * Flatbread hands the page one string of HTML, so there is no React element to
 * hang a button on. This walks the rendered block once after mount and adds
 * one. Using MDX instead would mean parsing the Markdown outside Flatbread,
 * which is the opposite of what this site is meant to show.
 */
export function CodeCopy({ scope }: { scope: string }) {
  useEffect(() => {
    const root = document.querySelector(scope);
    if (!root) return;

    const cleanups: Array<() => void> = [];

    root.querySelectorAll('pre').forEach((block) => {
      if (block.querySelector('.fb-copy')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fb-copy';
      button.textContent = '[copy]';
      button.setAttribute('aria-label', 'Copy this code');

      let reset: ReturnType<typeof setTimeout> | undefined;

      const onClick = async () => {
        const code = block.querySelector('code')?.textContent ?? '';
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = '[copied]';
          button.dataset.done = '';
        } catch {
          button.textContent = '[press ⌘C]';
        }
        clearTimeout(reset);
        reset = setTimeout(() => {
          button.textContent = '[copy]';
          delete button.dataset.done;
        }, 1600);
      };

      button.addEventListener('click', onClick);
      block.append(button);

      cleanups.push(() => {
        clearTimeout(reset);
        button.removeEventListener('click', onClick);
        button.remove();
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [scope]);

  return null;
}
