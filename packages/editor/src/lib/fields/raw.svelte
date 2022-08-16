<script lang="ts">
	import { browser } from '$app/env';

	export let field;
	export let value;
	export let inList: boolean = false;
	export let readOnly: boolean = false;

	if (browser) {
		console.log('raw field', field.component, { field, value });
	}
</script>

<label>
	{#if !inList}{field.label}{/if}
	{#if readOnly}
		{JSON.stringify(value)}
	{:else}
		<input type="string" disabled value={JSON.stringify(value)} />
	{/if}
	{#if field.description}<small>{field.description}</small>{/if}
</label>
