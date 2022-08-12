<script lang="ts">
  import { Application } from '@splinetool/runtime';
  import { onMount } from 'svelte';

  let splineHeroCanvas: HTMLCanvasElement;

  onMount(async () => {
    const app = new Application(splineHeroCanvas);
    await app.load(
      'https://prod.spline.design/9z0RJPmGv9Mhpdgl/scene.splinecode'
    );
  });
</script>

<svelte:head>
  <link
    rel="preload"
    href="https://prod.spline.design/9z0RJPmGv9Mhpdgl/scene.splinecode"
    as="fetch"
  />
</svelte:head>

<canvas bind:this={splineHeroCanvas} />
