'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { useEffortGraphLive } from '@/lib/useEffortGraphLive';
import type { GraphNode } from '@/lib/types';

import { TopBar } from './TopBar';
import { Legend } from './Legend';
import { DetailDrawer } from './DetailDrawer';

const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[11px] text-muted">
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

  const selectedNode = selectedId ? (nodesById.get(selectedId) ?? null) : null;

  return (
    <div className="flex h-[100dvh] min-h-[100svh] w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="safe-area-top shrink-0">
        <TopBar
          status={status}
          generation={generation}
          nodeCount={nodes.length}
          edgeCount={edges.length}
        />
      </div>

      <main className="relative min-h-0 flex-1">
        {nodes.length === 0 ? (
          <EmptyState status={status} error={error} />
        ) : (
          <div className="absolute inset-0 min-h-0">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex flex-col safe-area-x">
          <div className="flex flex-1 items-end justify-start p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
            <Legend />
          </div>
        </div>

        {selectedNode && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] safe-area-x sm:inset-y-0 sm:left-auto sm:right-0 sm:w-auto sm:items-start sm:p-5">
            <DetailDrawer
              node={selectedNode}
              edges={edges}
              nodesById={nodesById}
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
  const message =
    status === 'connecting'
      ? 'Connecting to Flatbread…'
      : status === 'error'
        ? (error?.message ?? 'Unable to reach the Flatbread live server.')
        : 'No effort graph data yet.';

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-[13px] font-medium text-foreground">
        Effort graph is quiet
      </p>
      <p className="max-w-sm text-[11px] leading-relaxed text-muted">
        {message}
      </p>
    </div>
  );
}
