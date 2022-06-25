<script context="module">
  export const load = async ({ fetch }) => {
    const query = `
      query Post {
        allPosts (sortBy: "title", order: DESC) {
          _collection
          _filename
          _slug
          id
          title
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
        return {
          error: new Error(errors.map(({ message }) => message).join('\\n')),
          status: 500,
        };
      return {
        props: {
          data: data,
        },
      };
    } catch (e) {
      return {
        error: new Error('Failed to load data'),
        status: 500,
      };
    }
  };
</script>

<script>
  import Pane from './../lib/components/Pane.svelte';

  export let data = {};
  export let error = null;
  if (error) console.error(error);

  function joinAuthors(authors) {
    return authors.map((author) => author.name).join(', ');
  }
</script>

<div class="grid grid-cols-2 divide-x-2 divide-black">
  <Pane label="JSON Output">
    <pre
      class="overflow-auto p-3"
      style="height: calc(100vh - 3.5rem);">
      <code class="text-sm">
        {JSON.stringify(data, null, 2)}
      </code>
    </pre>
  </Pane>
  <Pane label="Frontend">
    {#each data.allPosts as post, _ (post.id)}
      <article class="m-3 border border-opacity-20 bg-gray-50 p-3">
        <h3 class="text-xl font-medium">{post.title}</h3>
        <ul>
          <li class="text-xs font-semibold text-gray-500">
            By: {joinAuthors(post.authors)}
          </li>
          <li class="text-xs font-semibold text-gray-500">
            Rating: {post.rating}
          </li>
        </ul>
        <div>{@html post._content.html}</div>
      </article>
    {/each}
  </Pane>
</div>
