import { useEffect, useMemo, useRef } from 'react';
import { oklchCss, effortColor, retiredOklch } from '@/core/oklch';
import { PRIMITIVES, primitiveOklch } from '@/presets/effort-graph/primitives';
import {
  effectiveLifecycle,
  type LifecycleIndex,
} from '@/presets/effort-graph/lifecycle';
import type { GraphEdge, GraphNode } from '@/presets/effort-graph/types';
import { useTheme } from '../hooks/useTheme';
import { MarkdownSurface } from './MarkdownSurface';
import {
  PrimitiveGlyph,
  RELATION_GROUP_LABEL,
  RELATION_GROUP_ORDER,
  RELATION_META,
  RelationLineSample,
  lifecycleBadge,
  relationStrokeOklch,
  type RelationGroupId,
} from './RelationLegend';

interface DetailDrawerProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  nodesById: Map<string, GraphNode>;
  lifecycleIndex: LifecycleIndex;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}

type DirectedEdge = GraphEdge & { direction: 'outgoing' | 'incoming' };

interface GroupedRelations {
  group: RelationGroupId;
  edges: DirectedEdge[];
}

export function DetailDrawer({
  node,
  edges,
  nodesById,
  lifecycleIndex,
  onClose,
  onSelect,
}: DetailDrawerProps) {
  const { mode } = useTheme();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nodeId = node?.id ?? null;

  // Escape closes from anywhere, including while the graph canvas has focus.
  useEffect(() => {
    if (!nodeId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nodeId, onClose]);

  /*
   * Move focus to the heading whenever a different record is shown, and hand it
   * back to the graph on close.
   *
   * Without this, opening the panel from the keyboard leaves focus on the canvas
   * and a screen reader is told nothing: the body and relations — the entire
   * reason to open a record — stay unreachable. Following a relation also
   * unmounts the button that was focused, which would otherwise drop focus to
   * the document body.
   */
  useEffect(() => {
    if (!nodeId) return;
    headingRef.current?.focus();
    return () => {
      const canvas = document.querySelector<HTMLElement>(
        '[role="application"]'
      );
      // Only reclaim focus if it is still inside the panel being torn down.
      if (document.activeElement?.closest('aside[aria-labelledby]')) {
        canvas?.focus();
      }
    };
  }, [nodeId]);

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

  const resolveRecord = useMemo(() => {
    const bySlug = new Map<string, string>();
    for (const n of nodesById.values()) {
      if (n.slug) bySlug.set(n.slug, n.id);
    }
    return (target: string): string | null =>
      (nodesById.has(target) ? target : bySlug.get(target)) ?? null;
  }, [nodesById]);

  if (!node) return null;

  const primitive = PRIMITIVES[node.kind];
  const life = effectiveLifecycle(node, lifecycleIndex);
  const badge = lifecycleBadge(node.kind, life.state);
  const retired = life.aliveness === 'retired';
  const hasRelations = groupedRelations.length > 0;
  const hasBody = Boolean(node.body?.trim());

  const tint =
    node.kind === 'effort'
      ? effortColor(node.id, mode).css
      : oklchCss(
          retired
            ? retiredOklch(primitiveOklch(node.kind, mode), mode)
            : primitiveOklch(node.kind, mode)
        );

  return (
    <aside
      aria-labelledby="detail-drawer-title"
      className="pointer-events-auto flex max-h-[min(72vh,calc(100dvh-5.5rem))] w-full flex-col overflow-hidden rounded-xl border border-border bg-background/92 shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-8px_rgba(0,0,0,0.15)] backdrop-blur-md sm:max-h-[calc(100dvh-6rem)] sm:w-[min(24rem,calc(100vw-2.5rem))]"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <PrimitiveGlyph
              kind={node.kind}
              mode={mode}
              size={13}
              retired={retired}
              tint={tint}
            />
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {primitive.label}
            </span>
            {badge && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] ${badge.className}`}
              >
                {badge.label}
              </span>
            )}
          </div>
          <h2
            id="detail-drawer-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-[15px] font-semibold leading-snug tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {node.title}
          </h2>
          <span
            className="truncate font-mono text-[11px] text-muted"
            title={node.id}
          >
            {node.id}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close record details"
          className="-mr-1.5 -mt-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 ease-out hover:bg-muted/15 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-2 px-4 py-3">
          {life.overturnedByEdge && life.state && (
            <p className="rounded-md border border-border bg-muted/10 px-2.5 py-2 text-[12px] leading-snug text-muted">
              {life.state === 'invalidated'
                ? 'Marked wrong by a later Finding. Its own frontmatter still records the state it was in when written.'
                : life.state === 'rejected'
                ? 'Rejected by a later Decision. Its own frontmatter still records the state it was in when written.'
                : 'Replaced by a later record. Its own frontmatter still records the state it was in when written.'}{' '}
              Read from the graph edges, which are authoritative.
            </p>
          )}
          {node.kindLabel && node.kind !== 'effort' && (
            <MetaRow label="Kind" value={sentenceCase(node.kindLabel)} />
          )}
          {node.effortId && (
            <MetaRow
              label="Effort"
              value={
                <button
                  type="button"
                  onClick={() => onSelect(node.effortId)}
                  className="truncate text-left text-[12px] text-foreground underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {nodesById.get(node.effortId)?.title ?? node.effortId}
                </button>
              }
            />
          )}
          {node.likelihood && (
            <MetaRow label="Likelihood" value={sentenceCase(node.likelihood)} />
          )}
          {node.severity && (
            <MetaRow label="Severity" value={sentenceCase(node.severity)} />
          )}
          {node.createdAt && (
            <MetaRow label="Journaled" value={formatDate(node.createdAt)} />
          )}
        </div>

        {hasBody && (
          <section className="border-t border-border px-4 py-3">
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Body
            </h3>
            <MarkdownSurface
              value={node.body!}
              resolveRecord={resolveRecord}
              onNavigate={onSelect}
            />
          </section>
        )}

        {hasRelations && (
          <section className="border-t border-border px-4 py-3">
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Relations
            </h3>
            <div className="flex flex-col gap-3">
              {groupedRelations.map(({ group, edges: groupEdges }) => (
                <div key={group}>
                  <h4 className="mb-1 text-[11px] font-medium text-muted/90">
                    {RELATION_GROUP_LABEL[group]}
                  </h4>
                  <ul className="flex flex-col">
                    {groupEdges.map((edge) => (
                      <RelationRow
                        key={`${edge.direction}:${edge.id}`}
                        edge={edge}
                        nodesById={nodesById}
                        lifecycleIndex={lifecycleIndex}
                        mode={mode}
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

/** Frontmatter values are lowercase tokens; display them as prose. */
function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[11px] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[13px] text-foreground">
        {value}
      </span>
    </div>
  );
}

function RelationRow({
  edge,
  nodesById,
  lifecycleIndex,
  mode,
  onSelect,
}: {
  edge: DirectedEdge;
  nodesById: Map<string, GraphNode>;
  lifecycleIndex: LifecycleIndex;
  mode: ReturnType<typeof useTheme>['mode'];
  onSelect: (id: string | null) => void;
}) {
  const meta = RELATION_META[edge.kind];
  const peerId = edge.direction === 'outgoing' ? edge.target : edge.source;
  const peer = nodesById.get(peerId);
  const hint = meta.directionHint[edge.direction];
  const peerLife = peer ? effectiveLifecycle(peer, lifecycleIndex) : null;
  const peerRetired = peerLife?.aliveness === 'retired';
  const stroke =
    meta.group === 'membership'
      ? undefined
      : oklchCss(relationStrokeOklch(meta.group, mode));

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(peerId)}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-muted/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent motion-reduce:transition-none"
      >
        {peer ? (
          <PrimitiveGlyph
            kind={peer.kind}
            mode={mode}
            size={12}
            retired={peerRetired}
          />
        ) : (
          <RelationLineSample meta={meta} color={stroke} />
        )}
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[13px] ${
              peerRetired
                ? 'text-muted line-through decoration-muted/50'
                : 'text-foreground'
            }`}
          >
            {peer?.title ?? peerId}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted">
            {hint}
            {peer ? ` · ${PRIMITIVES[peer.kind].label}` : ''}
          </span>
        </span>
      </button>
    </li>
  );
}
