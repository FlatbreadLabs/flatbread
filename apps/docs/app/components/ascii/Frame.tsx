import type { ReactNode } from 'react';

interface FrameProps {
  /** Sits in the top rule, the way a filename sits in a box-drawn panel. */
  label?: ReactNode;
  /** Sits at the right of the top rule. Use it for counts and short notes. */
  note?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * A panel drawn as a box.
 *
 * The four sides are ordinary one-pixel borders so they stay crisp at any zoom
 * and any width. Only the corners are real box-drawing characters, sitting on
 * top of the border. A panel built entirely from characters comes apart the
 * moment the container is resized; this does not.
 */
export function Frame({ label, note, className, children }: FrameProps) {
  return (
    <section className={['fb-frame', className].filter(Boolean).join(' ')}>
      <span aria-hidden className="fb-frame__corner fb-frame__corner--tl">
        ┌
      </span>
      <span aria-hidden className="fb-frame__corner fb-frame__corner--tr">
        ┐
      </span>
      <span aria-hidden className="fb-frame__corner fb-frame__corner--bl">
        └
      </span>
      <span aria-hidden className="fb-frame__corner fb-frame__corner--br">
        ┘
      </span>

      {label ? <p className="fb-frame__label">{label}</p> : null}
      {note ? <p className="fb-frame__note">{note}</p> : null}

      <div className="fb-frame__body">{children}</div>
    </section>
  );
}
