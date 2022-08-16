<script lang="ts">
	import Header from '$lib/header.svelte';
	import { getSession } from '$lib/utils';

	const { gqlTypes, queryTypes } = getSession();
</script>

<Header />
<main class="container">
	<h1>Welcome to Leaven</h1>
	<ul>
		{#each Array.from(queryTypes.values()) as collection}
			<a sveltekit:prefetch href="/collection/{collection.name}">
				<details>
					<summary>
						{collection.schema.pluralName}
					</summary>
				</details>
			</a>
		{/each}
	</ul>
</main>
