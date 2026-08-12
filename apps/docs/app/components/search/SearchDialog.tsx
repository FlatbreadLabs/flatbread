'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SearchEntry } from '../../../lib/content';
import { search } from '../../../lib/search';
import { Cursor } from '../ascii/Cursor';

/**
 * Find a page by typing. Opens with the slash key, or with ⌘K / Ctrl+K.
 *
 * Every page and README is scored in the browser against the list the build
 * baked in, so there is no request and no index file to keep in step.
 */
export function SearchDialog({ entries }: { entries: SearchEntry[] }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0);
  const field = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => search(entries, input), [entries, input]);

  const close = useCallback(() => {
    setOpen(false);
    setInput('');
    setCursor(0);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(event.target.tagName);

      if (
        (event.key === 'k' && (event.metaKey || event.ctrlKey)) ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (event.key === 'Escape') close();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const onFieldKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((index) => Math.min(index + 1, hits.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((index) => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter' && hits[cursor]) {
      event.preventDefault();
      go(hits[cursor].entry.href);
    }
  };

  return (
    <>
      <button type="button" className="fb-button" onClick={() => setOpen(true)}>
        [search <span className="fb-button__hint">/</span>]
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fb-overlay"
            initial={reduced ? undefined : { opacity: 0 }}
            animate={reduced ? undefined : { opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.12 }}
            onMouseDown={close}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search the documentation"
              className="fb-search"
              initial={reduced ? undefined : { opacity: 0, y: -8 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <label className="fb-search__prompt">
                <span aria-hidden>{'>'}</span>
                <input
                  ref={field}
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    setCursor(0);
                  }}
                  onKeyDown={onFieldKey}
                  placeholder="find a page"
                  className="fb-search__field"
                  autoComplete="off"
                  spellCheck={false}
                />
                {input.length === 0 ? <Cursor /> : null}
              </label>

              <ul className="fb-search__results">
                {hits.map((hit, index) => (
                  <li key={hit.entry.href}>
                    <button
                      type="button"
                      data-active={index === cursor ? '' : undefined}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => go(hit.entry.href)}
                      className="fb-search__hit"
                    >
                      <span className="fb-search__hit-title">
                        {hit.entry.title}
                        <span className="fb-search__hit-group">
                          {hit.entry.group}
                        </span>
                      </span>
                      <span className="fb-search__hit-snippet">
                        {hit.snippet}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <p className="fb-search__footer">
                {input.length === 0
                  ? `${entries.length} pages · ↑↓ to move · ↵ to open · esc to close`
                  : `${hits.length} match${hits.length === 1 ? '' : 'es'}`}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
