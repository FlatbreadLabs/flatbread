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

export type LiveStatus = 'connecting' | 'live' | 'error';

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

  const refetch = useCallback(async () => {
    /*
     * Re-probe each generation. Flatbread derives its schema from the records
     * on disk, so a relation field appears the moment the first record uses it
     * — and selecting one that does not exist yet is a hard query error.
     */
    let schema: SchemaProbeResult | null = null;
    try {
      schema = await graphqlFetch<SchemaProbeResult>(
        SCHEMA_PROBE_QUERY,
        undefined,
        endpoint
      );
    } catch {
      // Fall back to selecting every known relation field; if the schema is
      // reachable at all the main query will report what is actually missing.
    }

    const data = await graphqlFetch<EffortGraphQueryResult>(
      buildEffortGraphQuery(schema),
      undefined,
      endpoint
    );
    const graph = normalizeEffortGraph(data);
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [endpoint]);

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
      setGeneration(nextGeneration);

      try {
        await refetch();
        if (cancelled) return;
        // Out-of-order responses: never let an older payload overwrite a newer
        // one that already landed.
        if (
          committedGenerationRef.current !== null &&
          nextGeneration < committedGenerationRef.current
        ) {
          return;
        }
        committedGenerationRef.current = nextGeneration;
        setStatus('live');
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        /*
         * Roll the request marker back so this generation can be retried.
         * Advancing it before the fetch (as this used to) meant a single
         * failed request pinned the view to stale data until the next write.
         */
        if (requestedGenerationRef.current === nextGeneration) {
          requestedGenerationRef.current = committedGenerationRef.current;
        }
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
        setStatus('error');
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
  }, [eventsUrl, refetch]);

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
