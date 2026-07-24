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
  /** Optional slug→id resolver so wiki-style links can drive graph selection. */
  onNavigate?: (target: string) => void;
  className?: string;
}

function isInternalHref(href: string): boolean {
  if (href.startsWith('#')) return true;
  if (href.startsWith('/')) return true;
  if (!href.includes('://') && !href.startsWith('mailto:')) return true;
  return false;
}

function normalizeNavigateTarget(href: string): string {
  const withoutHash = href.split('#')[0] ?? href;
  const segment = withoutHash.replace(/^\//, '').split('/').pop() ?? withoutHash;
  return segment.replace(/\.md$/i, '');
}

export function MarkdownSurface({
  value,
  editable = false,
  onChange,
  onNavigate,
  className = '',
}: MarkdownSurfaceProps) {
  if (editable && onChange) {
    // Future editor plugs in here with the same prop contract.
  }

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
            const internal = isInternalHref(target);
            if (internal && onNavigate) {
              return (
                <button
                  type="button"
                  onClick={() => onNavigate(normalizeNavigateTarget(target))}
                  className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                >
                  {children}
                </button>
              );
            }
            return (
              <a
                href={target}
                className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                {...(!internal
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {children}
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
