'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { normalizeBasePath } from '../../../lib/base-path.mjs';
import type { SearchEntry } from '../../../lib/content';
import { search } from '../../../lib/search';

/**
 * Find a page by typing. Opens with the slash key, or with ⌘K / Ctrl+K.
 *
 * Every page and README is scored in the browser against the static index the
 * build emits. The index is fetched only when search first opens.
 */
const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function SearchDialog() {
  const router = useRouter();
  const [entries, setEntries] = useState<SearchEntry[]>();
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const activeHit = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement>(null);
  const requested = useRef(false);

  const hits = useMemo(() => search(entries ?? [], input), [entries, input]);

  const reset = useCallback(() => {
    setOpen(false);
    setInput('');
    setCursor(0);
  }, []);

  const openDialog = useCallback(() => {
    if (!open) {
      const focused = document.activeElement;
      previousFocus.current =
        focused instanceof HTMLElement && focused !== document.body
          ? focused
          : opener.current;
    }
    setOpen(true);
  }, [open]);

  const close = useCallback(() => {
    if (dialog.current?.open) dialog.current.close();
    reset();
    const target = previousFocus.current;
    previousFocus.current = null;
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
      else opener.current?.focus();
    });
  }, [reset]);

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
        openDialog();
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDialog]);

  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    if (!node.open) node.showModal();
    field.current?.focus();

    return () => {
      if (node.open) node.close();
    };
  }, [open]);

  useEffect(() => {
    if (!open || entries !== undefined || requested.current) return;
    requested.current = true;
    setLoadError('');
    const controller = new AbortController();

    fetch(`${basePath}/search-index.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Search index returned ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((nextEntries) => {
        if (!isSearchEntries(nextEntries))
          throw new Error('Search index returned invalid entries');
        setLoadError('');
        setEntries(nextEntries);
      })
      .catch((error: unknown) => {
        requested.current = false;
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setLoadError(
          'Search index failed to load. Reload the page and try again.'
        );
      });

    return () => {
      requested.current = false;
      controller.abort();
    };
  }, [entries, open]);

  useEffect(() => {
    if (!open) return;
    activeHit.current?.scrollIntoView({ block: 'nearest' });
  }, [cursor, hits, open]);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const onFieldKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (hits.length === 0) return;
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
      <button
        ref={opener}
        type="button"
        className="fb-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openDialog}
      >
        Search <kbd className="fb-button__hint">/</kbd>
      </button>

      <dialog
        ref={dialog}
        className="fb-overlay"
        aria-labelledby="docs-search-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={reset}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="fb-search">
          <div className="fb-search__header">
            <label className="fb-search__prompt">
              <span id="docs-search-title" className="fb-sr-only">
                Search the documentation
              </span>
              <span aria-hidden>{'>'}</span>
              <input
                ref={field}
                role="combobox"
                aria-autocomplete="list"
                aria-controls="docs-search-results"
                aria-expanded="true"
                aria-activedescendant={
                  hits[cursor] ? `docs-search-hit-${cursor}` : undefined
                }
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
            </label>

            <button
              type="button"
              className="fb-button fb-search__close"
              onClick={close}
              aria-label="Close search"
            >
              Close
            </button>
          </div>

          <ul
            id="docs-search-results"
            className="fb-search__results"
            role="listbox"
            aria-label="Search results"
          >
            {hits.map((hit, index) => (
              <li key={hit.entry.href} role="none">
                <button
                  ref={index === cursor ? activeHit : undefined}
                  id={`docs-search-hit-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === cursor}
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
                  <span className="fb-search__hit-snippet">{hit.snippet}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="fb-search__footer" role="status" aria-live="polite">
            {loadError ||
              (entries === undefined
                ? 'Loading pages…'
                : input.length === 0
                ? `${entries.length} pages · ↑↓ to move · ↵ to open · esc to close`
                : `${hits.length} match${hits.length === 1 ? '' : 'es'}`)}
          </p>
        </div>
      </dialog>
    </>
  );
}

function isSearchEntries(value: unknown): value is SearchEntry[] {
  return Array.isArray(value) && value.every(isSearchEntry);
}

function isSearchEntry(value: unknown): value is SearchEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    isNonBlankString(entry.id) &&
    isNonBlankString(entry.title) &&
    isNonBlankString(entry.href) &&
    (entry.kind === 'guide' || entry.kind === 'package') &&
    isNonBlankString(entry.group) &&
    typeof entry.summary === 'string' &&
    typeof entry.body === 'string'
  );
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
