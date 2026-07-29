export interface ExplorerBootstrap {
  preset: string;
  graphqlPath: string;
  eventsPath: string;
}

const DEFAULT_GRAPHQL_PATH = '/graphql';
const DEFAULT_EVENTS_PATH = '/events';
const DEFAULT_PORT = 5057;

declare global {
  interface Window {
    __FLATBREAD_EXPLORER__?: ExplorerBootstrap;
  }
}

/**
 * Resolve the GraphQL HTTP endpoint for the explorer SPA.
 *
 * Priority: `?endpoint=` query param → injected bootstrap (same-origin) →
 * localhost default for standalone static deploys.
 */
export function resolveGraphqlEndpoint(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  bootstrap: ExplorerBootstrap | undefined = typeof window !== 'undefined'
    ? window.__FLATBREAD_EXPLORER__
    : undefined,
  locationOrigin: string = typeof window !== 'undefined'
    ? window.location.origin
    : `http://localhost:${DEFAULT_PORT}`
): string {
  const params = new URLSearchParams(search);
  const fromQuery = params.get('endpoint');
  if (fromQuery) {
    return normalizeGraphqlUrl(fromQuery, locationOrigin);
  }

  if (bootstrap?.graphqlPath) {
    return new URL(bootstrap.graphqlPath, locationOrigin).href;
  }

  // Standalone static host with no bootstrap: talk to local Flatbread.
  if (
    typeof window !== 'undefined' &&
    !window.__FLATBREAD_EXPLORER__ &&
    locationOrigin.includes('://')
  ) {
    // Prefer same-origin /graphql when served by Flatbread; fall back for file:// or alien hosts.
    try {
      const url = new URL(locationOrigin);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return new URL(DEFAULT_GRAPHQL_PATH, locationOrigin).href;
      }
    } catch {
      // fall through
    }
  }

  return `http://localhost:${DEFAULT_PORT}${DEFAULT_GRAPHQL_PATH}`;
}

export function resolveEventsUrl(graphqlEndpoint: string): string {
  const origin = new URL(graphqlEndpoint).origin;
  const bootstrap =
    typeof window !== 'undefined' ? window.__FLATBREAD_EXPLORER__ : undefined;
  const eventsPath = bootstrap?.eventsPath ?? DEFAULT_EVENTS_PATH;
  return new URL(eventsPath, origin).href;
}

export function normalizeGraphqlUrl(
  value: string,
  locationOrigin: string = typeof window !== 'undefined'
    ? window.location.origin
    : `http://localhost:${DEFAULT_PORT}`
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return `http://localhost:${DEFAULT_PORT}${DEFAULT_GRAPHQL_PATH}`;
  }
  try {
    const url = new URL(trimmed);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = DEFAULT_GRAPHQL_PATH;
    }
    return url.href;
  } catch {
    // Relative path like `/graphql`
    if (trimmed.startsWith('/')) {
      const path = trimmed === '/' ? DEFAULT_GRAPHQL_PATH : trimmed;
      return new URL(path, locationOrigin).href;
    }
    // Bare host is absolute; do not forward the caller's origin.
    return normalizeGraphqlUrl(`http://${trimmed}`);
  }
}

export function graphqlOrigin(endpoint: string): string {
  return new URL(endpoint).origin;
}
