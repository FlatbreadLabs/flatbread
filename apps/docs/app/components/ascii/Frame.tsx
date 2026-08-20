import type { ReactNode } from 'react';

interface FrameProps {
  /** Names the section. */
  label?: ReactNode;
  /** Adds a count or short note to the section heading. */
  note?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Groups a named section of a page. */
export function Frame({ label, note, className, children }: FrameProps) {
  return (
    <section className={['fb-frame', className].filter(Boolean).join(' ')}>
      {label ? <h2 className="fb-frame__label">{label}</h2> : null}
      {note ? <p className="fb-frame__note">{note}</p> : null}

      <div className="fb-frame__body">{children}</div>
    </section>
  );
}
