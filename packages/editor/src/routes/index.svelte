<script lang="ts">
	import { getSession } from '$lib/utils';

	const { gqlTypes, queryTypes } = getSession();
</script>

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
