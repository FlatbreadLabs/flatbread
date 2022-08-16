<script lang="ts">
  import { browser } from '$app/env';
  import Pane from './../lib/components/Pane.svelte';

  /** @type {import('./$types').PageData}*/
  export let data;

  if (browser) {
    import('svimg/dist/s-image');
  }

  export let error = null;
  if (error) console.error(error);

  function joinAuthors(authors) {
    return authors?.map((author) => author.name).join(', ');
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
    {#each data.allPostCategories as post, _ (post.id)}
      <article class="m-3 border border-opacity-20 bg-gray-50 p-3">
        <h3 class="text-xl font-medium">{post.title}</h3>
        <ul>
          <li class="text-xs font-semibold text-gray-500">
            <div class="flex">
              {#each post.authors as author}
                <div>
                  <div class="h-12 w-12">
                    <s-image {...author.image} />
                  </div>
                  {author.name}
                </div>
              {/each}
            </div>
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
