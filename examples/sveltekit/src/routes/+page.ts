import { error } from '@sveltejs/kit';

export const load = async ({ fetch }) => {
  const query = `
      query PostCategory {
        allPostCategories (sortBy: "title", order: DESC) {
          _metadata {
            sourceContext {
              filename
              slug
            }
            collection
          }
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
            _metadata {
              sourceContext {
                slug
              }
            }
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
		`;

  try {
    const response = await fetch('http://localhost:5057/graphql', {
      body: JSON.stringify({
        query,
      }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      method: 'POST',
    });

    const { data, errors } = await response.json();

    if (errors)
      throw error(500, errors.map(({ message }) => message).join('\\n'));
    return data;
  } catch (e) {
    throw error(500, 'Failed to load data');
  }
};
