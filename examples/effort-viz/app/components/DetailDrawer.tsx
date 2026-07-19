'use client';

import { useMemo } from 'react';
import { nodeColor } from '@/lib/oklch';
import type { GraphEdge, GraphNode } from '@/lib/types';
import { useTheme } from '../hooks/useTheme';

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

export function DetailDrawer({
  node,
  edges,
  nodesById,
  onClose,
  onSelect,
}: DetailDrawerProps) {
  const { mode } = useTheme();

  const relations = useMemo(() => {
    if (!node) return { outgoing: [], incoming: [] };
    const outgoing: GraphEdge[] = [];
    const incoming: GraphEdge[] = [];
    for (const e of edges) {
      if (e.source === node.id) outgoing.push(e);
      if (e.target === node.id) incoming.push(e);
    }
    return { outgoing, incoming };
  }, [node, edges]);

  if (!node) return null;

  const effortId = node.effortId ?? node.id;
  const swatch = nodeColor(effortId, node.kind, mode).css;
  const lifecycle = node.lifecycle ?? node.status ?? node.state;

  return (
    <aside className="pointer-events-auto flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background/85 shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-8px_rgba(0,0,0,0.15)] backdrop-blur-md sm:w-[320px]">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: swatch }}
            />
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              {KIND_LABEL[node.kind]}
            </span>
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

      <div className="flex flex-col gap-3 px-4 py-3">
        <MetaRow label="Kind" value={KIND_LABEL[node.kind]} />
        {lifecycle && <MetaRow label="State" value={lifecycle} />}
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

      <RelationList
        title="Outgoing"
        edges={relations.outgoing}
        peerFor={(edge) => edge.target}
        nodesById={nodesById}
        onSelect={onSelect}
      />
      <RelationList
        title="Incoming"
        edges={relations.incoming}
        peerFor={(edge) => edge.source}
        nodesById={nodesById}
        onSelect={onSelect}
      />
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

function RelationList({
  title,
  edges,
  peerFor,
  nodesById,
  onSelect,
}: {
  title: string;
  edges: GraphEdge[];
  peerFor: (edge: GraphEdge) => string;
  nodesById: Map<string, GraphNode>;
  onSelect: (id: string | null) => void;
}) {
  if (edges.length === 0) return null;
  return (
    <section className="border-t border-border px-4 py-3">
      <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
        {title} · {edges.length}
      </h3>
      <ul className="flex flex-col gap-1">
        {edges.map((edge) => {
          const peerId = peerFor(edge);
          const peer = nodesById.get(peerId);
          return (
            <li key={edge.id}>
              <button
                type="button"
                onClick={() => onSelect(peerId)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[11px] transition-colors hover:bg-muted/15 focus:outline-none focus-visible:bg-muted/15"
              >
                <span className="min-w-0 truncate text-foreground">
                  {peer?.title ?? peerId}
                </span>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
                  {edge.kind.replace(/_/g, ' ')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
