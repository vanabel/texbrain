<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/stores';
</script>

<div style="padding: 40px; text-align: center; font-family: system-ui; color: var(--text-primary); background: var(--bg-deep); min-height: 100vh;">
  <h1 style="font-size: 48px; margin-bottom: 16px;">error</h1>
  <p style="font-size: 18px; color: var(--text-secondary); margin-bottom: 8px;">status: {$page.status}</p>
  <p style="font-size: 16px; color: var(--error); margin-bottom: 32px;">{$page.error?.message}</p>
  <a href="{base}/" style="color: var(--accent); font-size: 14px;">go back home</a>
</div>
