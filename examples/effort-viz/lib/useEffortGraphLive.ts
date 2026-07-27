'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { graphqlFetch } from './graphql';
import { normalizeEffortGraph } from './normalize';
import {
  SCHEMA_PROBE_QUERY,
  buildEffortGraphQuery,
  type EffortGraphQueryResult,
  type SchemaProbeResult,
} from './query';
import type { GraphEdge, GraphNode } from './types';

const DEFAULT_GRAPHQL_ENDPOINT = 'http://localhost:5057/graphql';
const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

/**
 * Live connection / query state for the Effort Graph viz.
 *
 * - `live` — fetch succeeded with a known schema, so relationship fields
 *   (including retirement links) were selected when the server exposes them.
 * - `partial` — fetch succeeded, but we had no schema yet, so only record
 *   scalars loaded. Retirement links may be missing; do not treat the graph
 *   as complete.
 * - `disconnected` — SSE/transport loss after we have committed a generation.
 * - `error` — GraphQL query failure, or SSE loss before the first commit.
 */
export type LiveStatus =
  | 'connecting'
  | 'live'
  | 'partial'
  | 'disconnected'
  | 'error';

export interface UseEffortGraphLiveOptions {
  endpoint?: string;
}

export interface UseEffortGraphLiveResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  generation: number | null;
  status: LiveStatus;
  error: Error | null;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  refetch: () => Promise<void>;
}

export interface FetchedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /**
   * True when the query was built from a schema probe (fresh or sticky).
   * False on the scalars-only first-load fallback — relationship edges were
   * not selected, so retirement can look wrong.
   */
  relationsKnown: boolean;
}

/** Prefer a fresh probe; otherwise reuse the last successful one (sticky). */
export function resolveSchemaForQuery(
  probed: SchemaProbeResult | null,
  lastGood: SchemaProbeResult | null
): SchemaProbeResult | null {
  return probed ?? lastGood;
}

/**
 * Whether a fetched generation may paint into React state.
 * Older-than-committed responses are dropped (out-of-order SSE).
 */
export function shouldCommitGeneration(
  nextGeneration: number,
  committedGeneration: number | null
): boolean {
  return (
    committedGeneration === null || nextGeneration >= committedGeneration
  );
}

/**
 * After a failed refetch for `failedGeneration`, roll the request watermark
 * back only if nothing newer has since claimed it.
 */
export function rollbackRequestedGeneration(
  requestedGeneration: number | null,
  failedGeneration: number,
  committedGeneration: number | null
): number | null {
  if (requestedGeneration === failedGeneration) {
    return committedGeneration;
  }
  return requestedGeneration;
}

/** Pill copy for the live status indicator. */
export function liveStatusLabel(status: LiveStatus): string {
  switch (status) {
    case 'connecting':
      return 'Connecting';
    case 'live':
      return 'Live';
    case 'partial':
      return 'Partial';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Error';
  }
}

/**
 * After a successful graph fetch: Live only when relationship fields could
 * be selected. Without a schema, the safe scalars-only path still paints
 * records but must not claim a complete graph.
 */
export function liveStatusAfterSuccessfulFetch(
  relationsKnown: boolean
): Extract<LiveStatus, 'live' | 'partial'> {
  return relationsKnown ? 'live' : 'partial';
}

export function liveStatusAfterTransportLoss(
  hasCommittedGeneration: boolean
): Extract<LiveStatus, 'disconnected' | 'error'> {
  return hasCommittedGeneration ? 'disconnected' : 'error';
}

function graphqlOrigin(endpoint: string): string {
  return new URL(endpoint).origin;
}

function parseGeneration(data: string): number | null {
  try {
    const parsed = JSON.parse(data) as { generation?: unknown };
    return typeof parsed.generation === 'number' ? parsed.generation : null;
  } catch {
    return null;
  }
}

export function useEffortGraphLive(
  options: UseEffortGraphLiveOptions = {}
): UseEffortGraphLiveResult {
  const endpoint = options.endpoint ?? DEFAULT_GRAPHQL_ENDPOINT;
  const eventsUrl = `${graphqlOrigin(endpoint)}/events`;

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [generation, setGeneration] = useState<number | null>(null);
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const retryMsRef = useRef(INITIAL_RETRY_MS);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  /** Highest generation a fetch has been started for. */
  const requestedGenerationRef = useRef<number | null>(null);
  /** Highest generation whose data actually landed in state. */
  const committedGenerationRef = useRef<number | null>(null);
  /** Last successful schema probe — reused when introspection blips. */
  const lastGoodSchemaRef = useRef<SchemaProbeResult | null>(null);

  /**
   * Probe + fetch + normalize. Does not touch React graph state so callers
   * can enforce generation ordering before paint.
   */
  const fetchGraph = useCallback(async (): Promise<FetchedGraph> => {
    /*
     * Re-probe each generation. Flatbread derives its schema from the records
     * on disk, so a relation field appears the moment the first record uses it
     * — and selecting one that does not exist yet is a hard query error.
     */
    let probed: SchemaProbeResult | null = null;
    try {
      probed = await graphqlFetch<SchemaProbeResult>(
        SCHEMA_PROBE_QUERY,
        undefined,
        endpoint
      );
      lastGoodSchemaRef.current = probed;
    } catch {
      // Sticky last-good: a transient introspection failure must not wipe the
      // filtered relation selection. On first load (no cache) pass null so
      // buildEffortGraphQuery takes the scalars-only safe path.
    }

    const schema = resolveSchemaForQuery(probed, lastGoodSchemaRef.current);
    const data = await graphqlFetch<EffortGraphQueryResult>(
      buildEffortGraphQuery(schema),
      undefined,
      endpoint
    );
    const graph = normalizeEffortGraph(data);
    return {
      nodes: graph.nodes,
      edges: graph.edges,
      // Sticky last-good still counts: we selected relations from a known
      // schema. Only the null first-load fallback is partial.
      relationsKnown: schema !== null,
    };
  }, [endpoint]);

  const refetch = useCallback(async () => {
    const graph = await fetchGraph();
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setStatus(liveStatusAfterSuccessfulFetch(graph.relationsKnown));
    setError(null);
  }, [fetchGraph]);

  useEffect(() => {
    let cancelled = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const closeSource = () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      clearReconnectTimer();
      const delay = retryMsRef.current;
      retryMsRef.current = Math.min(retryMsRef.current * 2, MAX_RETRY_MS);
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    const maybeRefetch = async (nextGeneration: number | null) => {
      if (nextGeneration === null) return;
      if (
        requestedGenerationRef.current !== null &&
        nextGeneration <= requestedGenerationRef.current
      ) {
        return;
      }

      requestedGenerationRef.current = nextGeneration;
      // Do not advance the displayed generation pill until this fetch commits.

      try {
        const graph = await fetchGraph();
        if (cancelled) return;
        // Out-of-order responses: never let an older payload overwrite a newer
        // one that already landed. Check before paint — refetch used to
        // setNodes/setEdges inside the await, so a late older response could
        // still draw after we "skipped" the commit refs.
        if (
          !shouldCommitGeneration(
            nextGeneration,
            committedGenerationRef.current
          )
        ) {
          return;
        }
        committedGenerationRef.current = nextGeneration;
        setNodes(graph.nodes);
        setEdges(graph.edges);
        setGeneration(nextGeneration);
        setStatus(liveStatusAfterSuccessfulFetch(graph.relationsKnown));
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        /*
         * Roll the request marker back so this generation can be retried.
         * Advancing it before the fetch (as this used to) meant a single
         * failed request pinned the view to stale data until the next write.
         */
        requestedGenerationRef.current = rollbackRequestedGeneration(
          requestedGenerationRef.current,
          nextGeneration,
          committedGenerationRef.current
        );
        // Keep the pill aligned with committed data, not the failed request.
        setGeneration(committedGenerationRef.current);
        setStatus('error');
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    };

    const connect = () => {
      if (cancelled) return;
      clearReconnectTimer();
      closeSource();
      setStatus('connecting');

      const source = new EventSource(eventsUrl);
      sourceRef.current = source;

      source.addEventListener('open', () => {
        retryMsRef.current = INITIAL_RETRY_MS;
      });

      source.addEventListener('ready', (event) => {
        void maybeRefetch(parseGeneration((event as MessageEvent<string>).data));
      });

      source.addEventListener('generation', (event) => {
        void maybeRefetch(parseGeneration((event as MessageEvent<string>).data));
      });

      source.onerror = () => {
        if (cancelled) return;
        closeSource();
        // After we have committed graph data, label transport loss as
        // disconnected so query failures can stay a distinct "Error". Before
        // first commit, keep `error` so empty-state copy still treats it as
        // unreachable Flatbread.
        setStatus(
          liveStatusAfterTransportLoss(committedGenerationRef.current !== null)
        );
        setError(new Error('Lost connection to Flatbread live events'));
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      closeSource();
    };
  }, [eventsUrl, fetchGraph]);

  return {
    nodes,
    edges,
    generation,
    status,
    error,
    selectedId,
    setSelectedId,
    refetch,
  };
}

export { graphqlOrigin };
