import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeGraphqlUrl,
  resolveEventsUrl,
  resolveGraphqlEndpoint,
} from './endpoints.js';

describe('resolveGraphqlEndpoint', () => {
  it('prefers ?endpoint= over bootstrap', () => {
    const endpoint = resolveGraphqlEndpoint(
      '?endpoint=https://api.example.com/graphql',
      {
        preset: 'effort-graph',
        graphqlPath: '/graphql',
        eventsPath: '/events',
      },
      'http://localhost:5057'
    );
    assert.equal(endpoint, 'https://api.example.com/graphql');
  });

  it('uses bootstrap same-origin paths', () => {
    const endpoint = resolveGraphqlEndpoint(
      '',
      {
        preset: 'effort-graph',
        graphqlPath: '/graphql',
        eventsPath: '/events',
      },
      'http://localhost:5057'
    );
    assert.equal(endpoint, 'http://localhost:5057/graphql');
  });

  it('falls back to localhost when nothing is configured', () => {
    const endpoint = resolveGraphqlEndpoint('', undefined, 'file://');
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
});

describe('resolveEventsUrl', () => {
  it('derives SSE URL from the GraphQL origin', () => {
    assert.equal(
      resolveEventsUrl('http://localhost:5057/graphql'),
      'http://localhost:5057/events'
    );
  });
});
