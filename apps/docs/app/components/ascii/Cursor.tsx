/**
 * A blinking block, the way a terminal marks where it is.
 *
 * The blink is a CSS animation rather than a script, so it costs nothing and
 * stops on its own for anyone who asks for less motion.
 */
export function Cursor({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={['fb-cursor', className].filter(Boolean).join(' ')}
    >
      ▮
    </span>
  );
}
