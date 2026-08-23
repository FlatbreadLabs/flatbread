import type { ReactNode } from 'react';

type AsciiRuleProps = {
  label?: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  children?: ReactNode;
};

/**
 * A horizontal rule built from box-drawing characters with an inline label,
 * e.g. `──[ CONCEPTS ]──`. Rendered as flexbox + borders so it stays crisp at
 * any width and copies as plain text.
 */
export function AsciiRule({
  label,
  align = 'left',
  className,
  children,
}: AsciiRuleProps) {
  return (
    <div
      className={`ascii-rule ${className ?? ''}`}
      data-align={align}
      aria-hidden={Boolean(label) ? undefined : true}
    >
      {label ? (
        <span className="ascii-rule__label">
          <span className="ascii-rule__bracket">[</span>
          {` ${label} `}
          <span className="ascii-rule__bracket">]</span>
        </span>
      ) : null}
      {children}
    </div>
  );
}
