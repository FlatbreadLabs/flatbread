'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ElementType } from 'react';

interface SplitTextProps {
  text: string;
  /** Animate one word at a time, or one character at a time. */
  by?: 'word' | 'char';
  /** Seconds between neighbouring pieces. */
  stagger?: number;
  /** Seconds to wait before the first piece moves. */
  delay?: number;
  as?: ElementType;
  className?: string;
}

/**
 * Reveal a line of text piece by piece.
 *
 * Motion's own `splitText` belongs to Motion+, a paid membership served from a
 * private registry. A public repository cannot install it without handing a
 * secret to CI, so the site splits text itself.
 *
 * Two details matter and are easy to get wrong. The whole string stays in
 * `aria-label` so a screen reader hears a sentence rather than a stream of
 * letters, and each piece is `inline-block` so it can actually be moved —
 * transforms do nothing to an inline element.
 */
export function SplitText({
  text,
  by = 'char',
  stagger = 0.018,
  delay = 0,
  as: Tag = 'span',
  className,
}: SplitTextProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion.create(Tag);

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  const words = text.split(' ');

  return (
    <MotionTag
      className={className}
      aria-label={text}
      initial="hidden"
      animate="shown"
      transition={{ staggerChildren: stagger, delayChildren: delay }}
    >
      {words.map((word, wordIndex) => (
        <span
          key={`${word}-${wordIndex}`}
          aria-hidden
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
        >
          {by === 'word' ? (
            <Piece>{word}</Piece>
          ) : (
            Array.from(word).map((character, index) => (
              <Piece key={`${character}-${index}`}>{character}</Piece>
            ))
          )}
          {wordIndex < words.length - 1 ? <Piece> </Piece> : null}
        </span>
      ))}
    </MotionTag>
  );
}

function Piece({ children }: { children: string }) {
  return (
    <motion.span
      style={{ display: 'inline-block', whiteSpace: 'pre' }}
      variants={{
        hidden: { opacity: 0, y: '0.45em' },
        shown: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.34, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.span>
  );
}
