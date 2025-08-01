/**
 * GraphQL client utilities for Flatbread
 */

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
  }>;
}

/**
 * Simple GraphQL client for fetching data from Flatbread
 */
export async function graphqlFetch<T = any>(
  query: string,
  variables?: Record<string, any>,
  endpoint: string = 'http://localhost:5057/graphql'
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors) {
    throw new Error(result.errors.map((error) => error.message).join('\n'));
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL query');
  }

  return result.data;
}

/**
 * GraphQL query strings
 */
export const queries = {
  GET_POST_CATEGORIES: `
    query GetPostCategories {
      allPostCategories(sortBy: "title", order: DESC) {
        _collection
        _filename
        _slug
        id
        title
        category
        slug
        rating
        _content {
          raw
          html
          excerpt
          timeToRead
        }
        authors {
          _slug
          id
          name
          entity
          enjoys
          image {
            srcset
            srcsetwebp
            srcsetavif
            placeholder
            aspectratio
          }
          friend {
            name
            date_joined
          }
          date_joined
          skills {
            sitting
            breathing
            liquid_consumption
            existence
            sports
          }
        }
      }
    }
  `,

  GET_ALL_POSTS: `
    query GetAllPosts {
      allPosts {
        id
        title
        _content {
          html
          excerpt
          timeToRead
        }
        authors {
          id
          name
        }
      }
    }
  `,

  GET_AUTHORS: `
    query GetAuthors {
      allAuthors {
        id
        name
        entity
        enjoys
        image {
          srcset
          srcsetwebp
          srcsetavif
          placeholder
          aspectratio
        }
        date_joined
        skills {
          sitting
          breathing
          liquid_consumption
          existence
          sports
        }
      }
    }
  `,
} as const;