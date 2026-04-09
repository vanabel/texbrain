<script lang="ts">
  import { locale, setLocale } from '$lib/i18n/locale';
  import { landingCopy } from '$lib/i18n/landing';
</script>

<div class="lang-switch" role="group" aria-label={landingCopy[$locale].langSwitchLabel}>
  <button
    type="button"
    class="lang-btn"
    class:active={$locale === 'en'}
    aria-pressed={$locale === 'en'}
    on:click={() => setLocale('en')}
  >EN</button>
  <button
    type="button"
    class="lang-btn"
    class:active={$locale === 'zh'}
    aria-pressed={$locale === 'zh'}
    on:click={() => setLocale('zh')}
  >中文</button>
</div>

<style>
  .lang-switch {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--bg-surface);
  }

  .lang-btn {
    margin: 0;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    font-family: var(--font-editor);
    color: var(--text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    line-height: 1.2;
    transition: background 0.12s, color 0.12s;
  }

  .lang-btn:hover:not(.active) {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .lang-btn.active {
    background: var(--accent);
    color: #111;
  }
</style>
