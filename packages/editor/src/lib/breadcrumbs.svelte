<script lang="ts">
	import { slice } from 'lodash-es';

	export let breadcrumbs: { label: string; path?: string }[] = [];
	export let allowBack = false;
</script>

<div class="crumbs">
	{#if allowBack}
		<a
			href={breadcrumbs
				.slice()
				.reverse()
				.find((c) => c.path).path}
		>
			<svg
				class="w-6 h-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
	{/if}
	{#each breadcrumbs as crumb}
		{#if crumb.path}
			<a class="crumb" href={crumb.path}>{crumb.label}</a>
		{:else}
			<span>{crumb.label}</span>
		{/if}
	{/each}
</div>

<style lang="scss">
	.crumbs {
		--crumb-spacing: 0.5rem;
		display: flex;
		flex-direction: row;
		gap: var(--crumb-spacing);

		.crumb + * {
			&:before {
				text-decoration: none;
				margin-right: var(--crumb-spacing);
				content: '\\';
			}
		}
	}
</style>
