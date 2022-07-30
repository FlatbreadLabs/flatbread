<script lang="ts">
	export let field;
	export let value;
	export let inList: boolean = false;
	export let readOnly: boolean = false;
</script>

<label>
	{#if !inList}{field.label}{/if}
	{#if readOnly}
		{value}
	{:else}
		<input type="string" disabled={field.disabled} bind:value />
	{/if}
	{#if field.description}<small>{field.description}</small>{/if}
</label>
