'use client';

import { nodeColor } from '@/lib/oklch';
import type { GraphNodeKind } from '@/lib/types';
import { useTheme } from '../hooks/useTheme';

const KINDS: Array<{ kind: GraphNodeKind; label: string }> = [
  { kind: 'effort', label: 'Effort' },
  { kind: 'issue', label: 'Issue' },
  { kind: 'finding', label: 'Finding' },
  { kind: 'decision', label: 'Decision' },
  { kind: 'constraint', label: 'Constraint' },
  { kind: 'risk', label: 'Risk' },
];

/** Neutral sample effort id so legend swatches show kind lightness offsets. */
const LEGEND_SAMPLE_EFFORT = 'eff-legend-sample';

const SIZE_CLASS: Record<GraphNodeKind, string> = {
  effort: 'size-2.5',
  issue: 'size-1.5',
  finding: 'size-1.5',
  decision: 'size-1.5',
  constraint: 'size-1.5',
  risk: 'size-1.5',
};

export function Legend() {
  const { mode } = useTheme();

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-background/70 px-3 py-2 text-[11px] text-muted backdrop-blur-md">
      {KINDS.map(({ kind, label }) => {
        const swatch = nodeColor(LEGEND_SAMPLE_EFFORT, kind, mode).css;
        return (
          <div key={kind} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`${SIZE_CLASS[kind]} rounded-full`}
              style={{ background: swatch }}
            />
            <span className="text-foreground/80">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
