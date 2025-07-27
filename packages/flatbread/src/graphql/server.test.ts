import test from 'ava';
import http from 'http';
import { generateSchema } from '@flatbread/core';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
import express from 'express';
import cors from 'cors';
import type { GraphQLSchema } from 'graphql';
import type { FlatbreadConfig } from '@flatbread/core';

/**
 * Test configuration using example content
 */
const testConfig: FlatbreadConfig = {
  source: {
    filesystem: {
      // Using dynamic import to avoid issues with workspace dependencies
      async use() {
        const { default: filesystem } = await import(
          '@flatbread/source-filesystem'
        );
        return filesystem();
      },
    },
  } as any,
  transformer: [
    {
      markdown: {
        async use() {
          const { default: markdownTransformer } = await import(
            '@flatbread/transformer-markdown'
          );
          return markdownTransformer({
            markdown: {
              gfm: true,
              externalLinks: true,
            },
          });
        },
      },
    } as any,
    {
      yaml: {
        async use() {
          const { default: yamlTransformer } = await import(
            '@flatbread/transformer-yaml'
          );
          return yamlTransformer();
        },
      },
    } as any,
  ],
  content: [
    {
      path: 'examples/content/markdown/authors',
      collection: 'Author',
      refs: {
        friend: 'Author',
      },
    },
    {
      path: 'examples/content/markdown/posts',
      collection: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'examples/content/yaml/authors',
      collection: 'YamlAuthor',
      refs: {
        friend: 'YamlAuthor',
      },
    },
  ],
};

/**
 * Server setup for testing
 */
interface TestServer {
  server: ApolloServer;
  httpServer: http.Server;
  url: string;
  port: number;
  cleanup: () => Promise<void>;
}

async function createTestServer(
  schema: GraphQLSchema,
  testPort = 0
): Promise<TestServer> {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer({
    schema,
    cache: new InMemoryLRUCache({
      maxSize: Math.pow(2, 20) * 10, // 10MB for tests
    }),
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  // Setup CORS and middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Private-Network', 'true');
    const origin = req.headers.origin || req.headers.referer || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, apollo-require-preflight'
    );
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return;
    }
    next();
  });

  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'apollo-require-preflight',
      ],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }),
    express.json(),
    expressMiddleware(server)
  );

  // Start server and get actual port
  const serverInstance = await new Promise<http.Server>((resolve) => {
    const s = httpServer.listen(testPort, () => resolve(s));
  });

  const address = serverInstance.address();
  const port = typeof address === 'object' && address ? address.port : testPort;
  const url = `http://localhost:${port}`;

  const cleanup = async () => {
    try {
      await server.stop();
    } catch (err) {
      // Server might already be stopped
      console.warn('Server stop error:', err);
    }

    await new Promise<void>((resolve) => {
      if (serverInstance.listening) {
        serverInstance.close((err) => {
          if (err) console.warn('Server close error:', err);
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  return { server, httpServer: serverInstance, url, port, cleanup };
}

/**
 * Helper to execute GraphQL queries against the test server
 */
async function executeGraphQLQuery(
  url: string,
  query: string,
  variables?: Record<string, any>
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: variables || {},
    }),
  });

  const result = await response.json();

  // GraphQL servers can return 400 for invalid queries, but still have valid JSON responses
  // Only throw if it's not a GraphQL response
  if (!response.ok && !result.errors) {
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${JSON.stringify(result)}`
    );
  }

  return result;
}

/**
 * Setup and teardown for tests
 */
let testServer: TestServer;

test.before(async () => {
  // Initialize actual source and transformer instances
  const filesystem = await import('@flatbread/source-filesystem');
  const markdownTransformer = await import('@flatbread/transformer-markdown');
  const yamlTransformer = await import('@flatbread/transformer-yaml');
  const { initializeConfig } = await import('@flatbread/core');

  const rawConfig: FlatbreadConfig = {
    source: filesystem.default(),
    transformer: [
      markdownTransformer.default({
        markdown: {
          gfm: true,
          externalLinks: true,
        },
      }),
      yamlTransformer.default(),
    ],
    content: testConfig.content,
  };

  const config = initializeConfig(rawConfig);
  const schema = await generateSchema({ config });
  testServer = await createTestServer(schema);
});

test.after(async () => {
  if (testServer) {
    await testServer.cleanup();
  }
});

/**
 * Test Cases
 */

test('server starts and responds to health check', async (t) => {
  const response = await fetch(testServer.url, {
    method: 'GET',
  });

  // Apollo Server returns 400 for GET requests without query
  t.is(response.status, 400);
});

test('basic GraphQL query - fetch all authors', async (t) => {
  const query = `
    query AllAuthors {
      allAuthors {
        id
        name
        entity
        enjoys
        date_joined
      }
    }
  `;

  const result = await executeGraphQLQuery(testServer.url, query);

  t.is(result.errors, undefined);
  t.truthy(result.data);
  t.truthy(result.data.allAuthors);
  t.true(Array.isArray(result.data.allAuthors));
  t.true(result.data.allAuthors.length > 0);

  // Check that we have expected author data
  const tony = result.data.allAuthors.find(
    (author: any) => author.name === 'Tony'
  );
  t.truthy(tony);
  t.is(tony.entity, 'Human');
  t.true(Array.isArray(tony.enjoys));
});

test('relational query - authors with friend relationship', async (t) => {
  const query = `
    query AuthorsWithFriends {
      allAuthors {
        id
        name
        friend {
          id
          name
        }
      }
    }
  `;

  const result = await executeGraphQLQuery(testServer.url, query);

  t.is(result.errors, undefined);
  t.truthy(result.data);
  t.truthy(result.data.allAuthors);

  // Check that some authors have friends
  const authorsWithFriends = result.data.allAuthors.filter(
    (author: any) => author.friend
  );
  t.true(authorsWithFriends.length > 0);
});

test('filtered query - find authors by name', async (t) => {
  const query = `
    query FindTony {
      allAuthors(filter: { name: { eq: "Tony" } }) {
        id
        name
        entity
        enjoys
      }
    }
  `;

  const result = await executeGraphQLQuery(testServer.url, query);

  t.is(result.errors, undefined);
  t.truthy(result.data);
  t.truthy(result.data.allAuthors);
  t.is(result.data.allAuthors.length, 1);
  t.is(result.data.allAuthors[0].name, 'Tony');
  t.is(result.data.allAuthors[0].entity, 'Human');
});

test('query posts with author relationships', async (t) => {
  const query = `
    query AllPosts {
      allPosts {
        id
        title
        rating
        authors {
          id
          name
        }
      }
    }
  `;

  const result = await executeGraphQLQuery(testServer.url, query);

  t.is(result.errors, undefined);
  t.truthy(result.data);
  t.truthy(result.data.allPosts);
  t.true(Array.isArray(result.data.allPosts));

  if (result.data.allPosts.length > 0) {
    const post = result.data.allPosts[0];
    t.truthy(post.title);
    t.true(Array.isArray(post.authors));
  }
});

test('query YAML authors collection', async (t) => {
  const query = `
    query AllYamlAuthors {
      allYamlAuthors {
        id
        name
      }
    }
  `;

  const result = await executeGraphQLQuery(testServer.url, query);

  t.is(result.errors, undefined);
  t.truthy(result.data);
  t.truthy(result.data.allYamlAuthors);
  t.true(Array.isArray(result.data.allYamlAuthors));
});

test('GraphQL introspection query', async (t) => {
  const query = `
    query IntrospectionQuery {
      __schema {
        types {
          name
          kind
        }
      }
    }
  `;

  const result = await executeGraphQLQuery(testServer.url, query);

  t.is(result.errors, undefined);
  t.truthy(result.data);
  t.truthy(result.data.__schema);
  t.truthy(result.data.__schema.types);

  // Check that our custom types are present
  const typeNames = result.data.__schema.types.map((type: any) => type.name);
  t.true(typeNames.includes('Author'));
  t.true(typeNames.includes('Post'));
  t.true(typeNames.includes('YamlAuthor'));
});

test('invalid query returns error', async (t) => {
  const query = `
    query InvalidQuery {
      nonExistentField
    }
  `;

  const result = await executeGraphQLQuery(testServer.url, query);

  t.truthy(result.errors);
  t.true(Array.isArray(result.errors));
  t.true(result.errors.length > 0);
});

test('CORS headers are present', async (t) => {
  const response = await fetch(testServer.url, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  });

  t.is(response.status, 204);
  t.truthy(response.headers.get('Access-Control-Allow-Origin'));
  t.truthy(response.headers.get('Access-Control-Allow-Methods'));
  t.truthy(response.headers.get('Access-Control-Allow-Headers'));
});
