'use client';

import { useAnimationFrame, useReducedMotion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';

const NOISE = '#$%&@*+=<>/\\|_~^';

interface DecodeProps {
  text: string;
  /** Seconds from the first character settling to the last. */
  duration?: number;
  className?: string;
}

/**
 * Resolve a line of text out of noise, one cell at a time.
 *
 * Each character spends a moment cycling through punctuation before it lands
 * on the real letter. Because the font is monospaced, nothing reflows while it
 * runs — the line holds its exact width from the first frame.
 *
 * This is the one openly showy moment on the site, and it plays once.
 */
export function Decode({ text, duration = 0.9, className }: DecodeProps) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(() => text);
  const started = useRef<number | undefined>(undefined);
  const done = useRef(false);

  // Characters settle left to right, with the last one landing at `duration`.
  const settleAt = useMemo(
    () =>
      Array.from(text).map(
        (_, index) => (index / Math.max(text.length - 1, 1)) * duration
      ),
    [text, duration]
  );

  useAnimationFrame((time) => {
    if (reduced || done.current) return;
    started.current ??= time;

    const elapsed = (time - started.current) / 1000;
    if (elapsed >= duration) {
      done.current = true;
      setFrame(text);
      return;
    }

    setFrame(
      Array.from(text)
        .map((character, index) => {
          if (elapsed >= settleAt[index] || character === ' ') return character;
          return NOISE[Math.floor(Math.random() * NOISE.length)];
        })
        .join('')
    );
  });

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{reduced ? text : frame}</span>
    </span>
  );
}
