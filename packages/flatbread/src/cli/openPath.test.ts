import test from 'ava';
import { effortGraphContent } from '@flatbread/effort-graph';
import {
  EXPLORER_ENDPOINT,
  GRAPHQL_ENDPOINT,
  resolveCliOpenPath,
} from './openPath.js';

test('opens explorer root for a full Effort Graph preset', (t) => {
  t.is(resolveCliOpenPath(effortGraphContent()), EXPLORER_ENDPOINT);
});

test('opens GraphQL sandbox when no explorer preset matches', (t) => {
  t.is(
    resolveCliOpenPath([{ collection: 'Post', path: 'posts' }]),
    GRAPHQL_ENDPOINT
  );
  t.is(resolveCliOpenPath(undefined), GRAPHQL_ENDPOINT);
});
