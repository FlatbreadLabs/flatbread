interface RuleProps {
  className?: string;
}

/** Separates the main regions of the page. */
export function Rule({ className }: RuleProps) {
  return (
    <hr
      aria-hidden
      className={['fb-rule', className].filter(Boolean).join(' ')}
    />
  );
}
