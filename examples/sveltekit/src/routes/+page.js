export async function load({ fetch }) {
  const query = `
    query PostCategory {
      allPostCategories (sortBy: "title", order: DESC) {
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
  `;

  try {
    const response = await fetch('http://localhost:5057/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    });

    const { data, errors } = await response.json();

    if (errors) {
      throw new Error(errors.map(({ message }) => message).join('\n'));
    }

    return data;
  } catch (error) {
    throw new Error('Failed to load data: ' + error.message);
  }
}
