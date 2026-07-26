'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';

import { useEffortGraphLive } from '@/lib/useEffortGraphLive';
import {
  buildAlivenessMap,
  buildLifecycleIndex,
  summarizeGraph,
} from '@/lib/lifecycle';
import type { GraphNode } from '@/lib/types';

import { TopBar } from './TopBar';
import { Legend } from './Legend';
import { DetailDrawer } from './DetailDrawer';
import { RELATION_META, type RelationGroupId } from './RelationLegend';

const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[12px] text-muted">
      Booting canvas…
    </div>
  ),
});

export function EffortGraphApp() {
  const {
    nodes,
    edges,
    status,
    generation,
    error,
    selectedId,
    setSelectedId,
  } = useEffortGraphLive();

  const nodesById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  const lifecycleIndex = useMemo(() => buildLifecycleIndex(edges), [edges]);
  const summary = useMemo(
    () => summarizeGraph(nodes, buildAlivenessMap(nodes, edges)),
    [nodes, edges]
  );

  const efforts = useMemo(
    () =>
      nodes
        .filter((n) => n.kind === 'effort')
        .sort((a, b) => a.title.localeCompare(b.title)),
    [nodes]
  );

  /** Only key the relations the current generation actually contains. */
  const presentGroups = useMemo(() => {
    const groups = new Set<RelationGroupId>();
    for (const edge of edges) groups.add(RELATION_META[edge.kind].group);
    return groups;
  }, [edges]);

  const selectedNode = selectedId ? (nodesById.get(selectedId) ?? null) : null;

  // A selected record can vanish on a live update; don't keep a dangling id
  // that would silently reopen the drawer if the same id returns.
  useEffect(() => {
    if (selectedId && !nodesById.has(selectedId)) setSelectedId(null);
  }, [selectedId, nodesById, setSelectedId]);

  return (
    <div className="flex h-[100dvh] min-h-[100svh] w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="safe-area-top shrink-0">
        <TopBar status={status} generation={generation} summary={summary} />
      </div>

      <main className="atmosphere relative min-h-0 flex-1 isolate">
        {nodes.length === 0 ? (
          <EmptyState status={status} error={error} />
        ) : (
          <div className="absolute inset-0 z-10 min-h-0">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col safe-area-x">
          <div className="flex flex-1 items-end justify-start p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
            {nodes.length > 0 && (
              <Legend efforts={efforts} presentGroups={presentGroups} />
            )}
          </div>
        </div>

        {selectedNode && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] safe-area-x sm:inset-y-0 sm:left-auto sm:right-0 sm:w-auto sm:items-start sm:p-5">
            <DetailDrawer
              node={selectedNode}
              edges={edges}
              nodesById={nodesById}
              lifecycleIndex={lifecycleIndex}
              onClose={() => setSelectedId(null)}
              onSelect={setSelectedId}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({
  status,
  error,
}: {
  status: ReturnType<typeof useEffortGraphLive>['status'];
  error: Error | null;
}) {
  const [heading, message] =
    status === 'connecting'
      ? ['Connecting to Flatbread', 'Waiting for the live schema on port 5057.']
      : status === 'error'
        ? [
            "Can't reach Flatbread",
            error?.message ??
              'Start the dev server with `pnpm play:efforts` so GraphQL is served on port 5057.',
          ]
        : [
            'No Effort Graph records yet',
            'Nothing found in .flatbread-efforts. Journal a record and it will grow in here.',
          ];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-[14px] font-medium text-foreground">{heading}</p>
      <p className="max-w-sm text-[12px] leading-relaxed text-muted">{message}</p>
    </div>
  );
}
