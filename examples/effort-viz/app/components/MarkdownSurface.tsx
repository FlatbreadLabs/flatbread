'use client';

import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export interface MarkdownSurfaceProps {
  /** Raw markdown source (from `_content.raw`). */
  value: string;
  /** Reserved for a future editing surface; ignored while readonly. */
  editable?: boolean;
  onChange?: (next: string) => void;
  /**
   * Resolve a link target to a record id, or null when it points somewhere
   * else. Links only become in-graph navigation when this resolves — an
   * unresolvable target has to stay a real anchor rather than degrade into a
   * button that silently does nothing.
   */
  resolveRecord?: (target: string) => string | null;
  onNavigate?: (id: string) => void;
  className?: string;
}

/** True for anything with its own URL scheme: http, mailto, tel, and friends. */
function hasScheme(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

function normalizeNavigateTarget(href: string): string {
  const withoutHash = href.split('#')[0] ?? href;
  const segment = withoutHash.replace(/^\//, '').split('/').pop() ?? withoutHash;
  return segment.replace(/\.md$/i, '');
}

const LINK_CLASS =
  'text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm';

export function MarkdownSurface({
  value,
  resolveRecord,
  onNavigate,
  className = '',
}: MarkdownSurfaceProps) {
  return (
    <div
      className={`markdown-surface text-[13px] leading-[1.65] text-foreground/90 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-1 text-lg font-semibold tracking-tight text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 border-b border-border/60 pb-1 text-base font-semibold tracking-tight text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-4 text-sm font-semibold text-foreground first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-3 text-sm font-medium text-foreground first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-[13px] text-foreground/88 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-foreground/88 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-foreground/88 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children, className: liClassName }) => (
            <li
              className={`text-[13px] leading-relaxed ${liClassName ?? ''}`.trim()}
            >
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-accent/40 bg-muted/10 py-1 pl-3 text-foreground/75 last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border/70" />,
          a: ({ href, children }) => {
            const target = href ?? '';
            const recordId =
              target && !target.startsWith('#') && !hasScheme(target) && resolveRecord
                ? resolveRecord(normalizeNavigateTarget(target))
                : null;

            if (recordId && onNavigate) {
              return (
                <button
                  type="button"
                  onClick={() => onNavigate(recordId)}
                  className={LINK_CLASS}
                >
                  {children}
                </button>
              );
            }

            const external = hasScheme(target) && !target.startsWith('mailto:');
            return (
              <a
                href={target}
                className={LINK_CLASS}
                {...(external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {children}
                {external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            );
          },
          code: ({ className: codeClassName, children, ...props }) => {
            const isBlock = Boolean(codeClassName);
            if (isBlock) {
              return (
                <code
                  className={`block overflow-x-auto rounded-md bg-muted/25 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground ${codeClassName}`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-muted/30 px-1 py-0.5 font-mono text-[11px] text-foreground"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-lg border border-border/50 bg-muted/20 p-3 last:mb-0">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
              <table className="w-full min-w-[16rem] border-collapse text-left text-[12px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border bg-muted/15 text-foreground">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1.5 font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-t border-border/50 px-2 py-1.5 text-foreground/85">
              {children}
            </td>
          ),
          input: ({
            type,
            checked,
            disabled,
            ...props
          }: ComponentPropsWithoutRef<'input'>) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled
                  readOnly
                  className="mr-2 align-middle accent-accent"
                  {...props}
                />
              );
            }
            return <input type={type} disabled={disabled} {...props} />;
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/85">{children}</em>
          ),
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
