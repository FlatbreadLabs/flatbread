'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { graphqlFetch } from './graphql';
import { normalizeEffortGraph } from './normalize';
import {
  EFFORT_GRAPH_QUERY,
  type EffortGraphQueryResult,
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
  const fetchGenerationRef = useRef<number | null>(null);

  const refetch = useCallback(async () => {
    const data = await graphqlFetch<EffortGraphQueryResult>(
      EFFORT_GRAPH_QUERY,
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
        fetchGenerationRef.current !== null &&
        nextGeneration <= fetchGenerationRef.current
      ) {
        return;
      }

      fetchGenerationRef.current = nextGeneration;
      setGeneration(nextGeneration);

      try {
        await refetch();
        if (!cancelled) {
          setStatus('live');
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setStatus('error');
          setError(
            cause instanceof Error ? cause : new Error(String(cause))
          );
        }
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
