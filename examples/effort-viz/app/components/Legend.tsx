'use client';

import { useId, useState } from 'react';

import { effortColor, oklchCss, retiredOklch, structuralOklch } from '@/lib/oklch';
import { PRIMITIVES, PRIMITIVE_ORDER, primitiveOklch } from '@/lib/primitives';
import type { GraphNode } from '@/lib/types';
import { useTheme } from '../hooks/useTheme';
import {
  PrimitiveGlyph,
  RELATION_GROUP_LABEL,
  RELATION_GROUP_SAMPLE,
  RELATION_META,
  RelationLineSample,
  relationStrokeOklch,
  type RelationGroupId,
} from './RelationLegend';

interface LegendProps {
  /** Effort hubs currently in the graph, so the cluster key reflects reality. */
  efforts: GraphNode[];
  /** Relation groups present in this generation — the key never over-promises. */
  presentGroups: Set<RelationGroupId>;
}

export function Legend({ efforts, presentGroups }: LegendProps) {
  const { mode } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const panelId = useId();

  const relationRows = (
    Object.keys(RELATION_GROUP_LABEL) as RelationGroupId[]
  ).filter((group) => presentGroups.has(group));

  return (
    <div className="pointer-events-auto flex max-h-full w-[15.5rem] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-border bg-background/85 text-[12px] text-muted shadow-sm backdrop-blur-md">
      <button
        type="button"
        className="flex min-h-11 shrink-0 items-center justify-between gap-2 rounded-t-xl px-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:min-h-0 sm:cursor-default sm:py-2.5"
        aria-expanded={collapsed ? false : true}
        aria-controls={panelId}
        onClick={() => setCollapsed((open) => !open)}
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/80">
          Legend
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] text-muted sm:hidden">
          {collapsed ? 'Show' : 'Hide'}
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-150 ease-in-out motion-reduce:transition-none ${
              collapsed ? '' : 'rotate-180'
            }`}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/*
        Scrolls internally rather than growing past the viewport: the key is
        pinned to the bottom-left, so an over-tall panel silently loses its
        last sections off the bottom edge.
      */}
      <div
        id={panelId}
        className={`min-h-0 flex-col gap-3.5 overflow-y-auto overscroll-contain border-t border-border/70 px-3.5 pb-3.5 pt-3 ${
          collapsed ? 'hidden sm:flex' : 'flex'
        }`}
      >
        <section>
          <SectionHeading>Primitives</SectionHeading>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            {PRIMITIVE_ORDER.map((kind) => (
              <li key={kind} className="flex items-center gap-1.5">
                {/* Neutral core here — a hue would imply Efforts have one. */}
                <PrimitiveGlyph
                  kind={kind}
                  mode={mode}
                  size={13}
                  core={
                    kind === 'effort'
                      ? oklchCss(structuralOklch(mode === 'light' ? 'dark' : 'light'))
                      : undefined
                  }
                />
                <span className="truncate text-foreground/85">
                  {PRIMITIVES[kind].label}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] leading-snug text-muted">
            Shape and colour both mark the primitive.
          </p>
        </section>

        <section>
          <SectionHeading>Lifecycle</SectionHeading>
          {/*
            Shown as a before/after on one primitive so the row reads as a
            comparison. Two separate rows made the Decision square itself look
            like the thing being defined.
          */}
          <div className="flex items-center gap-2">
            <PrimitiveGlyph kind="decision" mode={mode} size={13} />
            <span className="text-foreground/85">Live</span>
            <span aria-hidden className="text-muted/60">
              →
            </span>
            <PrimitiveGlyph
              kind="decision"
              mode={mode}
              size={13}
              retired
              tint={oklchCss(retiredOklch(primitiveOklch('decision', mode), mode))}
            />
            <span className="text-muted line-through decoration-muted/50">Retired</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-muted">
            Rejected, superseded, invalidated, or won&apos;t fix.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <BlockerSample />
            <span className="text-foreground/85">Blocker</span>
            <span className="truncate text-[11px] text-muted">open, gating work</span>
          </div>
        </section>

        {relationRows.length > 0 && (
          <section>
            <SectionHeading>Relations</SectionHeading>
            {/*
              Names only. The definitions live in the drawer, where each
              relation is shown against the actual record it connects — a
              legend that carries them too doubles its own height and pushes
              the Efforts key off the bottom of the viewport.
            */}
            <ul className="flex flex-col gap-1">
              {relationRows.map((group) => {
                const meta = RELATION_META[RELATION_GROUP_SAMPLE[group]];
                const stroke =
                  group === 'membership'
                    ? undefined
                    : oklchCss(relationStrokeOklch(group, mode));
                return (
                  <li
                    key={group}
                    className="flex items-center gap-2"
                    title={meta.description}
                  >
                    <RelationLineSample meta={meta} color={stroke} />
                    <span className="truncate text-foreground/85">
                      {RELATION_GROUP_LABEL[group]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {efforts.length > 0 && (
          <section>
            <SectionHeading>Efforts</SectionHeading>
            <ul className="flex flex-col gap-1">
              {efforts.map((effort) => (
                <li key={effort.id} className="flex items-center gap-1.5">
                  <PrimitiveGlyph
                    kind="effort"
                    mode={mode}
                    size={13}
                    core={effortColor(effort.id, mode).css}
                  />
                  <span className="truncate text-foreground/85" title={effort.title}>
                    {effort.title}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.09em] text-muted">
      {children}
    </h3>
  );
}

/** Mirrors the canvas blocker ring: a triangular outline around the glyph. */
function BlockerSample() {
  return (
    <svg aria-hidden viewBox="0 0 13 13" width="13" height="13" className="shrink-0">
      <polygon
        points="6.5,0.9 12.1,10.8 0.9,10.8"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.4"
        opacity="0.85"
      />
      <polygon points="6.5,4.2 9.3,9.1 3.7,9.1" fill="oklch(70% 0.15 72)" />
    </svg>
  );
}
