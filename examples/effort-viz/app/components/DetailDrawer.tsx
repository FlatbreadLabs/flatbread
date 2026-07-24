'use client';

import { useMemo } from 'react';
import { nodeColor } from '@/lib/oklch';
import type { GraphEdge, GraphNode } from '@/lib/types';
import { useTheme } from '../hooks/useTheme';
import { MarkdownSurface } from './MarkdownSurface';
import {
  RELATION_GROUP_LABEL,
  RELATION_GROUP_ORDER,
  RELATION_META,
  RelationLineSample,
  lifecycleBadge,
  type RelationGroupId,
} from './RelationLegend';

interface DetailDrawerProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  nodesById: Map<string, GraphNode>;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}

const KIND_LABEL: Record<GraphNode['kind'], string> = {
  effort: 'Effort',
  issue: 'Issue',
  finding: 'Finding',
  decision: 'Decision',
  constraint: 'Constraint',
  risk: 'Risk',
};

type DirectedEdge = GraphEdge & { direction: 'outgoing' | 'incoming' };

interface GroupedRelations {
  group: RelationGroupId;
  edges: DirectedEdge[];
}

export function DetailDrawer({
  node,
  edges,
  nodesById,
  onClose,
  onSelect,
}: DetailDrawerProps) {
  const { mode } = useTheme();

  const groupedRelations = useMemo((): GroupedRelations[] => {
    if (!node) return [];

    const buckets = new Map<RelationGroupId, DirectedEdge[]>();
    for (const edge of edges) {
      let direction: DirectedEdge['direction'] | null = null;
      if (edge.source === node.id) direction = 'outgoing';
      else if (edge.target === node.id) direction = 'incoming';
      if (!direction) continue;

      const group = RELATION_META[edge.kind].group;
      const list = buckets.get(group) ?? [];
      list.push({ ...edge, direction });
      buckets.set(group, list);
    }

    return RELATION_GROUP_ORDER.flatMap((group) => {
      const groupEdges = buckets.get(group);
      if (!groupEdges || groupEdges.length === 0) return [];
      groupEdges.sort((a, b) => {
        if (a.direction !== b.direction) {
          return a.direction === 'outgoing' ? -1 : 1;
        }
        return a.kind.localeCompare(b.kind);
      });
      return [{ group, edges: groupEdges }];
    });
  }, [node, edges]);

  const navigateTarget = useMemo(() => {
    const bySlug = new Map<string, string>();
    const byId = new Map<string, string>();
    for (const n of nodesById.values()) {
      byId.set(n.id, n.id);
      if (n.slug) bySlug.set(n.slug, n.id);
    }
    return (target: string) => {
      const id = byId.get(target) ?? bySlug.get(target);
      if (id) onSelect(id);
    };
  }, [nodesById, onSelect]);

  if (!node) return null;

  const lifecycle = node.lifecycle ?? node.status ?? node.state;
  const badge = lifecycleBadge(lifecycle);
  const hasRelations = groupedRelations.length > 0;
  const hasBody = Boolean(node.body?.trim());
  const effortId = node.effortId ?? node.id;
  const swatch = nodeColor(effortId, node.kind, mode).css;

  return (
    <aside className="pointer-events-auto flex max-h-[min(72vh,calc(100dvh-5.5rem))] w-full flex-col overflow-hidden rounded-xl border border-border bg-background/90 shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-8px_rgba(0,0,0,0.15)] backdrop-blur-md sm:max-h-[calc(100dvh-6rem)] sm:w-[min(24rem,calc(100vw-2.5rem))]">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10"
              style={{ background: swatch }}
            />
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              {KIND_LABEL[node.kind]}
            </span>
            {badge && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] ${badge.className}`}
              >
                {badge.label}
              </span>
            )}
          </div>
          <h2
            className="truncate text-sm font-semibold tracking-tight text-foreground"
            title={node.title}
          >
            {node.title}
          </h2>
          <span className="truncate font-mono text-[10px] text-muted">
            {node.id}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-muted/15 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-3 px-4 py-3">
          <MetaRow label="Kind" value={KIND_LABEL[node.kind]} />
          {lifecycle && !badge && <MetaRow label="State" value={lifecycle} />}
          {node.kindLabel && node.kind !== 'effort' && (
            <MetaRow label="Subkind" value={node.kindLabel} />
          )}
          {node.effortId && (
            <MetaRow
              label="Effort"
              value={
                <button
                  type="button"
                  onClick={() => onSelect(node.effortId)}
                  className="truncate text-left font-mono text-[11px] text-foreground underline-offset-2 hover:underline"
                >
                  {nodesById.get(node.effortId)?.title ?? node.effortId}
                </button>
              }
            />
          )}
          {node.likelihood && (
            <MetaRow label="Likelihood" value={node.likelihood} />
          )}
          {node.severity && <MetaRow label="Severity" value={node.severity} />}
        </div>

        {hasBody && (
          <section className="border-t border-border px-4 py-3">
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Content
            </h3>
            <MarkdownSurface
              value={node.body!}
              onNavigate={navigateTarget}
            />
          </section>
        )}

        {hasRelations && (
          <section className="border-t border-border px-4 py-3">
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              Decision chain
            </h3>
            <div className="flex flex-col gap-3">
              {groupedRelations.map(({ group, edges: groupEdges }) => (
                <div key={group}>
                  <h4 className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.08em] text-muted/90">
                    {RELATION_GROUP_LABEL[group]}
                  </h4>
                  <ul className="flex flex-col gap-1">
                    {groupEdges.map((edge) => (
                      <RelationRow
                        key={`${edge.direction}:${edge.id}`}
                        edge={edge}
                        nodesById={nodesById}
                        onSelect={onSelect}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[12px] text-foreground">
        {value}
      </span>
    </div>
  );
}

function RelationRow({
  edge,
  nodesById,
  onSelect,
}: {
  edge: DirectedEdge;
  nodesById: Map<string, GraphNode>;
  onSelect: (id: string | null) => void;
}) {
  const meta = RELATION_META[edge.kind];
  const peerId =
    edge.direction === 'outgoing' ? edge.target : edge.source;
  const peer = nodesById.get(peerId);
  const arrow = edge.direction === 'outgoing' ? '→' : '←';

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(peerId)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/15 focus:outline-none focus-visible:bg-muted/15"
      >
        <RelationLineSample meta={meta} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[11px] text-foreground">
            <span className="shrink-0 font-mono text-[10px] text-muted" aria-hidden>
              {arrow}
            </span>
            <span className="truncate">{peer?.title ?? peerId}</span>
          </span>
          <span className="mt-0.5 block text-[9px] text-muted">
            {meta.label}
            {peer?.kind ? ` · ${peer.kind}` : ''}
          </span>
        </span>
      </button>
    </li>
  );
}
