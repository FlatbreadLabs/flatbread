'use client';

import { useId, useState } from 'react';

import { nodeColor } from '@/lib/oklch';
import type { GraphNodeKind } from '@/lib/types';
import { useTheme } from '../hooks/useTheme';
import {
  NODE_KINDS,
  RELATION_GROUP_LABEL,
  RELATION_LEGEND_ROWS,
  RELATION_META,
  RelationLineSample,
  lifecycleBadge,
} from './RelationLegend';

/** Neutral sample effort id so legend swatches match canvas kind offsets. */
const LEGEND_SAMPLE_EFFORT = 'eff-legend-sample';

const SIZE_CLASS: Record<GraphNodeKind, string> = {
  effort: 'size-2.5',
  issue: 'size-2',
  finding: 'size-2',
  decision: 'size-2',
  constraint: 'size-2',
  risk: 'size-2',
};

export function Legend() {
  const { mode } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const panelId = useId();

  return (
    <div className="pointer-events-auto max-w-[min(100vw-2rem,28rem)] rounded-lg border border-border bg-background/80 text-[11px] text-muted shadow-sm backdrop-blur-md">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left sm:pointer-events-none sm:cursor-default"
        aria-expanded={!collapsed}
        aria-controls={panelId}
        onClick={() => setCollapsed((open) => !open)}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/80">
          Legend
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted sm:hidden">
          {collapsed ? 'Show' : 'Hide'}
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <div
        id={panelId}
        className={`flex flex-col gap-3 border-t border-border/70 px-3 pb-3 pt-2 ${collapsed ? 'hidden sm:flex' : 'flex'}`}
      >
        <section>
          <h3 className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-muted">
            Node kinds
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {NODE_KINDS.map(({ kind, label }) => {
              const swatch = nodeColor(LEGEND_SAMPLE_EFFORT, kind, mode).css;
              return (
                <div key={kind} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`${SIZE_CLASS[kind]} shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10`}
                    style={{ background: swatch }}
                  />
                  <span className="text-foreground/80">{label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-muted">
            Decision states
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                'proposed',
                'accepted',
                'rejected',
                'superseded',
              ] as const
            ).map((state) => {
              const badge = lifecycleBadge(state);
              if (!badge) return null;
              return (
                <span
                  key={state}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] ${badge.className}`}
                >
                  {badge.label}
                </span>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-muted">
            Relations
          </h3>
          <ul className="flex flex-col gap-1.5">
            {RELATION_LEGEND_ROWS.map(({ group, sampleKind }) => {
              const meta = RELATION_META[sampleKind];
              return (
                <li key={group} className="flex items-start gap-2">
                  <RelationLineSample meta={meta} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-foreground/85">
                      {RELATION_GROUP_LABEL[group]}
                    </div>
                    <div className="text-[10px] leading-snug text-muted">
                      {meta.description}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
