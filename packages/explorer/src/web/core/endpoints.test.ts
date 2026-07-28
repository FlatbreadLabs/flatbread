import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  type ExplorerBootstrap,
  normalizeGraphqlUrl,
  resolveEventsUrl,
  resolveGraphqlEndpoint,
} from './endpoints.js';

const DEFAULT_BOOTSTRAP: ExplorerBootstrap = {
  preset: 'effort-graph',
  graphqlPath: '/graphql',
  eventsPath: '/events',
};

/** Stub browser globals for resolveEventsUrl (reads window.__FLATBREAD_EXPLORER__). */
function withExplorerBootstrap(
  bootstrap: ExplorerBootstrap,
  run: () => void
): void {
  const globalWithWindow = globalThis as typeof globalThis & {
    window?: Window & { __FLATBREAD_EXPLORER__?: ExplorerBootstrap };
  };
  const previous = globalWithWindow.window;
  globalWithWindow.window = {
    location: { origin: 'http://localhost:5057', search: '' },
    __FLATBREAD_EXPLORER__: bootstrap,
  } as Window & { __FLATBREAD_EXPLORER__?: ExplorerBootstrap };
  try {
    run();
  } finally {
    if (previous === undefined) {
      delete globalWithWindow.window;
    } else {
      globalWithWindow.window = previous;
    }
  }
}

describe('resolveGraphqlEndpoint', () => {
  it('prefers ?endpoint= over bootstrap', () => {
    const endpoint = resolveGraphqlEndpoint(
      '?endpoint=https://api.example.com/graphql',
      DEFAULT_BOOTSTRAP,
      'http://localhost:5057'
    );
    assert.equal(endpoint, 'https://api.example.com/graphql');
  });

  it('uses bootstrap same-origin paths', () => {
    const endpoint = resolveGraphqlEndpoint(
      '',
      DEFAULT_BOOTSTRAP,
      'http://localhost:5057'
    );
    assert.equal(endpoint, 'http://localhost:5057/graphql');
  });

  it('falls back to localhost when nothing is configured', () => {
    const endpoint = resolveGraphqlEndpoint('', undefined, 'file://');
    assert.equal(endpoint, 'http://localhost:5057/graphql');
  });

  it('resolves relative ?endpoint= against the injected origin', () => {
    const endpoint = resolveGraphqlEndpoint(
      '?endpoint=/alt/graphql',
      DEFAULT_BOOTSTRAP,
      'http://localhost:9999'
    );
    assert.equal(endpoint, 'http://localhost:9999/alt/graphql');
  });

  it('resolves bare / ?endpoint= against the injected origin', () => {
    const endpoint = resolveGraphqlEndpoint(
      '?endpoint=/',
      DEFAULT_BOOTSTRAP,
      'http://localhost:9999'
    );
    assert.equal(endpoint, 'http://localhost:9999/');
  });

  it('resolves host-without-scheme ?endpoint= by prepending http', () => {
    const endpoint = resolveGraphqlEndpoint(
      '?endpoint=api.example.com',
      DEFAULT_BOOTSTRAP,
      'http://localhost:9999'
    );
    assert.equal(endpoint, 'http://api.example.com/graphql');
  });

  it('resolves protocol-relative ?endpoint= without using the injected host', () => {
    const endpoint = resolveGraphqlEndpoint(
      '?endpoint=//api.example.com/graphql',
      DEFAULT_BOOTSTRAP,
      'http://localhost:9999'
    );
    assert.equal(endpoint, 'http://api.example.com/graphql');
  });

  it('trims whitespace in ?endpoint=', () => {
    const endpoint = resolveGraphqlEndpoint(
      '?endpoint=%20%20https://api.example.com/graphql%20%20',
      DEFAULT_BOOTSTRAP,
      'http://localhost:5057'
    );
    assert.equal(endpoint, 'https://api.example.com/graphql');
  });

  it('falls back when ?endpoint= is whitespace-only', () => {
    const endpoint = resolveGraphqlEndpoint(
      '?endpoint=%20%20%20',
      DEFAULT_BOOTSTRAP,
      'http://localhost:5057'
    );
    assert.equal(endpoint, 'http://localhost:5057/graphql');
  });
});

describe('normalizeGraphqlUrl', () => {
  it('appends /graphql when only an origin is given', () => {
    assert.equal(
      normalizeGraphqlUrl('https://api.example.com'),
      'https://api.example.com/graphql'
    );
  });

  it('preserves an explicit /graphql path', () => {
    assert.equal(
      normalizeGraphqlUrl('https://api.example.com/custom/graphql'),
      'https://api.example.com/custom/graphql'
    );
  });

  it('resolves a relative path against the default Node origin', () => {
    assert.equal(
      normalizeGraphqlUrl('/alt/graphql'),
      'http://localhost:5057/alt/graphql'
    );
  });

  it('resolves a relative path against an injected origin', () => {
    assert.equal(
      normalizeGraphqlUrl('/alt/graphql', 'http://localhost:9999'),
      'http://localhost:9999/alt/graphql'
    );
  });

  it('resolves bare / against an injected origin', () => {
    assert.equal(
      normalizeGraphqlUrl('/', 'http://localhost:9999'),
      'http://localhost:9999/'
    );
  });

  it('prepends http when given a host without a scheme', () => {
    assert.equal(
      normalizeGraphqlUrl('api.example.com', 'http://localhost:9999'),
      'http://api.example.com/graphql'
    );
  });

  it('resolves a protocol-relative URL without using the injected host', () => {
    assert.equal(
      normalizeGraphqlUrl('//api.example.com/graphql', 'http://localhost:9999'),
      'http://api.example.com/graphql'
    );
  });

  it('trims surrounding whitespace', () => {
    assert.equal(
      normalizeGraphqlUrl('  https://api.example.com/graphql  '),
      'https://api.example.com/graphql'
    );
  });

  it('falls back to localhost when given whitespace only', () => {
    assert.equal(normalizeGraphqlUrl('   '), 'http://localhost:5057/graphql');
  });
});

describe('normalizeGraphqlUrl with window', () => {
  afterEach(() => {
    delete (globalThis as { window?: Window }).window;
  });

  it('resolves relative paths against window.location.origin', () => {
    (globalThis as { window?: Window }).window = {
      location: { origin: 'http://localhost:5173', search: '' },
    } as Window;
    assert.equal(
      normalizeGraphqlUrl('/dev/graphql'),
      'http://localhost:5173/dev/graphql'
    );
  });
});

describe('resolveEventsUrl', () => {
  it('derives SSE URL from the GraphQL origin', () => {
    assert.equal(
      resolveEventsUrl('http://localhost:5057/graphql'),
      'http://localhost:5057/events'
    );
  });

  it('uses default /events when window bootstrap is absent', () => {
    assert.equal(
      resolveEventsUrl('https://api.example.com/graphql'),
      'https://api.example.com/events'
    );
  });

  it('uses custom eventsPath from window bootstrap', () => {
    withExplorerBootstrap(
      {
        preset: 'effort-graph',
        graphqlPath: '/graphql',
        eventsPath: '/custom-events',
      },
      () => {
        assert.equal(
          resolveEventsUrl('http://localhost:5057/graphql'),
          'http://localhost:5057/custom-events'
        );
      }
    );
  });

  it('derives custom eventsPath from the GraphQL endpoint origin only', () => {
    withExplorerBootstrap(
      {
        preset: 'effort-graph',
        graphqlPath: '/graphql',
        eventsPath: '/sse/stream',
      },
      () => {
        assert.equal(
          resolveEventsUrl('https://api.example.com/graphql'),
          'https://api.example.com/sse/stream'
        );
      }
    );
  });
});
