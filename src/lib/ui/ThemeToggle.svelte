<script lang="ts">
  import { locale } from '$lib/i18n/locale';
  import { theme, toggleTheme } from '$lib/stores/theme';

  const copy = {
    en: { toLight: 'Switch to light mode', toDark: 'Switch to dark mode' },
    zh: { toLight: '切换到浅色模式', toDark: '切换到深色模式' }
  };

  $: label = $theme === 'dark' ? copy[$locale].toLight : copy[$locale].toDark;
</script>

<button
  type="button"
  class="theme-btn"
  aria-pressed={$theme === 'dark'}
  aria-label={label}
  title={label}
  on:click={toggleTheme}
>
  {#if $theme === 'dark'}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" stroke-width="1.3" />
      <path d="M8 1.4v1.6M8 13v1.6M1.4 8h1.6M13 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
    </svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13.2 9.4A5.2 5.2 0 016.6 2.8 5.4 5.4 0 1013.2 9.4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
    </svg>
  {/if}
</button>

<style>
  .theme-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 26px;
    margin: 0;
    padding: 0;
    color: var(--text-secondary);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    line-height: 1;
    transition: background 0.12s, color 0.12s;
  }

  .theme-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
