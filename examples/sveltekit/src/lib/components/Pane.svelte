<script>
  import Label from '$lib/components/Label.svelte';

  export let label = '';
</script>

<section class="relative h-full">
  {#if label}
    <Label>{label}</Label>
  {/if}
  <slot />
</section>
