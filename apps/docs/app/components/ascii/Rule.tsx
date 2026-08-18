interface RuleProps {
  char?: string;
  className?: string;
}

/**
 * A horizontal rule made of real characters.
 *
 * The string is longer than any sensible screen and the container clips it, so
 * the rule fills its width without any measuring.
 */
export function Rule({ char = '─', className }: RuleProps) {
  return (
    <div
      aria-hidden
      className={['fb-rule', className].filter(Boolean).join(' ')}
    >
      {char.repeat(400)}
    </div>
  );
}
