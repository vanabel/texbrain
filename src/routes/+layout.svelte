<script lang="ts">
  import '../app.css';
  import Toast from '$lib/ui/Toast.svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    if (browser && 'serviceWorker' in navigator) {
      // Disable old service worker caches that can pin stale build assets
      // and break PDF preview after pm2/static deploy updates.
      const migrationKey = 'texbrain.sw.cleanup.v1';
      if (!localStorage.getItem(migrationKey)) {
        navigator.serviceWorker
          .getRegistrations()
          .then(regs => Promise.all(regs.map(r => r.unregister())))
          .catch(() => {});

        if ('caches' in globalThis) {
          caches
            .keys()
            .then(keys => Promise.all(keys.map(k => caches.delete(k))))
            .catch(() => {});
        }

        localStorage.setItem(migrationKey, '1');
      }
    }
  });
</script>

{@render children()}
<Toast />
