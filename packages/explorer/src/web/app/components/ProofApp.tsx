import { lazy, Suspense, useEffect, useMemo } from 'react';

import { resolveGraphqlEndpoint } from '@/core/endpoints';
import { useProofLive } from '@/presets/proof/useProofLive';
import {
  buildAlivenessMap,
  buildLifecycleIndex,
  summarizeGraph,
} from '@/presets/proof/lifecycle';
import type { GraphNode } from '@/presets/proof/types';

import { TopBar } from './TopBar';
import { Legend } from './Legend';
import { DetailDrawer } from './DetailDrawer';
import { RELATION_META, type RelationGroupId } from './RelationLegend';

const GraphCanvas = lazy(() => import('./GraphCanvas'));

export function ProofApp() {
  const endpoint = resolveGraphqlEndpoint();
  const { nodes, edges, status, generation, error, selectedId, setSelectedId } =
    useProofLive({ endpoint });

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

  const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null;

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
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-[12px] text-muted">
                  Booting canvas…
                </div>
              }
            >
              <GraphCanvas
                nodes={nodes}
                edges={edges}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </Suspense>
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
  status: ReturnType<typeof useProofLive>['status'];
  error: Error | null;
}) {
  const [heading, message] =
    status === 'connecting'
      ? ['Connecting to Flatbread', 'Waiting for the live schema on port 5057.']
      : status === 'error' || status === 'disconnected'
      ? [
          "Can't reach Flatbread",
          error?.message ??
            'Run `flatbread start --watch --open` so GraphQL is served (default port 5057).',
        ]
      : [
          'No Proof records yet',
          'Nothing found in the Proof content root. Journal a record and it will grow in here.',
        ];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-[14px] font-medium text-foreground">{heading}</p>
      <p className="max-w-sm text-[12px] leading-relaxed text-muted">
        {message}
      </p>
    </div>
  );
}
