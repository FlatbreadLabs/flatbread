<script lang="ts">
  import NavBar from '$lib/components/navigation/NavBar.svelte';
  import '../app.css';
</script>

<div class="relative">
  <NavBar />
  <slot />
</div>
