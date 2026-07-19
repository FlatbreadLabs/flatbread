'use client';

import type { GraphNodeKind } from '@/lib/types';

const KINDS: Array<{ kind: GraphNodeKind; label: string }> = [
  { kind: 'effort', label: 'Effort' },
  { kind: 'issue', label: 'Issue' },
  { kind: 'finding', label: 'Finding' },
  { kind: 'decision', label: 'Decision' },
  { kind: 'constraint', label: 'Constraint' },
  { kind: 'risk', label: 'Risk' },
];

const SIZE_CLASS: Record<GraphNodeKind, string> = {
  effort: 'size-2.5',
  issue: 'size-1.5',
  finding: 'size-1.5',
  decision: 'size-1.5',
  constraint: 'size-1.5',
  risk: 'size-1.5',
};

export function Legend() {
  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-background/70 px-3 py-2 text-[11px] text-muted backdrop-blur-md">
      {KINDS.map(({ kind, label }) => (
        <div key={kind} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`${SIZE_CLASS[kind]} rounded-full border border-border bg-muted/40`}
          />
          <span className="text-foreground/80">{label}</span>
        </div>
      ))}
    </div>
  );
}
